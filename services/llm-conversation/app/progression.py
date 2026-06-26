"""Server-side capability progression: list merge and operating context."""

from __future__ import annotations

from typing import Any

OPERATING_CONTEXT_KEY = "operating_context"

LIST_MERGE_FIELDS = frozenset(
    {"reference_questions_covered", "dynamic_questions_asked", "pending_artifacts"}
)

OPERATING_CONTEXT_LIST_KEYS = frozenset(
    {
        "technology_modes",
        "integration_channels",
        "policies_artifacts",
        "coverage_gaps",
    }
)


def merge_list_values(existing: list[Any], incoming: list[Any]) -> list[Any]:
    merged = list(existing)
    seen = set(existing)
    for item in incoming:
        if item not in seen:
            merged.append(item)
            seen.add(item)
    return merged


def merge_operating_context(
    existing: dict[str, Any] | None, incoming: dict[str, Any] | None
) -> dict[str, Any]:
    base = dict(existing) if isinstance(existing, dict) else {}
    if not isinstance(incoming, dict):
        return base

    for key, value in incoming.items():
        if value is None:
            continue
        if key in OPERATING_CONTEXT_LIST_KEYS and isinstance(value, list):
            prev = base.get(key)
            base_list = prev if isinstance(prev, list) else []
            base[key] = merge_list_values(base_list, value)
        elif isinstance(value, dict) and isinstance(base.get(key), dict):
            nested = dict(base[key])
            nested.update(value)
            base[key] = nested
        else:
            base[key] = value
    return base


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


def enforce_follow_up_limits(capability_states: dict[str, Any]) -> list[str]:
    """Follow-up limits removed — probing continues until evidence is sufficient."""
    return []


def build_progression_constraints(
    capability_states: dict[str, Any],
) -> dict[str, Any]:
    probing: list[dict[str, Any]] = []
    for capability_id, state in capability_states.items():
        if state.get("status") in ("sufficient", "insufficient"):
            continue
        count = follow_up_count(state)
        if count:
            probing.append(
                {"capability_id": capability_id, "probes_asked": count}
            )

    return {
        "follow_ups_unlimited": True,
        "reference_questions_unlimited": True,
        "capabilities_with_active_probing": probing,
    }


def all_capabilities_resolved(capability_states: dict[str, Any]) -> bool:
    if not capability_states:
        return False
    return all(
        state.get("status") in ("sufficient", "insufficient")
        for state in capability_states.values()
    )
