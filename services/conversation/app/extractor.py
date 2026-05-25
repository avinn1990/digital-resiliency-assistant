"""Rule-based extraction placeholder; swap for LLM-backed extraction when ready."""

import re
from typing import Any


def extract_from_message(
    message: str,
    field_key: str,
    response_type: str,
) -> tuple[Any, float]:
    text = message.strip()

    if response_type == "boolean":
        lowered = text.lower()
        if any(word in lowered for word in ("yes", "true", "we do", "implemented")):
            return True, 0.85
        if any(word in lowered for word in ("no", "false", "not", "none")):
            return False, 0.85
        return None, 0.3

    if response_type == "number":
        match = re.search(r"\d+(?:\.\d+)?", text)
        if match:
            value = float(match.group()) if "." in match.group() else int(match.group())
            return value, 0.8
        return None, 0.3

    if response_type == "choice" and "," in text:
        return [part.strip() for part in text.split(",") if part.strip()], 0.7

    if len(text) >= 3:
        return text, 0.75

    return None, 0.2
