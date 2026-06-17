# Change Management Service (evaluation service pack)

- **service_id**: `change-management`
- **Prefix**: `cm-` (e.g. `cm-00`, `rq-cm-00-1`)
- **9 capabilities**, **36 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Change Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged change management system and business process into `cm-01` (Change management system and process)
- Consolidated change policies by type (`cm-03`); reduced redundant per-type enterprise-wide and review questions
- Merged change baselines and baseline deviation into `cm-06` (Change baselines and deviation detection)
- Refreshed KPIs (`cm-02`) with change failure rate, unauthorized change detection, and restoration time metrics
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `cm-01`–`cm-10` IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
