# Security Training (evaluation service pack)

- **service_id**: `security-training`
- **Prefix**: `st-` (e.g. `st-00`, `rq-st-00-1`)
- **9 capabilities**, **18 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Security Training/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Expanded from 2 capabilities to 9 with program governance, KPIs, curriculum, segmentation, onboarding, phishing simulation, technical training, AI-era awareness, and delivery platform
- Refreshed legacy proactive content (`st-00`/`st-01` from v1.0) into `st-02` (curriculum) and `st-03` (segmented training)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities (legacy `st-00` Proactive Security Trainings → `st-02`; legacy `st-01` Customized training → `st-03`)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:** Strategic workforce and culture planning remains in ISSP (`issp-10`); security culture outcomes and leadership tone are assessed in Security Culture. Secure SDLC practices are also covered in Application Development and Testing.
