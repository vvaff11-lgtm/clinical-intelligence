from __future__ import annotations

import logging
import re
import json
import subprocess
from functools import lru_cache
from typing import Any
from urllib.parse import quote

import requests

from backend.app.core.config import ROOT_DIR, Settings, get_settings


logger = logging.getLogger(__name__)


class MedicalKnowledgeError(RuntimeError):
    """
    医疗知识图谱查询失败。
    """


class MedicalKnowledgeService:
    """
    复用 Streamlit 脚本中的 Neo4j 向量检索与大模型回答流程。
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._graph: Any | None = None

    def generate_answer(
        self,
        question: str,
        query_type: str | None = None,
        top_k: int | None = None,
        temperature: float | None = None,
        model_type: str | None = None,
        model_name: str | None = None,
        llm_base_url: str | None = None,
        api_key: str | None = None,
    ) -> tuple[str, dict[str, Any]]:
        """
        根据用户问题检索知识图谱并生成医疗问答回复。
        """
        if not self.settings.medical_ai_enabled:
            raise MedicalKnowledgeError("医疗知识图谱问答未启用")
        if self.settings.medical_worker_mode == "conda":
            return self._run_conda_worker(
                question,
                query_type,
                top_k,
                temperature,
                model_type,
                model_name,
                llm_base_url,
                api_key,
            )

        resolved_query_type = query_type or self.settings.medical_query_type
        resolved_top_k = top_k or self.settings.medical_top_k
        resolved_temperature = temperature if temperature is not None else self.settings.medical_temperature

        query_embedding = self._get_embedding(question)
        if resolved_query_type == "症状":
            results = self._query_symptoms(query_embedding, resolved_top_k)
            contexts = [{"type": "症状", "results": results}] if results else []
        else:
            results = self._query_diseases(query_embedding, resolved_top_k)
            contexts = [{"type": "疾病", "results": results}] if results else []

        if not contexts:
            return "抱歉，没有找到相关的医疗信息。", {
                "question": question,
                "contexts": [],
                "query_type": resolved_query_type,
                "graphData": None,
            }

        prompt = self._build_prompt(question, contexts)
        answer = self._call_llm(
            prompt,
            resolved_temperature,
            model_type=model_type,
            model_name=model_name,
            llm_base_url=llm_base_url,
            api_key=api_key,
        )
        return self._remove_think_content(answer), {
            "question": question,
            "contexts": contexts,
            "query_type": resolved_query_type,
            "top_k": resolved_top_k,
            "graphData": self._build_graph_data(contexts),
        }

    def _run_conda_worker(
        self,
        question: str,
        query_type: str | None,
        top_k: int | None,
        temperature: float | None,
        model_type: str | None,
        model_name: str | None,
        llm_base_url: str | None,
        api_key: str | None,
    ) -> tuple[str, dict[str, Any]]:
        """
        用 MedicalEnv 子进程执行知识图谱查询，避免主后端环境与外部课程环境互相污染。
        """
        resolved_model_type = model_type or self.settings.medical_model_type
        if resolved_model_type == "Gemini":
            resolved_llm_base_url = llm_base_url or self.settings.gemini_api_endpoint
        else:
            resolved_llm_base_url = llm_base_url or self.settings.medical_llm_base_url
        payload = {
            "question": question,
            "query_type": query_type or self.settings.medical_query_type,
            "top_k": top_k or self.settings.medical_top_k,
            "temperature": temperature if temperature is not None else self.settings.medical_temperature,
            "settings": {
                "neo4j_uri": self.settings.neo4j_uri,
                "neo4j_user": self.settings.neo4j_user,
                "neo4j_password": self.settings.neo4j_password,
                "dashscope_api_key": api_key or self.settings.dashscope_api_key,
                "gemini_api_key": api_key or self.settings.gemini_api_key,
                "gemini_api_endpoint": resolved_llm_base_url if resolved_model_type == "Gemini" else self.settings.gemini_api_endpoint,
                "medical_model_type": resolved_model_type,
                "medical_model_name": model_name or self.settings.medical_model_name,
                "medical_llm_base_url": resolved_llm_base_url,
                "ollama_base_url": self.settings.ollama_base_url,
                "ollama_embedding_model": self.settings.ollama_embedding_model,
            },
        }
        command = [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            (
                "$env:PYTHONUTF8='1'; "
                "$env:PYTHONIOENCODING='utf-8'; "
                "chcp 65001 | Out-Null; "
                f"conda activate {self.settings.medical_conda_env}; "
                "python -u backend/app/services/medical_knowledge_worker.py"
            ),
        ]

        try:
            completed = subprocess.run(
                command,
                input=json.dumps(payload, ensure_ascii=False),
                capture_output=True,
                cwd=ROOT_DIR,
                text=True,
                encoding="utf-8",
                timeout=self.settings.medical_worker_timeout_seconds,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            logger.exception("医疗知识图谱子进程执行失败")
            raise MedicalKnowledgeError("医疗知识图谱子进程执行失败，请确认 Conda 与 MedicalEnv 可用") from exc

        output_text = completed.stdout.strip()
        if completed.returncode != 0:
            logger.error("医疗知识图谱子进程返回失败：%s", completed.stderr.strip())
            error_detail = output_text or completed.stderr.strip() or "未知错误"
            raise MedicalKnowledgeError(error_detail)

        try:
            output = json.loads(output_text)
        except json.JSONDecodeError as exc:
            logger.error("医疗知识图谱子进程返回了非 JSON 内容：%s", output_text)
            raise MedicalKnowledgeError("医疗知识图谱子进程返回格式异常") from exc

        if output.get("error"):
            raise MedicalKnowledgeError(str(output["error"]))
        return str(output["answer"]), output.get("result", {})

    def get_full_graph(self, node_limit: int = 500, edge_limit: int = 1200) -> dict[str, Any]:
        """
        从 Neo4j 拉取知识图谱节点与关系，用于前端整图浏览。
        """
        if self.settings.medical_worker_mode == "conda":
            return self._run_conda_full_graph(node_limit, edge_limit)
        return self._query_full_graph(node_limit, edge_limit)

    def _run_conda_full_graph(self, node_limit: int, edge_limit: int) -> dict[str, Any]:
        payload = {
            "action": "full_graph",
            "node_limit": node_limit,
            "edge_limit": edge_limit,
            "settings": {
                "neo4j_uri": self.settings.neo4j_uri,
                "neo4j_user": self.settings.neo4j_user,
                "neo4j_password": self.settings.neo4j_password,
                "dashscope_api_key": self.settings.dashscope_api_key,
                "gemini_api_key": self.settings.gemini_api_key,
                "gemini_api_endpoint": self.settings.gemini_api_endpoint,
                "medical_model_type": self.settings.medical_model_type,
                "medical_model_name": self.settings.medical_model_name,
                "medical_llm_base_url": self.settings.medical_llm_base_url,
                "ollama_base_url": self.settings.ollama_base_url,
                "ollama_embedding_model": self.settings.ollama_embedding_model,
            },
        }
        command = [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            (
                "$env:PYTHONUTF8='1'; "
                "$env:PYTHONIOENCODING='utf-8'; "
                "chcp 65001 | Out-Null; "
                f"conda activate {self.settings.medical_conda_env}; "
                "python -u backend/app/services/medical_knowledge_worker.py"
            ),
        ]

        try:
            completed = subprocess.run(
                command,
                input=json.dumps(payload, ensure_ascii=False),
                capture_output=True,
                cwd=ROOT_DIR,
                text=True,
                encoding="utf-8",
                timeout=self.settings.medical_worker_timeout_seconds,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            logger.exception("知识图谱子进程执行失败")
            raise MedicalKnowledgeError("知识图谱子进程执行失败，请确认 Conda 与 MedicalEnv 可用") from exc

        output_text = completed.stdout.strip()
        if completed.returncode != 0:
            logger.error("知识图谱子进程返回失败：%s", completed.stderr.strip())
            raise MedicalKnowledgeError(output_text or completed.stderr.strip() or "未知错误")

        try:
            output = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise MedicalKnowledgeError("知识图谱子进程返回格式异常") from exc

        if output.get("error"):
            raise MedicalKnowledgeError(str(output["error"]))
        return output.get("graph", {"nodes": [], "edges": [], "totalNodes": 0, "totalEdges": 0})

    @property
    def graph(self) -> Any:
        if self._graph is None:
            try:
                from py2neo import Graph
            except ImportError as exc:
                raise MedicalKnowledgeError("当前 Python 环境缺少 py2neo，请在 MedicalEnv 中安装或启动后端") from exc

            self._graph = Graph(
                self.settings.neo4j_uri,
                user=self.settings.neo4j_user,
                password=self.settings.neo4j_password,
            )
        return self._graph

    def _get_embedding(self, text: str) -> list[float]:
        """
        调用本地 Ollama 生成查询向量。
        """
        try:
            response = requests.post(
                f"{self.settings.ollama_base_url.rstrip('/')}/api/embeddings",
                json={"model": self.settings.ollama_embedding_model, "prompt": text},
                timeout=30,
            )
            response.raise_for_status()
            embedding = response.json()["embedding"]
        except (requests.RequestException, KeyError, TypeError) as exc:
            logger.exception("获取医疗问题向量失败")
            raise MedicalKnowledgeError("获取医疗问题向量失败，请确认 Ollama 与 bge-m3 模型已启动") from exc

        return [float(value) for value in embedding]

    def _query_diseases(self, query_embedding: list[float], top_k: int) -> list[dict[str, Any]]:
        query = """
        CALL db.index.vector.queryNodes('disease_embeddings', $top_k, $query_embedding)
        YIELD node, score
        MATCH (node:Disease)
        OPTIONAL MATCH (node)-[:has_symptom]->(symptom:Symptom)
        OPTIONAL MATCH (node)-[:common_drug]->(drug:Drug)
        OPTIONAL MATCH (node)-[:recommend_drug]->(recommend_drug:Drug)
        OPTIONAL MATCH (node)-[:no_eat]->(no_eat:Food)
        OPTIONAL MATCH (node)-[:do_eat]->(do_eat:Food)
        OPTIONAL MATCH (node)-[:belongs_to]->(department:Department)
        RETURN node.name AS disease,
               score AS similarity,
               department.name AS department,
               COLLECT(DISTINCT symptom.name) AS symptoms,
               COLLECT(DISTINCT drug.name) AS common_drugs,
               COLLECT(DISTINCT recommend_drug.name) AS recommend_drugs,
               COLLECT(DISTINCT no_eat.name) AS avoid_foods,
               COLLECT(DISTINCT do_eat.name) AS recommend_foods,
               node.cause AS cause,
               node.cure_lasttime AS cure_duration
        ORDER BY score DESC
        """
        try:
            records = self.graph.run(query, top_k=top_k, query_embedding=query_embedding)
            return [
                {
                    "name": record["disease"],
                    "similarity": float(record["similarity"]),
                    "就诊科室": record.get("department"),
                    "症状": record.get("symptoms", []),
                    "常用药": record.get("common_drugs", []),
                    "推荐药物": record.get("recommend_drugs", []),
                    "勿食用": record.get("avoid_foods", []),
                    "推荐食物": record.get("recommend_foods", []),
                    "病因": record.get("cause"),
                    "治疗期限": record.get("cure_duration"),
                }
                for record in records
            ]
        except Exception as exc:
            logger.exception("疾病向量检索失败")
            raise MedicalKnowledgeError("疾病向量检索失败，请确认 Neo4j 和 disease_embeddings 索引可用") from exc

    def _query_symptoms(self, query_embedding: list[float], top_k: int) -> list[dict[str, Any]]:
        query = """
        CALL db.index.vector.queryNodes('symptom_embeddings', $top_k, $query_embedding)
        YIELD node, score
        MATCH (node:Symptom)
        OPTIONAL MATCH (node)<-[:has_symptom]-(disease:Disease)
        RETURN node.name AS symptom,
               score AS similarity,
               COLLECT(DISTINCT disease.name) AS related_diseases
        ORDER BY score DESC
        """
        try:
            records = self.graph.run(query, top_k=top_k, query_embedding=query_embedding)
            return [
                {
                    "name": record["symptom"],
                    "similarity": float(record["similarity"]),
                    "相关疾病": record.get("related_diseases", []),
                }
                for record in records
            ]
        except Exception as exc:
            logger.exception("症状向量检索失败")
            raise MedicalKnowledgeError("症状向量检索失败，请确认 Neo4j 和 symptom_embeddings 索引可用") from exc

    def _query_full_graph(self, node_limit: int, edge_limit: int) -> dict[str, Any]:
        node_records = list(
            self.graph.run(
                """
                MATCH (n)
                RETURN id(n) AS id,
                       labels(n) AS labels,
                       coalesce(n.name, n.title, toString(id(n))) AS label
                LIMIT $node_limit
                """,
                node_limit=node_limit,
            )
        )
        node_ids = [record["id"] for record in node_records]
        edge_records = list(
            self.graph.run(
                """
                MATCH (n)-[r]->(m)
                WHERE id(n) IN $node_ids AND id(m) IN $node_ids
                RETURN id(n) AS source,
                       id(m) AS target,
                       type(r) AS label
                LIMIT $edge_limit
                """,
                node_ids=node_ids,
                edge_limit=edge_limit,
            )
        )
        return {
            "nodes": [
                {
                    "id": str(record["id"]),
                    "label": record["label"],
                    "type": record["labels"][0] if record["labels"] else "Node",
                }
                for record in node_records
            ],
            "edges": [
                {
                    "source": str(record["source"]),
                    "target": str(record["target"]),
                    "label": record["label"],
                }
                for record in edge_records
            ],
            "totalNodes": len(node_records),
            "totalEdges": len(edge_records),
            "limited": len(node_records) >= node_limit or len(edge_records) >= edge_limit,
        }

    def _build_prompt(self, question: str, contexts: list[dict[str, Any]]) -> str:
        context_text = "\n\n".join(
            f"{context['type']}信息:\n" + "\n".join(self._format_context_item(context, item, index))
            for context in contexts
            for index, item in enumerate(context["results"])
        )
        return f"""你是一名医疗知识助手，需要根据提供的医疗信息回答用户的提问。
