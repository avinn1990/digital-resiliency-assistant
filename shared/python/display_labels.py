"""Human-friendly labels for chat assessment focus display."""

from __future__ import annotations

import re
from typing import Any

RUBRIC_LABELS = (
    "Documentation",
    "Enterprise adoption",
    "Automation",
    "Integration",
    "Monitoring",
)


def humanize_capability_label(
    name: str,
    *,
    short_name: str | None = None,
) -> str:
    if short_name and short_name.strip():
        return short_name.strip().lower()
    cleaned = name.strip()
    cleaned = re.sub(r"\s+and is in good condition\s*$", "", cleaned, flags=re.I)
    cleaned = re.sub(
        r"\s+alignment with business objectives\s*$",
        " alignment",
        cleaned,
        flags=re.I,
    )
    cleaned = re.sub(r"\binformation security\b", "security", cleaned, flags=re.I)
    return cleaned.lower()


def simplify_rubric_label(
    evaluation_focus: str | None = None,
    question: dict[str, Any] | None = None,
    *,
    llm_label: str | None = None,
) -> str | None:
    if llm_label and llm_label.strip():
        normalized = _normalize_rubric_label(llm_label.strip())
        if normalized:
            return normalized

    parts: list[str] = []
    if question:
        parts.extend(
            value
            for value in (question.get("prompt"), question.get("intent"))
            if isinstance(value, str)
        )
    if evaluation_focus:
        parts.append(evaluation_focus)
    blob = " ".join(parts).lower()
    if not blob.strip():
        return None
    return _rubric_from_text(blob)


def _normalize_rubric_label(label: str) -> str | None:
    lower = label.lower()
    if "document" in lower:
        return "Documentation"
    if "enterprise" in lower or "adopt" in lower:
        return "Enterprise adoption"
    if "automat" in lower:
        return "Automation"
    if "integrat" in lower:
        return "Integration"
    if "monitor" in lower or "metric" in lower:
        return "Monitoring"
    for canonical in RUBRIC_LABELS:
        if lower == canonical.lower():
            return canonical
    return None


def _rubric_from_text(blob: str) -> str:
    if any(
        phrase in blob
        for phrase in (
            "enterprise wide",
            "enterprise-wide",
            "enterprise adoption",
            "adopted enterprise",
            "adopted across",
            "operating model",
            "delivery cadence",
        )
    ):
        if any(token in blob for token in ("enterprise", "adopt", "operating model")):
            return "Enterprise adoption"
    if "automat" in blob:
        return "Automation"
    if any(
        phrase in blob
        for phrase in (
            "integrat",
            "linkage to",
            "risk taxonomy alignment",
            "control mapping",
            "mapping to obligation",
            "well integrated",
        )
    ):
        return "Integration"
    if any(
        phrase in blob
        for phrase in (
            "monitor",
            "metric",
            "kpi",
            "kri",
            "audit",
            "reviewed frequently",
            "reporting cadence",
            "continuous improvement",
            "stakeholder satisfaction",
            "culture metric",
            "well measured",
            "observed",
        )
    ):
        return "Monitoring"
    if any(
        phrase in blob
        for phrase in (
            "document",
            "charter",
            "published",
            "policy",
            "defined",
            "inventory",
            "roadmap",
            "vision",
            "mission",
            "governance forum",
            "named executive",
            "team or role assignment",
            "budget linkage",
            "training plan",
            "compliance obligation",
        )
    ):
        return "Documentation"
    return "Documentation"
