import os
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.scorer import run_assessment

app = FastAPI(
    title="Assessment Service",
    description="Evaluates extracted facts against a framework",
    version="0.1.0",
)

FRAMEWORK_SERVICE_URL = os.getenv(
    "FRAMEWORK_SERVICE_URL", "http://localhost:8003"
).rstrip("/")


class AssessmentRequest(BaseModel):
    session_id: str
    framework_id: str
    facts: dict = Field(default_factory=dict)


async def fetch_framework(framework_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{FRAMEWORK_SERVICE_URL}/frameworks/{framework_id}"
        )
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Framework not found")
    response.raise_for_status()
    return response.json()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "assessment"}


@app.post("/assessments")
async def create_assessment(body: AssessmentRequest) -> dict:
    framework = await fetch_framework(body.framework_id)
    result = run_assessment(framework, body.facts)
    result["session_id"] = body.session_id
    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    return result
