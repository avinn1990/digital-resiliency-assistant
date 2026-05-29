from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.assessments.schemas import UserOnboardingProfile
from app.assessments.service import get_user_profile, save_user_profile
from app.auth.deps import require_authenticated_user
from app.auth.models import AuthUser
from app.db.session import get_db

router = APIRouter()


@router.get("/me/profile", response_model=UserOnboardingProfile | None)
def read_my_profile(
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserOnboardingProfile | None:
    row = get_user_profile(db, user.email)
    if row is None:
        return None
    return UserOnboardingProfile(company=row.company, role=row.role)


@router.put("/me/profile", response_model=UserOnboardingProfile)
def write_my_profile(
    body: UserOnboardingProfile,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserOnboardingProfile:
    row = save_user_profile(db, user.email, body)
    return UserOnboardingProfile(company=row.company, role=row.role)
