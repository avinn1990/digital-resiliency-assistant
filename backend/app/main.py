from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.clients.assessment import AssessmentClient
from app.clients.conversation import ConversationClient
from app.clients.framework import FrameworkClient
from app.clients.llm_conversation import LLM_FRAMEWORK_IDS, LlmConversationClient
from app.config import (
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
    is_openai_configured,
    settings,
)
from app.evaluation_loader import list_evaluation_services, load_evaluation_service_bundle
from app.session_registry import is_llm_session, register_llm_session

app = FastAPI(
    title="Digital Resiliency Assistant API",
    description="Gateway for conversation, framework, and assessment services",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

conversation = ConversationClient(settings.conversation_service_url)
llm_conversation = LlmConversationClient(settings.llm_conversation_service_url)
assessment = AssessmentClient(settings.assessment_service_url)
framework = FrameworkClient(settings.framework_service_url)


def _uses_llm(framework_id: str) -> bool:
    return framework_id in LLM_FRAMEWORK_IDS


class StartSessionRequest(BaseModel):
    framework_id: str


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)


class RegisterFrameworkRequest(BaseModel):
    framework: dict


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "backend",
        "openai_configured": is_openai_configured(),
        "env": {
            OPENAI_API_KEY: "set" if is_openai_configured() else "missing",
            OPENAI_MODEL: OPENAI_MODEL,
            OPENAI_BASE_URL: OPENAI_BASE_URL or "default",
        },
    }


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


@app.get("/evaluation-services")
async def list_eval_services() -> list[dict]:
    return list_evaluation_services()


@app.get("/evaluation-services/{service_id}/content")
async def get_evaluation_content(service_id: str) -> dict:
    bundle = load_evaluation_service_bundle(service_id)
    if bundle:
        return bundle

    # Backwards-compatible fallback: proxy LLM service content (older deployments)
    if service_id not in LLM_FRAMEWORK_IDS:
        raise HTTPException(status_code=404, detail="Evaluation service not found")
    try:
        response = await llm_conversation.get("/evaluation-content")
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/sessions")
async def start_session(body: StartSessionRequest) -> dict:
    try:
        if _uses_llm(body.framework_id):
            result = await llm_conversation.start_session(body.framework_id)
            register_llm_session(result["session_id"])
            return result
        return await conversation.start_session(body.framework_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, body: SendMessageRequest) -> dict:
    try:
        if is_llm_session(session_id):
            return await llm_conversation.send_message(session_id, body.message)
        return await conversation.send_message(session_id, body.message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/sessions/{session_id}/facts")
async def get_session_facts(session_id: str) -> dict:
    try:
        if is_llm_session(session_id):
            return await llm_conversation.get_facts(session_id)
        return await conversation.get_facts(session_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/sessions/{session_id}/assess")
async def run_assessment(session_id: str) -> dict:
    try:
        if is_llm_session(session_id):
            return await llm_conversation.run_assessment(session_id)
        facts_payload = await conversation.get_facts(session_id)
        return await assessment.run_assessment(
            session_id=session_id,
            framework_id=facts_payload["framework_id"],
            facts=facts_payload.get("facts", {}),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
