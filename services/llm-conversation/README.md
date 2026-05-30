# LLM Conversation Service

Conducts **dynamic** assessments using an LLM (OpenAI-compatible API).

## Behavior

1. Loads `capabilities.json` and `reference-questions.json` from the evaluation-service folder.
2. Starts with reference questions, then asks **contextual follow-ups** until each capability has enough evidence.
3. Stores per-capability state in the session (`capability_states`). List fields (`reference_questions_covered`, `dynamic_questions_asked`) are merged cumulatively across turns.
4. Sends the **full** conversation history to the model each turn (no message window truncation).
5. Enforces a server-side maximum of **5 dynamic follow-ups per capability** (reference questions are not capped). Capabilities at the limit are closed as `insufficient` and the session can complete when all capabilities are resolved.
6. `POST /sessions/{id}/assess` produces LLM-scored results.

## Environment

Read from `shared/python/openai_env.py` (same names everywhere):

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your API key |
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
