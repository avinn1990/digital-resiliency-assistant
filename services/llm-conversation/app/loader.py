import json
import re
from pathlib import Path
from typing import Any

from functools import lru_cache

from app.config import settings

_QUESTION_ID_RE = re.compile(r"^rq-(issp-\d{2})-\d+$")


def _flatten_capability_questions(questions_doc: dict[str, Any]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for group in questions_doc["capability_questions"]:
        cap_id = group["capability_id"]
        cap_name = group["capability_name"]
        for question in group["questions"]:
            flat.append(
                {
                    **question,
                    "capability_id": cap_id,
                    "capability_name": cap_name,
                }
            )
    return flat


def _validate_capability_question_mapping(
    capabilities_doc: dict[str, Any], questions_doc: dict[str, Any]
) -> None:
    cap_by_id = {c["id"]: c for c in capabilities_doc["capabilities"]}
    cap_ids = set(cap_by_id)
    groups = questions_doc.get("capability_questions")
    if not groups:
        raise ValueError(
            "reference-questions.json must define capability_questions grouped by capability"
        )

    seen_ids: set[str] = set()
    covered: set[str] = set()

    for group in groups:
        cap_id = group["capability_id"]
        if cap_id not in cap_ids:
            raise ValueError(f"Unknown capability_id in reference questions: {cap_id}")
        if group.get("capability_name") != cap_by_id[cap_id]["name"]:
            raise ValueError(f"capability_name mismatch for {cap_id}")

        covered.add(cap_id)
        questions = group.get("questions") or []
        if not questions:
            raise ValueError(f"No reference questions defined for capability {cap_id}")

        cap_suffix = cap_id.replace("-", "_")
        for question in questions:
            qid = question["id"]
            if qid in seen_ids:
                raise ValueError(f"Duplicate reference question id: {qid}")
            seen_ids.add(qid)

            match = _QUESTION_ID_RE.match(qid)
            if not match or match.group(1) != cap_id:
                raise ValueError(f"Question id {qid} must belong to capability {cap_id}")

            if not question["field_key"].startswith(cap_suffix):
                raise ValueError(
                    f"field_key {question['field_key']} must map to capability {cap_id}"
                )

    missing = cap_ids - covered
    if missing:
        raise ValueError(
            f"Capabilities missing reference questions: {', '.join(sorted(missing))}"
        )

    if questions_doc.get("service_id") != capabilities_doc.get("service_id"):
        raise ValueError("service_id mismatch between capabilities and reference questions")


@lru_cache(maxsize=64)
def _service_dir_by_id() -> dict[str, Path]:
    root = settings.evaluation_services_root()
    if not root.is_dir():
        return {}
    mapping: dict[str, Path] = {}
    for child in root.iterdir():
        if not child.is_dir():
            continue
        cap_path = child / "capabilities.json"
        if not cap_path.is_file():
            continue
        try:
            with cap_path.open(encoding="utf-8") as f:
                capabilities_doc = json.load(f)
            service_id = capabilities_doc.get("service_id")
            if service_id and str(service_id) not in mapping:
                mapping[str(service_id)] = child
        except Exception:
            continue
    return mapping


def load_evaluation_bundle(
    service_dir: Path | None = None, *, service_id: str | None = None
) -> dict[str, Any]:
    if service_dir is not None:
        base = service_dir
    elif service_id:
        base = _service_dir_by_id().get(service_id) or settings.evaluation_dir()
    else:
        base = settings.evaluation_dir()
    if not base.is_dir():
        raise FileNotFoundError(f"Evaluation service directory not found: {base}")

    with (base / "capabilities.json").open(encoding="utf-8") as f:
        capabilities_doc = json.load(f)
    with (base / "reference-questions.json").open(encoding="utf-8") as f:
        questions_doc = json.load(f)

    _validate_capability_question_mapping(capabilities_doc, questions_doc)
    flat_questions = _flatten_capability_questions(questions_doc)

    return {
        "path": str(base),
        "capabilities": capabilities_doc,
        "reference_questions": questions_doc,
        "reference_questions_flat": flat_questions,
    }
