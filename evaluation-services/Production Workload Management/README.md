# Production Workload Management (evaluation service pack)

- **service_id**: `production-workload-management`
- **Prefix**: `pwm-` (e.g. `pwm-00`, `rq-pwm-00-1`)
- **9 capabilities**, **31 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Production Workload Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged application security policy and secure API deployment (`pwm-07` + legacy `pwm-07`/`pwm-08`)
- Added zero-trust segmentation to application management process (`pwm-02`)
- Refreshed KPIs (`pwm-01`); added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
