import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.llm_client import complete_json

_REPO = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[4],
)
sys.path.insert(0, str(_REPO / "shared" / "python"))
from env_constants import OPENAI_API_KEY as ENV_OPENAI_API_KEY  # noqa: E402
from openai_env import is_openai_configured  # noqa: E402


def _require_openai() -> None:
    if not is_openai_configured():
        raise HTTPException(
            status_code=503,
            detail=f"{ENV_OPENAI_API_KEY} must be set before starting an LLM session.",
        )
from app.loader import load_evaluation_bundle
from app.prompts import build_assessment_prompt, build_turn_prompt
from app.store import LlmSession, initial_capability_states, store


def _merge_capability_states(
    session: LlmSession, updates: list[dict[str, Any]]
) -> None:
    for item in updates:
        cid = item.get("capability_id")
        if not cid:
            continue
        existing = session.capability_states.get(cid, {})
        existing.update({k: v for k, v in item.items() if v is not None})
        session.capability_states[cid] = existing


def _merge_facts(session: LlmSession, extracted: dict[str, Any]) -> None:
    for key, value in extracted.items():
        if value is not None and value != "":
            session.facts[key] = value
            session.confidence[key] = 0.85


def _progress(session: LlmSession) -> dict[str, int]:
    total = len(session.capability_states)
    done = sum(
        1
        for s in session.capability_states.values()
        if s.get("status") in ("sufficient", "insufficient")
    )
    return {"current": done, "total": total}


async def start_session(framework_id: str) -> dict[str, Any]:
    _require_openai()
    try:
        bundle = load_evaluation_bundle(service_id=framework_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Evaluation content not found for service_id={framework_id!r}. {exc}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid evaluation content for service_id={framework_id!r}. {exc}",
        ) from exc
    service_id = bundle["capabilities"]["service_id"]
    caps = bundle["capabilities"]["capabilities"]
    states = initial_capability_states(caps)

    session = store.create(
        framework_id=framework_id,
        service_id=service_id,
        evaluation_path=bundle["path"],
        initial_states=states,
    )

    prompt = build_turn_prompt(
        bundle=bundle,
        capability_states=session.capability_states,
        conversation=[],
        user_message=None,
        is_start=True,
    )
    result = await complete_json(prompt)

    reply = result.get("reply") or (
        "Hello. I'll assess your Information Security Strategy and Planning "
        "capabilities. To start: how is security strategy set today at your organization?"
    )
    _merge_capability_states(session, result.get("capability_updates", []))
    _merge_facts(session, result.get("extracted_facts", {}))
    session.completed = bool(result.get("completed", False))
    session.messages.append({"role": "assistant", "content": reply})
    session.updated_at = datetime.now(timezone.utc).isoformat()

    return {
        "session_id": session.session_id,
        "framework_id": session.framework_id,
        "service_id": session.service_id,
        "reply": reply,
        "completed": session.completed,
        "progress": _progress(session),
        "capability_states": session.capability_states,
    }


async def handle_message(session: LlmSession, user_message: str) -> dict[str, Any]:
    _require_openai()
    bundle = load_evaluation_bundle(service_id=session.service_id)
    session.messages.append({"role": "user", "content": user_message})

    prompt = build_turn_prompt(
        bundle=bundle,
        capability_states=session.capability_states,
        conversation=session.messages,
        user_message=user_message,
        is_start=False,
    )
    result = await complete_json(prompt)

    reply = result.get("reply") or "Could you tell me more about that?"
    _merge_capability_states(session, result.get("capability_updates", []))
    _merge_facts(session, result.get("extracted_facts", {}))
    session.completed = bool(result.get("completed", False))
    session.messages.append({"role": "assistant", "content": reply})
    session.updated_at = datetime.now(timezone.utc).isoformat()

    return {
        "session_id": session.session_id,
        "reply": reply,
        "completed": session.completed,
        "progress": _progress(session),
        "facts_preview": session.facts,
        "capability_states": session.capability_states,
        "active_capability_id": result.get("active_capability_id"),
    }


async def run_llm_assessment(session: LlmSession) -> dict[str, Any]:
    _require_openai()
    bundle = load_evaluation_bundle()
    prompt = build_assessment_prompt(
        bundle=bundle,
        capability_states=session.capability_states,
        facts=session.facts,
    )
    result = await complete_json(prompt)

    capability_results = result.get("capability_results", [])
    return {
        "session_id": session.session_id,
        "framework_id": session.framework_id,
        "service_id": session.service_id,
        "overall_score": result.get("overall_score", 0),
        "maturity_label": result.get("maturity_label", "Unknown"),
        "summary": result.get("summary", ""),
        "control_results": [
            {
                "control_id": item.get("capability_id"),
                "score": item.get("score", 0),
                "status": item.get("status", "unknown"),
                "evidence": item.get("evidence", ""),
                "recommendations": item.get("recommendations", []),
            }
            for item in capability_results
        ],
        "capability_states": session.capability_states,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

