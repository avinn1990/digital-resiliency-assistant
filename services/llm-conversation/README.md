# LLM Conversation Service

Conducts **dynamic** assessments using an LLM (OpenAI-compatible API).

## Behavior

1. Loads `capabilities.json` and `reference-questions.json` from the evaluation-service folder.
2. Starts with reference questions, then asks **contextual follow-ups** until each capability has enough evidence.
3. Stores per-capability state in the session (`capability_states`).
4. `POST /sessions/{id}/assess` produces LLM-scored results.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | API key you provide |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | No | Custom endpoint (Azure, etc.) |
| `EVALUATION_SERVICE_DIR` | No | Path to evaluation content folder |

## Run locally

```bash
cd services/llm-conversation
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
export EVALUATION_SERVICE_DIR="../../evaluation-services/Information Security Strategy and Planning Services"
uvicorn app.main:app --reload --port 8004
```

## Framework ID

`information-security-strategy-planning`
