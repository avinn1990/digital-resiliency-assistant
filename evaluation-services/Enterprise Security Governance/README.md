# Enterprise Security Governance (evaluation service pack)

- **service_id**: `enterprise-security-governance`
- **Prefix**: `esg-` (e.g. `esg-00`, `rq-esg-00-1`)
- **6 capabilities**, **25 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Enterprise Security Governance/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged governance responsibility model and governance leader into `esg-02` (Governance responsibility model and leadership)
- Merged user, workload, and network segmentation strategies into `esg-03` (Segmentation governance strategy)
- Refreshed governance metrics with DORA board oversight and decision-cycle KPIs (`esg-01`)
- Added AI-era security governance with EU AI Act and DORA alignment (`esg-05`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `esg-03`–`esg-07` IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:** Program-level governance and accountability remain in ISSP (`issp-02`); enterprise risk scales and quantified risk profiles remain in Enterprise Risk Management (`erm-04`–`erm-12`). Segmentation *implementation* is assessed in Network Management and Access Management packs—this pack covers governance of segmentation *strategy*.
