"""Engagement context, pause intent, and pacing helpers for LLM interviews."""

from __future__ import annotations

import re
from typing import Any

PAUSE_INTENT_PATTERN = re.compile(
    r"\b("
    r"take\s+a?\s*break|"
    r"break\s+for\s+now|"
    r"stop\s+for\s+now|"
    r"continue\s+later|"
    r"save\s+my\s+place|"
    r"pick\s+up\s+later|"
    r"come\s+back\s+later|"
    r"(?:need\s+to\s+|want\s+to\s+|let'?s\s+)pause(?:\s+for\s+now|\s+here)?|"
    r"(?:need\s+to\s+|want\s+to\s+|let'?s\s+)stop(?:\s+for\s+now)?|"
    r"^pause\s*$"
    r")\b",
    re.IGNORECASE | re.MULTILINE,
)

CHECKPOINT_INTERVAL = 4
MIN_USER_MESSAGE_LENGTH_FOR_FATIGUE = 20
FATIGUE_TURN_WINDOW = 3


def detect_pause_intent(message: str) -> bool:
    return bool(PAUSE_INTENT_PATTERN.search(message.strip()))


def _resolved_count(capability_states: dict[str, Any]) -> int:
    return sum(
        1
        for state in capability_states.values()
        if state.get("status") in ("sufficient", "insufficient")
    )


def _count_reference_questions(bundle: dict[str, Any], capability_id: str) -> int:
    for group in bundle["reference_questions"]["capability_questions"]:
        if group.get("capability_id") != capability_id:
            continue
        questions = group.get("questions", [])
        return len(questions) if isinstance(questions, list) else 0
    return 0


def _infer_active_capability_id(capability_states: dict[str, Any]) -> str | None:
    for capability_id, state in capability_states.items():
        if state.get("status") == "exploring":
            return capability_id
    for capability_id, state in capability_states.items():
        if state.get("status") not in ("sufficient", "insufficient"):
            return capability_id
    return None


def build_capability_topic_progress(
    bundle: dict[str, Any],
    capability_states: dict[str, Any],
    active_capability_id: str | None = None,
) -> dict[str, int] | None:
    capability_id = active_capability_id or _infer_active_capability_id(capability_states)
    if not capability_id:
        return None
    state = capability_states.get(capability_id, {})
    covered = state.get("reference_questions_covered") or []
    covered_count = len(covered) if isinstance(covered, list) else 0
    total = _count_reference_questions(bundle, capability_id)
    if total <= 0:
        return {"covered": covered_count, "total": max(covered_count, 1)}
    return {"covered": covered_count, "total": total}


def build_pillar_progress(
    bundle: dict[str, Any],
    capability_states: dict[str, Any],
    active_capability_id: str | None = None,
) -> dict[str, Any] | None:
    capability_lookup = {
        cap["id"]: cap for cap in bundle["capabilities"]["capabilities"]
    }
    capability_id = active_capability_id or _infer_active_capability_id(capability_states)
    if not capability_id:
        return None

    capability = capability_lookup.get(capability_id, {})
    pillar = capability.get("pillar")
    if not isinstance(pillar, str) or not pillar.strip():
        return None

    pillar_name = pillar.strip()
    pillar_capability_ids = [
        cap["id"]
        for cap in bundle["capabilities"]["capabilities"]
        if (cap.get("pillar") or "").strip() == pillar_name
    ]
    if not pillar_capability_ids:
        return None

    resolved = sum(
        1
        for cid in pillar_capability_ids
        if capability_states.get(cid, {}).get("status") in ("sufficient", "insufficient")
    )
    return {
        "pillar": pillar_name,
        "resolved_in_pillar": resolved,
        "total_in_pillar": len(pillar_capability_ids),
        "pillar_complete": resolved >= len(pillar_capability_ids),
    }


def update_engagement_metrics(session: Any, user_message: str) -> None:
    lengths = list(getattr(session, "user_message_lengths", []) or [])
    lengths.append(len(user_message.strip()))
    session.user_message_lengths = lengths[-12:]


def detect_possible_fatigue(session: Any) -> bool:
    lengths = getattr(session, "user_message_lengths", []) or []
    if len(lengths) < FATIGUE_TURN_WINDOW:
        return False
    recent = lengths[-FATIGUE_TURN_WINDOW:]
    return all(length < MIN_USER_MESSAGE_LENGTH_FOR_FATIGUE for length in recent)


def build_engagement_context(
    bundle: dict[str, Any],
    session: Any,
    *,
    user_message: str | None = None,
) -> dict[str, Any]:
    total = len(session.capability_states)
    done = _resolved_count(session.capability_states)
    remaining = max(total - done, 0)
    pct = round(100 * done / total) if total else 0
    active_capability_id = _infer_active_capability_id(session.capability_states)
    topic_progress = build_capability_topic_progress(
        bundle, session.capability_states, active_capability_id
    )

    if user_message is not None:
        update_engagement_metrics(session, user_message)

    return {
        "turn_number": len(session.messages),
        "capabilities_resolved": done,
        "capabilities_remaining": remaining,
        "pct_complete": pct,
        "should_offer_checkpoint": done > 0 and done % CHECKPOINT_INTERVAL == 0,
        "active_capability_id": active_capability_id,
        "active_capability_questions_covered": (
            topic_progress["covered"] if topic_progress else 0
        ),
        "active_capability_reference_total": (
            topic_progress["total"] if topic_progress else 0
        ),
        "possible_fatigue": detect_possible_fatigue(session),
        "paused": bool(getattr(session, "paused", False)),
    }


def build_pause_reply(
    service_name: str,
    progress: dict[str, int],
    assessment_focus: dict[str, str] | None,
) -> str:
    current = progress.get("current", 0)
    total = progress.get("total", 0)
    pct = round(100 * current / total) if total else 0
    focus_line = ""
    if assessment_focus:
        capability = assessment_focus.get("capability_name", "")
        if capability:
            focus_line = f" You were working on {capability}."
    return (
        f"No problem — we'll pause here. You've completed {current} of {total} "
        f"capability areas ({pct}%) for {service_name}.{focus_line} "
        "Use Save & take a break to keep your place, then resume anytime "
        "from your dashboard."
    )


def build_resume_recap(
    bundle: dict[str, Any],
    session: Any,
    assessment_focus: dict[str, str] | None,
) -> str:
    service_name = bundle["capabilities"]["service_name"]
    progress = {
        "current": _resolved_count(session.capability_states),
        "total": len(session.capability_states),
    }
    current = progress["current"]
    total = progress["total"]
    pct = round(100 * current / total) if total else 0
    capability = ""
    if assessment_focus and assessment_focus.get("capability_name"):
        capability = f" We'll pick up with {assessment_focus['capability_name']}."
    return (
        f"Welcome back. You're {pct}% through {service_name} "
        f"({current} of {total} capability areas done).{capability} "
        "Reply when you're ready to continue."
    )