请用谨慎、非诊断性的语气回答，不要把症状直接判断为某个确定疾病。
如果检索信息显示某个疾病与症状相关，只能表述为“可能与某某疾病相关”、“可能是某某疾病的一种表现”或“建议进一步就医检查确认”。
禁止使用“答案：某某疾病”、“就是某某疾病”、“可以诊断为某某疾病”这类确定性表述。
如果信息不足，请回答“根据现有信息无法确定”。
问题：{question}
医疗信息：{context_text}
回答："""

    def _format_context_item(self, context: dict[str, Any], item: dict[str, Any], index: int) -> list[str]:
        lines = [f"{index + 1}. {item['name']} (相似度: {item['similarity']:.4f})"]
        if context["type"] == "疾病":
            field_map = [
                ("就诊科室", "科室"),
                ("症状", "症状"),
                ("常用药", "常用药"),
                ("推荐药物", "推荐药物"),
                ("勿食用", "勿食用"),
                ("推荐食物", "推荐食物"),
                ("病因", "病因"),
                ("治疗期限", "治疗期限"),
            ]
        else:
            field_map = [("相关疾病", "相关疾病")]

        for field, label in field_map:
            value = item.get(field)
            if isinstance(value, list) and value:
                lines.append(f"   - {label}: {', '.join(str(entry) for entry in value)}")
            elif value:
                lines.append(f"   - {label}: {value}")
        return lines

    def _build_graph_data(self, contexts: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not contexts or not contexts[0].get("results"):
            return None

        context = contexts[0]
        top_item = context["results"][0]
        center_id = "center"
        nodes = [
            {
                "id": center_id,
                "label": top_item["name"],
                "type": context["type"],
                "primary": True,
            }
        ]
        edges: list[dict[str, str]] = []

        def append_nodes(values: list[Any], node_type: str, edge_label: str, limit: int = 2) -> None:
            for value in [item for item in values if item][:limit]:
                node_id = f"{node_type}-{len(nodes)}"
                nodes.append({"id": node_id, "label": str(value), "type": node_type})
                edges.append({"source": center_id, "target": node_id, "label": edge_label})

        if context["type"] == "疾病":
            append_nodes(top_item.get("症状", []), "症状", "has_symptom", 2)
            append_nodes(top_item.get("推荐药物", []) or top_item.get("常用药", []), "药物", "recommend_drug", 1)
            append_nodes([top_item.get("就诊科室")] if top_item.get("就诊科室") else [], "科室", "belongs_to", 1)
            append_nodes(top_item.get("推荐食物", []), "食物", "do_eat", 1)
        else:
            append_nodes(top_item.get("相关疾病", []), "疾病", "related_disease", 5)

        return {
            "queryType": context["type"],
            "centerId": center_id,
            "title": top_item["name"],
            "similarity": top_item.get("similarity"),
            "nodes": nodes,
            "edges": edges,
        }

    def _call_llm(
        self,
        prompt: str,
        temperature: float,
        model_type: str | None = None,
        model_name: str | None = None,
        llm_base_url: str | None = None,
        api_key: str | None = None,
    ) -> str:
        model_type = model_type or self.settings.medical_model_type
        model_name = model_name or self.settings.medical_model_name
        if model_type == "Ollama":
            return self._call_ollama(prompt, temperature, model_name, llm_base_url)
        if model_type == "AliyunBailian":
            return self._call_aliyun_bailian(prompt, temperature, model_name, llm_base_url, api_key)
        if model_type == "Gemini":
            return self._call_gemini(prompt, temperature, model_name, llm_base_url, api_key)
        raise MedicalKnowledgeError(f"不支持的模型类型：{model_type}")

    def _call_aliyun_bailian(
        self,
        prompt: str,
        temperature: float,
        model_name: str,
        llm_base_url: str | None,
        api_key: str | None,
    ) -> str:
        resolved_api_key = api_key or self.settings.dashscope_api_key
        if not resolved_api_key:
            raise MedicalKnowledgeError("缺少 DASHSCOPE_API_KEY，请在 .env 中配置阿里云百炼 API Key")

        session = requests.Session()
        session.trust_env = False
        try:
            response = session.post(
                llm_base_url or self.settings.medical_llm_base_url,
                headers={
                    "Authorization": f"Bearer {resolved_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name,
                    "input": {"messages": [{"role": "user", "content": prompt}]},
                    "parameters": {
                        "temperature": temperature,
                        "top_p": 0.9,
                        "max_tokens": 4096,
                        "result_format": "message",
                    },
                },
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            return data["output"]["choices"][0]["message"]["content"] or ""
        except (requests.RequestException, KeyError, IndexError, TypeError) as exc:
            logger.exception("阿里云百炼回答生成失败")
            raise MedicalKnowledgeError("阿里云百炼回答生成失败，请检查 API Key、模型名和网络连接") from exc
        finally:
            session.close()

    def _call_gemini(
        self,
        prompt: str,
        temperature: float,
        model_name: str,
        llm_base_url: str | None,
        api_key: str | None,
    ) -> str:
        resolved_api_key = api_key or self.settings.gemini_api_key
        if not resolved_api_key:
            raise MedicalKnowledgeError("缺少 GEMINI_API_KEY，请在 .env 中配置 Gemini API Key")

        endpoint = (llm_base_url or self.settings.gemini_api_endpoint).rstrip("/")
        try:
            response = requests.post(
                f"{endpoint}/v1beta/models/{quote(model_name, safe='')}:generateContent",
                headers={
                    "Authorization": f"Bearer {resolved_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": temperature,
                        "topP": 0.9,
                        "maxOutputTokens": 4096,
                    },
                },
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            parts = data["candidates"][0]["content"]["parts"]
            return "\n".join(str(part.get("text", "")) for part in parts).strip()
        except (requests.RequestException, KeyError, IndexError, TypeError) as exc:
            logger.exception("Gemini 回答生成失败")
            raise MedicalKnowledgeError("Gemini 回答生成失败，请检查 API Key、代理端点和模型名") from exc

    def _call_ollama(self, prompt: str, temperature: float, model_name: str, llm_base_url: str | None) -> str:
        llm_base_url = llm_base_url or self.settings.medical_llm_base_url
        if "dashscope.aliyuncs.com" in llm_base_url:
            llm_base_url = f"{self.settings.ollama_base_url.rstrip('/')}/v1"

        try:
            response = requests.post(
                f"{llm_base_url.rstrip('/')}/completions",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "temperature": temperature,
                    "top_p": 0.9,
                    "max_tokens": 4096,
                },
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["text"] or ""
        except (requests.RequestException, KeyError, IndexError, TypeError) as exc:
            logger.exception("Ollama 回答生成失败")
            raise MedicalKnowledgeError("Ollama 回答生成失败，请确认本地 Ollama 模型已启动") from exc

    def _remove_think_content(self, text: str) -> str:
        cleaned_text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        return re.sub(r"\s+", " ", cleaned_text).strip()


@lru_cache
def get_medical_knowledge_service() -> MedicalKnowledgeService:
    return MedicalKnowledgeService(get_settings())
