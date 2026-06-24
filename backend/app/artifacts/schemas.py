from app.assessments.schemas import PendingArtifactBody, UploadedArtifactBody
from pydantic import BaseModel, Field


class ArtifactsListResponse(BaseModel):
    pendingArtifacts: list[PendingArtifactBody] = Field(default_factory=list)
    uploadedArtifacts: list[UploadedArtifactBody] = Field(default_factory=list)


class UploadArtifactResponse(BaseModel):
    artifact: UploadedArtifactBody
    pendingArtifacts: list[PendingArtifactBody] = Field(default_factory=list)
    uploadedArtifacts: list[UploadedArtifactBody] = Field(default_factory=list)


class CleanupResult(BaseModel):
    files_deleted: int = 0
    drafts_updated: int = 0
