# Content Management Service (evaluation service pack)

- **service_id**: `content-management`
- **Prefix**: `cnt-` (e.g. `cnt-00`, `rq-cnt-00-1`)
- **7 capabilities**, **18 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Content Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Cross-pack scope

Endpoint configuration baselines and infrastructure-as-code monitoring overlap with **Configuration Management Service** v1.1 (`cfm-06`, `cfm-08`). This pack focuses on mobile content, MDM, virtual workspaces, and golden images for endpoint provisioning—not duplicate configuration drift or IaC pipeline monitoring.

## Changelog

### 1.1

- Separated mislabeled policy capability into proper KPIs/KRIs (`cnt-01`) and content management policy (`cnt-02`)
- Merged downloadable content and distribution into `cnt-03` (Mobile content monitoring and distribution)
- Renamed virtual workspace (`cnt-04`) and mobile firmware (`cnt-05`) capabilities with `short_name` on all capabilities
- Refreshed KPIs with MDM coverage, policy compliance, and distribution metrics
- Standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
