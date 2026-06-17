# Configuration Management Service (evaluation service pack)

- **service_id**: `configuration-management`
- **Prefix**: `cfm-` (e.g. `cfm-00`, `rq-cfm-00-1`)
- **9 capabilities**, **48 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Configuration Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged SDN provisioning and network design documentation (`cfm-05` + legacy `cfm-06`)
- Merged workload and endpoint configuration management (`cfm-06` + legacy `cfm-07`–`cfm-09`)
- Refreshed KPIs (`cfm-02`); added IaC pipeline logging to SOC monitoring (`cfm-08`)
- Added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
