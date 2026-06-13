#!/usr/bin/env python3
"""Merge evaluation service packs per service clubbing plan."""

from __future__ import annotations

import copy
import json
import re
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EVAL = REPO / "evaluation-services"
AUDIENCE_PATH = REPO / "shared" / "docs" / "service-target-audience.json"

EVAL_BLOCK = {
    "resiliency_weight_policy": (
        "Ask stakeholder for per-capability weights when adding a new evaluation service. "
        "This service uses weight 1 for all capabilities."
    ),
    "normalized_scale": 5,
    "max_score_per_capability": 9,
    "dimensions": [
        {"id": "documented", "max": 2, "levels": {"0": "none", "1": "informal", "2": "documented"}},
        {
            "id": "implemented",
            "max": 2,
            "levels": {"0": "no adoption", "1": "partial", "2": "enterprise-wide"},
        },
        {
            "id": "automatable",
            "max": 2,
            "levels": {"0": "not at all", "1": "partial", "2": "enterprise-wide"},
        },
        {"id": "integrated", "max": 1, "levels": {"0": "siloed or cannot integrate", "1": "well integrated"}},
        {
            "id": "monitored",
            "max": 2,
            "levels": {"0": "cannot observe", "1": "observed not measured", "2": "well measured"},
        },
    ],
    "rollup_formula": "(sum(actual_i * weight_i) / sum(max_i * weight_i)) * normalized_scale",
    "pillar_policy": (
        "Some services may have no Technology capabilities; in those cases, "
        "do not compute or report a Technology pillar score."
    ),
}


def load_pack(dir_name: str) -> tuple[dict, dict]:
    base = EVAL / dir_name
    caps = json.loads((base / "capabilities.json").read_text(encoding="utf-8"))
    refs = json.loads((base / "reference-questions.json").read_text(encoding="utf-8"))
    return caps, refs


def quarterly(text: str) -> str:
    text = re.sub(r"\bfrequently\b", "at least quarterly", text, flags=re.IGNORECASE)
    text = re.sub(r"\bFrequent\b", "Regular", text)
    text = re.sub(r"\bfrequent\b", "regular", text)
    return text


def cap(
    id_: str,
    name: str,
    short_name: str,
    description: str,
    evaluation_focus: list[str],
    pillar: str,
) -> dict:
    return {
        "id": id_,
        "name": name,
        "short_name": short_name,
        "description": quarterly(description),
        "evaluation_focus": [quarterly(f) for f in evaluation_focus],
        "resiliency_weight": 1,
        "pillar": pillar,
    }


def normalize_field_key(cap_id: str, old_key: str, counter: int) -> str:
    cap_suffix = cap_id.replace("-", "_")
    match = re.match(r"^[a-z]+_\d+_(.+)$", old_key)
    if match:
        return f"{cap_suffix}_{match.group(1)}"
    return f"{cap_suffix}_q_{counter}"


def merge_questions(
    source_refs: list[dict],
    merge_map: dict[str, list[str]],
    new_caps: list[dict],
    *,
    service_id: str,
    service_name: str,
    max_per_cap: int = 7,
    extra_by_cap: dict[str, list[dict]] | None = None,
) -> dict:
    old_groups: dict[str, dict] = {}
    for refs in source_refs:
        for group in refs["capability_questions"]:
            old_groups[group["capability_id"]] = group

    new_groups = []
    for nc in new_caps:
        cap_id = nc["id"]
        sources = merge_map.get(cap_id, [cap_id])
        merged: list[dict] = []
        seen_prompts: set[str] = set()
        seen_field_keys: set[str] = set()
        q_counter = 0
        for src in sources:
            if src not in old_groups:
                continue
            for q in old_groups[src]["questions"]:
                prompt = quarterly(q["prompt"])
                if prompt in seen_prompts:
                    continue
                seen_prompts.add(prompt)
                q_counter += 1
                field_key = normalize_field_key(cap_id, q["field_key"], q_counter)
                if field_key in seen_field_keys:
                    field_key = f"{field_key}_{q_counter}"
                seen_field_keys.add(field_key)
                merged.append(
                    {
                        "prompt": prompt,
                        "intent": quarterly(q["intent"]),
                        "field_key": field_key,
                        "evaluation_focus": quarterly(q.get("evaluation_focus", "")),
                    }
                )
        if extra_by_cap and cap_id in extra_by_cap:
            for q in extra_by_cap[cap_id]:
                prompt = quarterly(q["prompt"])
                if prompt in seen_prompts:
                    continue
                seen_prompts.add(prompt)
                q_counter += 1
                field_key = q.get("field_key") or f"{cap_id.replace('-', '_')}_extra_{q_counter}"
                merged.append(
                    {
                        "prompt": prompt,
                        "intent": quarterly(q["intent"]),
                        "field_key": field_key,
                        "evaluation_focus": quarterly(q.get("evaluation_focus", "")),
                    }
                )
        if not merged:
            raise ValueError(f"No questions for {cap_id} from sources {sources}")
        if len(merged) > max_per_cap:
            merged = merged[:max_per_cap]
        questions = []
        for i, q in enumerate(merged, start=1):
            questions.append(
                {
                    "id": f"rq-{cap_id}-{i}",
                    "prompt": q["prompt"],
                    "intent": q["intent"],
                    "field_key": q["field_key"],
                    "evaluation_focus": q["evaluation_focus"],
                }
            )
        new_groups.append(
            {
                "capability_id": cap_id,
                "capability_name": nc["name"],
                "questions": questions,
            }
        )
    return {
        "service_id": service_id,
        "service_name": service_name,
        "capability_questions": new_groups,
    }


def merge_cap_fields(sources: list[dict], *, name: str, short_name: str, description: str, pillar: str) -> dict:
    focus: list[str] = []
    seen: set[str] = set()
    for src in sources:
        for item in src.get("evaluation_focus", []):
            if item not in seen:
                seen.add(item)
                focus.append(item)
    return cap(sources[0]["id"], name, short_name, description, focus, pillar)


