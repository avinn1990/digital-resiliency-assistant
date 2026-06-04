import sys
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

_REPO_ROOT = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[3],
)
sys.path.insert(0, str(_REPO_ROOT / "shared" / "python"))
from role_registry import resolve_role_id  # noqa: E402

from app.assessments.schemas import UserOnboardingProfile
from app.assessments.service import delete_user_profile, get_user_profile, save_user_profile
from app.auth.deps import require_authenticated_user
from app.auth.models import AuthUser
from app.db.session import get_db

router = APIRouter()


def _profile_from_row(row) -> UserOnboardingProfile:
    role = resolve_role_id(row.role) or row.role
    return UserOnboardingProfile(company=row.company, role=role)


@router.get("/me/profile", response_model=UserOnboardingProfile | None)
def read_my_profile(
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserOnboardingProfile | None:
    row = get_user_profile(db, user.email)
    if row is None:
        return None
    return _profile_from_row(row)


@router.put("/me/profile", response_model=UserOnboardingProfile)
def write_my_profile(
    body: UserOnboardingProfile,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserOnboardingProfile:
    row = save_user_profile(db, user.email, body)
    return _profile_from_row(row)


@router.delete("/me/profile", status_code=204)
def remove_my_profile(
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    delete_user_profile(db, user.email)
