#!/usr/bin/env python3
"""Validate canonical roles, service mappings, and evaluation pack audience fields."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ROLES_PATH = REPO_ROOT / "shared" / "docs" / "canonical-roles.json"
MAPPING_PATH = REPO_ROOT / "shared" / "docs" / "service-target-audience.json"
EVAL_ROOT = REPO_ROOT / "evaluation-services"


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    roles_doc = load_json(ROLES_PATH)
    mapping_doc = load_json(MAPPING_PATH)

    role_ids = {role["role_id"] for role in roles_doc.get("roles", [])}
    display_names = {role["display_name"] for role in roles_doc.get("roles", [])}

    if len(display_names) != len(roles_doc.get("roles", [])):
        print("error: duplicate display_name in canonical-roles.json", file=sys.stderr)
        return 1

    errors: list[str] = []
    role_to_service: dict[str, str] = {}

    for service_id, entry in (mapping_doc.get("services") or {}).items():
        service_role_ids = entry.get("role_ids") or []
        if not service_role_ids:
            errors.append(f"{service_id}: missing role_ids")
            continue
        for role_id in service_role_ids:
            if role_id not in role_ids:
                errors.append(f"{service_id}: unknown role_id {role_id!r}")
            elif role_id in role_to_service:
                errors.append(
                    f"{role_id!r} mapped to both {role_to_service[role_id]!r} and {service_id!r}"
                )
            else:
                role_to_service[role_id] = service_id

        cap_path = None
        for child in EVAL_ROOT.iterdir():
            if not child.is_dir():
                continue
            candidate = child / "capabilities.json"
            if not candidate.is_file():
                continue
            doc = load_json(candidate)
            if doc.get("service_id") == service_id:
                cap_path = candidate
                break

        if cap_path is None:
            errors.append(f"{service_id}: capabilities.json not found under evaluation-services/")
            continue

        pack_role_ids = load_json(cap_path).get("target_audience_role_ids") or []
        if list(pack_role_ids) != list(service_role_ids):
            errors.append(
                f"{service_id}: target_audience_role_ids mismatch between pack and service-target-audience.json"
            )

    mapped_roles = set(role_to_service)
    unmapped = role_ids - mapped_roles
    if unmapped:
        errors.append(
            f"canonical roles not mapped to any service: {', '.join(sorted(unmapped))}"
        )

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print(
        f"ok: {len(role_ids)} canonical roles, "
        f"{len(mapping_doc.get('services', {}))} service mappings validated, "
        "no overlapping role assignments"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
