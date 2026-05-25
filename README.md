# Digital Resiliency Assistant

A modular assistant that gathers information from users through conversation, then performs assessments against frameworks you provide.

## Repository layout

| Path | Role |
|------|------|
| `ui/` | Web interface for chat and assessment results |
| `backend/` | API gateway that orchestrates services |
| `services/conversation/` | Question flow and information extraction from user messages |
| `services/assessment/` | Scoring and reporting against a loaded framework |
| `services/framework/` | Upload, storage, and retrieval of assessment frameworks |
| `shared/` | Cross-cutting types and JSON schemas |

Each new capability you request should live in its own folder under `services/<name>/`.

## Quick start

### Prerequisites

- Docker and Docker Compose, **or**
- Node.js 20+, Python 3.11+

### Run with Docker Compose

```bash
docker compose up --build
```

- UI: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### Run locally (development)

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Services** (each in its own terminal)

```bash
cd services/conversation && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8001
cd services/assessment && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8002
cd services/framework && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8003
```

**UI**

```bash
cd ui
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:8000` in `ui/.env` if needed.

## Assessment flow

1. **Framework** — Register or select a framework (controls, domains, scoring rules).
2. **Conversation** — The assistant asks questions mapped to framework fields and extracts structured answers.
3. **Assessment** — Extracted data is evaluated; you receive scores, gaps, and recommendations.

## Adding a new service

1. Create `services/<service-name>/` with `app/`, `requirements.txt`, and `Dockerfile` (mirror existing services).
2. Register the service URL in `backend/app/config.py` and add a client in `backend/app/clients/`.
3. Expose routes on the backend that proxy or compose the new service.
4. Add the service to `docker-compose.yml`.

## License

MIT
