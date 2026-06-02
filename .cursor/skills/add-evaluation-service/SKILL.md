---
name: add-evaluation-service
description: Add a new evaluation service pack (service management offering) under evaluation-services/ so the LLM can assess capabilities and ask the right questions. Use when the user wants a new service, offering, or assessment pack like Enterprise Architecture Management, or Network Management or Incident Management.
paths:
  - "evaluation-services/**"
  - "shared/docs/service-target-audience.json"
  - "services/llm-conversation/**"
  - "docker-compose.yml"
---

# Add evaluation service pack

An **evaluation service** is a content pack under `evaluation-services/<Display Name>/` that defines what to assess and which questions the LLM asks. It is **not** a Python microservice in `services/`. This is an important distinction.

**Reference implementation:** `evaluation-services/Information Security Strategy and Planning Services/`  
**Reference `service_id`:** `information-security-strategy-planning`  
**Reference capability prefix:** `issp-` (e.g. `issp-00`, `rq-issp-00-1`, field keys `issp_00_...`)

Shared scoring rules: `shared/docs/evaluation-rubric.md`

---

## Step 0 — Confirm intent

If the user asks to add a "service" or "new offering":

- **Evaluation pack** → follow this skill (`evaluation-services/`)
- **Microservice** (new API container) → do **not** use this skill; see root `README.md` "Adding a new service" under `services/<name>/`

---

## Step 1 — Discovery (ask before writing JSON)

Try to create these yourself and then confirm with the user vs asking the user to type all the information. Evaluate each first before asking the user.
Do not create files until these are agreed (ask the user or infer clearly from their message):

| Topic | What to capture |
|--------|------------------|
| **Identity** | Display name (folder title) and `service_id` (kebab-case, stable, used as `framework_id` in sessions) |
| **ID prefix** | Short prefix for capability IDs (ISSP uses `issp`; EAM might use `eam`) |
| **Capabilities** | List: `id`, `name`, `description`, `evaluation_focus[]`, `pillar` (Strategy / People / Process/Service / Technology) |
| **Foundational capability** | Include a first capability like ISSP `issp-00`: "Service exists and is in good condition" adapted to the new domain |
| **Pillars in scope** | Which pillars apply; if no Technology capabilities, document that Technology pillar is not scored (per rubric). Evaluate yourself and confirm with the user |
| **Resiliency weights** | `resiliency_weight` per capability (ISSP uses `1` for all; rubric requires explicit weights for new services). If the user is not sure use `1` for all |
| **Target audience** | Roles for onboarding / role filter (e.g. Chief Architect, EA lead). Assess yoursel on who the target audience could be and then confirm with the user. |
| **Reference questions** | At least one question per capability; prompts should match `evaluation_focus`. Ask for a list if possible.|
| **Version** | e.g. `1.0` in `capabilities.json` |

**Naming conventions** (must be consistent across all files):

- Capability id: `<prefix>-<two-digit-or-code>` (e.g. `eam-00`, `eam-01`)
- Question id: `rq-<capability-id>-<n>` (e.g. `rq-eam-00-1`)
- `field_key`: capability id with `-` → `_`, plus semantic suffix (e.g. `eam_00_enterprise_ea_service_exists`)

---

## Step 2 — Create the pack folder

Create:

```text
evaluation-services/<Service Display Name>/
├── README.md
├── capabilities.json
├── reference-questions.json
├── reference-questions.schema.json
├── assessed-capabilities.schema.json
└── validate_evaluation_content.py
```

Copy structure from `evaluation-services/Information Security Strategy and Planning Services/` and replace domain text, ids, and schema patterns (`issp` → new prefix).

### `capabilities.json`

Required top-level fields (see ISSP pack):

- `service_id`, `service_name`, `version`, `description`
- `capabilities[]` — each entry: `id`, `name`, `description`, `evaluation_focus` (array), `resiliency_weight`, `pillar`
- `scoring_rubric` — copy ISSP structure (five dimensions, rollup formula, `pillar_policy`)
- `target_audience[]` — roles shown in UI

### `reference-questions.json`

Required:

- Same `service_id` and `service_name` as `capabilities.json`
- `capability_questions[]` — one group per capability:
  - `capability_id`, `capability_name` (must match `capabilities.json` `name` exactly)
  - `questions[]` — each: `id`, `prompt`, `intent`, `field_key`; optional `evaluation_focus` aligned to capability

**Rules (enforced by validator and runtime loader):**

1. Every capability has ≥1 question; no extra groups for unknown capabilities
2. `service_id` must match between the two JSON files
3. Question `id` must encode its capability (pattern `rq-<capability-id>-<n>`)
4. `field_key` must start with capability id with hyphens replaced by underscores
5. No duplicate question ids
6. Each capability has positive numeric `resiliency_weight`

### `README.md` in the pack

Document: purpose, `service_id`, validate command, pointer to `shared/docs/evaluation-rubric.md`, OpenAI env (root `.env.example`).

### Schemas and validator

