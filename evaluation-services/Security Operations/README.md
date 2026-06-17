# Security Operations (evaluation service pack)

- **service_id**: `security-operations`
- **Prefix**: `soc-` (e.g. `soc-00`, `rq-soc-00-1`)
- **11 capabilities**, **42 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Security Operations/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged behavioural analysis, software scanning, and real-time monitoring into `soc-05` (SOC detection and monitoring)
- Merged device compliance visibility and cross-service KPI monitoring into `soc-07` (Cross-service visibility and KPI monitoring)
- Folded application trend analysis into `soc-02` (SOC System dashboards)
- Refreshed KPIs (`soc-01`) with MTTD, MTTR, alert fidelity, and AI triage metrics
- Added AI SecOps (`soc-10`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `soc-05`–`soc-13` IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
