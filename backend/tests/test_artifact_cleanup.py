import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from app.artifacts.cleanup import cleanup_expired_artifacts
from app.artifacts.storage import artifact_file_path
from app.assessments.schemas import AssessmentDraftBody, UserProfileBody
from app.config import settings
from app.db.models import AssessmentRecord


def _sample_payload(uploaded_at: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "assessmentId": "assessment-1",
        "createdAt": now,
        "updatedAt": now,
        "ownerEmail": "user@example.com",
        "mode": "chat",
        "profile": {
            "username": "user",
            "fullName": "Test User",
            "company": "Acme",
            "role": "ciso",
        },
        "selectedServiceIds": ["issp"],
        "responsesByService": {},
        "chatState": None,
        "pendingArtifacts": [
            {
                "id": "pending-1",
                "serviceId": "issp",
                "capabilityId": "issp-01",
                "label": "Security policy",
                "reason": "needs_permission",
                "status": "fulfilled",
                "fileId": "file-1",
                "requestedAt": now,
                "fulfilledAt": uploaded_at,
            }
        ],
        "uploadedArtifacts": [
            {
                "id": "file-1",
                "fileName": "policy.pdf",
                "contentType": "application/pdf",
                "sizeBytes": 12,
                "serviceId": "issp",
                "capabilityId": "issp-01",
                "uploadedAt": uploaded_at,
                "expired": False,
            }
        ],
    }


class _FakeQuery:
    def __init__(self, rows: list[AssessmentRecord]) -> None:
        self._rows = rows

    def all(self) -> list[AssessmentRecord]:
        return self._rows


class _FakeSession:
    def __init__(self, rows: list[AssessmentRecord]) -> None:
        self._rows = rows
        self.committed = False

    def query(self, model: type[AssessmentRecord]) -> _FakeQuery:
        return _FakeQuery(self._rows)

    def commit(self) -> None:
        self.committed = True


class ArtifactCleanupTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.settings_patch = patch.object(settings, "artifacts_upload_dir", str(self.upload_dir))
        self.settings_patch.start()
        self.retention_patch = patch.object(settings, "artifact_retention_days", 7)
        self.retention_patch.start()

    def tearDown(self) -> None:
        self.settings_patch.stop()
        self.retention_patch.stop()
        self.temp_dir.cleanup()

    def test_cleanup_deletes_expired_files_and_reopens_pending(self) -> None:
        old_time = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
        row = AssessmentRecord(
            id="assessment-1",
            owner_email="user@example.com",
            payload=_sample_payload(old_time),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db = _FakeSession([row])
        path = artifact_file_path("assessment-1", "file-1")
        path.write_bytes(b"old-content")

        result = cleanup_expired_artifacts(db)
        self.assertEqual(result.files_deleted, 1)
        self.assertEqual(result.drafts_updated, 1)
        self.assertFalse(path.exists())
        self.assertTrue(db.committed)

        payload = AssessmentDraftBody.model_validate(row.payload)
        self.assertEqual(payload.uploadedArtifacts, [])
        self.assertEqual(payload.pendingArtifacts[0].status, "pending")
        self.assertIsNone(payload.pendingArtifacts[0].fileId)

    def test_cleanup_preserves_recent_files(self) -> None:
        recent_time = datetime.now(timezone.utc).isoformat()
        row = AssessmentRecord(
            id="assessment-2",
            owner_email="user@example.com",
            payload=_sample_payload(recent_time),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db = _FakeSession([row])
        path = artifact_file_path("assessment-2", "file-1")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"recent-content")

        result = cleanup_expired_artifacts(db)
        self.assertEqual(result.files_deleted, 0)
        self.assertEqual(result.drafts_updated, 0)
        self.assertTrue(path.exists())
        self.assertFalse(db.committed)


if __name__ == "__main__":
    unittest.main()
