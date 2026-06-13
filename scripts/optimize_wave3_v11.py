#!/usr/bin/env python3
"""Optimize Wave 3 evaluation packs from v1.0 to v1.1."""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EVAL = REPO / "evaluation-services"

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


def load_pack(name: str) -> tuple[dict, dict]:
    base = EVAL / name
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
    refs: dict,
    merge_map: dict[str, list[str]],
    new_caps: list[dict],
    *,
    max_per_cap: int = 6,
    extra_by_cap: dict[str, list[dict]] | None = None,
) -> dict:
    old_groups = {g["capability_id"]: g for g in refs["capability_questions"]}
    new_groups = []
    for nc in new_caps:
        cap_id = nc["id"]
        sources = merge_map.get(cap_id, [cap_id])
        merged: list[dict] = []
        seen_prompts: set[str] = set()
        seen_field_keys: set[str] = set()
        cap_suffix = cap_id.replace("-", "_")
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
                        "evaluation_focus": quarterly(q["evaluation_focus"]),
                    }
                )
        if extra_by_cap and cap_id in extra_by_cap:
            for q in extra_by_cap[cap_id]:
                merged.append(q)
        if not merged:
            raise ValueError(f"No questions for {cap_id} from sources {sources}")
        # Trim very long merges but keep coverage
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
        "service_id": refs["service_id"],
        "service_name": refs["service_name"],
        "capability_questions": new_groups,
    }


