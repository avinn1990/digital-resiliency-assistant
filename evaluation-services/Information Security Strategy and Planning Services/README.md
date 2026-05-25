# Information Security Strategy and Planning Services

Evaluation content for the Digital Resiliency Assistant LLM agent.

## Files

| File | Purpose |
|------|---------|
| `capabilities.json` | Capabilities measured in this evaluation (10 areas) |
| `reference-questions.json` | Base reference questions the LLM uses as a starting point |
| `assessed-capabilities.schema.json` | Shape of LLM output stored per session (documentation) |

## How the LLM uses this

1. **Start** — Loads capabilities and reference questions from this folder.
2. **Chat** — Uses reference questions as anchors, then asks **dynamic follow-ups** until each capability has enough context.
3. **Assess** — Scores each capability from collected evidence (maturity, gaps, recommendations).

## Configuration

Set on the `llm-conversation` service (see root `.env.example`):

- `OPENAI_API_KEY` — your provider key
- `OPENAI_MODEL` — default `gpt-4o-mini`
- `EVALUATION_SERVICE_DIR` — optional override; defaults to this folder

## Service ID

Use framework / session id: **`information-security-strategy-planning`**
