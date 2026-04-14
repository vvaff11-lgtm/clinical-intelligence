from __future__ import annotations

import json
import re
import sys
from typing import Any, Dict, List, Tuple
from urllib.parse import quote

import requests
from py2neo import Graph


def mask_secret_text(text: str) -> str:
    """
    脱敏代理或模型服务返回的错误正文，避免把用户临时填入的 Key 写进日志和页面。
    """
    return re.sub(r"sk-[A-Za-z0-9_-]+", "sk-***", text)


class WorkerMedicalKnowledgeService:
    """
    在 MedicalEnv 中运行的医疗知识图谱查询器。
    """

    def __init__(self, settings: Dict[str, Any]) -> None:
        self.settings = settings
        self.graph = Graph(
            settings["neo4j_uri"],
            user=settings["neo4j_user"],
            password=settings["neo4j_password"],
        )

    def generate_answer(
        self,
        question: str,
        query_type: str,
        top_k: int,
        temperature: float,
    ) -> Tuple[str, Dict[str, Any]]:
        query_embedding = self.get_embedding(question)
        if query_type == "症状":
            results = self.query_symptoms(query_embedding, top_k)
            contexts = [{"type": "症状", "results": results}] if results else []
        else:
            results = self.query_diseases(query_embedding, top_k)
            contexts = [{"type": "疾病", "results": results}] if results else []

        if not contexts:
            return "抱歉，没有找到相关的医疗信息。", {
                "question": question,
                "contexts": [],
                "query_type": query_type,
                "top_k": top_k,
                "graphData": None,
            }

        prompt = self.build_prompt(question, contexts)
        answer = self.call_llm(prompt, temperature)
        return self.remove_think_content(answer), {
            "question": question,
            "contexts": contexts,
            "query_type": query_type,
            "top_k": top_k,
            "graphData": self.build_graph_data(contexts),
        }

    def get_embedding(self, text: str) -> List[float]:
        response = requests.post(
            "{}/api/embeddings".format(self.settings["ollama_base_url"].rstrip("/")),
            json={"model": self.settings["ollama_embedding_model"], "prompt": text},
            timeout=30,
        )
        response.raise_for_status()
        return [float(value) for value in response.json()["embedding"]]

    def query_diseases(self, query_embedding: List[float], top_k: int) -> List[Dict[str, Any]]:
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

    def query_symptoms(self, query_embedding: List[float], top_k: int) -> List[Dict[str, Any]]:
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
        records = self.graph.run(query, top_k=top_k, query_embedding=query_embedding)
        return [
            {
                "name": record["symptom"],
                "similarity": float(record["similarity"]),
                "相关疾病": record.get("related_diseases", []),
            }
            for record in records
        ]

    def query_full_graph(self, node_limit: int, edge_limit: int) -> Dict[str, Any]:
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

    def build_prompt(self, question: str, contexts: List[Dict[str, Any]]) -> str:
        context_parts = []
        for context in contexts:
            item_lines = []
            for index, item in enumerate(context["results"]):
                item_lines.extend(self.format_context_item(context, item, index))
            context_parts.append("{}信息:\n{}".format(context["type"], "\n".join(item_lines)))

        context_text = "\n\n".join(context_parts)
        return """你是一名医疗知识助手，需要根据提供的医疗信息回答用户的提问。
请用谨慎、非诊断性的语气回答，不要把症状直接判断为某个确定疾病。
如果检索信息显示某个疾病与症状相关，只能表述为“可能与某某疾病相关”、“可能是某某疾病的一种表现”或“建议进一步就医检查确认”。
禁止使用“答案：某某疾病”、“就是某某疾病”、“可以诊断为某某疾病”这类确定性表述。
如果信息不足，请回答“根据现有信息无法确定”。
问题：{}
医疗信息：{}
回答：""".format(question, context_text)

    def format_context_item(self, context: Dict[str, Any], item: Dict[str, Any], index: int) -> List[str]:
        lines = ["{}. {} (相似度: {:.4f})".format(index + 1, item["name"], item["similarity"])]
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
                lines.append("   - {}: {}".format(label, ", ".join(str(entry) for entry in value)))
            elif value:
                lines.append("   - {}: {}".format(label, value))
        return lines

    def build_graph_data(self, contexts: List[Dict[str, Any]]) -> Dict[str, Any]:
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
        edges = []

        def append_nodes(values, node_type, edge_label, limit=2):
            for value in [item for item in values if item][:limit]:
                node_id = "{}-{}".format(node_type, len(nodes))
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

    def call_llm(self, prompt: str, temperature: float) -> str:
        if self.settings["medical_model_type"] == "Ollama":
            return self.call_ollama(prompt, temperature)
        if self.settings["medical_model_type"] == "AliyunBailian":
            return self.call_aliyun_bailian(prompt, temperature)
        if self.settings["medical_model_type"] == "Gemini":
            return self.call_gemini(prompt, temperature)
        raise ValueError("不支持的模型类型：{}".format(self.settings["medical_model_type"]))

    def call_aliyun_bailian(self, prompt: str, temperature: float) -> str:
        api_key = self.settings.get("dashscope_api_key") or ""
        if not api_key:
            raise ValueError("缺少 DASHSCOPE_API_KEY，请在 .env 中配置阿里云百炼 API Key")

        session = requests.Session()
        session.trust_env = False
        try:
            response = session.post(
                self.settings["medical_llm_base_url"],
                headers={
                    "Authorization": "Bearer {}".format(api_key),
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.settings["medical_model_name"],
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
        finally:
            session.close()

    def call_gemini(self, prompt: str, temperature: float) -> str:
        api_key = self.settings.get("gemini_api_key") or ""
        if not api_key:
            raise ValueError("缺少 GEMINI_API_KEY，请在 .env 中配置 Gemini API Key")

        endpoint = (self.settings.get("gemini_api_endpoint") or "http://127.0.0.1:8045").rstrip("/")
        response = requests.post(
            "{}/v1beta/models/{}:generateContent".format(
                endpoint,
                quote(self.settings["medical_model_name"], safe=""),
            ),
            headers={
                "Authorization": "Bearer {}".format(api_key),
                "Content-Type": "application/json",
            },
            json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "topP": 0.9,
                    "maxOutputTokens": 4096,
                },
            },
            timeout=120,
        )
        if not response.ok:
            error_text = mask_secret_text(response.text[:1000])
            raise ValueError("Gemini 代理返回 {}：{}".format(response.status_code, error_text))
        response.raise_for_status()
        data = response.json()
        parts = data["candidates"][0]["content"]["parts"]
        return "\n".join(str(part.get("text", "")) for part in parts).strip()

    def call_ollama(self, prompt: str, temperature: float) -> str:
        llm_base_url = self.settings["medical_llm_base_url"]
        if "dashscope.aliyuncs.com" in llm_base_url:
            llm_base_url = "{}/v1".format(self.settings["ollama_base_url"].rstrip("/"))

        response = requests.post(
            "{}/completions".format(llm_base_url.rstrip("/")),
            json={
                "model": self.settings["medical_model_name"],
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

    def remove_think_content(self, text: str) -> str:
        cleaned_text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        return re.sub(r"\s+", " ", cleaned_text).strip()


def main() -> None:
    request_payload = json.loads(sys.stdin.read())
    try:
        service = WorkerMedicalKnowledgeService(request_payload["settings"])
        if request_payload.get("action") == "full_graph":
            graph = service.query_full_graph(
                int(request_payload.get("node_limit", 500)),
                int(request_payload.get("edge_limit", 1200)),
            )
            response_payload = {"graph": graph}
        else:
            answer, result = service.generate_answer(
                request_payload["question"],
                request_payload["query_type"],
                int(request_payload["top_k"]),
                float(request_payload["temperature"]),
            )
            response_payload = {"answer": answer, "result": result}
    except Exception as exc:
        response_payload = {"error": str(exc)}

    sys.stdout.write(json.dumps(response_payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
