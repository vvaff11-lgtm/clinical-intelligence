# Clinical Intelligence

前后端一体的临床智能应用：

- 前端：React + Vite + Tailwind
- 后端：FastAPI + SQLAlchemy 2 + Alembic
- 数据库：本地 MySQL 8

## 本地启动

1. 安装 Node.js 依赖

```bash
npm install
```

2. 安装 Python 依赖

```bash
python -m pip install -r backend/requirements.txt
```

3. 复制环境变量并填写本地 MySQL 账号

```bash
copy .env.example .env
```

智能问诊会通过子进程调用外部 `MedicalEnv` 环境执行 Neo4j 医疗知识图谱查询。确认本机可执行：

```powershell
$env:PYTHONUTF8='1'; $env:PYTHONIOENCODING='utf-8'; chcp 65001 | Out-Null; conda activate MedicalEnv
```

然后在 `.env` 中配置知识图谱和模型参数：

```env
MEDICAL_WORKER_MODE=conda
MEDICAL_CONDA_ENV=MedicalEnv
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=12345678
DASHSCOPE_API_KEY=你的阿里云百炼 API Key
MEDICAL_MODEL_TYPE=AliyunBailian
MEDICAL_MODEL_NAME=qwen-plus
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=bge-m3
```

如果不使用阿里云百炼，可以把 `MEDICAL_MODEL_TYPE` 改为 `Ollama`，并把 `MEDICAL_MODEL_NAME` 改成本地已安装的 Ollama 模型名。

4. 初始化数据库、迁移和种子数据

```bash
npm run init:db
```

5. 启动前后端开发环境

```bash
npm run dev
```

- 前端地址：`http://127.0.0.1:3000`
- 后端地址：`http://127.0.0.1:8000`

## 生产构建

```bash
npm run build
npm run start
```

构建后的前端静态资源会由 FastAPI 统一托管。

## 测试

```bash
npm run test:api
```
