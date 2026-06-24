from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.artifacts.schemas import CleanupResult
from app.artifacts.storage import artifact_file_path, delete_artifact_file
from app.assessments.schemas import AssessmentDraftBody
from app.assessments.service import utcnow, update_assessment
from app.config import settings
from app.db.models import AssessmentRecord

logger = logging.getLogger(__name__)

_cleanup_lock = False


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def _is_expired(uploaded_at: str | None, file_path: Path | None) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.artifact_retention_days)
    parsed = _parse_iso(uploaded_at)
    if parsed is not None:
        return parsed < cutoff
    if file_path is not None and file_path.is_file():
        mtime = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
        return mtime < cutoff
    return False


def _reopen_pending_for_file(pending: list[dict[str, Any]], file_id: str) -> None:
    for item in pending:
        if item.get("fileId") == file_id:
            item["status"] = "pending"
            item["fileId"] = None
            item["fulfilledAt"] = None


def _reopen_capability_pending(chat_state: dict[str, Any] | None, file_id: str) -> None:
    if not chat_state:
        return
    snapshots = chat_state.get("serviceSnapshots") or {}
    for snapshot in snapshots.values():
        capability_states = snapshot.get("capabilityStates") or {}
        for state in capability_states.values():
            pending = state.get("pending_artifacts")
            if isinstance(pending, list):
                _reopen_pending_for_file(pending, file_id)


def cleanup_expired_artifacts(db: Session) -> CleanupResult:
    global _cleanup_lock
    if _cleanup_lock:
        return CleanupResult()
    _cleanup_lock = True
    files_deleted = 0
    drafts_updated = 0

    try:
        rows = db.query(AssessmentRecord).all()
        for row in rows:
            draft = AssessmentDraftBody.model_validate(row.payload)
            pending_raw = list((row.payload or {}).get("pendingArtifacts") or [])
            uploaded_raw = list((row.payload or {}).get("uploadedArtifacts") or [])
            expired_ids: list[str] = []
            changed = False

            for item in uploaded_raw:
                file_id = item.get("id")
                if not file_id:
                    continue
                path = artifact_file_path(row.id, file_id)
                if _is_expired(item.get("uploadedAt"), path if path.exists() else None):
                    expired_ids.append(file_id)

            for file_id in expired_ids:
                if delete_artifact_file(row.id, file_id):
                    files_deleted += 1
                uploaded_raw = [item for item in uploaded_raw if item.get("id") != file_id]
                _reopen_pending_for_file(pending_raw, file_id)
                chat_state = draft.chatState
                if isinstance(chat_state, dict):
                    _reopen_capability_pending(chat_state, file_id)
                    draft = draft.model_copy(update={"chatState": chat_state})
                changed = True

            if changed:
                now = utcnow().isoformat()
                updated = draft.model_copy(
                    update={
                        "pendingArtifacts": pending_raw,
                        "uploadedArtifacts": uploaded_raw,
                        "updatedAt": now,
                    }
                )
                row.payload = updated.model_dump(mode="json")
                row.updated_at = utcnow()
                drafts_updated += 1

        if drafts_updated:
            db.commit()

        logger.info(
            "Artifact cleanup complete: files_deleted=%s drafts_updated=%s",
            files_deleted,
            drafts_updated,
        )
        return CleanupResult(files_deleted=files_deleted, drafts_updated=drafts_updated)
    finally:
        _cleanup_lock = False
