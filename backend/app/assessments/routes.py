from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.artifacts.routes import router as artifacts_router
from app.assessments.schemas import AssessmentDraftBody, AssessmentSummaryResponse
from app.assessments.service import (
    create_assessment,
    delete_assessment,
    get_assessment,
    list_assessments,
    update_assessment,
)
from app.auth.deps import require_authenticated_user
from app.auth.models import AuthUser
from app.db.session import get_db

router = APIRouter()
router.include_router(artifacts_router)


@router.get("", response_model=list[AssessmentSummaryResponse])
def list_user_assessments(
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AssessmentSummaryResponse]:
    return list_assessments(db, user.email)


@router.get("/{assessment_id}", response_model=AssessmentDraftBody)
def get_user_assessment(
    assessment_id: str,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AssessmentDraftBody:
    row = get_assessment(db, user.email, assessment_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return AssessmentDraftBody.model_validate(row.payload)


@router.post("", response_model=AssessmentDraftBody, status_code=status.HTTP_201_CREATED)
def create_user_assessment(
    body: AssessmentDraftBody,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AssessmentDraftBody:
    if body.assessmentId != body.assessmentId.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assessment id")
    existing = get_assessment(db, user.email, body.assessmentId)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assessment already exists")
    row = create_assessment(db, user.email, body)
    return AssessmentDraftBody.model_validate(row.payload)


@router.put("/{assessment_id}", response_model=AssessmentDraftBody)
def update_user_assessment(
    assessment_id: str,
    body: AssessmentDraftBody,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AssessmentDraftBody:
    if body.assessmentId != assessment_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment id mismatch")
    row = update_assessment(db, user.email, assessment_id, body)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return AssessmentDraftBody.model_validate(row.payload)


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_assessment(
    assessment_id: str,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    deleted = delete_assessment(db, user.email, assessment_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
