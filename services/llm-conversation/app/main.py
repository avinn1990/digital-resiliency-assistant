from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import sys
from pathlib import Path

from app.config import settings

_REPO = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[3],
)
sys.path.insert(0, str(_REPO / "shared" / "python"))
from env_constants import (  # noqa: E402
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
)
from openai_env import is_openai_configured  # noqa: E402
from app.orchestrator import handle_message, run_llm_assessment, start_session
from app.store import store

app = FastAPI(
    title="LLM Conversation Service",
    description="Dynamic capability assessment using LLM and evaluation-service content",
    version="0.1.0",
)

LLM_FRAMEWORK_IDS = {
    "information-security-strategy-planning",
}


class StartSessionBody(BaseModel):
    framework_id: str = Field(default=settings.default_service_id)


class MessageBody(BaseModel):
    message: str = Field(..., min_length=1)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "llm-conversation",
        "llm_configured": is_openai_configured(),
        "env": {
            "OPENAI_API_KEY": "set" if is_openai_configured() else "missing",
            "OPENAI_MODEL": OPENAI_MODEL,
            "OPENAI_BASE_URL": OPENAI_BASE_URL or "default",
        },
        "evaluation_dir": str(settings.evaluation_dir()),
    }


@app.get("/evaluation-content")
async def get_evaluation_content() -> dict:
    from app.loader import load_evaluation_bundle

    bundle = load_evaluation_bundle()
    return {
        "service_id": bundle["capabilities"]["service_id"],
        "service_name": bundle["capabilities"]["service_name"],
        "capabilities": bundle["capabilities"]["capabilities"],
        "reference_questions_by_capability": bundle["reference_questions"][
            "capability_questions"
        ],
        "reference_questions": bundle["reference_questions_flat"],
        "path": bundle["path"],
    }


@app.post("/sessions")
async def create_session(body: StartSessionBody) -> dict:
    if body.framework_id not in LLM_FRAMEWORK_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Framework {body.framework_id} is not configured for LLM evaluation.",
        )
    return await start_session(body.framework_id)


@app.post("/sessions/{session_id}/messages")
async def post_message(session_id: str, body: MessageBody) -> dict:
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return await handle_message(session, body.message)


@app.get("/sessions/{session_id}/facts")
async def get_facts(session_id: str) -> dict:
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "framework_id": session.framework_id,
        "service_id": session.service_id,
        "facts": session.facts,
        "confidence": session.confidence,
        "capability_states": session.capability_states,
        "updated_at": session.updated_at,
    }


@app.post("/sessions/{session_id}/assess")
async def assess_session(session_id: str) -> dict:
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return await run_llm_assessment(session)
