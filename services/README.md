# Services

Each subdirectory is an independent microservice with its own `Dockerfile`, dependencies, and API.

| Service | Port (default) | Responsibility |
|---------|----------------|----------------|
| `conversation/` | 8001 | Guided Q&A and fact extraction from user messages |
| `assessment/` | 8002 | Score extracted facts against a framework |
| `framework/` | 8003 | Store and serve frameworks you provide |
| `llm-conversation/` | 8004 | LLM dynamic assessment (capabilities + reference questions) |

When adding a new service, copy the structure of an existing folder and wire it in `backend/app/config.py` and `render.yaml`. Add to `docker-compose.yml` only if you use Docker locally.
