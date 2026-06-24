from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.artifacts.schemas import (
    ArtifactsListResponse,
    PendingArtifactBody,
    UploadArtifactResponse,
    UploadedArtifactBody,
)
from app.artifacts.storage import (
    artifact_file_path,
    delete_artifact_file,
    sanitize_filename,
    validate_upload,
)
from app.assessments.schemas import AssessmentDraftBody
from app.assessments.service import get_assessment, update_assessment


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_pending(raw: dict[str, Any]) -> PendingArtifactBody:
    return PendingArtifactBody.model_validate(raw)


def _parse_uploaded(raw: dict[str, Any]) -> UploadedArtifactBody:
    return UploadedArtifactBody.model_validate(raw)


def _draft_lists(draft: AssessmentDraftBody) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    payload = draft.model_dump(mode="json")
    pending = list(payload.get("pendingArtifacts") or [])
    uploaded = list(payload.get("uploadedArtifacts") or [])
    return pending, uploaded


def _save_draft_lists(
    draft: AssessmentDraftBody,
    pending: list[dict[str, Any]],
    uploaded: list[dict[str, Any]],
) -> AssessmentDraftBody:
    now = utcnow_iso()
    return draft.model_copy(
        update={
            "pendingArtifacts": pending,
            "uploadedArtifacts": uploaded,
            "updatedAt": now,
        }
    )


def list_artifacts(db: Session, owner_email: str, assessment_id: str) -> ArtifactsListResponse:
    row = get_assessment(db, owner_email, assessment_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    draft = AssessmentDraftBody.model_validate(row.payload)
    pending_raw, uploaded_raw = _draft_lists(draft)
    return ArtifactsListResponse(
        pendingArtifacts=[_parse_pending(item) for item in pending_raw],
        uploadedArtifacts=[_parse_uploaded(item) for item in uploaded_raw],
    )


def upload_artifact(
    db: Session,
    owner_email: str,
    assessment_id: str,
    file: UploadFile,
    *,
    service_id: str | None = None,
    capability_id: str | None = None,
    pending_artifact_id: str | None = None,
) -> UploadArtifactResponse:
    row = get_assessment(db, owner_email, assessment_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    content = file.file.read()
    validate_upload(file, len(content))

    file_id = str(uuid.uuid4())
    file_name = sanitize_filename(file.filename or "upload")
    content_type = (file.content_type or "application/octet-stream").split(";")[0].strip()
    uploaded_at = utcnow_iso()

    path = artifact_file_path(assessment_id, file_id)
    path.write_bytes(content)

    draft = AssessmentDraftBody.model_validate(row.payload)
    pending_raw, uploaded_raw = _draft_lists(draft)

    artifact_entry: dict[str, Any] = {
        "id": file_id,
        "fileName": file_name,
        "contentType": content_type,
        "sizeBytes": len(content),
        "serviceId": service_id,
        "capabilityId": capability_id,
        "uploadedAt": uploaded_at,
        "expired": False,
    }
    uploaded_raw.append(artifact_entry)

    if pending_artifact_id:
        for item in pending_raw:
            if item.get("id") == pending_artifact_id:
                item["status"] = "fulfilled"
                item["fileId"] = file_id
                item["fulfilledAt"] = uploaded_at
                break
    elif capability_id and service_id:
        for item in pending_raw:
            if (
                item.get("status") == "pending"
                and item.get("capabilityId") == capability_id
                and item.get("serviceId") == service_id
            ):
                item["status"] = "fulfilled"
                item["fileId"] = file_id
                item["fulfilledAt"] = uploaded_at
                break

    updated = _save_draft_lists(draft, pending_raw, uploaded_raw)
    update_assessment(db, owner_email, assessment_id, updated)

    return UploadArtifactResponse(
        artifact=_parse_uploaded(artifact_entry),
        pendingArtifacts=[_parse_pending(item) for item in pending_raw],
        uploadedArtifacts=[_parse_uploaded(item) for item in uploaded_raw],
    )


def get_artifact_file_path(db: Session, owner_email: str, assessment_id: str, file_id: str):
    row = get_assessment(db, owner_email, assessment_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    draft = AssessmentDraftBody.model_validate(row.payload)
    _, uploaded_raw = _draft_lists(draft)
    meta = next((item for item in uploaded_raw if item.get("id") == file_id), None)
    if meta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if meta.get("expired"):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This file was removed after 7 days. Please upload it again.",
        )

    path = artifact_file_path(assessment_id, file_id)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This file was removed after 7 days. Please upload it again.",
        )

    return path, meta


def delete_artifact(db: Session, owner_email: str, assessment_id: str, file_id: str) -> None:
    row = get_assessment(db, owner_email, assessment_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    draft = AssessmentDraftBody.model_validate(row.payload)
    pending_raw, uploaded_raw = _draft_lists(draft)
    uploaded_raw = [item for item in uploaded_raw if item.get("id") != file_id]

    for item in pending_raw:
        if item.get("fileId") == file_id:
            item["status"] = "pending"
            item["fileId"] = None
            item["fulfilledAt"] = None

    delete_artifact_file(assessment_id, file_id)
    updated = _save_draft_lists(draft, pending_raw, uploaded_raw)
    update_assessment(db, owner_email, assessment_id, updated)
