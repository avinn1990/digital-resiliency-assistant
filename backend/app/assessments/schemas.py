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


class AssessmentDraftBody(BaseModel):
    assessmentId: str
    createdAt: str
    updatedAt: str
    ownerEmail: EmailStr | None = None
    profile: UserProfileBody
    selectedServiceIds: list[str]
    currentServiceId: str | None = None
    responsesByService: dict[str, dict[str, Any]] = Field(default_factory=dict)


class AssessmentSummaryResponse(BaseModel):
    assessmentId: str
    updatedAt: str
    company: str
    username: str
    role: str
    ownerEmail: EmailStr | None = None
    status: Literal["pending", "completed"]
    servicesDone: int
    servicesTotal: int
