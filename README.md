# Digital Resiliency Assistant

A modular assistant that gathers information from users through conversation, then performs assessments against frameworks you provide.

## Repository layout

| Path | Role |
|------|------|
| `ui/` | **UI module** — chat interface to access and talk with the backend agent (see `ui/README.md`) |
| `backend/` | API gateway that orchestrates services |
| `services/conversation/` | Question flow and information extraction from user messages |
| `services/assessment/` | Scoring and reporting against a loaded framework |
| `services/framework/` | Upload, storage, and retrieval of assessment frameworks |
| `services/llm-conversation/` | LLM-driven dynamic Q&A for evaluation services |
| `evaluation-services/` | Capability definitions and reference questions per offering |
| `shared/` | Cross-cutting types, JSON schemas, and shared Python helpers |
| `render.yaml` | **Primary** deployment — Render Blueprint (5 services) |

Each new capability you request should live in its own folder under `services/<name>/`.

## Git branches

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code |
| `dev` | Active development — **all changes land here first** |

```bash
git checkout dev
# make changes, commit, push
git push origin dev
```

When `dev` is ready for release, merge into `main` (via PR or locally). Do not use short-lived feature branches for routine work.

## Deploy on Render (recommended)

This project is set up for [Render](https://render.com) as separate web services — no Docker required.

### One-click Blueprint

1. Push this repo to GitHub.
2. In Render: **New → Blueprint** → connect the repository.
3. Render reads `render.yaml` and creates:
   - `dra-framework` — framework storage
   - `dra-conversation` — Q&A and extraction
   - `dra-assessment` — scoring
   - `dra-backend` — public API gateway
   - `dra-ui` — static React site

Service URLs are wired automatically via `fromService` env vars. Hostnames from Render are normalized to `https://` in application code.

### After deploy

- Open the **dra-ui** URL for the chat interface.
- Use **dra-backend** `/docs` for the API (e.g. `https://dra-backend-xxxx.onrender.com/docs`).
- If the UI shows **“Service catalog error” / “couldn’t reach the server”**, the static site is usually calling the wrong API URL. In Render → **dra-ui** → Environment, confirm `VITE_API_URL` is the **public** `https://…onrender.com` URL for **dra-backend** (not a private `host` value), then trigger a **manual redeploy** of **dra-ui** so Vite rebakes the URL into the build.

### Render notes

| Topic | Detail |
|-------|--------|
| **Framework uploads** | `render.yaml` mounts a persistent disk on `dra-framework` at `data/`. Remove the `disk` block if your plan does not support disks; bundled example frameworks still work. |
| **Sessions** | Conversation sessions are in-memory today. For multiple instances or restarts, add Redis or a database in a follow-up. |
| **Cold starts** | Free-tier services spin down when idle; first request may be slow. |
| **Custom domains** | Add in each Render service’s Settings → Custom Domains. |

### Manual Render setup (without Blueprint)

Create five services and match `render.yaml` settings: Python web services use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` with the `rootDir` values from the blueprint. Set cross-service env vars to each service’s `https://<host>` (or hostname only — the apps add `https://`).

## Local development (no Docker)

Prerequisites: Node.js 20+, Python 3.11+

Copy `.env.example` values into `backend/.env` and `ui/.env` as needed.

**Terminal 1 — framework**

```bash
cd services/framework
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

**Terminal 2 — conversation**

```bash
cd services/conversation
pip install -r requirements.txt
export FRAMEWORK_SERVICE_URL=http://localhost:8003
uvicorn app.main:app --reload --port 8001
```

**Terminal 3 — assessment**

```bash
cd services/assessment
pip install -r requirements.txt
export FRAMEWORK_SERVICE_URL=http://localhost:8003
uvicorn app.main:app --reload --port 8002
```

**Terminal 4 — LLM conversation** (for Information Security Strategy and Planning)

```bash
cd services/llm-conversation
pip install -r requirements.txt
export OPENAI_API_KEY=your-key-here   # required — used by shared/python/openai_env.py
export OPENAI_MODEL=gpt-4o-mini       # optional
export EVALUATION_SERVICE_DIR="../../evaluation-services/Information Security Strategy and Planning Services"
uvicorn app.main:app --reload --port 8004
```

**Terminal 5 — backend**

```bash
cd backend
pip install -r requirements.txt
export LLM_CONVERSATION_SERVICE_URL=http://localhost:8004
uvicorn app.main:app --reload --port 8000
```

**Terminal 6 — UI**

```bash
cd ui
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

- UI: http://localhost:5173  
- API docs: http://localhost:8000/docs  

## Optional: Docker Compose

If you prefer containers locally or elsewhere:

```bash
docker compose up --build
```

See `docker-compose.yml`. Dockerfiles in `backend/`, `ui/`, and each `services/*/` folder are maintained for this path only.

## Assessment flow

1. **Framework** — Register or select a framework (controls, domains, scoring rules).
2. **Conversation** — The assistant asks questions mapped to framework fields and extracts structured answers.
3. **Assessment** — Extracted data is evaluated; you receive scores, gaps, and recommendations.

## Adding a new service

1. Create `services/<service-name>/` with `app/`, `requirements.txt`, and optionally `Dockerfile`.
2. Register the service URL in `backend/app/config.py` and add a client in `backend/app/clients/`.
3. Expose routes on the backend that proxy or compose the new service.
4. Add the service to `render.yaml` (required for Render) and optionally `docker-compose.yml`.

## License

MIT
