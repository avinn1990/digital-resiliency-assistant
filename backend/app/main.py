from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.clients.assessment import AssessmentClient
from app.clients.conversation import ConversationClient
from app.clients.framework import FrameworkClient
from app.config import settings

app = FastAPI(
    title="Digital Resiliency Assistant API",
    description="Gateway for conversation, framework, and assessment services",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conversation = ConversationClient(settings.conversation_service_url)
assessment = AssessmentClient(settings.assessment_service_url)
framework = FrameworkClient(settings.framework_service_url)


class StartSessionRequest(BaseModel):
    framework_id: str


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)


class RegisterFrameworkRequest(BaseModel):
    framework: dict


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "backend"}


@app.get("/frameworks")
async def list_frameworks() -> list[dict]:
    try:
        return await framework.list_frameworks()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/frameworks/{framework_id}")
async def get_framework(framework_id: str) -> dict:
    try:
        return await framework.get_framework(framework_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/frameworks")
async def register_framework(body: RegisterFrameworkRequest) -> dict:
    try:
        return await framework.register_framework(body.framework)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/sessions")
async def start_session(body: StartSessionRequest) -> dict:
    try:
        return await conversation.start_session(body.framework_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, body: SendMessageRequest) -> dict:
    try:
        return await conversation.send_message(session_id, body.message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/sessions/{session_id}/facts")
async def get_session_facts(session_id: str) -> dict:
    try:
        return await conversation.get_facts(session_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/sessions/{session_id}/assess")
async def run_assessment(session_id: str) -> dict:
    try:
        facts_payload = await conversation.get_facts(session_id)
        return await assessment.run_assessment(
            session_id=session_id,
            framework_id=facts_payload["framework_id"],
            facts=facts_payload.get("facts", {}),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
