# Compliance Management Service (evaluation service pack)

This evaluation service pack defines the **capabilities** and **reference questions** used by the LLM interview to assess **Compliance Management Service**.

- **service_id**: `compliance-management-service`
- **Capability id prefix**: `cm-` (e.g. `cm-00`)
- **Question id format**: `rq-cm-00-1`
- **11 capabilities**, **41 reference questions** (stakeholder-approved spec)

## Validate content

```bash
python3 "evaluation-services/Compliance Management Service/validate_evaluation_content.py"
```

## Scoring rubric

Shared scoring rules: `shared/docs/evaluation-rubric.md`.

## OpenAI

Set `OPENAI_API_KEY` per root `.env.example` before LLM assessment sessions.
