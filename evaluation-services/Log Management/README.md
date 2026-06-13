# Log Management (evaluation service pack)

- **service_id**: `log-management`
- **Prefix**: `lm-` (e.g. `lm-00`, `rq-lm-00-1`)
- **10 capabilities**, **26 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Log Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged per-segment logging caps (`lm-03` through `lm-08` from v1.0) into `lm-03` (Unified enterprise log collection)
- Refreshed KPIs (`lm-01`) with ingestion coverage, pipeline latency, and retention metrics
- Added AI-assisted log analysis (`lm-09`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `lm-03`–`lm-12` segment IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
