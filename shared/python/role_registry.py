"""Load canonical roles and service-to-role mappings from shared/docs/."""

from __future__ import annotations

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
        if (parent / "shared" / "docs" / "canonical-roles.json").is_file():
            return parent
        if (parent / "render.yaml").is_file():
            return parent
    return Path(__file__).resolve().parents[2]


def _read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _normalize(value: str) -> str:
    return value.strip().lower()


@lru_cache(maxsize=1)
def _roles_by_id() -> dict[str, dict[str, Any]]:
    path = _repo_root() / "shared" / "docs" / "canonical-roles.json"
    doc = _read_json(path)
    roles: dict[str, dict[str, Any]] = {}
    for role in doc.get("roles", []):
        role_id = str(role["role_id"])
        roles[role_id] = role
    return roles


@lru_cache(maxsize=1)
def _alias_to_role_id() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for role_id, role in _roles_by_id().items():
        mapping[_normalize(role_id)] = role_id
        mapping[_normalize(role["display_name"])] = role_id
        for alias in role.get("aliases") or []:
            mapping[_normalize(str(alias))] = role_id
    return mapping


@lru_cache(maxsize=1)
def _service_role_ids() -> dict[str, list[str]]:
    path = _repo_root() / "shared" / "docs" / "service-target-audience.json"
    doc = _read_json(path)
    result: dict[str, list[str]] = {}
    for service_id, entry in (doc.get("services") or {}).items():
        role_ids = entry.get("role_ids")
        if role_ids is None:
            legacy = entry.get("target_audience") or []
            resolved: list[str] = []
            for item in legacy:
                rid = resolve_role_id(str(item))
                if rid and rid not in resolved:
                    resolved.append(rid)
            role_ids = resolved
        result[str(service_id)] = [str(rid) for rid in role_ids]
    return result


def list_roles(*, used_only: bool = False) -> list[dict[str, str]]:
    """Return canonical roles sorted by display_name."""
    used: set[str] = set()
    if used_only:
        for role_ids in _service_role_ids().values():
            used.update(role_ids)

    items: list[dict[str, str]] = []
    for role_id, role in _roles_by_id().items():
        if used_only and role_id not in used:
            continue
        items.append(
            {
                "role_id": role_id,
                "display_name": str(role["display_name"]),
            }
        )
    return sorted(items, key=lambda item: item["display_name"].lower())


def resolve_role_id(value: str | None) -> str | None:
    """Resolve role_id, display_name, or alias to a canonical role_id."""
    if not value or not str(value).strip():
        return None
    return _alias_to_role_id().get(_normalize(str(value)))


def display_name(role_id: str) -> str | None:
    role = _roles_by_id().get(role_id)
    if not role:
        return None
    return str(role["display_name"])


def role_ids_for_service(service_id: str) -> list[str]:
    return list(_service_role_ids().get(service_id, []))


def display_names_for_role_ids(role_ids: list[str]) -> list[str]:
    names: list[str] = []
    for role_id in role_ids:
        name = display_name(role_id)
        if name:
            names.append(name)
    return names


def services_for_role_id(role_id: str) -> list[str]:
    matches: list[str] = []
    for service_id, role_ids in sorted(_service_role_ids().items()):
        if role_id in role_ids:
            matches.append(service_id)
    return matches


def enrich_service_audience(service_id: str, capabilities_doc: dict[str, Any]) -> dict[str, Any]:
    """Attach resolved role_ids and display names to a service summary."""
    pack_role_ids = capabilities_doc.get("target_audience_role_ids")
    if pack_role_ids is None:
        pack_role_ids = capabilities_doc.get("target_audience") or []

    registry_role_ids = role_ids_for_service(service_id)
    if registry_role_ids:
        role_ids = registry_role_ids
    else:
        role_ids = []
        for item in pack_role_ids:
            resolved = resolve_role_id(str(item))
            if resolved and resolved not in role_ids:
                role_ids.append(resolved)

    return {
        "target_audience_role_ids": role_ids,
        "target_audience": display_names_for_role_ids(role_ids),
    }
