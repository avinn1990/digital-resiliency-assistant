import re
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_EXTENSIONS = frozenset(
    {".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".txt"}
)
ALLOWED_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/png",
        "image/jpeg",
        "text/plain",
    }
)


def _upload_root() -> Path:
    root = Path(settings.artifacts_upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def assessment_upload_dir(assessment_id: str) -> Path:
    safe_id = re.sub(r"[^a-zA-Z0-9._-]", "_", assessment_id.strip())
    path = _upload_root() / "assessments" / safe_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def sanitize_filename(name: str) -> str:
    base = Path(name).name.strip()
    base = re.sub(r"[^\w.\- ]", "_", base)
    return base[:200] or "upload"


def validate_upload(file: UploadFile, size_bytes: int) -> None:
    if size_bytes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The file appears to be empty.",
        )
    if size_bytes > settings.artifact_max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File is too large. Maximum size is {settings.artifact_max_size_mb} MB.",
        )
    filename = sanitize_filename(file.filename or "")
    ext = Path(filename).suffix.lower()
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if ext not in ALLOWED_EXTENSIONS and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed: PDF, DOCX, XLSX, PNG, JPG, TXT.",
        )


def artifact_file_path(assessment_id: str, file_id: str) -> Path:
    safe_file_id = re.sub(r"[^a-zA-Z0-9._-]", "_", file_id.strip())
    return assessment_upload_dir(assessment_id) / safe_file_id


def delete_artifact_file(assessment_id: str, file_id: str) -> bool:
    path = artifact_file_path(assessment_id, file_id)
    if not path.is_file():
        return False
    path.unlink()
    _remove_empty_dirs(path.parent)
    return True


def _remove_empty_dirs(directory: Path) -> None:
    try:
        if directory.is_dir() and not any(directory.iterdir()):
            directory.rmdir()
            parent = directory.parent
            if parent.name == "assessments":
                return
            _remove_empty_dirs(parent)
    except OSError:
        return


def iter_assessment_upload_dirs() -> list[tuple[str, Path]]:
    root = _upload_root() / "assessments"
    if not root.is_dir():
        return []
    results: list[tuple[str, Path]] = []
    for child in root.iterdir():
        if child.is_dir():
            results.append((child.name, child))
    return results
