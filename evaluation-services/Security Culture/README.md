# Security Culture (evaluation service pack)

- **service_id**: `security-culture`
- **Prefix**: `sc-` (e.g. `sc-00`, `rq-sc-00-1`)
- **8 capabilities**, **16 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Security Culture/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Expanded from 1 capability to 8 with program governance, KPIs, leadership tone, champions, incentives, workforce understanding, reporting culture, and culture measurement
- Split legacy `sc-00` Top Down Security culture into leadership (`sc-02`), incentives (`sc-04`), and workforce understanding (`sc-05`) capabilities
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities (legacy `sc-00` topics distributed across `sc-02`–`sc-07`)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:** Strategic workforce and culture planning remains in ISSP (`issp-10`); training delivery, curriculum, and phishing simulation are assessed in Security Training. Executive accountability at board level overlaps Enterprise Security Governance (`esg-01`).
