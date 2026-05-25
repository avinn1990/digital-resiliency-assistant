import json
import os
from pathlib import Path

import httpx

FRAMEWORK_SERVICE_URL = os.getenv(
    "FRAMEWORK_SERVICE_URL", "http://localhost:8003"
).rstrip("/")

# Local fallback for development without framework service
_LOCAL_DATA = (
    Path(__file__).resolve().parents[2]
    / ".."
    / "framework"
    / "data"
).resolve()


def _questions_from_framework(framework: dict) -> list[dict]:
    questions: list[dict] = []
    for domain in framework.get("domains", []):
        for control in domain.get("controls", []):
            for question in control.get("questions", []):
                questions.append(
                    {
                        **question,
                        "control_id": control["id"],
                        "domain_id": domain["id"],
                    }
                )
    return questions


def _load_local(framework_id: str) -> dict | None:
    for name in (f"{framework_id}.json", "example-digital-resilience.json"):
        path = _LOCAL_DATA / name
        if path.exists():
            with path.open(encoding="utf-8") as handle:
                return json.load(handle)
    return None


def load_framework(framework_id: str) -> dict:
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{FRAMEWORK_SERVICE_URL}/frameworks/{framework_id}"
            )
        if response.status_code == 200:
            return response.json()
    except httpx.HTTPError:
        pass

    local = _load_local(framework_id)
    if local:
        return local
    raise FileNotFoundError(f"Framework not found: {framework_id}")


def load_framework_questions(framework_id: str) -> list[dict]:
    framework = load_framework(framework_id)
    return _questions_from_framework(framework)
