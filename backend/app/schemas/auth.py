from datetime import datetime

from pydantic import EmailStr, Field

from backend.app.schemas.base import CamelModel


class AuthUser(CamelModel):
    id: int
    email: EmailStr
    phone: str | None = None
    name: str
    avatar: str
    created_at: datetime


class RegisterRequest(CamelModel):
    email: EmailStr
    phone: str | None = Field(default=None, min_length=6, max_length=30)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=2, max_length=120)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AuthResponse(CamelModel):
    token: str
    user: AuthUser
