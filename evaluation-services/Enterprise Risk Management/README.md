# Enterprise Risk Management (evaluation service pack)

This evaluation service pack defines the **capabilities** and **reference questions** used by the LLM interview to assess **Enterprise Risk Management**.

- **service_id**: `enterprise-risk-management`
- **Capability id prefix**: `erm-` (e.g. `erm-00`)
- **Question id format**: `rq-erm-00-1`

## Validate content

Run:

```bash
python3 "evaluation-services/Enterprise Risk Management/validate_evaluation_content.py"
```

Expected output:

```text
ok: N capabilities, M questions, 1:1 capability mapping enforced
```

## Scoring rubric

Shared scoring rules are described in `shared/docs/evaluation-rubric.md`.

## OpenAI (LLM interviews)

Set `OPENAI_API_KEY` per the root `.env.example` before starting LLM assessment sessions.