def write_pack(
    dir_name: str,
    caps_doc: dict,
    refs_doc: dict,
    readme: str,
) -> tuple[int, int]:
    base = EVAL / dir_name
    caps_doc["version"] = "1.1"
    caps_doc["evaluation"] = copy.deepcopy(EVAL_BLOCK)
    (base / "capabilities.json").write_text(
        json.dumps(caps_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (base / "reference-questions.json").write_text(
        json.dumps(refs_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (base / "README.md").write_text(readme, encoding="utf-8")
    n_caps = len(caps_doc["capabilities"])
    n_qs = sum(len(g["questions"]) for g in refs_doc["capability_questions"])
    return n_caps, n_qs


def optimize_network_management() -> tuple[int, int]:
    _, refs = load_pack("Network Management Service")
    capabilities = [
        cap(
            "nm-00",
            "Service exists and is in good condition",
            "service existence",
            "A network management service exists, is scoped appropriately, and is reviewed at least quarterly for efficacy.",
            ["Enterprise network management service exists", "Regular service efficacy review"],
            "Process/Service",
        ),
        cap(
            "nm-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Network management KPIs and KRIs—including availability, fault MTTR, and capacity utilization—are documented and reviewed at least quarterly.",
            [
                "Documented KPIs and KRIs for network management",
                "Regular KPI/KRI review",
                "Network availability and fault recovery metrics",
                "Capacity utilization and scaling effectiveness metrics",
            ],
            "Strategy",
        ),
        cap(
            "nm-02",
            "Network management process",
            "network management process",
            "An enterprise-wide formalized network management process is documented, automated where appropriate, aligned to zero-trust segmentation, and reviewed at least quarterly.",
            [
                "Enterprise-wide formalized documented network management process",
                "Network management process automation",
                "Zero-trust segmentation alignment in network operations",
                "Regular network management process review",
            ],
            "Process/Service",
        ),
        cap(
            "nm-03",
            "NMS Platform",
            "NMS platform",
            "An NMS platform manages network devices enterprise-wide, supports automation, is reviewed at least quarterly, and integrates with configuration, asset, and policy management systems.",
            [
                "NMS platform exists",
                "Enterprise-wide network device management",
                "NMS automation features such as upgrades and remediation",
                "Regular NMS platform configuration review",
                "Integration with configuration, asset, and policy management systems",
            ],
            "Technology",
        ),
        cap(
            "nm-04",
            "Capacity planning and scale",
            "capacity and scale",
            "Capacity planning monitors availability and performance enterprise-wide; the network supports automatic or programmatic scaling with configuration reviewed at least quarterly.",
            [
                "Formalized documented capacity planning process",
                "Network expansion based on workload increase",
                "Enterprise-wide scaling capability",
                "Automatic or programmatic capacity expansion",
                "Regular capacity and scaling configuration review",
            ],
            "Technology",
        ),
        cap(
            "nm-05",
            "Network visibility and fault correlation",
            "visibility and faults",
            "The NMS provides full enterprise-wide network visibility with fault detection, correlation, and segmentation context.",
            [
                "Full enterprise-wide network visibility in NMS",
                "Full fault visibility and correlation across the network",
                "Segmentation and trust-zone visibility in NMS",
            ],
            "Technology",
        ),
        cap(
            "nm-06",
            "Network device user management",
            "NMS user management",
            "The NMS can create and manage users who access the platform and view dashboards with role-appropriate scope.",
            ["NMS user creation and management for dashboard access"],
            "People",
        ),
        cap(
            "nm-07",
            "Network monitoring",
            "network monitoring",
            "The NMS deploys monitoring mechanisms such as SNMP and Syslog and monitors all network devices enterprise-wide.",
            [
                "SNMP, Syslog, and similar monitoring mechanisms",
                "Enterprise-wide network device monitoring",
            ],
            "Technology",
        ),
    ]
    merge_map = {
        "nm-00": ["nm-00"],
        "nm-01": ["nm-01"],
        "nm-02": ["nm-02"],
        "nm-03": ["nm-03"],
        "nm-04": ["nm-04", "nm-09"],
        "nm-05": ["nm-05", "nm-08"],
        "nm-06": ["nm-06"],
        "nm-07": ["nm-07"],
    }
    extra = {
        "nm-02": [
            {
                "prompt": "Does the network management process align operations with zero-trust segmentation and micro-segmentation policies?",
                "intent": "Evaluate whether network management aligns with zero-trust segmentation",
                "field_key": "nm_02_ztna_segmentation_alignment",
                "evaluation_focus": "Zero-trust segmentation alignment in network operations",
            }
        ],
        "nm-05": [
            {
                "prompt": "Does the NMS expose segmentation boundaries, trust zones, or policy enforcement context alongside topology visibility?",
                "intent": "Evaluate whether NMS provides segmentation and trust-zone visibility",
                "field_key": "nm_05_segmentation_visibility",
                "evaluation_focus": "Segmentation and trust-zone visibility in NMS",
            }
        ],
    }
    refs_doc = merge_questions(refs, merge_map, capabilities, extra_by_cap=extra)
    caps_doc = {
        "service_id": "network-management",
        "service_name": "Network Management Service",
        "description": quarterly(
            "Evaluates network management service maturity—service governance, KPIs/KRIs, network management processes, "
            "NMS platform capabilities, zero-trust segmentation alignment, capacity planning and scale, visibility and fault "
            "correlation, device user management, and network monitoring."
        ),
        "capabilities": capabilities,
        "target_audience_role_ids": [
            "it-director-head-of-it",
            "security-architecture-lead",
            "ciso-head-of-security",
            "deputy-ciso-security-director",
            "grc-lead",
            "compliance-audit-lead",
            "security-program-strategy-lead",
        ],
    }
    readme = """# Network Management Service (evaluation service pack)

- **service_id**: `network-management`
- **Prefix**: `nm-` (e.g. `nm-00`, `rq-nm-00-1`)
- **8 capabilities**, **reference questions** (see validator output)
- **version**: 1.1

```bash
python3 "evaluation-services/Network Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged capacity planning and scale (`nm-04` + legacy `nm-09`)
- Merged network visibility and fault correlation (`nm-05` + legacy `nm-08`)
- Added zero-trust segmentation alignment to network management process (`nm-02`)
- Added segmentation visibility to NMS observability (`nm-05`)
- Refreshed KPIs (`nm-01`); added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
"""
    return write_pack("Network Management Service", caps_doc, refs_doc, readme)


def optimize_configuration_management() -> tuple[int, int]:
    _, refs = load_pack("Configuration Management Service")
    capabilities = [
        cap(
            "cfm-00",
            "Service exists and is in good condition",
            "service existence",
            "A configuration management service exists and is reviewed at least quarterly for efficacy.",
            ["Enterprise configuration management service exists", "Regular service efficacy review"],
            "Process/Service",
        ),
        cap(
            "cfm-01",
            "Configuration management business process",
            "business process",
            "A formalized configuration management process applies enterprise-wide, is automated, and reviewed at least quarterly.",
            [
                "Formalized and documented process",
                "Enterprise-wide process adoption",
                "Process automation",
                "Regular process review",
            ],
            "Process/Service",
        ),
        cap(
            "cfm-02",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Configuration management KPIs and KRIs—including drift detection, CMDB accuracy, and policy compliance—are documented and reviewed at least quarterly.",
            [
                "Documented KPIs and KRIs",
                "Regular KPI/KRI review",
                "Configuration drift and CMDB accuracy metrics",
            ],
            "Strategy",
        ),
        cap(
            "cfm-03",
            "Configuration Management policy",
            "configuration policies",
            "Formal configuration management policies for subject, endpoint, network, application, and data or database changes apply enterprise-wide and are reviewed at least quarterly.",
            [
                "Subject configuration policy",
                "Endpoint configuration policy",
                "Network configuration policy",
                "Application configuration policy",
                "Data/database configuration policy",
                "Regular policy review",
            ],
            "Strategy",
        ),
        cap(
            "cfm-04",
            "Configuration management system (CMDB)",
            "CMDB",
            "A CMDB centrally manages configuration items with automated add/remove, integrity review, and integration with change, policy, and visibility solutions.",
            [
                "Central CMDB for configuration items",
                "Automated CMDB add and remove",
                "CMDB integrity review",
                "Integration with change, policy, and visibility solutions",
            ],
            "Technology",
        ),
        cap(
            "cfm-05",
            "Network provisioning and design documentation",
            "network provisioning",
            "SDN provisions the network from centralized configuration storage; network and application design documents are stored securely enterprise-wide and reviewed at least quarterly.",
            [
                "Network provisioned from configuration storage",
                "Central network configuration storage",
                "Automated SDN provisioning",
                "SDN configuration review",
                "SDN integration with security solutions",
                "Network and application design documents stored",
                "Secure enterprise-wide document storage",
                "Regular design and configuration review",
            ],
            "Technology",
        ),
        cap(
            "cfm-06",
            "Workload and endpoint configuration management",
            "workload and endpoint config",
            "Application and endpoint configuration is managed centrally with trigger-based automation, secure storage, and regular review.",
            [
                "Application configuration management solution",
                "Central application configuration management",
                "Trigger-based configuration automation",
                "Regular application configuration review",
                "Secure application configuration storage",
                "Enterprise-wide vs critical-only storage scope",
                "Endpoint configuration management solution",
                "Central endpoint configuration management",
                "Trigger-based endpoint configuration automation",
                "Regular endpoint configuration review",
            ],
            "Technology",
        ),
        cap(
            "cfm-07",
            "Configuration management responsibility",
            "configuration responsibility",
            "Dedicated teams manage identity, endpoint, application, data, and network configuration assets centrally.",
            [
                "Identity and subject configuration team",
                "Endpoint configuration team",
                "Application configuration team",
                "Data configuration team",
                "Network configuration team",
            ],
            "People",
        ),
        cap(
            "cfm-08",
            "Configuration change monitoring",
            "configuration logging",
            "Configuration changes and lifecycle events are logged securely to the SOC, including dynamic changes and infrastructure-as-code pipeline events.",
            [
                "Documented configuration logging to SOC",
                "Secure configuration logging to SOC",
                "Dynamic configuration changes to SOC",
                "Infrastructure-as-code pipeline change logging",
            ],
            "Technology",
        ),
    ]
    merge_map = {
        "cfm-00": ["cfm-00"],
        "cfm-01": ["cfm-01"],
        "cfm-02": ["cfm-02"],
        "cfm-03": ["cfm-03"],
        "cfm-04": ["cfm-04"],
        "cfm-05": ["cfm-05", "cfm-06"],
        "cfm-06": ["cfm-07", "cfm-08", "cfm-09"],
        "cfm-07": ["cfm-10"],
        "cfm-08": ["cfm-11"],
    }
    extra = {
        "cfm-08": [
            {
                "prompt": "Are infrastructure-as-code and policy-as-code pipeline changes logged to the SOC alongside runtime configuration changes?",
                "intent": "Evaluate whether IaC pipeline changes are logged to the SOC",
                "field_key": "cfm_08_iac_pipeline_logging",
                "evaluation_focus": "Infrastructure-as-code pipeline change logging",
            }
        ],
    }
    refs_doc = merge_questions(refs, merge_map, capabilities, max_per_cap=8, extra_by_cap=extra)
    caps_doc = {
        "service_id": "configuration-management",
        "service_name": "Configuration Management Service",
        "description": quarterly(
            "Evaluates configuration management service maturity—business processes, KPIs/KRIs, policies by configuration type, "
            "CMDB, SDN provisioning and design documentation, workload and endpoint configuration, responsibility models, "
            "infrastructure-as-code change monitoring, and SOC logging."
        ),
        "capabilities": capabilities,
        "target_audience_role_ids": [
            "it-director-head-of-it",
            "security-architecture-lead",
            "ciso-head-of-security",
            "deputy-ciso-security-director",
            "grc-lead",
            "compliance-audit-lead",
            "security-program-strategy-lead",
        ],
    }
    readme = """# Configuration Management Service (evaluation service pack)

- **service_id**: `configuration-management`
- **Prefix**: `cfm-` (e.g. `cfm-00`, `rq-cfm-00-1`)
- **9 capabilities**, **reference questions** (see validator output)
- **version**: 1.1

```bash
python3 "evaluation-services/Configuration Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged SDN provisioning and network design documentation (`cfm-05` + legacy `cfm-06`)
- Merged workload and endpoint configuration management (`cfm-06` + legacy `cfm-07`–`cfm-09`)
- Refreshed KPIs (`cfm-02`); added IaC pipeline logging to SOC monitoring (`cfm-08`)
- Added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
"""
    return write_pack("Configuration Management Service", caps_doc, refs_doc, readme)


def optimize_container_management() -> tuple[int, int]:
    _, refs = load_pack("Container Management")
    capabilities = [
        cap(
            "ctm-00",
            "Service exists and is in good condition",
            "service existence",
            "A container management service exists, is scoped appropriately, and is reviewed at least quarterly for efficacy.",
            [
                "Enterprise container management service exists",
                "Regular container management service efficacy review",
            ],
            "Process/Service",
        ),
        cap(
            "ctm-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Container management KPIs and KRIs—including image vulnerability age, cluster compliance, and resource efficiency—are documented and reviewed at least quarterly.",
            [
                "Documented KPIs and KRIs for container management",
                "Regular KPI/KRI review",
                "Image vulnerability and cluster compliance metrics",
            ],
            "Strategy",
        ),
        cap(
            "ctm-02",
            "Container testing, development and deployment policies",
            "container lifecycle policies",
            "Enterprise-wide container management and lifecycle policies apply across the organization and are reviewed at least quarterly.",
            [
                "Enterprise-wide container management and lifecycle policies",
                "Enterprise-wide policy application",
                "Regular container management policy review",
            ],
            "Strategy",
        ),
        cap(
            "ctm-03",
            "Container management software",
            "orchestration platform",
            "Container management and orchestration software manages container infrastructure enterprise-wide, automates lifecycle, enforces supply chain image provenance, and integrates with asset, vulnerability, and compliance systems.",
            [
                "Container management software for container infrastructure",
                "Enterprise-specific or multi-type orchestrator deployment",
                "Automated container lifecycle management",
                "Regular container management and orchestration configuration review",
                "Integration with asset, vulnerability, and compliance management systems",
                "Container image provenance and supply chain verification",
            ],
            "Technology",
        ),
        cap(
            "ctm-04",
            "Container Resource management",
            "resource management",
            "The container management system performs efficient resource management based on policies for all or critical containers with automated deployment of best practices.",
            [
                "Efficient resource management based on container policies",
                "Resource management scope for all or critical containers",
                "Automated resource management practices",
            ],
            "Technology",
        ),
        cap(
            "ctm-05",
            "Container Security",
            "container security",
            "Container security deploys function-specific controls across the ecosystem, supports automated response to compromises and policy changes, and is reviewed at least quarterly.",
            [
                "Function-specific security for container systems",
                "Container security scope across ecosystem or specific vendors",
                "Automated container security deployment",
                "Regular container security practice review",
                "Native or externally integrated container security features",
                "Runtime threat detection and policy enforcement for workloads",
            ],
            "Technology",
        ),
    ]
    merge_map = {c["id"]: [c["id"]] for c in capabilities}
    extra = {
        "ctm-03": [
            {
                "prompt": "Does the organization verify container image provenance and block deployment of images from untrusted registries or with known supply chain risk?",
                "intent": "Evaluate container image provenance and supply chain controls",
                "field_key": "ctm_03_image_provenance_supply_chain",
                "evaluation_focus": "Container image provenance and supply chain verification",
            }
        ],
    }
    refs_doc = merge_questions(refs, merge_map, capabilities, extra_by_cap=extra)
    caps_doc = {
        "service_id": "container-management",
        "service_name": "Container Management",
        "description": quarterly(
            "Evaluates container management maturity—service governance, KPIs/KRIs, lifecycle policies, container management "
            "and orchestration software, supply chain image provenance, resource management, and container security."
        ),
        "capabilities": capabilities,
        "target_audience_role_ids": [
            "it-director-head-of-it",
            "security-architecture-lead",
            "ciso-head-of-security",
            "deputy-ciso-security-director",
            "grc-lead",
            "compliance-audit-lead",
            "security-program-strategy-lead",
        ],
    }
    readme = """# Container Management (evaluation service pack)

- **service_id**: `container-management`
- **Prefix**: `ctm-` (e.g. `ctm-00`, `rq-ctm-00-1`)
- **6 capabilities**, **reference questions** (see validator output)
- **version**: 1.1

```bash
python3 "evaluation-services/Container Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Added container image provenance and supply chain verification to orchestration platform (`ctm-03`)
- Refreshed KPIs (`ctm-01`) and container security (`ctm-05`)
- Added `short_name` on all capabilities; standardized quarterly review cadence
"""
    return write_pack("Container Management", caps_doc, refs_doc, readme)


def optimize_production_workload_management() -> tuple[int, int]:
    _, refs = load_pack("Production Workload Management")
    capabilities = [
        cap(
            "pwm-00",
            "Service exists and is in good condition",
            "service existence",
            "An application or production workload management service exists, is scoped appropriately, and is reviewed at least quarterly for efficacy.",
            [
                "Enterprise application or production workload management service exists",
                "Regular workload management service efficacy review",
            ],
            "Process/Service",
        ),
        cap(
            "pwm-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Workload management KPIs and KRIs—including availability, API security posture, and scaling effectiveness—are documented and reviewed at least quarterly.",
            [
                "Documented KPIs and KRIs for workload management",
                "Regular KPI/KRI review",
                "Application availability and API security metrics",
            ],
            "Strategy",
        ),
        cap(
            "pwm-02",
            "Application management process",
            "application management",
            "A formalized application management process covers capacity planning, fault identification, segmentation, provisioning, and application security enterprise-wide.",
            [
                "Formalized documented application management process",
                "Enterprise-wide application management process deployment",
                "Zero-trust segmentation in production workload management",
                "Regular application management process review",
            ],
            "Process/Service",
        ),
        cap(
            "pwm-03",
            "Application classifications",
            "application classifications",
            "Applications, containers, systems, and VMs are classified, automation supports classification, classifications are reviewed at least quarterly, and integrate with other technology such as object profiles.",
            [
                "Application classifications for applications, containers, systems, and VMs",
                "Automated application classification in workload management",
                "Regular application classification review",
                "Integration of classifications into other technology such as object profiles",
            ],
            "Process/Service",
        ),
        cap(
            "pwm-04",
            "Workload Capacity expansion",
            "capacity expansion",
            "Enterprise applications can expand capacity based on workload demand enterprise-wide or for critical apps, support automatic or programmatic scaling, and scaling configuration is reviewed at least quarterly.",
            [
                "Application capacity expansion based on workload increase",
                "Enterprise-wide or critical-application scaling scope",
                "Automatic or programmatic capacity expansion",
                "Regular scaling configuration review",
            ],
            "Technology",
        ),
        cap(
            "pwm-05",
            "User Management on Production workload",
            "production user management",
            "Formalized policies govern local and external authentication for applications and containers, with external authentication enabled via AD and embedded in golden images and provisioning templates.",
            [
                "Formalized policy on local and external authentication",
                "External authentication to AD for all applications",
                "External authentication in golden images and provisioning templates",
            ],
            "People",
        ),
        cap(
            "pwm-06",
            "Application Security Baseline",
            "security baseline",
            "Application baseline templates are generated for all applications, can be automated from flow discovery, and are reviewed at least quarterly for accuracy.",
            [
                "Application baseline templates for all applications",
                "Automated baseline generation from flow discovery",
                "Regular baseline template review for accuracy",
            ],
            "Technology",
        ),
        cap(
            "pwm-07",
            "Application and API security",
            "application and API security",
            "API security is treated as a core application security concern with formalized documented policies, secure API deployment, and API gateway protection reviewed at least quarterly.",
            [
                "API security as an important aspect of application security",
                "Formalized documented application security policies",
                "Regular application security policy review",
                "Secure API deployment for all applications",
                "API gateways protecting workloads that expose APIs",
            ],
            "Strategy",
        ),
        cap(
            "pwm-08",
            "Application performance monitoring",
            "performance monitoring",
            "Application performance monitoring is deployed enterprise-wide or for critical apps, automated during provisioning or development, and integrated with the SOC for availability context.",
            [
                "Application performance monitoring deployment",
                "APM scope across all or critical applications",
                "Automated APM during provisioning or development",
                "APM integration with SOC for availability context",
            ],
            "Technology",
        ),
    ]
    merge_map = {
        "pwm-00": ["pwm-00"],
        "pwm-01": ["pwm-01"],
        "pwm-02": ["pwm-02"],
        "pwm-03": ["pwm-03"],
        "pwm-04": ["pwm-04"],
        "pwm-05": ["pwm-05"],
        "pwm-06": ["pwm-06"],
        "pwm-07": ["pwm-07", "pwm-08"],
        "pwm-08": ["pwm-09"],
    }
    extra = {
        "pwm-02": [
            {
                "prompt": "Does the application management process incorporate zero-trust segmentation and workload isolation for production environments?",
                "intent": "Evaluate zero-trust segmentation in production workload management",
                "field_key": "pwm_02_zt_segmentation",
                "evaluation_focus": "Zero-trust segmentation in production workload management",
            }
        ],
    }
    refs_doc = merge_questions(refs, merge_map, capabilities, max_per_cap=7, extra_by_cap=extra)
    caps_doc = {
        "service_id": "production-workload-management",
        "service_name": "Production Workload Management",
        "description": quarterly(
            "Evaluates production workload management maturity—service governance, KPIs/KRIs, application management processes, "
            "zero-trust segmentation, classifications, capacity expansion, production user authentication, security baselines, "
            "application and API security, and application performance monitoring."
        ),
        "capabilities": capabilities,
        "target_audience_role_ids": [
            "it-director-head-of-it",
            "security-architecture-lead",
            "ciso-head-of-security",
            "deputy-ciso-security-director",
            "grc-lead",
            "compliance-audit-lead",
            "security-program-strategy-lead",
        ],
    }
    readme = """# Production Workload Management (evaluation service pack)

- **service_id**: `production-workload-management`
- **Prefix**: `pwm-` (e.g. `pwm-00`, `rq-pwm-00-1`)
- **9 capabilities**, **reference questions** (see validator output)
- **version**: 1.1

```bash
python3 "evaluation-services/Production Workload Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged application security policy and secure API deployment (`pwm-07` + legacy `pwm-07`/`pwm-08`)
- Added zero-trust segmentation to application management process (`pwm-02`)
- Refreshed KPIs (`pwm-01`); added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
"""
    return write_pack("Production Workload Management", caps_doc, refs_doc, readme)


def optimize_facilities_management() -> tuple[int, int]:
    _, refs = load_pack("Facilities Management Service")
    capabilities = [
        cap(
            "fac-00",
            "Service exists and is in good condition",
            "service existence",
            "A facilities management service exists and is reviewed at least quarterly for efficacy.",
            ["Enterprise facilities management service exists", "Regular service efficacy review"],
            "Process/Service",
        ),
        cap(
            "fac-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Facilities management KPIs and KRIs—including physical access incidents, environmental excursions, and utility test compliance—are documented and reviewed at least quarterly.",
            [
                "Documented KPIs and KRIs",
                "Regular KPI/KRI review",
                "Physical access and environmental excursion metrics",
            ],
            "Strategy",
        ),
        cap(
            "fac-02",
            "Controlled Access Points and Secure Area Authorization",
            "physical access control",
            "Physical access to data centers is controlled and functional zones are physically separated.",
            [
                "Physical access control to data centers",
                "Physical separation of functional zones",
            ],
            "Process/Service",
        ),
        cap(
            "fac-03",
            "Equipment Identification",
            "equipment identification",
            "Accurate equipment identification validates physical asset placements and is reviewed at least quarterly.",
            [
                "Accurate equipment identification for asset placement",
                "Regular physical equipment identification review",
            ],
            "Process/Service",
        ),
        cap(
            "fac-04",
            "Surveillance System",
            "surveillance",
            "Surveillance at all data centers identifies and calls out unauthorized or anomalous access.",
            ["Data center surveillance for unauthorized access"],
            "Technology",
        ),
        cap(
            "fac-05",
            "Unauthorized Access Response Training",
            "access response training",
            "Formal training on unauthorized data center access is provided for all data center personnel.",
            ["Formal unauthorized access training for DC personnel"],
            "People",
        ),
        cap(
            "fac-06",
            "Cabling Security",
            "cabling security",
            "Power and telecommunication cables receive risk-based protection from interception, interference, or damage at all facilities.",
            ["Risk-based cabling protection at all facilities"],
            "Process/Service",
        ),
        cap(
            "fac-07",
            "Environmental Systems",
            "environmental systems",
            "Data center environmental control systems monitor, maintain, and test temperature and humidity within industry standards.",
            ["Environmental monitoring and testing within industry standards"],
            "Technology",
        ),
        cap(
            "fac-08",
            "Secure Utilities",
            "secure utilities",
            "Utility services are secured, monitored, maintained, and tested at planned intervals.",
            ["Secured and tested utility services"],
            "Process/Service",
        ),
        cap(
            "fac-09",
            "Equipment Location",
            "equipment location",
            "Business-critical equipment is kept away from locations with high probability of environmental risk events.",
            ["Business-critical equipment away from high environmental risk locations"],
            "Process/Service",
        ),
    ]
    merge_map = {c["id"]: [c["id"]] for c in capabilities}
    refs_doc = merge_questions(refs, merge_map, capabilities)
    caps_doc = {
        "service_id": "facilities-management",
        "service_name": "Facilities Management Service",
        "description": quarterly(
            "Evaluates facilities management service maturity—physical access control, equipment identification, surveillance, "
            "unauthorized access training, cabling security, environmental systems, secure utilities, and equipment location."
        ),
        "capabilities": capabilities,
        "target_audience_role_ids": [
            "ciso-head-of-security",
            "deputy-ciso-security-director",
            "security-architecture-lead",
            "it-director-head-of-it",
            "grc-lead",
            "compliance-audit-lead",
            "enterprise-risk-manager",
            "security-program-strategy-lead",
        ],
    }
    readme = """# Facilities Management Service (evaluation service pack)

- **service_id**: `facilities-management`
- **Prefix**: `fac-` (e.g. `fac-00`, `rq-fac-00-1`)
- **10 capabilities**, **reference questions** (see validator output)
- **version**: 1.1

```bash
python3 "evaluation-services/Facilities Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Refreshed KPIs (`fac-01`)
- Added `short_name` on all capabilities; standardized quarterly review cadence
"""
    return write_pack("Facilities Management Service", caps_doc, refs_doc, readme)


def optimize_enterprise_asset_management() -> tuple[int, int]:
    _, refs = load_pack("Enterprise Asset Management")
    capabilities = [
        cap(
            "eam-00",
            "Service exists and is in good condition",
            "service existence",
            "An enterprise asset management service exists, is scoped across endpoint, network, and application assets, and is reviewed at least quarterly for efficacy.",
            [
                "Enterprise asset management service exists",
                "Regular service efficacy review",
                "Endpoint, network, and application asset scope",
            ],
            "Process/Service",
        ),
        cap(
            "eam-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Enterprise asset management KPIs and KRIs—including inventory accuracy, provisioning velocity, and shadow asset discovery—are documented and reviewed at least quarterly across asset types.",
            [
                "Documented KPIs and KRIs across asset types",
                "Regular KPI/KRI review",
                "Inventory accuracy and lifecycle velocity metrics",
                "Shadow asset discovery metrics",
            ],
            "Strategy",
        ),
        cap(
            "eam-02",
            "Enterprise asset management system",
            "EAM platform",
            "A centralized enterprise asset management system automates lifecycle functions, is reviewed at least quarterly, and integrates with access, logging, and compliance systems.",
            [
                "Centralized vs siloed asset management",
                "Automated asset lifecycle functions",
                "Asset management configuration review",
                "Integration with access, logging, and compliance systems",
            ],
            "Technology",
        ),
        cap(
            "eam-03",
            "SSRM and procurement policy",
            "SSRM and procurement",
            "SSRM strategy and procurement policies govern third-party and managed assets across endpoint, application, and network domains and are reviewed at least quarterly.",
            [
                "SSRM strategy and policy",
                "Third-party asset scope",
                "SSRM policy review",
                "Endpoint procurement policy",
                "Application procurement policy",
                "Network procurement policy",
            ],
            "Strategy",
        ),
        cap(
            "eam-04",
            "Unmanaged and mobile assets",
            "unmanaged and mobile",
            "BYOD and mobile asset policies govern unmanaged and mobile device provisioning, security, network access, and self-registration enterprise-wide.",
            [
                "BYOD policy exists",
                "Enterprise-wide BYOD implementation",
                "BYOD policy review",
                "Unmanaged device provisioning and security",
                "Unmanaged device network access",
                "Self-register portal for unmanaged devices",
                "MDM policy exists",
                "Enterprise-wide MDM implementation",
                "MDM policy review",
                "Mobile device provisioning and security",
                "Mobile device network access",
                "Self-register portal for mobile devices",
            ],
            "Strategy",
        ),
        cap(
            "eam-05",
            "Managed asset security policies",
            "security policies",
            "Formalized security policies for endpoint, application, and network managed assets apply enterprise-wide and are reviewed at least quarterly.",
            [
                "Formalized endpoint security policy",
                "Enterprise-wide endpoint security policy",
                "Endpoint security policy review",
                "Formalized application security policy",
                "Enterprise-wide application security policy",
                "Application security policy review",
                "Formalized network security policy",
                "Enterprise-wide network security policy",
                "Network security policy review",
            ],
            "Strategy",
        ),
        cap(
            "eam-06",
            "Managed asset provisioning and deprovisioning policies",
            "lifecycle policies",
            "Formalized provisioning and deprovisioning policies for endpoint, application, and network managed assets apply enterprise-wide and are reviewed at least quarterly.",
            [
                "Formalized endpoint provisioning policy",
                "Enterprise-wide endpoint provisioning policy",
                "Endpoint provisioning policy review",
                "Formalized application provisioning policy",
                "Enterprise-wide application provisioning policy",
                "Application provisioning policy review",
                "Formalized network provisioning policy",
                "Enterprise-wide network provisioning policy",
                "Network provisioning policy review",
                "Formalized endpoint deprovisioning policy",
                "Enterprise-wide endpoint deprovisioning policy",
                "Endpoint deprovisioning policy review",
                "Formalized application deprovisioning policy",
                "Enterprise-wide application deprovisioning policy",
                "Application deprovisioning policy review",
                "Formalized network deprovisioning policy",
                "Enterprise-wide network deprovisioning policy",
                "Network deprovisioning policy review",
            ],
            "Strategy",
        ),
        cap(
            "eam-07",
            "Asset inventory and registration lifecycle",
            "inventory and registration",
            "Inventory tracking and registration or de-registration processes cover endpoint, application, and network assets with automation and regular review.",
            [
                "Endpoint inventory process",
                "Application inventory process",
                "Network device inventory process",
                "Asset registration capability",
                "All assets registered",
                "Automated registration",
                "Registration process review",
                "Asset de-registration capability",
                "All assets de-registered",
                "Automated de-registration",
                "De-registration process review",
            ],
            "Process/Service",
        ),
        cap(
            "eam-08",
            "Self-service provisioning, deprovisioning, and migration",
            "self-service lifecycle",
            "Self-service provisioning and deprovisioning plus migration processes cover endpoint, application, and network assets with automation where appropriate.",
            [
                "Endpoint provisioning",
                "Application provisioning",
                "Network provisioning",
                "Endpoint deprovisioning",
                "Application deprovisioning",
                "Network deprovisioning",
                "Endpoint migration process",
                "Endpoint migration automation",
                "Endpoint migration review",
                "Network migration process",
                "Network migration automation",
                "Network migration review",
            ],
            "Process/Service",
        ),
        cap(
            "eam-09",
            "Threat protection and supply chain visibility",
            "threat and supply chain",
            "Threat protections and supply chain visibility span endpoint, application, and network assets with enterprise-wide coverage.",
            [
                "Endpoint threat protections",
                "Application threat protections",
                "Network threat protections",
                "Endpoint supply chain visibility",
                "Network supply chain visibility",
                "Application supply chain visibility",
            ],
            "Technology",
        ),
        cap(
            "eam-10",
            "Asset access and user management",
            "asset access control",
            "Identity and context-based access control governs asset platform users with regular review.",
            [
                "Identity and context-based asset access control",
                "Asset access user review",
            ],
            "Technology",
        ),
        cap(
            "eam-11",
            "Asset management custodians",
            "custodians",
            "Separate asset management custodians are assigned by asset type with clear separation of duties.",
            ["Separate asset management custodians by asset type"],
            "People",
        ),
        cap(
            "eam-12",
            "Shadow asset handling",
            "shadow IT",
            "Shadow IT is managed enterprise-wide with automated discovery where possible.",
            [
                "Shadow IT management across enterprise",
                "Automated shadow IT discovery",
            ],
            "Technology",
        ),
        cap(
            "eam-13",
            "Enterprise asset management logging",
            "asset logging",
            "Asset lifecycle logs and dynamic state changes are logged securely to the SOC.",
            [
                "Documented asset lifecycle logging to SOC",
                "Secure asset logging to SOC",
                "Dynamic asset state changes to SOC",
            ],
            "Technology",
        ),
    ]
    merge_map = {
        "eam-00": ["eam-00"],
        "eam-01": ["eam-01"],
        "eam-02": ["eam-02"],
        "eam-03": ["eam-03", "eam-17"],
        "eam-04": ["eam-04", "eam-05", "eam-06", "eam-07"],
        "eam-05": ["eam-08", "eam-09", "eam-10"],
        "eam-06": ["eam-11", "eam-12", "eam-13", "eam-14", "eam-15", "eam-16"],
        "eam-07": ["eam-18", "eam-19", "eam-20"],
        "eam-08": ["eam-21", "eam-22", "eam-23"],
        "eam-09": ["eam-24", "eam-25"],
        "eam-10": ["eam-26"],
        "eam-11": ["eam-27"],
        "eam-12": ["eam-28"],
        "eam-13": ["eam-29"],
    }
    refs_doc = merge_questions(refs, merge_map, capabilities, max_per_cap=8)
    caps_doc = {
        "service_id": "enterprise-asset-management",
        "service_name": "Enterprise Asset Management",
        "description": quarterly(
            "Evaluates enterprise asset management maturity—endpoint, network, and application asset tracking, consolidated "
            "policies, inventory and lifecycle processes, threat protection, supply chain visibility, shadow IT, custodianship, "
            "and SOC logging."
        ),
        "capabilities": capabilities,
        "target_audience_role_ids": [
            "it-director-head-of-it",
            "security-architecture-lead",
            "ciso-head-of-security",
            "deputy-ciso-security-director",
            "grc-lead",
            "compliance-audit-lead",
            "security-program-strategy-lead",
            "tprm-lead",
        ],
    }
    readme = """# Enterprise Asset Management (evaluation service pack)

- **service_id**: `enterprise-asset-management`
- **Prefix**: `eam-` (e.g. `eam-00`, `rq-eam-00-1`)
- **14 capabilities** (merged from 30 in v1.0), **reference questions** (see validator output)
- **version**: 1.1

```bash
python3 "evaluation-services/Enterprise Asset Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- **Major merge (~53% cap reduction):** consolidated per-technology fragmentation across endpoint, network, and application domains
- Merged SSRM and procurement (`eam-03` + legacy `eam-03`/`eam-17`)
- Merged unmanaged, BYOD, and mobile assets (`eam-04` + legacy `eam-04`–`eam-07`)
- Merged managed asset security policies (`eam-05` + legacy `eam-08`–`eam-10`)
- Merged provisioning and deprovisioning policies (`eam-06` + legacy `eam-11`–`eam-16`)
- Merged inventory and registration lifecycle (`eam-07` + legacy `eam-18`–`eam-20`)
- Merged self-service and migration (`eam-08` + legacy `eam-21`–`eam-23`)
- Merged threat protection and supply chain visibility (`eam-09` + legacy `eam-24`/`eam-25`)
- Added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
"""
    return write_pack("Enterprise Asset Management", caps_doc, refs_doc, readme)


def optimize_data_management() -> tuple[int, int]:
    _, refs = load_pack("Data Management")
    capabilities = [
        cap(
            "dtm-00",
            "Service exists and is in good condition",
            "service existence",
            "A data management service exists, is scoped appropriately, and is reviewed at least quarterly for efficacy.",
            [
                "Enterprise data management service exists",
                "Regular data management service efficacy review",
            ],
            "Process/Service",
        ),
        cap(
            "dtm-01",
            "KPIs/KRIs",
            "KPIs and KRIs",
            "Data management KPIs and KRIs—including classification coverage, DLP incident rate, and backup restore success—are documented and reviewed at least quarterly.",
            [
                "Documented KPIs and KRIs for data management",
                "Regular KPI/KRI review",
                "Classification coverage and DLP effectiveness metrics",
            ],
            "Strategy",
        ),
        cap(
            "dtm-02",
            "Data Management platform",
            "data platform",
            "A data management platform manages the enterprise data asset lifecycle enterprise-wide with automation, warehousing capabilities, configuration review, and integrations.",
            [
                "Data management platform for data asset lifecycle",
                "Enterprise-wide platform coverage including subsidiaries",
                "Automation for data lifecycle processes",
                "Regular platform configuration review",
                "Integration with vulnerability, asset, and compliance systems",
                "Data warehousing capabilities",
            ],
            "Technology",
        ),
        cap(
            "dtm-03",
            "Data management process",
            "data management process",
            "A formalized documented data management process applies across data segments with platform automation and regular review.",
            [
                "Formalized documented data management process",
                "Process scope across all or specific data segments",
                "Utilization of platform automation capabilities",
                "Regular data management process review",
            ],
            "Process/Service",
        ),
        cap(
            "dtm-04",
            "Governance program and data stewardship",
            "governance and stewardship",
            "An enterprise-wide information security and data governance program with defined ownership, custodianship, and a data and privacy officer is reviewed at least quarterly.",
            [
                "Enterprise-wide information security and data governance program",
                "Regular governance program review",
                "Data and privacy officer for enterprise data governance",
                "Formalized data ownership and custodianship hierarchy",
                "Clear ownership trail for all data assets",
                "Regular ownership and permissions review",
            ],
            "People",
        ),
        cap(
            "dtm-05",
            "Data lifecycle policies",
            "lifecycle policies",
            "Formalized documented policies govern data provisioning, deprovisioning, and modification and are reviewed at least quarterly.",
            [
                "Formalized documented data provisioning policy and process",
                "Regular data provisioning policy review",
                "Formalized documented data deprovisioning policy and process",
                "Regular data deprovisioning policy review",
                "Formalized documented data modification policy and process",
                "Regular data modification policy review",
            ],
            "Strategy",
        ),
        cap(
            "dtm-06",
            "Data retention policies and process",
            "data retention",
            "Formalized retention policies and processes cover network devices, applications, and endpoints with regular review.",
            [
                "Data retention policy for network devices",
                "Regular network device retention policy review",
                "Data retention policy for applications",
                "Regular application retention policy review",
                "Data retention policy for devices",
                "Regular device retention policy review",
                "Formalized multi-platform data retention process",
            ],
            "Strategy",
        ),
        cap(
            "dtm-07",
            "Data architecture and modelling",
            "architecture and modelling",
            "A formalized enterprise-wide data architecture and data model are reviewed at least quarterly for efficacy.",
            [
                "Formalized documented enterprise-wide data architecture",
                "Regular data architecture review",
                "Formalized documented enterprise-wide data modelling",
                "Regular data model review",
            ],
            "Strategy",
        ),
        cap(
            "dtm-08",
            "Data protection — DLP and encryption",
            "DLP and encryption",
            "DLP mechanisms and encryption policies for applications, endpoints, and network devices prevent exfiltration and protect data at rest and in motion enterprise-wide.",
            [
                "DLP mechanisms to prevent data exfiltration",
                "Enterprise-wide DLP at network and endpoint",
                "Regular DLP design and configuration review",
                "DLP integration with policy and contextual decision systems",
                "Application data-at-rest encryption policy",
                "Regular application encryption policy review",
                "Endpoint data-at-rest encryption policy",
                "Regular endpoint encryption policy review",
                "Network device data-at-rest and in-motion encryption policy",
                "Regular network encryption policy review",
            ],
            "Technology",
        ),
        cap(
            "dtm-09",
            "Data classification, labelling, and flows",
            "classification and flows",
            "Data assets are classified and labelled automatically where possible, data flows are mapped, and reviews occur at least quarterly.",
            [
                "Platform capability to classify data assets",
                "All data assets classified",
                "Automated data asset classification",
                "Classification incorporated into other systems",
                "Regular classification review",
                "Platform capability to label data assets",
                "All data assets labelled",
                "Automated data asset labelling",
                "Labelling incorporated into other systems",
                "Regular labelling review",
                "Map data flow communications for all data assets",
                "Automatic data flow capture capability",
                "Regular mapped data flow review",
            ],
            "Process/Service",
        ),
        cap(
            "dtm-10",
            "Data quality and master data",
            "quality and master data",
            "The data management platform measures data quality and integrity and maintains a master data record with automation and audit capabilities.",
            [
                "Measure and report data quality and integrity changes",
                "All data assets monitored for quality and integrity",
                "Automated data quality checks and validation",
                "Data quality information incorporated into other systems",
                "Master data record for all enterprise assets",
                "Automated master data record changes",
                "Audit and identify master data record changes",
            ],
            "Technology",
        ),
        cap(
            "dtm-11",
            "Supply chain data assessment",
            "supply chain data",
            "Security assessments for supply chain organizations sharing or processing enterprise data are defined, reviewed at least quarterly, and automated where possible.",
            [
                "Periodic supply chain security assessment process",
                "Regular supply chain process review",
                "Automated supply chain risk assessment",
            ],
            "Process/Service",
        ),
        cap(
            "dtm-12",
            "Secure data communications and transfer",
            "communications and transfer",
            "The data platform enforces secure communication between data assets and secure transfer methods protect data movement within regulatory scope.",
            [
                "Secure communication between all data assets",
                "Secure transfer methods for data movement and migration",
                "Protection of personal and sensitive data within regulatory scope",
            ],
            "Technology",
        ),
        cap(
            "dtm-13",
            "Data lifecycle processes",
            "lifecycle processes",
            "Formalized processes manage data provisioning, deprovisioning, and modification across all locations and are reviewed for efficacy.",
            [
                "Formalized data modification process across all locations",
                "Data modification process efficacy review",
                "Formalized data provisioning process across all locations",
                "Data provisioning process efficacy review",
                "Formalized data deprovisioning process across all locations",
                "Data deprovisioning process efficacy review",
            ],
            "Process/Service",
        ),
        cap(
            "dtm-14",
            "Data resiliency, backup, and RPO/RTO",
            "resiliency and backup",
            "RPO and RTO metrics, backup policies, and resiliency design—including multiple access paths and rerouting—are defined enterprise-wide and reviewed at least quarterly.",
            [
                "Multiple paths to access data assets during failure",
                "Automatic alternate location or network rerouting",
                "Automatic or manual data resiliency measures",
                "RPO/RTO metrics defined per availability policy",
                "Enterprise-wide RPO/RTO applicability",
                "Regular RPO/RTO metric review",
                "Documented formalized backup policy and process",
                "Remote or local backup storage",
                "Automatic interval-based backups",
                "Full and incremental or differential backups",
                "Restore time measurement against RTO and RPO",
                "Regular backup policy and process review",
                "Automated backup as part of asset management",
            ],
            "Process/Service",
        ),
        cap(
            "dtm-15",
            "Data location and sovereignty",
            "data location",
            "Rules govern data storage locations including cloud constraints and are reviewed at least quarterly.",
            [
                "Regulatory data location storage rules",
                "Regular data location restriction review",
            ],
            "Strategy",
        ),
        cap(
            "dtm-16",
            "Visibility of data",
            "SOC visibility",
            "Data asset lifecycle logs and activity are logged securely to the SOC including dynamic state changes.",
            [
                "Formal process for logging data asset lifecycle to SOC",
                "Secure logging of data asset management logs to SOC",
                "Dynamic data asset state changes captured and transferred to SOC",
            ],
            "Technology",
        ),
        cap(
            "dtm-17",
            "AI-era data governance",
            "AI data governance",
            "Policies govern training data, model inputs, shadow AI data access, and retention for AI workloads and third-party AI services.",
            [
                "Approved versus shadow AI access to enterprise data",
                "Training data and model input governance",
                "Retention and deletion policy for AI-derived datasets",
            ],
            "Strategy",
        ),
    ]
    merge_map = {
        "dtm-00": ["dtm-00"],
        "dtm-01": ["dtm-01"],
        "dtm-02": ["dtm-02", "dtm-23"],
        "dtm-03": ["dtm-03"],
        "dtm-04": ["dtm-04", "dtm-09", "dtm-31"],
        "dtm-05": ["dtm-05", "dtm-06", "dtm-07"],
        "dtm-06": ["dtm-08", "dtm-30"],
        "dtm-07": ["dtm-10", "dtm-12"],
        "dtm-08": ["dtm-13", "dtm-14", "dtm-15", "dtm-16"],
        "dtm-09": ["dtm-18", "dtm-20", "dtm-21"],
        "dtm-10": ["dtm-17", "dtm-22"],
        "dtm-11": ["dtm-19"],
        "dtm-12": ["dtm-11", "dtm-32"],
        "dtm-13": ["dtm-24", "dtm-25", "dtm-26"],
        "dtm-14": ["dtm-27", "dtm-28", "dtm-29"],
        "dtm-15": ["dtm-33"],
        "dtm-16": ["dtm-34"],
        "dtm-17": [],
    }
    extra = {
        "dtm-17": [
            {
                "prompt": "Does the organization govern which enterprise data may be used for AI training, model fine-tuning, or inference—including approved versus shadow AI tools?",
                "intent": "Evaluate governance of enterprise data use in AI workloads",
                "field_key": "dtm_17_ai_data_access_governance",
                "evaluation_focus": "Approved versus shadow AI access to enterprise data",
            },
            {
                "prompt": "Are training datasets, model inputs, and AI-derived outputs subject to classification, retention, and deletion policies?",
                "intent": "Evaluate training data and model input governance",
                "field_key": "dtm_17_training_data_governance",
                "evaluation_focus": "Training data and model input governance",
            },
            {
                "prompt": "Is there a defined retention and deletion policy for datasets created or enriched by AI systems and third-party AI services?",
                "intent": "Evaluate retention policy for AI-derived datasets",
                "field_key": "dtm_17_ai_dataset_retention",
                "evaluation_focus": "Retention and deletion policy for AI-derived datasets",
            },
        ],
    }
    refs_doc = merge_questions(refs, merge_map, capabilities, max_per_cap=8, extra_by_cap=extra)
    caps_doc = {
        "service_id": "data-management",
        "service_name": "Data Management",
        "description": quarterly(
            "Evaluates data management maturity—service governance, KPIs/KRIs, platform and process, governance and stewardship, "
            "lifecycle policies and processes, architecture, DLP and encryption, classification and flows, quality and master data, "
            "supply chain data assessment, resiliency and backup, location sovereignty, SOC visibility, and AI-era data governance."
        ),
        "capabilities": capabilities,
        "target_audience_role_ids": [
            "grc-lead",
            "ciso-head-of-security",
            "deputy-ciso-security-director",
            "compliance-audit-lead",
            "enterprise-risk-manager",
            "it-director-head-of-it",
            "security-architecture-lead",
            "security-program-strategy-lead",
        ],
    }
    readme = """# Data Management (evaluation service pack)

- **service_id**: `data-management`
- **Prefix**: `dtm-` (e.g. `dtm-00`, `rq-dtm-00-1`)
- **18 capabilities** (merged from 35 in v1.0), **reference questions** (see validator output)
- **version**: 1.1

```bash
python3 "evaluation-services/Data Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- **Major merge (~49% cap reduction):** consolidated per-technology fragmentation and duplicate policy/process pairs
- Merged governance, privacy officer, and stewardship (`dtm-04` + legacy `dtm-04`/`dtm-09`/`dtm-31`)
- Merged lifecycle policies (`dtm-05` + legacy `dtm-05`–`dtm-07`)
- Merged retention policies and process (`dtm-06` + legacy `dtm-08`/`dtm-30`)
- Merged architecture and modelling (`dtm-07` + legacy `dtm-10`/`dtm-12`)
- Merged DLP and encryption (`dtm-08` + legacy `dtm-13`–`dtm-16`)
- Merged classification, labelling, and flows (`dtm-09` + legacy `dtm-18`/`dtm-20`/`dtm-21`)
- Merged quality and master data (`dtm-10` + legacy `dtm-17`/`dtm-22`); warehousing folded into platform (`dtm-02`)
- Merged lifecycle processes (`dtm-13` + legacy `dtm-24`–`dtm-26`)
- Merged resiliency, backup, and RPO/RTO (`dtm-14` + legacy `dtm-27`–`dtm-29`)
- Added AI-era data governance (`dtm-17`)
- Added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
"""
    return write_pack("Data Management", caps_doc, refs_doc, readme)


PACKS = [
    ("Network Management Service", optimize_network_management),
    ("Configuration Management Service", optimize_configuration_management),
    ("Container Management", optimize_container_management),
    ("Production Workload Management", optimize_production_workload_management),
    ("Enterprise Asset Management", optimize_enterprise_asset_management),
    ("Data Management", optimize_data_management),
    ("Facilities Management Service", optimize_facilities_management),
]


def main() -> None:
    results = []
    for name, fn in PACKS:
        caps, qs = fn()
        results.append((name, caps, qs))
        print(f"{name}: {caps} capabilities, {qs} questions")
    print("\nSummary:")
    for name, caps, qs in results:
        print(f"  {name}: {caps} caps, {qs} qs")


if __name__ == "__main__":
    main()
