from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.drug import Drug
from backend.app.schemas.drug import DrugOut
from backend.app.schemas.response import PaginatedResponse


router = APIRouter(prefix="/drugs", tags=["drugs"])


@router.get("", response_model=PaginatedResponse[DrugOut])
def list_drugs(
    query: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
) -> PaginatedResponse[DrugOut]:
    statement = select(Drug)
    count_statement = select(func.count()).select_from(Drug)

    if query:
        pattern = f"%{query}%"
        filters = or_(Drug.name.like(pattern), Drug.scientific_name.like(pattern), Drug.description.like(pattern))
        statement = statement.where(filters)
        count_statement = count_statement.where(filters)

    items = db.scalars(statement.order_by(Drug.id.asc())).all()
    total = db.scalar(count_statement) or 0
    return PaginatedResponse[DrugOut](items=items, total=total)


@router.get("/{drug_id}", response_model=DrugOut)
def get_drug(drug_id: int, db: Session = Depends(get_db)) -> DrugOut:
    drug = db.get(Drug, drug_id)
    if not drug:
        raise HTTPException(status_code=404, detail="Drug not found")
    return DrugOut.model_validate(drug)
