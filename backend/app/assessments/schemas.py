from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class UserProfileBody(BaseModel):
    username: str
    fullName: str
    company: str
    role: str


class UserOnboardingProfile(BaseModel):
    company: str = Field(..., min_length=2)
    role: str = Field(..., min_length=2)


class PendingArtifactBody(BaseModel):
    id: str
    serviceId: str
    capabilityId: str
    label: str
    reason: Literal["not_available", "needs_permission", "will_provide_later"]
    notes: str | None = None
    status: Literal["pending", "fulfilled"] = "pending"
    fileId: str | None = None
    requestedAt: str
    fulfilledAt: str | None = None


class UploadedArtifactBody(BaseModel):
    id: str
    fileName: str
    contentType: str
    sizeBytes: int
    serviceId: str | None = None
    capabilityId: str | None = None
    uploadedAt: str
    expired: bool = False


class AssessmentDraftBody(BaseModel):
    assessmentId: str
    createdAt: str
    updatedAt: str
    ownerEmail: EmailStr | None = None
    mode: Literal["questionnaire", "chat"] = "questionnaire"
    profile: UserProfileBody
    selectedServiceIds: list[str]
    currentServiceId: str | None = None
    responsesByService: dict[str, dict[str, Any]] = Field(default_factory=dict)
    chatState: dict[str, Any] | None = None
    pendingArtifacts: list[PendingArtifactBody] = Field(default_factory=list)
    uploadedArtifacts: list[UploadedArtifactBody] = Field(default_factory=list)


class AssessmentSummaryResponse(BaseModel):
    assessmentId: str
    updatedAt: str
    company: str
    username: str
    role: str
    ownerEmail: EmailStr | None = None
    mode: Literal["questionnaire", "chat"] = "questionnaire"
    status: Literal["pending", "completed"]
    servicesDone: int
    servicesTotal: int
    pendingArtifactsCount: int = 0
