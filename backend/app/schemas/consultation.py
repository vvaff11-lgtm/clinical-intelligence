from datetime import datetime
from typing import Literal

from pydantic import Field

from backend.app.schemas.base import CamelModel


class ConsultationSessionOut(CamelModel):
    id: int
    title: str
    summary: str
    status: str
    last_message_at: datetime
    created_at: datetime


class ConsultationMessageOut(CamelModel):
    id: int
    session_id: int
    sender: str
    content: str
    context_data: dict | None = None
    created_at: datetime


class CreateConsultationRequest(CamelModel):
    title: str | None = Field(default=None, max_length=120)


class CreateMessageRequest(CamelModel):
    content: str = Field(min_length=1, max_length=4000)
    query_type: Literal["疾病", "症状"] | None = None
    top_k: int | None = Field(default=None, ge=1, le=10)
    temperature: float | None = Field(default=None, ge=0, le=1)
    model_type: Literal["AliyunBailian", "Ollama"] | None = None
    model_name: str | None = Field(default=None, max_length=120)
    llm_base_url: str | None = Field(default=None, max_length=255)
    api_key: str | None = Field(default=None, max_length=255)


class CreateMessageResponse(CamelModel):
    user_message: ConsultationMessageOut
    system_message: ConsultationMessageOut


class RegenerateMessageRequest(CamelModel):
    query_type: Literal["疾病", "症状"] | None = None
    top_k: int | None = Field(default=None, ge=1, le=10)
    temperature: float | None = Field(default=None, ge=0, le=1)
    model_type: Literal["AliyunBailian", "Ollama"] | None = None
    model_name: str | None = Field(default=None, max_length=120)
    llm_base_url: str | None = Field(default=None, max_length=255)
    api_key: str | None = Field(default=None, max_length=255)
