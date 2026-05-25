# Backend (API gateway)

Orchestrates calls to services under `services/`. The UI should talk only to this layer.

## Endpoints

- `GET /health` — Liveness
- `GET|POST /frameworks` — Proxy to framework service
- `POST /sessions` — Start a conversation session
- `POST /sessions/{id}/messages` — Send a user message
- `GET /sessions/{id}/facts` — Extracted structured facts
- `POST /sessions/{id}/assess` — Run assessment on current facts

## Configuration

| Variable | Default (local) | Render |
|----------|-----------------|--------|
| `CONVERSATION_SERVICE_URL` | `http://localhost:8001` | Set via Blueprint `fromService` → `dra-conversation` |
| `ASSESSMENT_SERVICE_URL` | `http://localhost:8002` | `dra-assessment` |
| `FRAMEWORK_SERVICE_URL` | `http://localhost:8003` | `dra-framework` |
| `LLM_CONVERSATION_SERVICE_URL` | `http://localhost:8004` | `dra-llm-conversation` |

LLM evaluation framework id: `information-security-strategy-planning`

Host-only values (e.g. `my-service.onrender.com`) are normalized to `https://` automatically.
