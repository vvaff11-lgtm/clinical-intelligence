from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash, verify_password
from backend.app.db.session import get_db
from backend.app.models.user import User, UserProfile
from backend.app.schemas.auth import AuthResponse, AuthUser, LoginRequest, RegisterRequest
from backend.app.services.auth import build_avatar, get_current_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    conditions = [User.email == payload.email]
    if payload.phone:
        conditions.append(User.phone == payload.phone)

    existing_user = db.scalar(select(User).where(or_(*conditions)))
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or phone already registered")

    user = User(
        email=payload.email,
        phone=payload.phone,
        password_hash=get_password_hash(payload.password),
        name=payload.name,
        avatar=build_avatar(payload.name),
    )
    profile = UserProfile(
        user=user,
        allergies=[],
        chronic_conditions=[],
        privacy_settings={"shareHistory": False, "smartAlerts": True},
    )
    db.add_all([user, profile])
    db.commit()
    db.refresh(user)
    return AuthResponse(token=create_access_token(str(user.id)), user=AuthUser.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    return AuthResponse(token=create_access_token(str(user.id)), user=AuthUser.model_validate(user))


@router.get("/me", response_model=AuthUser)
def me(current_user: User = Depends(get_current_user)) -> AuthUser:
    return AuthUser.model_validate(current_user)
