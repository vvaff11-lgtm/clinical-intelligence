from backend.app.schemas.base import CamelModel


class ProfileOut(CamelModel):
    id: int
    email: str
    phone: str | None
    name: str
    avatar: str
    age: int | None
    blood_type: str | None
    height: str | None
    address: str | None
    allergies: list[str]
    chronic_conditions: list[str]
    privacy_settings: dict


class ProfileUpdate(CamelModel):
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    age: int | None = None
    blood_type: str | None = None
    height: str | None = None
    address: str | None = None
    allergies: list[str] | None = None
    chronic_conditions: list[str] | None = None
    privacy_settings: dict | None = None
