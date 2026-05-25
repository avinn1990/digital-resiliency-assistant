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

| Variable | Default |
|----------|---------|
| `CONVERSATION_SERVICE_URL` | `http://localhost:8001` |
| `ASSESSMENT_SERVICE_URL` | `http://localhost:8002` |
| `FRAMEWORK_SERVICE_URL` | `http://localhost:8003` |
