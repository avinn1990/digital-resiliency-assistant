# Container Management (evaluation service pack)

- **service_id**: `container-management`
- **Prefix**: `ctm-` (e.g. `ctm-00`, `rq-ctm-00-1`)
- **6 capabilities**, **21 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Container Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Added container image provenance and supply chain verification to orchestration platform (`ctm-03`)
- Refreshed KPIs (`ctm-01`) and container security (`ctm-05`)
- Added `short_name` on all capabilities; standardized quarterly review cadence
