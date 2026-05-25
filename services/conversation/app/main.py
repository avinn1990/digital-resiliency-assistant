from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.extractor import extract_from_message
from app.framework_loader import load_framework_questions
from app.store import store

app = FastAPI(
    title="Conversation Service",
    description="Asks questions and extracts structured facts from user messages",
    version="0.1.0",
)


class StartSessionBody(BaseModel):
    framework_id: str


class MessageBody(BaseModel):
    message: str = Field(..., min_length=1)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "conversation"}


@app.post("/sessions")
async def start_session(body: StartSessionBody) -> dict:
    session = store.create(body.framework_id)
    questions = load_framework_questions(body.framework_id)
    first_prompt = (
        questions[0]["prompt"]
        if questions
        else "Tell me about your organization's digital resiliency posture."
    )
    reply = (
        "Welcome. I'll ask a few questions to build your assessment. "
        f"First: {first_prompt}"
    )
    session.messages.append({"role": "assistant", "content": reply})
    return {
        "session_id": session.session_id,
        "framework_id": session.framework_id,
        "reply": reply,
        "progress": {"current": 0, "total": len(questions)},
    }


@app.post("/sessions/{session_id}/messages")
async def handle_message(session_id: str, body: MessageBody) -> dict:
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = load_framework_questions(session.framework_id)
    session.messages.append({"role": "user", "content": body.message})

    if session.question_index < len(questions):
        current = questions[session.question_index]
        value, conf = extract_from_message(
            body.message,
            current["field_key"],
            current.get("response_type", "text"),
        )
        if value is not None:
            session.facts[current["field_key"]] = value
            session.confidence[current["field_key"]] = conf
        session.question_index += 1
        session.updated_at = datetime.now(timezone.utc).isoformat()

    if session.question_index < len(questions):
        next_q = questions[session.question_index]
        reply = f"Thanks. Next: {next_q['prompt']}"
        session.completed = False
    else:
        session.completed = True
        reply = (
            "Thank you — I have enough information for an assessment. "
            "You can request an assessment when ready."
        )

    session.messages.append({"role": "assistant", "content": reply})
    return {
        "session_id": session.session_id,
        "reply": reply,
        "completed": session.completed,
        "progress": {
            "current": min(session.question_index, len(questions)),
            "total": len(questions),
        },
        "facts_preview": session.facts,
    }


@app.get("/sessions/{session_id}/facts")
async def get_facts(session_id: str) -> dict:
    session = store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "framework_id": session.framework_id,
        "facts": session.facts,
        "confidence": session.confidence,
        "updated_at": session.updated_at,
    }
