from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"
DIST_DIR = ROOT_DIR / "dist"


class Settings(BaseSettings):
    app_name: str = "Clinical Intelligence"
    api_prefix: str = "/api"
    debug: bool = True

    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_database: str = "clinical_intelligence"
    mysql_user: str = "root"
    mysql_password: str = ""
    database_url: str | None = None

    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    cors_origins: str = "http://127.0.0.1:3000,http://localhost:3000"

    medical_ai_enabled: bool = True
    medical_worker_mode: str = "conda"
    medical_conda_env: str = "MedicalEnv"
    medical_worker_timeout_seconds: int = 180
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "12345678"
    dashscope_api_key: str = ""
    gemini_api_key: str = ""
    gemini_api_endpoint: str = "http://127.0.0.1:8045"
    medical_model_type: str = "AliyunBailian"
    medical_model_name: str = "qwen-plus"
    medical_llm_base_url: str = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
    medical_query_type: str = "疾病"
    medical_top_k: int = 3
    medical_temperature: float = 0.3
    ollama_base_url: str = "http://localhost:11434"
    ollama_embedding_model: str = "bge-m3"

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @computed_field  # type: ignore[misc]
    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"mysql+pymysql://{quote_plus(self.mysql_user)}:{quote_plus(self.mysql_password)}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
