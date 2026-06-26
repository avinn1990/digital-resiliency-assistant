# LLM Conversation Service

Conducts **dynamic** assessments using an LLM (OpenAI-compatible API).

## Behavior

1. Loads `capabilities.json` and `reference-questions.json` from the evaluation-service folder.
2. Starts with reference questions, then asks **contextual follow-ups** until each capability has enough evidence.
3. Stores per-capability state in the session (`capability_states`). List fields (`reference_questions_covered`, `dynamic_questions_asked`) are merged cumulatively across turns.
4. Sends the **full** conversation history to the model each turn (no message window truncation).
5. Probes and dynamic follow-ups are **unlimited** per capability; the model uses question metadata (`probe_on`, `probe_hints`, `dependency_type`) to gather evidence. Capabilities close when marked sufficient or insufficient.
6. Maintains `operating_context` in session facts (merged cumulatively) for interview reframing and final assessment scoring.
7. `POST /sessions/{id}/assess` produces LLM-scored results using facts and operating_context.

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
