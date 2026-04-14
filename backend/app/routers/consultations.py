from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.consultation import ConsultationMessage, ConsultationSession
from backend.app.models.user import User
from backend.app.schemas.consultation import (
    CreateMessageResponse,
    ConsultationMessageOut,
    ConsultationSessionOut,
    CreateConsultationRequest,
    CreateMessageRequest,
    RegenerateMessageRequest,
)
from backend.app.schemas.response import PaginatedResponse
from backend.app.services.auth import get_current_user
from backend.app.services.medical_knowledge import MedicalKnowledgeError, get_medical_knowledge_service


router = APIRouter(prefix="/consultations", tags=["consultations"])


def build_title(content: str) -> str:
    plain = content.strip().replace("\n", " ")
    return plain[:20] if len(plain) > 20 else plain


def build_summary(content: str) -> str:
    plain = content.strip().replace("\n", " ")
    return plain[:80] if len(plain) > 80 else plain


def get_user_session_or_404(db: Session, session_id: int, user_id: int) -> ConsultationSession:
    consultation = db.scalar(
        select(ConsultationSession).where(
            ConsultationSession.id == session_id, ConsultationSession.user_id == user_id
        )
    )
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation session not found")
    return consultation


@router.get("", response_model=PaginatedResponse[ConsultationSessionOut])
def list_consultations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[ConsultationSessionOut]:
    statement = (
        select(ConsultationSession)
        .where(ConsultationSession.user_id == current_user.id)
        .order_by(ConsultationSession.last_message_at.desc(), ConsultationSession.created_at.desc())
    )
    items = db.scalars(statement).all()
    total = db.scalar(
        select(func.count()).select_from(ConsultationSession).where(ConsultationSession.user_id == current_user.id)
    ) or 0
    return PaginatedResponse[ConsultationSessionOut](items=items, total=total)


@router.post("", response_model=ConsultationSessionOut, status_code=status.HTTP_201_CREATED)
def create_consultation(
    payload: CreateConsultationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsultationSessionOut:
    consultation = ConsultationSession(
        user_id=current_user.id,
        title=payload.title or "新的问诊",
        summary="等待补充症状描述",
        status="active",
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return ConsultationSessionOut.model_validate(consultation)


@router.get("/{session_id}/messages", response_model=PaginatedResponse[ConsultationMessageOut])
def list_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[ConsultationMessageOut]:
    get_user_session_or_404(db, session_id, current_user.id)
    statement = (
        select(ConsultationMessage)
        .where(ConsultationMessage.session_id == session_id)
        .order_by(ConsultationMessage.created_at.asc())
    )
    items = db.scalars(statement).all()
    total = db.scalar(
        select(func.count()).select_from(ConsultationMessage).where(ConsultationMessage.session_id == session_id)
    ) or 0
    return PaginatedResponse[ConsultationMessageOut](items=items, total=total)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_consultation(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    consultation = get_user_session_or_404(db, session_id, current_user.id)
    db.delete(consultation)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{session_id}/messages/{message_id}/regenerate",
    response_model=ConsultationMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def regenerate_message(
    session_id: int,
    message_id: int,
    payload: RegenerateMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsultationMessageOut:
    consultation = get_user_session_or_404(db, session_id, current_user.id)
    source_message = db.scalar(
        select(ConsultationMessage).where(
            ConsultationMessage.id == message_id,
            ConsultationMessage.session_id == session_id,
            ConsultationMessage.sender == "system",
        )
    )
    if source_message is None:
        raise HTTPException(status_code=404, detail="System message not found")

    question = ""
    if isinstance(source_message.context_data, dict):
        question = str(source_message.context_data.get("question") or "")

    if not question:
        previous_user_message = db.scalar(
            select(ConsultationMessage)
            .where(
                ConsultationMessage.session_id == session_id,
                ConsultationMessage.sender == "user",
                ConsultationMessage.id < source_message.id,
            )
            .order_by(ConsultationMessage.id.desc())
        )
        question = previous_user_message.content if previous_user_message else ""

    if not question:
        raise HTTPException(status_code=400, detail="No source question found")

    source_context = source_message.context_data if isinstance(source_message.context_data, dict) else {}
    root_system_message_id = source_context.get("rootSystemMessageId") or source_message.id
    source_user_message_id = source_context.get("sourceUserMessageId")

    try:
        answer, query_result = get_medical_knowledge_service().generate_answer(
            question,
            query_type=payload.query_type,
            top_k=payload.top_k,
            temperature=payload.temperature,
            model_type=payload.model_type,
            model_name=payload.model_name,
            llm_base_url=payload.llm_base_url,
            api_key=payload.api_key,
        )
    except MedicalKnowledgeError as exc:
        answer = f"医疗知识图谱暂时不可用：{exc}"
        query_result = {"question": question, "contexts": [], "error": str(exc)}
    query_result = {
        **query_result,
        "question": question,
        "rootSystemMessageId": root_system_message_id,
        "sourceUserMessageId": source_user_message_id,
        "regeneratedFromMessageId": source_message.id,
    }

    regenerated_message = ConsultationMessage(
        session_id=session_id,
        sender="system",
        content=answer,
        context_data=query_result,
    )
    consultation.last_message_at = datetime.now(timezone.utc)
    db.add_all([regenerated_message, consultation])
    db.commit()
    db.refresh(regenerated_message)
    return ConsultationMessageOut.model_validate(regenerated_message)


@router.post("/{session_id}/messages", response_model=CreateMessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    session_id: int,
    payload: CreateMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreateMessageResponse:
    consultation = get_user_session_or_404(db, session_id, current_user.id)
    content = payload.content.strip()
    user_message = ConsultationMessage(session_id=session_id, sender="user", content=content)
    consultation.title = build_title(content) or consultation.title
    consultation.summary = build_summary(content)
    consultation.last_message_at = datetime.now(timezone.utc)
    db.add_all([user_message, consultation])
    db.commit()
    db.refresh(user_message)

    try:
        answer, query_result = get_medical_knowledge_service().generate_answer(
            content,
            query_type=payload.query_type,
            top_k=payload.top_k,
            temperature=payload.temperature,
            model_type=payload.model_type,
            model_name=payload.model_name,
            llm_base_url=payload.llm_base_url,
            api_key=payload.api_key,
        )
    except MedicalKnowledgeError as exc:
        answer = f"医疗知识图谱暂时不可用：{exc}"
        query_result = {"question": content, "contexts": [], "error": str(exc)}
    query_result = {**query_result, "question": content, "sourceUserMessageId": user_message.id}

    system_message = ConsultationMessage(
        session_id=session_id,
        sender="system",
        content=answer,
        context_data=query_result,
    )
    consultation.last_message_at = datetime.now(timezone.utc)
    db.add_all([system_message, consultation])
    db.commit()
    db.refresh(system_message)
    system_message.context_data = {
        **(system_message.context_data or {}),
        "rootSystemMessageId": system_message.id,
    }
    db.add(system_message)
    db.commit()
    db.refresh(system_message)

    return CreateMessageResponse(
        user_message=ConsultationMessageOut.model_validate(user_message),
        system_message=ConsultationMessageOut.model_validate(system_message),
    )
