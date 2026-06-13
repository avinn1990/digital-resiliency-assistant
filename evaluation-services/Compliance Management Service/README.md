# Compliance Management Service (evaluation service pack)

- **service_id**: `compliance-management-service`
- **Prefix**: `cm-` (e.g. `cm-00`, `rq-cm-00-1`)
- **10 capabilities**, **35 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Compliance Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged compliance management software and compliance scanning into `cm-01` (Compliance management platform and scanning)
- Merged compliance teams and policy specialists into `cm-05` (Compliance teams and specialists)
- Streamlined asset hardening from 14 to 4 questions covering application, device, and network hardening (`cm-07`)
- Refreshed standards alignment with DORA and EU AI Act mapping (`cm-03`)
- Refreshed compliance metrics with control coverage, scan pass rate, and remediation velocity (`cm-04`)
- Expanded SOC compliance monitoring with anomalous drift detection (`cm-08`)
- Added AI-era compliance governance (`cm-09`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `cm-01`–`cm-10` v1.0 ID layout)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:** Program-level compliance alignment remains in ISSP (`issp-08`); policy lifecycle and rule management remain in Policy Management Service. DORA board-level ICT risk governance is assessed in Enterprise Security Governance (`esg-01`, `esg-05`).
