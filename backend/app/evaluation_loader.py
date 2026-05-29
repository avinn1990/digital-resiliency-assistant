import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any


def _repo_root() -> Path:
    override = os.environ.get("REPO_ROOT", "").strip()
    if override:
        return Path(override)
    for parent in Path(__file__).resolve().parents:
        if (parent / "evaluation-services").is_dir():
            return parent
        if (parent / "render.yaml").is_file():
            return parent
    return Path(__file__).resolve().parents[2]


def _evaluation_services_root() -> Path:
    override = os.environ.get("EVALUATION_SERVICES_DIR", "").strip()
    if override:
        return Path(override)
    return _repo_root() / "evaluation-services"


def _read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _flatten_capability_questions(questions_doc: dict[str, Any]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for group in questions_doc.get("capability_questions", []):
        cap_id = group.get("capability_id")
        cap_name = group.get("capability_name")
        for question in group.get("questions", []):
            flat.append(
                {
                    **question,
                    "capability_id": cap_id,
                    "capability_name": cap_name,
                }
            )
    return flat


@lru_cache(maxsize=1)
def _service_dir_by_id() -> dict[str, Path]:
    root = _evaluation_services_root()
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
            capabilities_doc = _read_json(cap_path)
            service_id = capabilities_doc.get("service_id")
            if service_id and service_id not in mapping:
                mapping[str(service_id)] = child
        except Exception:
            # If a pack is malformed, skip it rather than breaking the API.
            continue
    return mapping


def list_evaluation_services() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for service_id, service_dir in sorted(_service_dir_by_id().items()):
        cap_path = service_dir / "capabilities.json"
        try:
            capabilities_doc = _read_json(cap_path)
        except Exception:
            continue
        items.append(
            {
                "service_id": service_id,
                "service_name": capabilities_doc.get("service_name"),
                "version": capabilities_doc.get("version"),
                "description": capabilities_doc.get("description"),
                "target_audience": capabilities_doc.get("target_audience", []),
                "path": str(service_dir),
            }
        )
    return items


def load_evaluation_service_bundle(service_id: str) -> dict[str, Any] | None:
    service_dir = _service_dir_by_id().get(service_id)
    if not service_dir:
        return None

    cap_path = service_dir / "capabilities.json"
    q_path = service_dir / "reference-questions.json"
    if not cap_path.is_file() or not q_path.is_file():
        return None

    capabilities_doc = _read_json(cap_path)
    questions_doc = _read_json(q_path)

    return {
        "service_id": capabilities_doc.get("service_id") or service_id,
        "service_name": capabilities_doc.get("service_name"),
        "version": capabilities_doc.get("version"),
        "description": capabilities_doc.get("description"),
        "target_audience": capabilities_doc.get("target_audience", []),
        "capabilities": capabilities_doc.get("capabilities", []),
        "reference_questions_by_capability": questions_doc.get("capability_questions", []),
        "reference_questions": _flatten_capability_questions(questions_doc),
        "path": str(service_dir),
    }