def write_pack_files(
    dir_name: str,
    *,
    service_id: str,
    service_name: str,
    prefix: str,
    version: str,
    description: str,
    role_ids: list[str],
    capabilities: list[dict],
    refs_doc: dict,
    readme: str,
    remove_dirs: list[str],
) -> tuple[int, int]:
    base = EVAL / dir_name
    base.mkdir(parents=True, exist_ok=True)

    caps_doc = {
        "service_id": service_id,
        "service_name": service_name,
        "version": version,
        "description": description,
        "capabilities": capabilities,
        "evaluation": copy.deepcopy(EVAL_BLOCK),
        "target_audience_role_ids": role_ids,
    }
    refs_doc["service_id"] = service_id
    refs_doc["service_name"] = service_name

    (base / "capabilities.json").write_text(
        json.dumps(caps_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (base / "reference-questions.json").write_text(
        json.dumps(refs_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (base / "README.md").write_text(readme, encoding="utf-8")

    assessed = (
        EVAL / "Information Security Strategy and Planning Services" / "assessed-capabilities.schema.json"
    ).read_text(encoding="utf-8")
    (base / "assessed-capabilities.schema.json").write_text(assessed, encoding="utf-8")

    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "ReferenceQuestionsByCapability",
        "type": "object",
        "required": ["service_id", "service_name", "capability_questions"],
        "properties": {
            "service_id": {"type": "string"},
            "service_name": {"type": "string"},
            "capability_questions": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "required": ["capability_id", "capability_name", "questions"],
                    "properties": {
                        "capability_id": {"type": "string", "pattern": f"^{prefix}-"},
                        "capability_name": {"type": "string", "minLength": 1},
                        "questions": {
                            "type": "array",
                            "minItems": 1,
                            "items": {
                                "type": "object",
                                "required": ["id", "prompt", "intent", "field_key"],
                                "properties": {
                                    "id": {
                                        "type": "string",
                                        "pattern": f"^rq-{prefix}-[0-9]{{2}}-[0-9]+$",
                                    },
                                    "prompt": {"type": "string", "minLength": 1},
                                    "intent": {"type": "string", "minLength": 1},
                                    "field_key": {"type": "string", "pattern": f"^{prefix.replace('-', '_')}_"},
                                    "evaluation_focus": {"type": "string"},
                                },
                                "additionalProperties": False,
                            },
                        },
                    },
                    "additionalProperties": False,
                },
            },
        },
        "additionalProperties": False,
    }
    (base / "reference-questions.schema.json").write_text(
        json.dumps(schema, indent=2) + "\n", encoding="utf-8"
    )

    prefix_re = prefix.replace("-", r"\-")
    validator = f'''#!/usr/bin/env python3
"""Validate capabilities.json and reference-questions.json stay in sync."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
QUESTION_ID_RE = re.compile(r"^rq-({prefix_re}-\\d{{2}})-\\d+$")


def load(name: str) -> dict:
    with (SERVICE_DIR / name).open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    caps_doc = load("capabilities.json")
    refs_doc = load("reference-questions.json")

    capabilities = caps_doc["capabilities"]
    cap_by_id = {{c["id"]: c for c in capabilities}}
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
            print(f"error: unknown capability_id {{cap_id!r}} in reference questions", file=sys.stderr)
            return 1

        expected_name = cap_by_id[cap_id]["name"]
        if group.get("capability_name") != expected_name:
            print(
                f"error: capability_name mismatch for {{cap_id}}: "
                f"expected {{expected_name!r}}, got {{group.get('capability_name')!r}}",
                file=sys.stderr,
            )
            return 1

        covered_caps.add(cap_id)
        questions = group.get("questions") or []
        if not questions:
            print(f"error: capability {{cap_id}} has no questions", file=sys.stderr)
            return 1

        for q in questions:
            qid = q["id"]
            if qid in seen_question_ids:
                print(f"error: duplicate question id {{qid!r}}", file=sys.stderr)
                return 1
            seen_question_ids.add(qid)

            match = QUESTION_ID_RE.match(qid)
            if not match or match.group(1) != cap_id:
                print(
                    f"error: question id {{qid!r}} must map to capability {{cap_id!r}}",
                    file=sys.stderr,
                )
                return 1

            cap_suffix = cap_id.replace("-", "_")
            if not q["field_key"].startswith(cap_suffix):
                print(
                    f"error: field_key {{q['field_key']!r}} must start with {{cap_suffix!r}}",
                    file=sys.stderr,
                )
                return 1

    missing = cap_ids - covered_caps
    extra = covered_caps - cap_ids
    if missing:
        print(f"error: capabilities missing questions: {{sorted(missing)}}", file=sys.stderr)
        return 1
    if extra:
        print(f"error: reference groups for unknown capabilities: {{sorted(extra)}}", file=sys.stderr)
        return 1

    if refs_doc["service_id"] != caps_doc["service_id"]:
        print("error: service_id mismatch between capabilities and questions", file=sys.stderr)
        return 1

    for cap in capabilities:
        weight = cap.get("resiliency_weight")
        if weight is None:
            print(f"error: capability {{cap['id']!r}} missing resiliency_weight", file=sys.stderr)
            return 1
        if not isinstance(weight, (int, float)) or weight <= 0:
            print(
                f"error: capability {{cap['id']!r}} resiliency_weight must be a positive number, got {{weight!r}}",
                file=sys.stderr,
            )
            return 1

    print(
        f"ok: {{len(capabilities)}} capabilities, {{len(seen_question_ids)}} questions, "
        "1:1 capability mapping enforced"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''
    (base / "validate_evaluation_content.py").write_text(validator, encoding="utf-8")
    (base / "validate_evaluation_content.py").chmod(0o755)

    for old in remove_dirs:
        old_path = EVAL / old
        if old_path.exists():
            shutil.rmtree(old_path)

    n_caps = len(capabilities)
    n_qs = sum(len(g["questions"]) for g in refs_doc["capability_questions"])
    return n_caps, n_qs


def cap_by_id(pack: dict) -> dict[str, dict]:
    return {c["id"]: c for c in pack["capabilities"]}


def merge_security_awareness_culture() -> tuple[int, int]:
    sc, sc_refs = load_pack("Security Culture")
    st, st_refs = load_pack("Security Training")
    sc_map = cap_by_id(sc)
    st_map = cap_by_id(st)

    capabilities = [
        cap(
            "sac-00",
            "Service exists and is in good condition",
            "service existence",
            "A formal security awareness and culture program exists, is scoped appropriately, and is reviewed at least quarterly for efficacy.",
            [
                "Enterprise security awareness and culture program exists",
                "Regular program efficacy review",
            ],
            "Process/Service",
        ),
        cap(
            "sac-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Awareness and culture KPIs and KRIs—including training completion, phishing report and click rates, policy acknowledgment, and culture survey scores—are documented and reviewed at least quarterly.",
            sc_map["sc-01"]["evaluation_focus"] + st_map["st-01"]["evaluation_focus"][2:],
            "Strategy",
        ),
        sc_map["sc-02"] | {"id": "sac-02"},
        cap(
            "sac-03",
            "Leadership, incentives, and champions",
            "leadership and champions",
            "Executive leaders model security behavior, incentives recognize positive behaviors, and a champions program extends culture beyond the security team with quarterly review.",
            sc_map["sc-03"]["evaluation_focus"]
            + sc_map["sc-04"]["evaluation_focus"][:2],
            "People",
        ),
        cap(
            "sac-04",
            "Curriculum, role-based delivery, and platform",
            "curriculum and delivery",
            "Security education content is developed proactively, tailored to roles and risk profiles, and delivered through an automated enterprise platform reviewed at least quarterly.",
            st_map["st-02"]["evaluation_focus"]
            + st_map["st-03"]["evaluation_focus"]
            + st_map["st-08"]["evaluation_focus"],
            "People",
        ),
        st_map["st-04"] | {"id": "sac-05"},
        st_map["st-05"] | {"id": "sac-06"},
        cap(
            "sac-07",
            "Technical and AI-era awareness",
            "technical awareness",
            "Technical roles receive specialized secure-coding and operational training, and all staff receive AI-era and emerging threat awareness refreshed at least quarterly.",
            st_map["st-06"]["evaluation_focus"] + st_map["st-07"]["evaluation_focus"],
            "People",
        ),
        sc_map["sc-06"] | {"id": "sac-08"},
        cap(
            "sac-09",
            "Culture measurement and workforce understanding",
            "culture measurement",
            "Security culture is measured through surveys and behavioral metrics, the workforce understands security rationale, and improvement actions are tracked with quarterly review.",
            sc_map["sc-05"]["evaluation_focus"]
            + sc_map["sc-07"]["evaluation_focus"],
            "Process/Service",
        ),
    ]
    for c in capabilities:
        c["resiliency_weight"] = 1

    merge_map = {
        "sac-00": ["sc-00", "st-00"],
        "sac-01": ["sc-01", "st-01"],
        "sac-02": ["sc-02"],
        "sac-03": ["sc-03", "sc-04"],
        "sac-04": ["st-02", "st-03", "st-08"],
        "sac-05": ["st-04"],
        "sac-06": ["st-05"],
        "sac-07": ["st-06", "st-07"],
        "sac-08": ["sc-06"],
        "sac-09": ["sc-05", "sc-07"],
    }
    extra = {
        "sac-00": [
            {
                "prompt": "Does the enterprise have a formal security awareness and culture program that covers both training delivery and culture outcomes?",
                "intent": "Evaluate whether a combined awareness and culture program exists.",
                "field_key": "sac_00_combined_awareness_culture_program",
                "evaluation_focus": "Enterprise security awareness and culture program exists",
            }
        ]
    }
    refs = merge_questions(
        [sc_refs, st_refs],
        merge_map,
        capabilities,
        service_id="security-awareness-culture",
        service_name="Security Awareness and Culture",
        max_per_cap=6,
        extra_by_cap=extra,
    )
    readme = """# Security Awareness and Culture

Merged evaluation pack combining Security Culture and Security Training (v2.0 club).

## Service ID

`security-awareness-culture`

## Validate

```bash
python3 "evaluation-services/Security Awareness and Culture/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 2.0

- Merged `security-culture` and `security-training` into a single awareness and culture program assessment
- Consolidated existence, KPI, and phishing metric questions
"""
    return write_pack_files(
        "Security Awareness and Culture",
        service_id="security-awareness-culture",
        service_name="Security Awareness and Culture",
        prefix="sac",
        version="2.0",
        description="Evaluates security awareness and culture maturity—program governance, KPIs/KRIs, leadership and champions, curriculum and delivery, onboarding, phishing simulation, technical and AI-era awareness, psychological safety, and culture measurement.",
        role_ids=sc["target_audience_role_ids"],
        capabilities=capabilities,
        refs_doc=refs,
        readme=readme,
        remove_dirs=["Security Culture", "Security Training"],
    )


def merge_vulnerability_remediation() -> tuple[int, int]:
    upm, upm_refs = load_pack("Update and Patch Management Service")
    vmp, vmp_refs = load_pack("Vulnerability Management and Pentesting Service")
    upm_map = cap_by_id(upm)
    vmp_map = cap_by_id(vmp)

    capabilities = [
        cap(
            "vrm-00",
            "Service exists and is in good condition",
            "service existence",
            "A vulnerability and remediation management service exists, is scoped appropriately, and is reviewed at least quarterly for efficacy.",
            ["Documented vulnerability and remediation service", "Regular service efficacy review"],
            "Process/Service",
        ),
        cap(
            "vrm-01",
            "Unified vulnerability and patch process",
            "VM and patch process",
            "Formalized vulnerability management and patch processes cover enterprise assets and third-party supply chain components with automation and quarterly review.",
            upm_map["upm-01"]["evaluation_focus"] + vmp_map["vmp-01"]["evaluation_focus"][2:],
            "Process/Service",
        ),
        cap(
            "vrm-02",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Vulnerability and remediation KPIs and KRIs—including MTTR, critical vulnerability age, patch SLA compliance, and AI triage accuracy—are documented and reviewed at least quarterly.",
            list(dict.fromkeys(vmp_map["vmp-02"]["evaluation_focus"] + upm_map["upm-02"]["evaluation_focus"][2:])),
            "Strategy",
        ),
        cap(
            "vrm-03",
            "Vulnerability and patch policy",
            "VM and patch policy",
            "Formal policies govern vulnerability management and patching across devices, applications, and network assets with quarterly review.",
            vmp_map["vmp-03"]["evaluation_focus"] + upm_map["upm-04"]["evaluation_focus"],
            "Strategy",
        ),
        cap(
            "vrm-04",
            "Discovery and orchestration platform",
            "VM and patch platform",
            "Vulnerability management and patch orchestration platforms cover the enterprise with scanning, remediation automation, and integration across compliance and patch tools.",
            vmp_map["vmp-04"]["evaluation_focus"] + upm_map["upm-03"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "vrm-05",
            "Teams and ownership",
            "VM and patch teams",
            "Dedicated teams manage vulnerability prioritization, remediation coordination, and patch operations with clear ownership.",
            vmp_map["vmp-05"]["evaluation_focus"] + upm_map["upm-05"]["evaluation_focus"],
            "People",
        ),
        vmp_map["vmp-06"] | {"id": "vrm-06"},
        vmp_map["vmp-07"] | {"id": "vrm-07"},
        cap(
            "vrm-08",
            "Remediation workflow and SOC integration",
            "remediation and SOC",
            "Remediation workflows are formalized, automated where feasible, tracked against SLAs, and integrated with SOC logging reviewed at least quarterly.",
            vmp_map["vmp-08"]["evaluation_focus"] + vmp_map["vmp-09"]["evaluation_focus"] + upm_map["upm-06"]["evaluation_focus"],
            "Process/Service",
        ),
        cap(
            "vrm-09",
            "AI-assisted triage and patch prioritization",
            "AI-era remediation",
            "AI-assisted vulnerability triage and patch prioritization operate with human verification and disclosure-velocity targets aligned to AI-accelerated discovery.",
            vmp_map["vmp-10"]["evaluation_focus"] + upm_map["upm-07"]["evaluation_focus"],
            "Technology",
        ),
    ]
    for c in capabilities:
        c["resiliency_weight"] = 1

    merge_map = {
        "vrm-00": ["upm-00", "vmp-00"],
        "vrm-01": ["vmp-01", "upm-01"],
        "vrm-02": ["vmp-02", "upm-02"],
        "vrm-03": ["vmp-03", "upm-04"],
        "vrm-04": ["vmp-04", "upm-03"],
        "vrm-05": ["vmp-05", "upm-05"],
        "vrm-06": ["vmp-06"],
        "vrm-07": ["vmp-07"],
        "vrm-08": ["vmp-08", "vmp-09", "upm-06"],
        "vrm-09": ["vmp-10", "upm-07"],
    }
    refs = merge_questions(
        [upm_refs, vmp_refs],
        merge_map,
        capabilities,
        service_id="vulnerability-remediation-management",
        service_name="Vulnerability and Remediation Management",
        max_per_cap=7,
    )
    readme = """# Vulnerability and Remediation Management

Merged evaluation pack combining Update and Patch Management with Vulnerability Management and Pentesting (v2.0 club).

## Service ID

`vulnerability-remediation-management`

## Validate

```bash
python3 "evaluation-services/Vulnerability and Remediation Management/validate_evaluation_content.py"
```
"""
    return write_pack_files(
        "Vulnerability and Remediation Management",
        service_id="vulnerability-remediation-management",
        service_name="Vulnerability and Remediation Management",
        prefix="vrm",
        version="2.0",
        description="Evaluates vulnerability discovery, prioritization, penetration testing, remediation, and patch management maturity—including supply chain scope, KPIs/KRIs, orchestration platforms, SOC integration, and AI-assisted triage.",
        role_ids=upm["target_audience_role_ids"],
        capabilities=capabilities,
        refs_doc=refs,
        readme=readme,
        remove_dirs=[
            "Update and Patch Management Service",
            "Vulnerability Management and Pentesting Service",
        ],
    )


def merge_pki() -> tuple[int, int]:
    cert, cert_refs = load_pack("Certificate Management Service")
    ckm, ckm_refs = load_pack("Cryptographic Key Management")
    cert_map = cap_by_id(cert)
    ckm_map = cap_by_id(ckm)

    capabilities = [
        cap(
            "pki-00",
            "Service exists and is in good condition",
            "service existence",
            "A PKI and cryptographic key management service exists and is reviewed at least quarterly for efficacy.",
            ["Enterprise PKI and key management service exists", "Regular service efficacy review"],
            "Process/Service",
        ),
        cap(
            "pki-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "PKI and key management KPIs and KRIs are documented and reviewed at least quarterly.",
            cert_map["cert-01"]["evaluation_focus"] + ckm_map["ckm-01"]["evaluation_focus"],
            "Strategy",
        ),
        ckm_map["ckm-02"] | {"id": "pki-02"},
        cap(
            "pki-03",
            "Centralized PKI, KMS, and HSM platform",
            "PKI platform",
            "Centralized certificate, KMS, and HSM platforms inventory and manage cryptographic assets enterprise-wide with quarterly configuration review.",
            cert_map["cert-02"]["evaluation_focus"] + ckm_map["ckm-03"]["evaluation_focus"],
            "Technology",
        ),
        cert_map["cert-03"] | {"id": "pki-04"},
        cap(
            "pki-05",
            "Key lifecycle management",
            "key lifecycle",
            "Key provisioning, rotation, state management, and revocation operate with documented processes and compromise response reviewed at least quarterly.",
            ckm_map["ckm-05"]["evaluation_focus"]
            + ckm_map["ckm-06"]["evaluation_focus"]
            + ckm_map["ckm-07"]["evaluation_focus"]
            + ckm_map["ckm-08"]["evaluation_focus"],
            "Process/Service",
        ),
        cap(
            "pki-06",
            "Machine identity and short-lived credentials",
            "machine identity",
            "Machine identity uses short-lived certificates and cloud KMS governance with quarterly review.",
            cert_map["cert-04"]["evaluation_focus"] + ckm_map["ckm-09"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "pki-07",
            "Custodianship and CEK roles",
            "custodianship",
            "Certificate and encryption key custodians and CEK roles are defined with separation of duties.",
            cert_map["cert-05"]["evaluation_focus"] + ckm_map["ckm-04"]["evaluation_focus"],
            "People",
        ),
    ]
    for c in capabilities:
        c["resiliency_weight"] = 1

    merge_map = {
        "pki-00": ["cert-00", "ckm-00"],
        "pki-01": ["cert-01", "ckm-01"],
        "pki-02": ["ckm-02"],
        "pki-03": ["cert-02", "ckm-03"],
        "pki-04": ["cert-03"],
        "pki-05": ["ckm-05", "ckm-06", "ckm-07", "ckm-08"],
        "pki-06": ["cert-04", "ckm-09"],
        "pki-07": ["cert-05", "ckm-04"],
    }
    refs = merge_questions(
        [cert_refs, ckm_refs],
        merge_map,
        capabilities,
        service_id="pki-cryptographic-key-management",
        service_name="PKI and Cryptographic Key Management",
        max_per_cap=7,
    )
    readme = """# PKI and Cryptographic Key Management

Merged evaluation pack combining Certificate Management and Cryptographic Key Management (v2.0 club).

## Service ID

`pki-cryptographic-key-management`
"""
    return write_pack_files(
        "PKI and Cryptographic Key Management",
        service_id="pki-cryptographic-key-management",
        service_name="PKI and Cryptographic Key Management",
        prefix="pki",
        version="2.0",
        description="Evaluates PKI and cryptographic key management maturity—centralized platforms, certificate and key lifecycle, machine identity, custodianship, and KPIs/KRIs.",
        role_ids=cert["target_audience_role_ids"],
        capabilities=capabilities,
        refs_doc=refs,
        readme=readme,
        remove_dirs=["Certificate Management Service", "Cryptographic Key Management"],
    )


def merge_auth_session_credential() -> tuple[int, int]:
    auth, auth_refs = load_pack("Authentication Service")
    ses, ses_refs = load_pack("Session Management Service")
    cred, cred_refs = load_pack("Credential Management Service")
    auth_map = cap_by_id(auth)
    ses_map = cap_by_id(ses)
    cred_map = cap_by_id(cred)

    capabilities = [
        cap(
            "asc-00",
            "Service exists and is in good condition",
            "service existence",
            "Authentication, session, and credential management services exist and are reviewed at least quarterly for efficacy.",
            [
                "Enterprise authentication, session, and credential services exist",
                "Regular service efficacy review",
            ],
            "Process/Service",
        ),
        cap(
            "asc-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Authentication, session, and credential KPIs and KRIs—including MFA coverage, SSO adoption, and credential hygiene—are documented and reviewed at least quarterly.",
            auth_map["auth-03"]["evaluation_focus"]
            + ses_map["ses-01"]["evaluation_focus"][2:]
            + cred_map["cred-01"]["evaluation_focus"][2:],
            "Strategy",
        ),
        auth_map["auth-01"] | {"id": "asc-02"},
        cap(
            "asc-03",
            "Service ownership and custodianship",
            "ownership",
            "Authentication and credential owners configure policies with central management when capabilities are siloed.",
            auth_map["auth-02"]["evaluation_focus"] + cred_map["cred-06"]["evaluation_focus"],
            "People",
        ),
        cap(
            "asc-04",
            "Modern authentication and credential policy",
            "MFA and credential policy",
            "Modern MFA, passwordless, and credential lifecycle policies are documented and enforced enterprise-wide with quarterly review.",
            auth_map["auth-04"]["evaluation_focus"] + cred_map["cred-02"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "asc-05",
            "Risk-based authentication and session validation",
            "adaptive auth",
            "Risk-based authentication and continuous session validation enforce re-authentication and renewal with quarterly configuration review.",
            auth_map["auth-05"]["evaluation_focus"] + ses_map["ses-04"]["evaluation_focus"],
            "Technology",
        ),
        ses_map["ses-02"] | {"id": "asc-06"},
        ses_map["ses-03"] | {"id": "asc-07"},
        cap(
            "asc-08",
            "Credential vault and lifecycle operations",
            "credential operations",
            "Secure credential vaults and lifecycle operations provision, rotate, and revoke credentials with quarterly review.",
            cred_map["cred-03"]["evaluation_focus"] + cred_map["cred-04"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "asc-09",
            "Non-human and API authentication",
            "non-human auth",
            "Non-human identities and API authentication use governed credentials with quarterly review.",
            auth_map["auth-06"]["evaluation_focus"] + cred_map["cred-05"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "asc-10",
            "Authentication and session logging",
            "auth logging",
            "Authentication and session events are logged to the SOC with anomaly detection reviewed at least quarterly.",
            auth_map["auth-07"]["evaluation_focus"] + ses_map["ses-05"]["evaluation_focus"],
            "Process/Service",
        ),
    ]
    for c in capabilities:
        c["resiliency_weight"] = 1

    merge_map = {
        "asc-00": ["auth-00", "ses-00", "cred-00"],
        "asc-01": ["auth-03", "ses-01", "cred-01"],
        "asc-02": ["auth-01"],
        "asc-03": ["auth-02", "cred-06"],
        "asc-04": ["auth-04", "cred-02"],
        "asc-05": ["auth-05", "ses-04"],
        "asc-06": ["ses-02"],
        "asc-07": ["ses-03"],
        "asc-08": ["cred-03", "cred-04"],
        "asc-09": ["auth-06", "cred-05"],
        "asc-10": ["auth-07", "ses-05"],
    }
    refs = merge_questions(
        [auth_refs, ses_refs, cred_refs],
        merge_map,
        capabilities,
        service_id="authentication-session-credential-management",
        service_name="Authentication, Session and Credential Management",
        max_per_cap=7,
    )
    return write_pack_files(
        "Authentication, Session and Credential Management",
        service_id="authentication-session-credential-management",
        service_name="Authentication, Session and Credential Management",
        prefix="asc",
        version="2.0",
        description="Evaluates authentication, session, and credential management maturity—MFA, SSO, federation, risk-based auth, credential vaults, non-human identity, and SOC logging.",
        role_ids=auth["target_audience_role_ids"],
        capabilities=capabilities,
        refs_doc=refs,
        readme="# Authentication, Session and Credential Management\n\nMerged auth + session + credential packs (v2.0).\n",
        remove_dirs=[
            "Authentication Service",
            "Session Management Service",
            "Credential Management Service",
        ],
    )


def merge_access_pam() -> tuple[int, int]:
    acm, acm_refs = load_pack("Access Management Service")
    pam, pam_refs = load_pack("Privileged Access Management Service")
    acm_map = cap_by_id(acm)
    pam_map = cap_by_id(pam)

    capabilities = [
        cap(
            "apa-00",
            "Service exists and is in good condition",
            "service existence",
            "Access and privileged access management services exist and are reviewed at least quarterly for efficacy.",
            ["Enterprise access management service exists", "Regular service efficacy review"],
            "Process/Service",
        ),
        cap(
            "apa-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Access and PAM KPIs and KRIs are documented and reviewed at least quarterly.",
            acm_map["acm-01"]["evaluation_focus"] + pam_map["pam-02"]["evaluation_focus"][2:],
            "Strategy",
        ),
        cap(
            "apa-02",
            "Access and PAM systems",
            "access systems",
            "Access management and PAM systems enforce network and application access with centralized administration reviewed at least quarterly.",
            acm_map["acm-02"]["evaluation_focus"] + pam_map["pam-01"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "apa-03",
            "Access provisioning and entitlement certification",
            "provisioning",
            "Unified access and privileged access provisioning with entitlement certification operates enterprise-wide with quarterly review.",
            acm_map["acm-03"]["evaluation_focus"]
            + acm_map["acm-07"]["evaluation_focus"]
            + pam_map["pam-03"]["evaluation_focus"],
            "Process/Service",
        ),
        acm_map["acm-04"] | {"id": "apa-04"},
        acm_map["acm-05"] | {"id": "apa-05"},
        acm_map["acm-06"] | {"id": "apa-06"},
        cap(
            "apa-07",
            "Guest and out-of-band access",
            "guest access",
            "Guest and out-of-band device access are governed with quarterly review.",
            acm_map["acm-08"]["evaluation_focus"] + acm_map["acm-09"]["evaluation_focus"],
            "Process/Service",
        ),
        acm_map["acm-10"] | {"id": "apa-08"},
        cap(
            "apa-09",
            "Custodianship and separation of duties",
            "custodianship",
            "Access and privilege account custodians operate with documented separation of duties.",
            acm_map["acm-11"]["evaluation_focus"] + pam_map["pam-05"]["evaluation_focus"],
            "People",
        ),
        cap(
            "apa-10",
            "Access logging and PAM session recording",
            "access logging",
            "Access, authorization, accounting, and PAM session recording feed the SOC with quarterly review.",
            acm_map["acm-12"]["evaluation_focus"] + pam_map["pam-06"]["evaluation_focus"],
            "Process/Service",
        ),
        acm_map["acm-13"] | {"id": "apa-11"},
        pam_map["pam-04"] | {"id": "apa-12"},
        acm_map["acm-14"] | {"id": "apa-13"},
    ]
    for c in capabilities:
        c["resiliency_weight"] = 1

    merge_map = {
        "apa-00": ["acm-00", "pam-00"],
        "apa-01": ["acm-01", "pam-02"],
        "apa-02": ["acm-02", "pam-01"],
        "apa-03": ["acm-03", "acm-07", "pam-03"],
        "apa-04": ["acm-04"],
        "apa-05": ["acm-05"],
        "apa-06": ["acm-06"],
        "apa-07": ["acm-08", "acm-09"],
        "apa-08": ["acm-10"],
        "apa-09": ["acm-11", "pam-05"],
        "apa-10": ["acm-12", "pam-06"],
        "apa-11": ["acm-13"],
        "apa-12": ["pam-04"],
        "apa-13": ["acm-14"],
    }
    refs = merge_questions(
        [acm_refs, pam_refs],
        merge_map,
        capabilities,
        service_id="access-privileged-access-management",
        service_name="Access and Privileged Access Management",
        max_per_cap=7,
    )
    return write_pack_files(
        "Access and Privileged Access Management",
        service_id="access-privileged-access-management",
        service_name="Access and Privileged Access Management",
        prefix="apa",
        version="2.0",
        description="Evaluates access and privileged access management maturity—provisioning, zero-trust access, entitlement certification, JIT privileged access, logging, and AI-era access governance.",
        role_ids=acm["target_audience_role_ids"],
        capabilities=capabilities,
        refs_doc=refs,
        readme="# Access and Privileged Access Management\n\nMerged access + PAM packs (v2.0).\n",
        remove_dirs=["Access Management Service", "Privileged Access Management Service"],
    )


def merge_policy_compliance() -> tuple[int, int]:
    plm, plm_refs = load_pack("Policy Management Service")
    cm, cm_refs = load_pack("Compliance Management Service")
    plm_map = cap_by_id(plm)
    cm_map = cap_by_id(cm)

    capabilities = [
        cap(
            "pcm-00",
            "Service exists and is in good condition",
            "service existence",
            "Policy and compliance management services exist and are reviewed at least quarterly for efficacy.",
            ["Policy and compliance management services exist", "Regular service efficacy review"],
            "Process/Service",
        ),
        cap(
            "pcm-01",
            "Reference framework and standards alignment",
            "framework and standards",
            "A reference policy framework and standards/regulations alignment provide enterprise-wide visibility and compliance scope reviewed at least quarterly.",
            plm_map["plm-01"]["evaluation_focus"] + cm_map["cm-03"]["evaluation_focus"],
            "Strategy",
        ),
        cap(
            "pcm-02",
            "KPIs, KRIs, and compliance metrics",
            "metrics",
            "Policy and compliance KPIs, KRIs, and metrics—including drift, exceptions, and remediation velocity—are documented and reviewed at least quarterly.",
            plm_map["plm-02"]["evaluation_focus"] + cm_map["cm-04"]["evaluation_focus"],
            "Strategy",
        ),
        cap(
            "pcm-03",
            "Policy and compliance platforms",
            "platforms",
            "Rule management and compliance scanning platforms support automation, policy-as-code, and enterprise-wide scanning with quarterly configuration review.",
            plm_map["plm-03"]["evaluation_focus"] + cm_map["cm-01"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "pcm-04",
            "Policy and compliance processes",
            "processes",
            "Rule lifecycle and compliance management processes are documented, automated where possible, and reviewed at least quarterly.",
            plm_map["plm-04"]["evaluation_focus"] + cm_map["cm-02"]["evaluation_focus"],
            "Process/Service",
        ),
        cap(
            "pcm-05",
            "Policy and compliance teams",
            "teams",
            "Policy and compliance teams are centralized or clearly defined with documented hierarchy and separation of duties.",
            plm_map["plm-05"]["evaluation_focus"] + cm_map["cm-05"]["evaluation_focus"],
            "People",
        ),
        cap(
            "pcm-06",
            "Software-defined and context-based policies",
            "software-defined policy",
            "Software-defined and context-based domain policies are maintained, deployed programmatically, and validated at least quarterly.",
            plm_map["plm-06"]["evaluation_focus"] + plm_map["plm-07"]["evaluation_focus"],
            "Technology",
        ),
        cap(
            "pcm-07",
            "Policy and compliance change monitoring",
            "change monitoring",
            "Policy and compliance changes are monitored and logged to the SOC with quarterly review.",
            plm_map["plm-08"]["evaluation_focus"] + cm_map["cm-08"]["evaluation_focus"],
            "Process/Service",
        ),
        cap(
            "pcm-08",
            "Asset hardening and posture compliance",
            "hardening compliance",
            "Endpoint posture and asset hardening policies align with compliance requirements including automated patching where possible.",
            cm_map["cm-06"]["evaluation_focus"] + cm_map["cm-07"]["evaluation_focus"],
            "Process/Service",
        ),
        cap(
            "pcm-09",
            "AI-era policy and compliance governance",
            "AI-era governance",
            "Policy and compliance governance accounts for AI adoption, dual-use model risk, and automated control validation.",
            plm_map["plm-09"]["evaluation_focus"] + cm_map["cm-09"]["evaluation_focus"],
            "Strategy",
        ),
    ]
    for c in capabilities:
        c["resiliency_weight"] = 1

    merge_map = {
        "pcm-00": ["plm-00", "cm-00"],
        "pcm-01": ["plm-01", "cm-03"],
        "pcm-02": ["plm-02", "cm-04"],
        "pcm-03": ["plm-03", "cm-01"],
        "pcm-04": ["plm-04", "cm-02"],
        "pcm-05": ["plm-05", "cm-05"],
        "pcm-06": ["plm-06", "plm-07"],
        "pcm-07": ["plm-08", "cm-08"],
        "pcm-08": ["cm-06", "cm-07"],
        "pcm-09": ["plm-09", "cm-09"],
    }
    refs = merge_questions(
        [plm_refs, cm_refs],
        merge_map,
        capabilities,
        service_id="policy-compliance-management",
        service_name="Policy and Compliance Management",
        max_per_cap=7,
    )
    return write_pack_files(
        "Policy and Compliance Management",
        service_id="policy-compliance-management",
        service_name="Policy and Compliance Management",
        prefix="pcm",
        version="2.0",
        description="Evaluates policy and compliance management maturity—reference frameworks, rule lifecycle, compliance scanning, hardening alignment, SOC monitoring, and AI-era governance.",
        role_ids=sorted(
            set(plm["target_audience_role_ids"] + cm["target_audience_role_ids"]),
            key=lambda r: [
                "grc-lead",
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "security-architecture-lead",
                "compliance-audit-lead",
                "it-director-head-of-it",
                "enterprise-risk-manager",
            ].index(r)
            if r
            in [
                "grc-lead",
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "security-architecture-lead",
                "compliance-audit-lead",
                "it-director-head-of-it",
                "enterprise-risk-manager",
            ]
            else 999,
        ),
        capabilities=capabilities,
        refs_doc=refs,
        readme="# Policy and Compliance Management\n\nMerged policy + compliance packs (v2.0).\n",
        remove_dirs=["Policy Management Service", "Compliance Management Service"],
    )


def absorb_esg_into_issp() -> tuple[int, int]:
    issp_caps, issp_refs = load_pack("Information Security Strategy and Planning Services")
    esg_caps, esg_refs = load_pack("Enterprise Security Governance")
    issp_map = cap_by_id(issp_caps)
    esg_map = cap_by_id(esg_caps)

    issp_map["issp-02"]["evaluation_focus"] = list(
        dict.fromkeys(
            issp_map["issp-02"]["evaluation_focus"]
            + esg_map["esg-02"]["evaluation_focus"]
        )
    )
    issp_map["issp-07"]["evaluation_focus"] = list(
        dict.fromkeys(
            issp_map["issp-07"]["evaluation_focus"]
            + esg_map["esg-01"]["evaluation_focus"]
        )
    )

    new_caps = [
        esg_map["esg-03"] | {"id": "issp-15"},
        esg_map["esg-04"] | {"id": "issp-16"},
        esg_map["esg-05"] | {"id": "issp-17"},
    ]
    capabilities = issp_caps["capabilities"] + new_caps
    for c in capabilities:
        c["resiliency_weight"] = 1

    merge_map = {c["id"]: [c["id"]] for c in capabilities}
    merge_map["issp-02"] = ["issp-02", "esg-02"]
    merge_map["issp-07"] = ["issp-07", "esg-01"]
    merge_map["issp-15"] = ["esg-03"]
    merge_map["issp-16"] = ["esg-04"]
    merge_map["issp-17"] = ["esg-05"]

    refs = merge_questions(
        [issp_refs, esg_refs],
        merge_map,
        capabilities,
        service_id="information-security-strategy-planning",
        service_name="Information Security Strategy and Planning Services",
        max_per_cap=7,
    )

    issp_caps["version"] = "1.5"
    issp_caps["capabilities"] = capabilities
    issp_caps["description"] = (
        issp_caps["description"]
        + " Includes enterprise security governance depth: segmentation governance, external expert input, and AI-era governance."
    )

    base = EVAL / "Information Security Strategy and Planning Services"
    (base / "capabilities.json").write_text(
        json.dumps(issp_caps, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (base / "reference-questions.json").write_text(
        json.dumps(refs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    readme = (base / "README.md").read_text(encoding="utf-8")
    if "### 1.5" not in readme:
        readme += "\n## Changelog\n\n### 1.5\n\n- Absorbed Enterprise Security Governance capabilities (segmentation governance, external expert input, AI-era governance)\n- Enhanced governance model and KPIs with ESG depth\n"
        (base / "README.md").write_text(readme, encoding="utf-8")

    shutil.rmtree(EVAL / "Enterprise Security Governance")
    n_caps = len(capabilities)
    n_qs = sum(len(g["questions"]) for g in refs["capability_questions"])
    return n_caps, n_qs


def update_audience_mappings() -> None:
    doc = json.loads(AUDIENCE_PATH.read_text(encoding="utf-8"))
    services = doc["services"]

    replacements = {
        "security-culture": "security-awareness-culture",
        "security-training": "security-awareness-culture",
        "update-patch-management": "vulnerability-remediation-management",
        "vulnerability-management-pentesting": "vulnerability-remediation-management",
        "certificate-management": "pki-cryptographic-key-management",
        "cryptographic-key-management": "pki-cryptographic-key-management",
        "authentication-service": "authentication-session-credential-management",
        "session-management": "authentication-session-credential-management",
        "credential-management": "authentication-session-credential-management",
        "access-management": "access-privileged-access-management",
        "privileged-access-management": "access-privileged-access-management",
        "policy-management": "policy-compliance-management",
        "compliance-management-service": "policy-compliance-management",
    }
    for old, new in replacements.items():
        services.pop(old, None)

    new_entries = {
        "security-awareness-culture": {
            "service_name": "Security Awareness and Culture",
            "role_ids": services.get("security-awareness-culture", {}).get("role_ids")
            or [
                "security-awareness-culture-lead",
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "grc-lead",
                "security-program-strategy-lead",
                "compliance-audit-lead",
            ],
        },
        "vulnerability-remediation-management": {
            "service_name": "Vulnerability and Remediation Management",
            "role_ids": [
                "it-director-head-of-it",
                "security-architecture-lead",
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "tprm-lead",
                "compliance-audit-lead",
                "grc-lead",
            ],
        },
        "pki-cryptographic-key-management": {
            "service_name": "PKI and Cryptographic Key Management",
            "role_ids": [
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "security-architecture-lead",
                "it-director-head-of-it",
                "grc-lead",
                "compliance-audit-lead",
                "security-program-strategy-lead",
            ],
        },
        "authentication-session-credential-management": {
            "service_name": "Authentication, Session and Credential Management",
            "role_ids": [
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "security-architecture-lead",
                "it-director-head-of-it",
                "grc-lead",
                "compliance-audit-lead",
                "security-program-strategy-lead",
            ],
        },
        "access-privileged-access-management": {
            "service_name": "Access and Privileged Access Management",
            "role_ids": [
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "security-architecture-lead",
                "it-director-head-of-it",
                "grc-lead",
                "compliance-audit-lead",
                "security-program-strategy-lead",
            ],
        },
        "policy-compliance-management": {
            "service_name": "Policy and Compliance Management",
            "role_ids": [
                "grc-lead",
                "ciso-head-of-security",
                "deputy-ciso-security-director",
                "security-architecture-lead",
                "compliance-audit-lead",
                "it-director-head-of-it",
                "enterprise-risk-manager",
            ],
        },
    }
    for sid, entry in new_entries.items():
        if sid not in services:
            services[sid] = entry

    services.pop("enterprise-security-governance", None)
    doc["services"] = dict(sorted(services.items()))
    AUDIENCE_PATH.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    results = []
    results.append(("Security Awareness and Culture", *merge_security_awareness_culture()))
    results.append(("Vulnerability and Remediation", *merge_vulnerability_remediation()))
    results.append(("PKI and Cryptographic Key Management", *merge_pki()))
    results.append(("Auth Session Credential", *merge_auth_session_credential()))
    results.append(("Access and PAM", *merge_access_pam()))
    results.append(("Policy and Compliance", *merge_policy_compliance()))
    results.append(("ISSP + ESG", *absorb_esg_into_issp()))
    update_audience_mappings()
    for name, n_caps, n_qs in results:
        print(f"{name}: {n_caps} capabilities, {n_qs} questions")


if __name__ == "__main__":
    main()
