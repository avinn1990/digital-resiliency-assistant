from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.assessments.schemas import (
    AssessmentDraftBody,
    AssessmentSummaryResponse,
    UserOnboardingProfile,
)
from app.db.models import AssessmentRecord, UserProfileRecord


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def get_draft_status(draft: AssessmentDraftBody) -> str:
    if not draft.selectedServiceIds:
        return "pending"
    all_done = all(
        bool((draft.responsesByService.get(service_id) or {}).get("answeredAt"))
        for service_id in draft.selectedServiceIds
    )
    return "completed" if all_done else "pending"


def get_draft_progress(draft: AssessmentDraftBody) -> tuple[int, int]:
    services_total = len(draft.selectedServiceIds)
    services_done = sum(
        1
        for service_id in draft.selectedServiceIds
        if (draft.responsesByService.get(service_id) or {}).get("answeredAt")
    )
    return services_done, services_total


def draft_to_summary(record: AssessmentRecord) -> AssessmentSummaryResponse:
    draft = AssessmentDraftBody.model_validate(record.payload)
    services_done, services_total = get_draft_progress(draft)
    return AssessmentSummaryResponse(
        assessmentId=draft.assessmentId,
        updatedAt=draft.updatedAt,
        company=draft.profile.company,
        username=draft.profile.username,
        role=draft.profile.role,
        ownerEmail=draft.ownerEmail,
        status=get_draft_status(draft),
        servicesDone=services_done,
        servicesTotal=services_total,
    )


def get_user_profile(db: Session, email: str) -> UserProfileRecord | None:
    return db.get(UserProfileRecord, _normalize_email(email))


def delete_user_profile(db: Session, email: str) -> bool:
    row = get_user_profile(db, email)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def save_user_profile(db: Session, email: str, profile: UserOnboardingProfile) -> UserProfileRecord:
    normalized = _normalize_email(email)
    existing = db.get(UserProfileRecord, normalized)
    if existing:
        existing.company = profile.company.strip()
        existing.role = profile.role.strip()
        existing.updated_at = utcnow()
        row = existing
    else:
        row = UserProfileRecord(
            email=normalized,
            company=profile.company.strip(),
            role=profile.role.strip(),
            updated_at=utcnow(),
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_assessments(db: Session, owner_email: str) -> list[AssessmentSummaryResponse]:
    normalized = _normalize_email(owner_email)
    rows = (
        db.query(AssessmentRecord)
        .filter(AssessmentRecord.owner_email == normalized)
        .order_by(AssessmentRecord.updated_at.desc())
        .limit(100)
        .all()
    )
    return [draft_to_summary(row) for row in rows]


def get_assessment(db: Session, owner_email: str, assessment_id: str) -> AssessmentRecord | None:
    normalized = _normalize_email(owner_email)
    return (
        db.query(AssessmentRecord)
        .filter(
            AssessmentRecord.id == assessment_id,
            AssessmentRecord.owner_email == normalized,
        )
        .one_or_none()
    )


def create_assessment(
    db: Session, owner_email: str, draft: AssessmentDraftBody
) -> AssessmentRecord:
    normalized = _normalize_email(owner_email)
    draft = draft.model_copy(update={"ownerEmail": normalized})
    now = utcnow()
    row = AssessmentRecord(
        id=draft.assessmentId,
        owner_email=normalized,
        payload=draft.model_dump(mode="json"),
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_assessment(
    db: Session, owner_email: str, assessment_id: str, draft: AssessmentDraftBody
) -> AssessmentRecord | None:
    row = get_assessment(db, owner_email, assessment_id)
    if row is None:
        return None
    draft = draft.model_copy(update={"ownerEmail": _normalize_email(owner_email)})
    row.payload = draft.model_dump(mode="json")
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return row


def delete_assessment(db: Session, owner_email: str, assessment_id: str) -> bool:
    row = get_assessment(db, owner_email, assessment_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
