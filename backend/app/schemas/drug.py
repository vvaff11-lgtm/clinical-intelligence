from backend.app.schemas.base import CamelModel


class DrugOut(CamelModel):
    id: int
    name: str
    scientific_name: str
    drug_type: str
    description: str
    image_url: str
    dosage: str
    packaging: str
    indications: list[str]
    ai_insight: str
