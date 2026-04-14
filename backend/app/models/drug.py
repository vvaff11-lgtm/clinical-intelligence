from datetime import datetime

from sqlalchemy import DateTime, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base_class import Base


class Drug(Base):
    __tablename__ = "drugs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    scientific_name: Mapped[str] = mapped_column(String(255), nullable=False)
    drug_type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    dosage: Mapped[str] = mapped_column(String(120), nullable=False)
    packaging: Mapped[str] = mapped_column(String(120), nullable=False)
    indications: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    ai_insight: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
