---
name: update-dra-project
description: Update, fix, or extend the Digital Resiliency Assistant codebase following established architecture, branch workflow, Render deployment patterns, auth/onboarding UX, and lessons from merged PRs. Use when changing this repo, fixing bugs, improving UI/backend, updating render.yaml, or implementing features in ui/, backend/, services/, or shared/.
---

# Update Digital Resiliency Assistant (DRA)

Use this skill for **any change to this project** — features, fixes, refactors, deployment, UI, backend, or microservices. For adding a **new evaluation offering** (content pack), also invoke `/add-evaluation-service`.

Read `CONTRIBUTING.md` and root `README.md` before large changes.

---

## Step 0 — Classify the work

| User intent | Primary area | Also check |
|-------------|--------------|------------|
| New assessment **offering** (EAM, IAM, etc.) | `evaluation-services/` | `/add-evaluation-service` skill |
| New **microservice** (API container) | `services/<name>/`, `backend/`, `render.yaml` | Root README "Adding a new service" |
| UI / onboarding / dashboard / chat UX | `ui/src/assessmentFlow/`, `ui/src/components/` | Auth bootstrap rules below |
| Auth / profiles / assessments persistence | `backend/app/auth/`, `backend/app/users/`, `backend/app/assessments/` | Postgres + JWT env |
| Render / deploy / env wiring | `render.yaml`, `.env.example` | Blueprint sync, rebuild UI after `VITE_*` changes |
| LLM interview behavior | `services/llm-conversation/` | Progression rules, capability mapping |
| Shared rubric / schemas | `shared/docs/`, `shared/schemas/` | `evaluation-rubric.md` |

**Minimize scope** — match existing patterns; do not refactor unrelated code.

---

## Step 1 — Git and branches

Per `CONTRIBUTING.md`:

- **`dev`** — all day-to-day development; commit and push here
- **`main`** — stable releases only; merge `dev` → `main` when ready for production
- Avoid long-lived `cursor/*` branches unless explicitly requested
- You can directly push to dev as needed. When pushing to main , ask the user for confirmation.
- Typical flow:

```bash
git fetch origin
git checkout dev
git pull origin dev
# edit, commit, push
git push origin dev
```

Render: **preview/staging → `dev`**, **production → `main`** after merge.

---

## Step 2 — Architecture (do not violate)

```text
Browser → ui/ (static React, Vite)
       → backend/ (FastAPI gateway — only public API the UI calls)
       → services/conversation | assessment | framework | llm-conversation
       → evaluation-services/ (content packs — capabilities + reference questions)
       → shared/ (Python helpers, JSON schemas, docs)
```

| Rule | Detail |
|------|--------|
| UI talks to **backend only** | Never call microservice URLs from the browser |
| Gateway proxies | `backend/app/clients/*` extend `ServiceClient` with retries (502/503/504, backoff) |
| Evaluation discovery | `backend/app/evaluation_loader.py` scans `evaluation-services/*/capabilities.json` — no manual registry for new packs |
| LLM routing | `_uses_llm(framework_id)` true when pack exists on disk OR legacy allowlist |
| Service URLs | Normalized via `shared/python/service_url.py` — host-only OK, apps add `https://` |
| Sessions (chat) | In-memory today; Postgres used for **profiles** and **assessment drafts** (questionnaire + chat save/resume) |

---

## Step 3 — User flows (preserve unless explicitly changing)

Established in PRs #4–#22; breaking these caused regressions:

### Auth bootstrap (PR #16)

- Wait for **`authReady`** and **`onboardingReady`** before redirecting or rendering route content
- Never redirect authenticated users to `/onboarding` while profile is still loading — causes **blank screen**
- Show loading UI on `/`, `/onboarding`, `/dashboard` during bootstrap

### Onboarding (PRs #12, #17)

- First sign-in: company + role + service selection on one screen
- Roles derived from evaluation services' `target_audience`
- Role → services mapping: pre-select mapped services; user can deselect
- `GET /users/me/profile` returns **200 + null** for new users (not 404) — PR #14

### Dashboard (PRs #11, #13)

- Returning users land on **`/dashboard`** (not splash)
- Assessments and profiles persisted in **Postgres** via API (`assessmentsApi`, `profileApi`) — not localStorage for drafts
- **Continue assessment** resumes questionnaire drafts or saved **chat** drafts (via **Save progress** in chat); **Start new assessment** begins flow

### Chat / assessment start (PRs #19, #22)

- **Never auto-start** chat on page load or URL params alone
- User must explicitly click **Confirm & start chat**, **Start assessment chat**, or **Start new assessment**
- **Start over** must clear session **and** URL params (`?services=`) so auto-start does not re-fire
- Chat is **service-driven** (`service_id` / `framework_id` = evaluation pack id), not legacy framework picker
- Multi-service: walk selected `service_id`s sequentially
- **Save progress** in chat persists messages + LLM capability state to Postgres (`mode: chat`, `chatState` on `/assessments`); dashboard **Continue** restores via `POST /sessions/restore`

