#!/usr/bin/env python3
"""Validate capabilities.json and reference-questions.json stay in sync."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
QUESTION_ID_RE = re.compile(r"^rq-(adt-\d{2})-\d+$")


def load(name: str) -> dict:
    with (SERVICE_DIR / name).open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    caps_doc = load("capabilities.json")
    refs_doc = load("reference-questions.json")

    capabilities = caps_doc["capabilities"]
    cap_by_id = {c["id"]: c for c in capabilities}
    cap_ids = set(cap_by_id)

    groups = refs_doc.get("capability_questions")
    if not groups:
        print("error: reference-questions.json must use capability_questions[]", file=sys.stderr)
        return 1

    seen_question_ids: set[str] = set()
    covered_caps: set[str] = set()

    for group in groups:
        cap_id = group["capability_id"]
        if cap_id not in cap_ids:
            print(f"error: unknown capability_id {cap_id!r} in reference questions", file=sys.stderr)
            return 1

        expected_name = cap_by_id[cap_id]["name"]
        if group.get("capability_name") != expected_name:
            print(
                f"error: capability_name mismatch for {cap_id}: "
                f"expected {expected_name!r}, got {group.get('capability_name')!r}",
                file=sys.stderr,
            )
            return 1

        covered_caps.add(cap_id)
        questions = group.get("questions") or []
        if not questions:
            print(f"error: capability {cap_id} has no questions", file=sys.stderr)
            return 1

        for q in questions:
            qid = q["id"]
            if qid in seen_question_ids:
                print(f"error: duplicate question id {qid!r}", file=sys.stderr)
                return 1
            seen_question_ids.add(qid)

            match = QUESTION_ID_RE.match(qid)
            if not match or match.group(1) != cap_id:
                print(
                    f"error: question id {qid!r} must map to capability {cap_id!r}",
                    file=sys.stderr,
                )
                return 1

            cap_suffix = cap_id.replace("-", "_")
            if not q["field_key"].startswith(cap_suffix):
                print(
                    f"error: field_key {q['field_key']!r} must start with {cap_suffix!r}",
                    file=sys.stderr,
                )
                return 1

    missing = cap_ids - covered_caps
    extra = covered_caps - cap_ids
    if missing:
        print(f"error: capabilities missing questions: {sorted(missing)}", file=sys.stderr)
        return 1
    if extra:
        print(f"error: reference groups for unknown capabilities: {sorted(extra)}", file=sys.stderr)
        return 1

    if refs_doc["service_id"] != caps_doc["service_id"]:
        print("error: service_id mismatch between capabilities and questions", file=sys.stderr)
        return 1

    for cap in capabilities:
        weight = cap.get("resiliency_weight")
        if weight is None:
            print(f"error: capability {cap['id']!r} missing resiliency_weight", file=sys.stderr)
            return 1
        if not isinstance(weight, (int, float)) or weight <= 0:
            print(
                f"error: capability {cap['id']!r} resiliency_weight must be a positive number, got {weight!r}",
                file=sys.stderr,
            )
            return 1

    print(
        f"ok: {len(capabilities)} capabilities, {len(seen_question_ids)} questions, "
        "1:1 capability mapping enforced"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
