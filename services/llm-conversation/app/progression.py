"""Server-side capability progression: list merge and follow-up limits."""

from __future__ import annotations

from typing import Any

MAX_FOLLOW_UPS_PER_CAPABILITY = 5

LIST_MERGE_FIELDS = frozenset(
    {"reference_questions_covered", "dynamic_questions_asked", "pending_artifacts"}
)

_FOLLOW_UP_LIMIT_NOTE = (
    " (Maximum follow-up questions reached; capability closed.)"
)


def merge_list_values(existing: list[Any], incoming: list[Any]) -> list[Any]:
    merged = list(existing)
    seen = set(existing)
    for item in incoming:
        if item not in seen:
            merged.append(item)
            seen.add(item)
    return merged


def merge_pending_artifacts(existing: list[Any], incoming: list[Any]) -> list[Any]:
    merged = [dict(item) for item in existing if isinstance(item, dict)]
    by_id = {item.get("id"): item for item in merged if item.get("id")}
    for item in incoming:
        if not isinstance(item, dict):
            continue
        artifact_id = item.get("id")
        label = (item.get("label") or "").strip().lower()
        if artifact_id and artifact_id in by_id:
            by_id[artifact_id].update(item)
            continue
        duplicate = next(
            (
                existing_item
                for existing_item in merged
                if (existing_item.get("label") or "").strip().lower() == label
                and label
            ),
            None,
        )
        if duplicate is not None:
            duplicate.update(item)
            if artifact_id:
                by_id[artifact_id] = duplicate
            continue
        merged.append(dict(item))
        if artifact_id:
            by_id[artifact_id] = merged[-1]
    return merged


def merge_capability_state_update(
    existing: dict[str, Any], update: dict[str, Any]
) -> dict[str, Any]:
    result = dict(existing)
    for key, value in update.items():
        if value is None:
            continue
        if key in LIST_MERGE_FIELDS and isinstance(value, list):
            prev = result.get(key)
            base = prev if isinstance(prev, list) else []
            if key == "pending_artifacts":
                result[key] = merge_pending_artifacts(base, value)
            else:
                result[key] = merge_list_values(base, value)
        else:
            result[key] = value
    return result


def follow_up_count(state: dict[str, Any]) -> int:
    asked = state.get("dynamic_questions_asked", [])
    return len(asked) if isinstance(asked, list) else 0


def enforce_follow_up_limits(
    capability_states: dict[str, Any],
    *,
    max_follow_ups: int = MAX_FOLLOW_UPS_PER_CAPABILITY,
) -> list[str]:
    """Close capabilities that used the maximum number of follow-ups."""
    closed: list[str] = []
    for capability_id, state in capability_states.items():
        status = state.get("status")
        if status in ("sufficient", "insufficient"):
            continue
        if follow_up_count(state) < max_follow_ups:
            continue
        state["status"] = "insufficient"
        summary = (state.get("evidence_summary") or "").strip()
        if _FOLLOW_UP_LIMIT_NOTE.strip() not in summary:
            state["evidence_summary"] = f"{summary}{_FOLLOW_UP_LIMIT_NOTE}".strip()
        closed.append(capability_id)
    return closed


def build_progression_constraints(
    capability_states: dict[str, Any],
    *,
    max_follow_ups: int = MAX_FOLLOW_UPS_PER_CAPABILITY,
) -> dict[str, Any]:
    at_limit: list[dict[str, Any]] = []
    near_limit: list[dict[str, Any]] = []

    for capability_id, state in capability_states.items():
        if state.get("status") in ("sufficient", "insufficient"):
            continue
        count = follow_up_count(state)
        if count >= max_follow_ups:
            at_limit.append(
                {"capability_id": capability_id, "follow_ups_used": count}
            )
        elif count == max_follow_ups - 1:
            near_limit.append(
                {
                    "capability_id": capability_id,
                    "follow_ups_used": count,
                    "follow_ups_remaining": 1,
                }
            )

    return {
        "max_follow_ups_per_capability": max_follow_ups,
        "reference_questions_unlimited": True,
        "capabilities_at_follow_up_limit": at_limit,
        "capabilities_with_one_follow_up_remaining": near_limit,
    }


def all_capabilities_resolved(capability_states: dict[str, Any]) -> bool:
    if not capability_states:
        return False
    return all(
        state.get("status") in ("sufficient", "insufficient")
        for state in capability_states.values()
    )
