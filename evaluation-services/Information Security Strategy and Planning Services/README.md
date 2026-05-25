# Information Security Strategy and Planning Services

Evaluation content for the LLM agent.

## Files

| File | Purpose |
|------|---------|
| `capabilities.json` | Capabilities measured (placeholder set — **you will provide the final list**) |
| `reference-questions.json` | Base reference questions (placeholder set — **you will provide the final list**) |
| `assessed-capabilities.schema.json` | Per-session state shape from the LLM |

> **Next step:** Share your official capabilities and reference questions; we will replace the placeholder JSON in this folder.

## OpenAI environment variables

Set once for the whole project (see root `.env.example`):

```bash
export OPENAI_API_KEY=your-key-here
export OPENAI_MODEL=gpt-4o-mini   # optional
```

Used by `services/llm-conversation` via `shared/python/openai_env.py`.

## Service ID

`information-security-strategy-planning`