- `assessed-capabilities.schema.json` — generic; copy from ISSP unchanged if unchanged
- `reference-questions.schema.json` — update patterns from `issp` to the new prefix
- `validate_evaluation_content.py` — update `QUESTION_ID_RE` to match new prefix (ISSP: `^rq-(issp-\d{2})-\d+$`)

---

## Step 3 — Register target audience (canonical roles)

Pick `role_id` values from [`shared/docs/canonical-roles.json`](shared/docs/canonical-roles.json). Do **not** invent free-text role labels — add a new canonical role there only when a genuinely new stakeholder type is needed.

Add an entry to [`shared/docs/service-target-audience.json`](shared/docs/service-target-audience.json):

```json
"<service_id>": {
  "service_name": "<Service Display Name>",
  "role_ids": ["ciso-head-of-security", "..."]
}
```

Set the same `target_audience_role_ids` array in the pack's `capabilities.json`. Run `python3 shared/scripts/validate_role_mappings.py` to verify registry, mapping, and pack stay in sync.

---

## Step 4 — Platform wiring (required for 2+ services)

The UI discovers packs automatically via `GET /evaluation-services` (`backend/app/evaluation_loader.py` scans `evaluation-services/*/capabilities.json`). **No UI changes** are required for listing.

For the LLM to load and validate a **second** pack, fix ISSP-specific hardcoding when adding the first non-ISSP service:

| File | Change |
|------|--------|
| `services/llm-conversation/app/loader.py` | Generalize `_QUESTION_ID_RE` to accept any capability id prefix, or add the new prefix |
| `services/llm-conversation/app/prompts.py` | Make `SYSTEM_PROMPT` use `bundle["capabilities"]["service_name"]` (or per-service prompt), not hardcoded "Information Security Strategy and Planning" |
| `services/llm-conversation/app/orchestrator.py` | Generic default welcome message using service name from bundle |
| `docker-compose.yml` | Mount full `evaluation-services` (or both packs), not only the ISSP subfolder — Render already uses `EVALUATION_SERVICES_DIR` for the whole tree |
| `services/llm-conversation/app/config.py` | Prefer `evaluation_services_dir` over single-pack `evaluation_service_dir` default when unset |

**Usually not needed:**

- `render.yaml` — already sets `EVALUATION_SERVICES_DIR` on backend and llm-conversation
- `backend/app/clients/llm_conversation.py` `LLM_FRAMEWORK_IDS` — fallback only; packs on disk are preferred via `load_evaluation_service_bundle()`
- New microservice under `services/`

**Optional:**

- `services/framework/data/<service_id>.json` — minimal framework stub if non-LLM path is needed (see ISSP `information-security-strategy-planning.json`)

---

## Step 5 — Authoring reference questions (how the agent should think)

For each capability:

1. Read `description` and each line in `evaluation_focus`
2. Write 1–4 **reference questions** that elicit evidence for those focuses (ISSP often uses 2–4 for foundational capabilities, 1–2 for others)
3. Set `intent` to state what is being evaluated
4. Tie `evaluation_focus` on the question to one capability focus string where possible
5. Use conversational `prompt` text; the LLM may adapt wording but must not score the wrong capability

Interview behavior (runtime): one question at a time; reference questions are anchors; up to **5 dynamic follow-ups** per capability; mark capability `sufficient` only with concrete evidence (people, process, artifacts, cadence).

---

## Step 6 — Validate and smoke-test

```bash
python3 "evaluation-services/<Service Display Name>/validate_evaluation_content.py"
```

Expect: `ok: N capabilities, M questions, 1:1 capability mapping enforced`

Then verify:

1. `GET /evaluation-services` includes the new `service_id`, `service_name`, `description`, `target_audience`
2. Start an LLM session with `framework_id` = `service_id` (via backend/UI); questions should reflect the new domain
3. Onboarding / Services pages show the new offering when `target_audience` matches selected roles

---

## Step 7 — Branch and docs

Per `CONTRIBUTING.md`: commit to `dev` unless the user requested a feature branch.

Update only if needed:

- Root `README.md` — mention the new offering in local dev notes if you add special env instructions
- Do not edit unrelated services or UI unless broken by Step 4

---

## Anti-patterns

- Do not add a microservice under `services/` for a new assessment offering
- Do not skip reference questions for any capability
- Do not mismatch `service_id` between JSON files
- Do not use ISSP `issp-` ids for a different domain
- Do not hardcode only ISSP in loader/prompts when adding a second pack

---

## Quick reference — ISSP mapping

| Item | ISSP value |
|------|------------|
| Folder | `Information Security Strategy and Planning Services` |
| `service_id` | `information-security-strategy-planning` |
| Prefix | `issp-` |
| Example question | `rq-issp-00-1` |
| Example field_key | `issp_00_enterprise_strategy_planning_service` |
| Capability count | 15 (as of reference pack) |

When the user names a new domain (e.g. Enterprise Architecture Management), derive a new `service_id` and prefix and apply the same structure end-to-end.
