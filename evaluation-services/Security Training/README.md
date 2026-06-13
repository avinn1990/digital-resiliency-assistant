# Security Training (evaluation service pack)

- **service_id**: `security-training`
- **Prefix**: `st-` (e.g. `st-00`, `rq-st-00-1`)
- **2 capabilities**, **2 reference questions**

```bash
python3 "evaluation-services/Security Training/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

OpenAI: set `OPENAI_API_KEY` in the repo root `.env.example` for local LLM interview sessions.
