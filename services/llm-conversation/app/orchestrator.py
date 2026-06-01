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
from app.progression import (
    all_capabilities_resolved,
    enforce_follow_up_limits,
    merge_capability_state_update,
)
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
        session.capability_states[cid] = merge_capability_state_update(existing, item)


def _apply_progression_rules(session: LlmSession) -> None:
    enforce_follow_up_limits(session.capability_states)
    if all_capabilities_resolved(session.capability_states):
        session.completed = True


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


def _capability_lookup(bundle: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        cap["id"]: cap
        for cap in bundle["capabilities"]["capabilities"]
    }


def _infer_active_capability_id(session: LlmSession) -> str | None:
    for capability_id, state in session.capability_states.items():
        if state.get("status") == "exploring":
            return capability_id
    for capability_id, state in session.capability_states.items():
        if state.get("status") not in ("sufficient", "insufficient"):
            return capability_id
    return None


def _infer_evaluation_focus(
    bundle: dict[str, Any],
    capability_id: str,
    capability_state: dict[str, Any] | None,
) -> str | None:
    covered = set((capability_state or {}).get("reference_questions_covered") or [])
    for group in bundle["reference_questions"]["capability_questions"]:
        if group.get("capability_id") != capability_id:
            continue
        for question in group.get("questions", []):
            if question.get("id") not in covered:
                focus = question.get("evaluation_focus")
                if isinstance(focus, str) and focus.strip():
                    return focus.strip()
    capability = _capability_lookup(bundle).get(capability_id, {})
    focuses = capability.get("evaluation_focus") or []
    if focuses and isinstance(focuses[0], str):
        return focuses[0].strip()
    return None


def _build_assessment_focus(
    bundle: dict[str, Any],
    session: LlmSession,
    *,
    active_capability_id: str | None = None,
    active_evaluation_focus: str | None = None,
) -> dict[str, str] | None:
    capability_id = active_capability_id or _infer_active_capability_id(session)
    if not capability_id:
        return None

    capability = _capability_lookup(bundle).get(capability_id, {})
    capability_name = (
        capability.get("name")
        or session.capability_states.get(capability_id, {}).get("name")
        or capability_id
    )
    evaluation_focus = (
        active_evaluation_focus.strip()
        if isinstance(active_evaluation_focus, str) and active_evaluation_focus.strip()
        else _infer_evaluation_focus(
            bundle,
            capability_id,
            session.capability_states.get(capability_id),
        )
    )

    focus: dict[str, str] = {
        "capability_id": capability_id,
        "capability_name": str(capability_name),
    }
    if evaluation_focus:
        focus["evaluation_focus"] = evaluation_focus
    return focus


def _session_response(
    bundle: dict[str, Any],
    session: LlmSession,
    *,
    reply: str,
    active_capability_id: str | None = None,
    active_evaluation_focus: str | None = None,
    facts_preview: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "session_id": session.session_id,
        "framework_id": session.framework_id,
        "service_id": session.service_id,
        "reply": reply,
        "completed": session.completed,
        "progress": _progress(session),
        "capability_states": session.capability_states,
        "assessment_focus": _build_assessment_focus(
            bundle,
            session,
            active_capability_id=active_capability_id,
            active_evaluation_focus=active_evaluation_focus,
        ),
    }
    if facts_preview is not None:
        payload["facts_preview"] = facts_preview
    if active_capability_id:
        payload["active_capability_id"] = active_capability_id
    return payload


async def restore_session(framework_id: str, snapshot: dict[str, Any]) -> dict[str, Any]:
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
    default_states = initial_capability_states(caps)
    capability_states = snapshot.get("capability_states") or default_states
    facts = snapshot.get("facts") or {}
    messages = snapshot.get("messages") or []
    completed = bool(snapshot.get("completed", False))

    session = store.create_restored(
        framework_id=framework_id,
        service_id=service_id,
        evaluation_path=bundle["path"],
        capability_states=capability_states,
        facts=facts,
        messages=messages,
        completed=completed,
    )
    _apply_progression_rules(session)
    session.updated_at = datetime.now(timezone.utc).isoformat()

    last_assistant = next(
        (message["content"] for message in reversed(messages) if message.get("role") == "assistant"),
        "",
    )

    return _session_response(
        bundle,
        session,
        reply=last_assistant,
    )


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
    _apply_progression_rules(session)
    session.completed = bool(result.get("completed", False)) or session.completed
    session.messages.append({"role": "assistant", "content": reply})
    session.updated_at = datetime.now(timezone.utc).isoformat()

    return _session_response(
        bundle,
        session,
        reply=reply,
        active_capability_id=result.get("active_capability_id"),
        active_evaluation_focus=result.get("active_evaluation_focus"),
    )


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
    _apply_progression_rules(session)
    session.completed = bool(result.get("completed", False)) or session.completed
    session.messages.append({"role": "assistant", "content": reply})
    session.updated_at = datetime.now(timezone.utc).isoformat()

    return _session_response(
        bundle,
        session,
        reply=reply,
        active_capability_id=result.get("active_capability_id"),
        active_evaluation_focus=result.get("active_evaluation_focus"),
        facts_preview=session.facts,
    )


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

