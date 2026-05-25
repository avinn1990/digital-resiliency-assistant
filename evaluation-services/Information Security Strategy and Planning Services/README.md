# Information Security Strategy and Planning Services

Evaluation content for the LLM agent.

## Files

| File | Purpose |
|------|---------|
| `capabilities.json` | Fifteen merged capabilities (foundational program metrics + strategy/planning depth) |
| `reference-questions.json` | Reference questions per capability (measurement criteria to be added later) |
| `assessed-capabilities.schema.json` | Per-session state shape from the LLM |

> **Next step:** Add official measurement criteria (scoring rubrics) per capability when ready.

## OpenAI environment variables

Set once for the whole project (see root `.env.example`):

```bash
export OPENAI_API_KEY=your-key-here
export OPENAI_MODEL=gpt-4o-mini   # optional
```

Used by `services/llm-conversation` via `shared/python/openai_env.py`.

## Service ID

`information-security-strategy-planning`
