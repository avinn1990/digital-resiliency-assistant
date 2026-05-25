import json
from pathlib import Path
from typing import Any

from app.config import settings


def load_evaluation_bundle(service_dir: Path | None = None) -> dict[str, Any]:
    base = service_dir or settings.evaluation_dir()
    if not base.is_dir():
        raise FileNotFoundError(f"Evaluation service directory not found: {base}")

    with (base / "capabilities.json").open(encoding="utf-8") as f:
        capabilities_doc = json.load(f)
    with (base / "reference-questions.json").open(encoding="utf-8") as f:
        questions_doc = json.load(f)

    return {
        "path": str(base),
        "capabilities": capabilities_doc,
        "reference_questions": questions_doc,
    }
