---
name: optimize-evaluation-services
description: Optimize evaluation content packs — audit capabilities and reference questions for current threats and trends (AI adoption, Claude Mythos, etc.), propose merges/additions, and roll out from a reference pack. Secondary playbooks for runtime caching and validator dedup. Use when improving evaluation-services/ quality, not when adding a brand-new offering.
paths:
  - "evaluation-services/**"
  - "shared/docs/evaluation-rubric.md"
  - "shared/docs/service-target-audience.json"
  - "services/llm-conversation/app/loader.py"
  - "services/llm-conversation/app/prompts.py"
  - "backend/app/evaluation_loader.py"
  - "shared/scripts/**"
---

# Optimize evaluation services

Use this skill to **improve existing** evaluation content packs under `evaluation-services/` — capabilities, reference questions, threat/trend alignment, and merge/redundancy cleanup.

**Not for:**

- Adding a **new** offering → use `/add-evaluation-service`
- General DRA changes (UI, auth, deploy) → use `/update-dra-project`
- Adding a microservice under `services/`

**Reference pilot pack:** `evaluation-services/Information Security Strategy and Planning Services/` (`information-security-strategy-planning`, prefix `issp-`)

---

## Confirmed defaults (do not override without user request)

| Topic | Rule |
|-------|------|
| **Primary focus** | Content pack quality — capabilities, questions, trends/threats, merges |
| **Secondary** | Runtime caching, code dedup — only when user asks |
| **Scoring / rubric** | **Out of scope** — do not modify `shared/docs/evaluation-rubric.md` or scoring implementation |
| **Low-risk fixes** | May implement (e.g. typo fixes, bundle caching) |
| **Behavior changes** | Ask first — include rationale (why / benefit / risk) |
| **Bulk edits** | Pilot on reference pack → user approval → roll out pack-by-pack |
| **Benchmarks** | Not required — use validation commands below |

---

## Step 0 — Classify intent

| User intent | Action |
|-------------|--------|
| Refresh capabilities/questions for new threats (AI, Mythos, etc.) | Content playbook Steps 1–4 |
| Merge redundant capabilities | Content playbook Step 2 merge rules |
| Faster API / caching | Appendix A (secondary) |
| Deduplicate validators | Appendix A code dedup |
| Change interview behavior / prompts | Appendix B — **ask first** |
| Change scoring rubric | **Forbidden** — note gap only, defer |

Before editing JSON, confirm:

1. **Which pack(s)?** Default: ISSP pilot
2. **Goal:** trends, merges, clarity, gaps, or all
3. **Rollout:** one pack at a time until approved

**Do not** edit all 34 packs in one pass.

---

## Step 1 — Threat and trend research (mandatory)

Research and cite current context **before** proposing capability changes. Produce a short **Trend & threat brief** tied to the service domain.

| Category | Examples |
|----------|----------|
| Threat landscape | Ransomware, supply-chain, identity attacks, API abuse, SaaS misconfiguration |
| AI frontier models | Claude Mythos-class models — see section below; Project Glasswing; dual-use AI risk |
| Frameworks | NIST CSF 2.0, ISO 27001, MITRE ATT&CK (domain-relevant) |
| Technology trends | AI adoption (governance, shadow AI, AI in SecOps), zero trust, cloud-native |
| Regulatory | DORA, SEC cyber rules, EU AI Act, sector rules |
| Operating model | Platform engineering, third-party concentration |

**Rule:** Every proposed change must map to a trend/threat gap or redundancy finding — no drive-by renames.

---

## Claude Mythos (Anthropic) — trend reference

