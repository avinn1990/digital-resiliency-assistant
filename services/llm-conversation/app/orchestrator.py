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
from display_labels import humanize_capability_label, simplify_rubric_label  # noqa: E402
from openai_env import is_openai_configured  # noqa: E402


def _require_openai() -> None:
    if not is_openai_configured():
        raise HTTPException(
            status_code=503,
            detail=f"{ENV_OPENAI_API_KEY} must be set before starting an LLM session.",
        )
from app.loader import load_evaluation_bundle
from app.engagement import (
    build_capability_topic_progress,
    build_engagement_context,
    build_pause_reply,
    build_pillar_progress,
    build_resume_recap,
    detect_pause_intent,
)
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
    from app.progression import OPERATING_CONTEXT_KEY, merge_operating_context

    for key, value in extracted.items():
        if value is None or value == "":
            continue
        if key == OPERATING_CONTEXT_KEY and isinstance(value, dict):
            session.facts[key] = merge_operating_context(
                session.facts.get(key), value
            )
        else:
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


def _find_next_question(
    bundle: dict[str, Any],
    capability_id: str,
    capability_state: dict[str, Any] | None,
) -> dict[str, Any] | None:
    covered = set((capability_state or {}).get("reference_questions_covered") or [])
    for group in bundle["reference_questions"]["capability_questions"]:
        if group.get("capability_id") != capability_id:
            continue
        for question in group.get("questions", []):
            if question.get("id") not in covered:
                return question
    return None


def _infer_evaluation_focus(
    bundle: dict[str, Any],
    capability_id: str,
    capability_state: dict[str, Any] | None,
) -> str | None:
    question = _find_next_question(bundle, capability_id, capability_state)
    if question:
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
    active_capability_label: str | None = None,
    active_rubric_label: str | None = None,
) -> dict[str, str] | None:
    capability_id = active_capability_id or _infer_active_capability_id(session)
    if not capability_id:
        return None

    capability = _capability_lookup(bundle).get(capability_id, {})
    capability_state = session.capability_states.get(capability_id)
    next_question = _find_next_question(bundle, capability_id, capability_state)
    evaluation_focus = (
        active_evaluation_focus.strip()
        if isinstance(active_evaluation_focus, str) and active_evaluation_focus.strip()
        else _infer_evaluation_focus(bundle, capability_id, capability_state)
    )

    capability_name = humanize_capability_label(
        str(
            capability.get("name")
            or (capability_state or {}).get("name")
            or capability_id
        ),
        short_name=capability.get("short_name"),
    )
    if isinstance(active_capability_label, str) and active_capability_label.strip():
        capability_name = humanize_capability_label(active_capability_label.strip())

    rubric_label = simplify_rubric_label(
        evaluation_focus,
        next_question,
        llm_label=active_rubric_label,
    )

    focus: dict[str, str] = {
        "capability_id": capability_id,
        "capability_name": capability_name,
    }
    if rubric_label:
        focus["evaluation_focus"] = rubric_label
    return focus


def _session_response(
    bundle: dict[str, Any],
    session: LlmSession,
    *,
    reply: str,
    active_capability_id: str | None = None,
    active_evaluation_focus: str | None = None,
    active_capability_label: str | None = None,
    active_rubric_label: str | None = None,
    facts_preview: dict[str, Any] | None = None,
    resume_recap: str | None = None,
) -> dict[str, Any]:
    focus = _build_assessment_focus(
        bundle,
        session,
        active_capability_id=active_capability_id,
        active_evaluation_focus=active_evaluation_focus,
        active_capability_label=active_capability_label,
        active_rubric_label=active_rubric_label,
    )
    active_id = active_capability_id or (focus or {}).get("capability_id")
    engagement_context = build_engagement_context(bundle, session)
    payload: dict[str, Any] = {
        "session_id": session.session_id,
        "framework_id": session.framework_id,
        "service_id": session.service_id,
        "reply": reply,
        "completed": session.completed,
        "paused": session.paused,
        "progress": _progress(session),
        "capability_states": session.capability_states,
        "assessment_focus": focus,
        "engagement_context": engagement_context,
        "capability_topic_progress": build_capability_topic_progress(
            bundle, session.capability_states, active_id
        ),
        "pillar_progress": build_pillar_progress(
            bundle, session.capability_states, active_id
        ),
    }
    if facts_preview is not None:
        payload["facts_preview"] = facts_preview
    if active_capability_id:
        payload["active_capability_id"] = active_capability_id
    if resume_recap:
        payload["resume_recap"] = resume_recap
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
    focus = _build_assessment_focus(bundle, session)
    recap = build_resume_recap(bundle, session, focus)

    return _session_response(
        bundle,
        session,
        reply=last_assistant,
        resume_recap=recap,
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
        engagement_context=build_engagement_context(bundle, session),
        current_facts=session.facts,
    )
    result = await complete_json(prompt)

    service_name = bundle["capabilities"]["service_name"]
    reply = result.get("reply") or (
        f"Hello. I'll assess your {service_name} capabilities. "
        "To start: could you briefly describe how this works today in your organization?"
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
        active_capability_label=result.get("active_capability_label"),
        active_rubric_label=result.get("active_rubric_label"),
    )


async def handle_message(session: LlmSession, user_message: str) -> dict[str, Any]:
    _require_openai()
    bundle = load_evaluation_bundle(service_id=session.service_id)
    session.messages.append({"role": "user", "content": user_message})

    if detect_pause_intent(user_message):
        session.paused = True
        focus = _build_assessment_focus(bundle, session)
        reply = build_pause_reply(
            bundle["capabilities"]["service_name"],
            _progress(session),
            focus,
        )
        session.messages.append({"role": "assistant", "content": reply})
        session.updated_at = datetime.now(timezone.utc).isoformat()
        return _session_response(bundle, session, reply=reply)

    prompt = build_turn_prompt(
        bundle=bundle,
        capability_states=session.capability_states,
        conversation=session.messages,
        user_message=user_message,
        is_start=False,
        engagement_context=build_engagement_context(
            bundle, session, user_message=user_message
        ),
        current_facts=session.facts,
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
        active_capability_label=result.get("active_capability_label"),
        active_rubric_label=result.get("active_rubric_label"),
        facts_preview=session.facts,
    )


async def run_llm_assessment(session: LlmSession) -> dict[str, Any]:
    _require_openai()
    bundle = load_evaluation_bundle(service_id=session.service_id)
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