### Sign out / change role (PR #18)

- **Sign out**: clear auth + local prefs → login screen
- **Change role**: `DELETE /users/me/profile` + clear prefs → full onboarding again

Routes (`ui/src/App.tsx`): `/chat` = legacy chat shell; `/*` = assessment flow (`/`, `/dashboard`, `/onboarding`, questionnaire, summary).

---

## Step 4 — UI conventions

| Topic | Convention |
|-------|------------|
| Stack | React + TypeScript + Vite; `npm run build` must pass before merge |
| Assessment flow | `ui/src/assessmentFlow/` — pages, state in `AssessmentFlowApp.tsx` |
| Legacy chat | `ui/src/components/` + `useChatSession` |
| Styles | `global.css` for app/dashboard; **scoped** CSS for marketing landing (`landing.css`) — PR #24 |
| Copy / errors | `ui/src/lib/userMessages.ts` — plain language, friendly errors |
| API client | `ui/src/services/agentApi.ts`; auth token as `Authorization: Bearer` |
| Google sign-in | `VITE_GOOGLE_CLIENT_ID` baked at build; COOP header `same-origin-allow-popups` on UI (PR #15) — in `render.yaml` and `vite.config.ts` |
| API URL | `VITE_API_URL` → backend **public** HTTPS URL only |

**UI build rule (PR #7):** `VITE_API_URL` must be `RENDER_EXTERNAL_URL` of backend, **not** private `host`/`hostport` — browsers cannot reach internal Render hostnames.

---

## Step 5 — Backend conventions

| Topic | Convention |
|-------|------------|
| Framework | FastAPI; `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Config | `pydantic-settings` in `app/config.py`; `.env` locally |
| Downstream calls | `ServiceClient` — 120s timeout, retry 502/503/504 up to 4 attempts |
| Errors | `raise_gateway_error` for proxy failures |
| Health | `GET /health`; optional `GET /health/ready` probes downstream (PR #8) |
| Auth | Google ID token → app JWT; `AUTH_REQUIRED=true` on Render dev/prod |
| Dependencies | If using `google.auth.transport.requests`, ensure `requests` in `requirements.txt` (PR #10) |
| DB | SQLAlchemy; tables init on startup when `DATABASE_URL` set |
| CORS | Explicit origins + regex for `*.onrender.com`; set `CORS_ORIGINS` in blueprint |

Key endpoints the UI depends on:

- `GET /evaluation-services`, `GET /evaluation-services/{id}/content`
- `GET/PUT/DELETE /users/me/profile`
- `GET/POST/PUT/DELETE /assessments`
- `POST /sessions`, `POST /sessions/{id}/messages`

---

## Step 6 — LLM conversation rules (PRs #2, #3, #23)

When touching `services/llm-conversation/`:

| Rule | Detail |
|------|--------|
| Capability ↔ question | Strict 1:1; questions grouped in `capability_questions[]`; do not score across capabilities |
| Reference questions | Unlimited per capability; sent as `reference_questions_by_capability` |
| Dynamic follow-ups | Max **5 per capability**; server enforces via `dynamic_questions_asked` |
| State merge | `reference_questions_covered` and `dynamic_questions_asked` are **append-merged**, not replaced |
| Conversation history | Full history to model (no arbitrary truncation) |
| Progression | Capability `sufficient` only with concrete evidence; session completes when all sufficient or insufficient |
| Content load | By `service_id` from `evaluation-services/`; validate with pack's `validate_evaluation_content.py` |
| OpenAI | `OPENAI_API_KEY` via `shared/python/openai_env.py`; 503 if missing on session start |

Run tests: `cd services/llm-conversation && PYTHONPATH=. python3 -m unittest tests.test_progression -v`

---

## Step 7 — Render blueprint (`render.yaml`)

**Primary deployment path** — prefer blueprint changes over dashboard duplication.

### Dev environment (current blueprint)

- Branch: **`dev`**; resource names suffixed `-dev`
- Services: `dra-framework-dev`, `dra-conversation-dev`, `dra-assessment-dev`, `dra-llm-conversation-dev`, `dra-backend-dev`, `dra-ui-dev`
- Postgres: `dra-postgres-dev` (`basic-256mb`)
- Env groups: `dra-auth-dev`, `dra-cors-dev`, `dra-openai-dev`

### Plans (lessons from PRs #5–#8, #20–#21)

| Service | Plan | Notes |
|---------|------|-------|
| `dra-framework-dev` | **starter** + **1GB disk** | Framework uploads must persist |
| `dra-backend-dev` | **starter** | Avoid free-tier spin-down on gateway |
| `dra-ui-dev` | static | **No `region`** on static sites (PR #21) |
| Others | free | Cold starts possible; UI retries session start |

### Wiring checklist

- [ ] `VITE_API_URL` → backend `RENDER_EXTERNAL_URL` (public HTTPS)
- [ ] `CORS_ORIGINS` matches UI origin exactly
- [ ] `REPO_ROOT` + `EVALUATION_SERVICES_DIR` on backend and llm-conversation
- [ ] Cross-service URLs via `fromService` + `RENDER_EXTERNAL_URL` (or internal `hostport` for gateway→microservice only)
- [ ] `JWT_SECRET`, `OPENAI_API_KEY`: `sync: false` — set in dashboard once
- [ ] After blueprint change: **sync blueprint**, redeploy affected services; **rebuild UI** if any `VITE_*` changed
- [ ] Add new Render hostnames to Google OAuth authorized origins

### Common Render failures (fix patterns from PRs)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Service catalog empty / network error | Private URL in `VITE_API_URL` | Use `RENDER_EXTERNAL_URL` |
| Empty evaluation-services on backend | `rootDir` too narrow | Backend deploy from repo root; set `REPO_ROOT`, `EVALUATION_SERVICES_DIR` |
| POST /sessions 502 | Cold free-tier downstream | Retries in gateway; UI polling; consider starter plan |
| Google sign-in COOP warning | Missing header | `Cross-Origin-Opener-Policy: same-origin-allow-popups` on UI |
| Auth startup crash | Missing `requests` package | Add to `backend/requirements.txt` |

---

## Step 8 — Evaluation content (shared rubric)

Canonical rubric: `shared/docs/evaluation-rubric.md`

- Five dimensions per capability (Documented, Implemented, Automatable, Integrated, Monitored)
- `resiliency_weight` on every capability; ask stakeholder for weights on new services
- Pillars: Strategy, People, Process/Service, Technology — skip Technology pillar if no tech capabilities
- Target audience: `shared/docs/service-target-audience.json` + `capabilities.json`

Do not invent scoring rules per service — extend the shared rubric.

---

## Step 9 — Local development

**Without Docker** (preferred for iteration): see root README — 6 terminals (framework 8003, conversation 8001, assessment 8002, llm-conversation 8004, backend 8000, ui 5173).

**Docker Compose**: optional; note `evaluation-services` mount may only include one pack — use full tree for multi-pack dev.

Verify:

```bash
# UI
cd ui && npm run build

# Evaluation pack (when touched)
python3 "evaluation-services/Information Security Strategy and Planning Services/validate_evaluation_content.py"

# LLM progression (when touched)
cd services/llm-conversation && PYTHONPATH=. python3 -m unittest tests.test_progression -v
```

---

## Step 10 — Implementation checklist (every change)

1. **Read** surrounding code; match naming, types, and patterns
2. **Scope** — smallest correct diff; no drive-by refactors
3. **Auth/UX** — respect bootstrap and no-auto-start rules
4. **API** — UI → backend only; gateway proxies with retries
5. **Render** — if env or URLs change, update `render.yaml` not dashboard-only
6. **Build/test** — `npm run build`; run relevant Python tests
7. **Docs** — update README only when behavior or env vars change
8. **Commit** — clear message; push to `dev`. Keep render.yaml separate for both main and dev branches
9. **New Feature Addition** - Any new implementation or feature addition must be validated for dependancies with existing features. This skill file must then be updated everytime there is a push or merge to the repository.

---

## Step 11 — Related skills and docs

| Resource | When |
|----------|------|
| `/add-evaluation-service` | New service management offering under `evaluation-services/` |
| `CONTRIBUTING.md` | Branch policy |
| `README.md` | Layout, local dev, Render overview |
| `ui/README.md` | UI module structure |
| `backend/README.md` | Gateway endpoints and env |
| `services/README.md` | Microservice ports |
| `evaluation-services/EVALUATION_FRAMEWORK.md` | Pointer to shared rubric |

---

## Anti-patterns (caused regressions in past PRs)

- Auto-starting chat from URL params or `useEffect` on mount
- Redirecting before `onboardingReady`
- Using Render private hostname in browser-facing `VITE_API_URL`
- Returning 404 for missing user profile (use 200 + null)
- Replacing cumulative LLM state instead of merging lists
- Adding `region` to static `dra-ui` in blueprint
- Duplicating CORS/API URL in Render dashboard instead of `render.yaml`
- Hardcoding a single evaluation service id in LLM loader when multi-pack discovery exists
- Storing assessment drafts in localStorage (use Postgres API)
- Large unrelated refactors mixed with bug fixes

---

## Quick reference — repo map

| Path | Role |
|------|------|
| `ui/` | React app: landing, onboarding, dashboard, questionnaire, `/chat` |
| `backend/` | API gateway, auth, users, assessments, evaluation-services API |
| `services/conversation/` | Rule-based Q&A (port 8001) |
| `services/assessment/` | Scoring (8002) |
| `services/framework/` | Framework storage (8003) |
| `services/llm-conversation/` | LLM interviews (8004) |
| `evaluation-services/` | Per-offering capabilities + reference questions |
| `shared/python/` | `openai_env`, `service_url`, `env_constants` |
| `shared/docs/` | Rubric, target audience |
| `render.yaml` | Render blueprint (dev environment) |
| `.cursor/skills/` | Agent skills for this repo |
