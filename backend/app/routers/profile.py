from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.user import User, UserProfile
from backend.app.schemas.profile import ProfileOut, ProfileUpdate
from backend.app.services.auth import get_current_user


router = APIRouter(prefix="/profile", tags=["profile"])


def serialize_profile(user: User) -> ProfileOut:
    profile = user.profile or UserProfile(
        user_id=user.id,
        allergies=[],
        chronic_conditions=[],
        privacy_settings={"shareHistory": False, "smartAlerts": True},
    )
    return ProfileOut(
        id=user.id,
        email=user.email,
        phone=user.phone,
        name=user.name,
        avatar=user.avatar,
        age=profile.age,
        blood_type=profile.blood_type,
        height=profile.height,
        address=profile.address,
        allergies=profile.allergies or [],
        chronic_conditions=profile.chronic_conditions or [],
        privacy_settings=profile.privacy_settings or {},
    )


@router.get("", response_model=ProfileOut)
def get_profile(current_user: User = Depends(get_current_user)) -> ProfileOut:
    return serialize_profile(current_user)


@router.put("", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileOut:
    profile = current_user.profile
    if profile is None:
        profile = UserProfile(
            user_id=current_user.id,
            allergies=[],
            chronic_conditions=[],
            privacy_settings={"shareHistory": False, "smartAlerts": True},
        )
        db.add(profile)

    for field in ["name", "phone", "avatar"]:
        value = getattr(payload, field)
        if value is not None:
            setattr(current_user, field, value)

    for field in ["age", "blood_type", "height", "address", "allergies", "chronic_conditions", "privacy_settings"]:
        value = getattr(payload, field)
        if value is not None:
            setattr(profile, field, value)

    db.add_all([current_user, profile])
    db.commit()
    db.refresh(current_user)
    return serialize_profile(current_user)