[Claude Mythos](https://www.anthropic.com/claude/mythos) is Anthropic's **Mythos-class** frontier tier (above Opus) for software engineering, agents, and **cybersecurity**. Shipped as **Mythos Preview** (April 2026, [Project Glasswing](https://www.anthropic.com/glasswing)); **Mythos 5** and **Fable 5** announced June 9, 2026 ([news](https://www.anthropic.com/news/claude-fable-5-mythos-5)).

| Variant | Access | Notes |
|---------|--------|-------|
| **Mythos 5** | Restricted — vetted cyberdefenders, Glasswing partners | Full cyber capabilities in approved domains |
| **Fable 5** | General public | Same base model; guardrails route risky cyber/biology queries to Opus 4.8 |
| **Mythos Preview** | Glasswing (predecessor) | Reported thousands of zero-day findings across major OSes/browsers |

**Why it matters for content packs:** Mythos-class models can autonomously find and chain vulnerabilities at scale. The bottleneck shifts to **verify, disclose, and patch**. Anthropic expects similar capabilities to proliferate across vendors ([Expanding Glasswing](https://www.anthropic.com/news/expanding-project-glasswing)).

**Translate into evaluation gaps:**

| Theme | What to assess |
|-------|----------------|
| AI-augmented offense | Org awareness of AI-accelerated attacks (chaining, recon, exploit speed) |
| AI-augmented defense | AI for scanning, patches, pre-release checks, pen testing, detection |
| Patch/disclosure velocity | Triaging high vuln volume; SLAs; responsible disclosure |
| Dual-use AI governance | Approved powerful models vs shadow AI; trusted-access policies |
| Critical software focus | OSS, browsers, OS deps, supply chain priority |
| Strategy refresh | Roadmaps account for AI-era threat model |

**Pack mapping:**

- ISSP / Enterprise Risk / Security Governance → AI in strategy, risk registers, investment
- Vulnerability Management / Security Operations → AI-assisted discovery, patch workflow
- Application Development / Code Management → secure SDLC, pre-release AI checks
- Third-party packs → vendor codebase risk under AI-augmented attack

**Rule:** Mythos informs **what to assess** in JSON content — do **not** integrate Mythos into DRA runtime.

---

## Step 2 — Capability audit

Produce an audit table before editing:

| Capability ID | Name | Pillar | Issue | Recommendation | Rationale |
|---------------|------|--------|-------|----------------|-----------|
| `issp-00` | Service exists… | Process/Service | Overlap | Merge with `issp-11` | Both assess program existence |
| — | AI-era security strategy | Strategy | Gap | **Add** | Mythos/AI trend brief |

**Audit dimensions:**

1. **Merge candidates** — common patterns:
   - Foundational `*-00` ("service exists") vs formal program capability
   - Vision/mission vs strategy alignment
   - Governance vs program leadership
   - Culture/training overlap with dedicated Security Training / Security Culture packs (flag cross-pack; don't silently delete)
2. **Coverage gaps** — AI governance, non-human identity, resilience, third-party
3. **Pillar balance** — weak/missing Technology; document if intentionally out of scope
4. **Interview burden** — more capabilities = longer chat (`ui/src/hooks/useChatSession.ts` queues multi-service); merges should reduce length without losing signal
5. **`resiliency_weight`** — note inconsistencies; **do not change** without user approval
6. **`evaluation_focus`** — stale items; realign to merged/new capabilities

**Merge rules:**

- Update **both** `capabilities.json` and `reference-questions.json`
- Every capability keeps ≥1 reference question (strict 1:1 enforced by `services/llm-conversation/app/loader.py`)
- Consolidate questions; renumber IDs (`rq-<cap-id>-<n>`) if needed
- **Warn:** removing capability IDs breaks saved chat drafts (best-effort; new sessions only)
- Present merge proposal **before** editing

---

## Step 3 — Reference question optimization

| Check | Action |
|-------|--------|
| Prompt clarity | Plain language; define jargon |
| Trend relevance | AI, automation, third-party where on-topic |
| `evaluation_focus` | Question tags match capability focus string |
| `intent` | States evidence the LLM should extract |
| `field_key` | Prefix convention (`issp_00_...`) |
| Count | Min 1 per capability; prefer 2–4 for high-value areas |

**Example ISSP proposals (illustrative — user approves first):**

- Add: **"AI-era security strategy and dual-use model risk"**
- Refresh `issp-01`: strategy addresses AI-augmented offense/defense
- Merge `issp-00` + `issp-11`
- Refresh `issp-07`: vuln triage velocity, AI-assisted discovery metrics
- Refresh `issp-04`: roadmap includes AI-era defensive initiatives

---

## Step 4 — Pilot and rollout workflow

1. **Research** → trend/threat brief
2. **Audit** → capability table with recommendations
3. **Propose** → present to user **before JSON edits**
4. **Edit pilot pack** — bump `version` in both JSON files; update pack `README.md` changelog if present
5. **Validate:**

```bash
python3 "evaluation-services/Information Security Strategy and Planning Services/validate_evaluation_content.py"
python3 shared/scripts/validate_role_mappings.py
```

6. **User review** — spot-check questionnaire mode or walk through interview flow
7. **Rollout** — apply **approved pattern** to next pack; adapt domain text and ID prefix; validate each

**Cross-pack:** Rollout = **pattern**, not copy-paste. AI codegen questions belong in App Dev, not Facilities Management.

---

## Step 5 — Approval gates

| Change | Agent action |
|--------|--------------|
| Typo / prompt clarity | Low-risk — may fix in pilot |
| Add / merge / remove capability | **Ask first** — rationale + trend link |
| Change `resiliency_weight` | **Ask first** |
| Change `service_id` or capability prefix | **Ask first** — breaking |
| Cross-pack dedup | **Ask first** — may affect role mappings |
| Scoring rubric or `scoring_rubric` in JSON | **Forbidden** |
| LLM prompt / progression / orchestrator | **Ask first** — Appendix B |

---

## Step 6 — Verification (no benchmarks)

After content edits:

```bash
python3 "evaluation-services/<Service Display Name>/validate_evaluation_content.py"
python3 shared/scripts/validate_role_mappings.py
```

After runtime low-risk fixes (if any):

```bash
cd services/llm-conversation && PYTHONPATH=. python3 -m unittest tests.test_progression -v
cd ui && npm run build   # only if UI touched
```

Smoke-test: `GET /evaluation-services` lists pack; start LLM session with `framework_id` = `service_id`.

---

## Appendix A — Secondary playbooks (good-to-have)

Use only when user requests non-content optimization.

### Runtime (low-risk — may implement)

- Cache `load_evaluation_bundle()` on session object in `services/llm-conversation/app/orchestrator.py` (stop reloading every message)
- Memoize `list_evaluation_services()` with mtime invalidation in `backend/app/evaluation_loader.py`
- Reuse persistent `httpx.AsyncClient` in `backend/app/clients/base.py`

### Code dedup (low-risk — small scope)

- Shared `shared/scripts/validate_evaluation_content.py` with per-pack thin wrapper (prefix regex param)
- Do not refactor loaders unless user requests

**Shared validator pattern (design only until approved):**

```python
# evaluation-services/<Name>/validate_evaluation_content.py
from shared.scripts.validate_evaluation_content import main as validate
if __name__ == "__main__":
    raise SystemExit(validate(prefix_re=r"^rq-(issp-\d{2})-\d+$"))
```

Implement `shared/scripts/validate_evaluation_content.py` only when user approves dedup work.

---

## Appendix B — LLM behavior changes (ask first)

When proposing interview rule changes, fill in **why / benefit / risk**:

| Current rule | Why it exists | When change might help | Risk if changed |
|--------------|---------------|------------------------|-----------------|
| Full conversation history | Cross-capability evidence; avoids re-asking | Long sessions; token cost | Lost context; inconsistent scores |
| Max 5 follow-ups per capability | Bounds length and cost | Deep technical capabilities | User fatigue; longer sessions |
| Append-merge state lists | Prevents forgetting covered questions | — | Replacing lists caused regressions |
| Strict 1:1 capability↔questions | Deterministic progression; loader validation | — | Validation failure if violated |

**Rule:** Propose with this table → wait for approval → then edit `prompts.py`, `progression.py`, or `orchestrator.py`.

### Scoring (deferred)

- Do **not** modify `shared/docs/evaluation-rubric.md`
- Do **not** change LLM assess schema or add rubric engine
- May **note** documented vs implemented gap for future work

---

## Anti-patterns

- Batch-editing all 34 packs without pilot approval
- Modifying scoring rubric or `scoring_rubric` structure
- Removing capability IDs without warning about draft breakage
- Integrating Mythos or external models into DRA runtime
- Cross-pack capability deletion without role-mapping check
- Behavior changes (prompts, progression) without rationale table
- Conflating content pack work with new microservices
- Large unrelated refactors mixed with content updates

---

## Related skills

| Skill | When |
|-------|------|
| `/add-evaluation-service` | New offering under `evaluation-services/` |
| `/update-dra-project` | General DRA architecture, deploy, UX |
| `shared/docs/evaluation-rubric.md` | Read-only structure reference for capabilities |
| `evaluation-services/EVALUATION_FRAMEWORK.md` | Pointer to shared rubric |

Per `CONTRIBUTING.md`: commit to `dev` unless user requests a feature branch.
