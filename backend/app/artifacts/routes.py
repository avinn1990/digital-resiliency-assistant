from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.artifacts.schemas import ArtifactsListResponse, CleanupResult, UploadArtifactResponse
from app.artifacts.service import delete_artifact, get_artifact_file_path, list_artifacts, upload_artifact
from app.auth.deps import require_authenticated_user
from app.auth.models import AuthUser
from app.db.session import get_db

router = APIRouter()


@router.get("/{assessment_id}/artifacts", response_model=ArtifactsListResponse)
def get_assessment_artifacts(
    assessment_id: str,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ArtifactsListResponse:
    return list_artifacts(db, user.email, assessment_id)


@router.post(
    "/{assessment_id}/artifacts",
    response_model=UploadArtifactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_assessment_artifact(
    assessment_id: str,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    service_id: str | None = Form(default=None),
    capability_id: str | None = Form(default=None),
    pending_artifact_id: str | None = Form(default=None),
) -> UploadArtifactResponse:
    return upload_artifact(
        db,
        user.email,
        assessment_id,
        file,
        service_id=service_id,
        capability_id=capability_id,
        pending_artifact_id=pending_artifact_id,
    )


@router.get("/{assessment_id}/artifacts/{file_id}")
def download_assessment_artifact(
    assessment_id: str,
    file_id: str,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> FileResponse:
    path, meta = get_artifact_file_path(db, user.email, assessment_id, file_id)
    return FileResponse(
        path,
        media_type=meta.get("contentType") or "application/octet-stream",
        filename=meta.get("fileName") or file_id,
    )


@router.delete("/{assessment_id}/artifacts/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_assessment_artifact(
    assessment_id: str,
    file_id: str,
    user: Annotated[AuthUser, Depends(require_authenticated_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    delete_artifact(db, user.email, assessment_id, file_id)
