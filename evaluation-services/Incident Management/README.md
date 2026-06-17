# Incident Management (evaluation service pack)

- **service_id**: `incident-management`
- **Prefix**: `im-` (e.g. `im-00`, `rq-im-00-1`)
- **13 capabilities**, **36 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Incident Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged incident management and triaging processes into `im-02` (Incident and triage process)
- Merged incident response plan and points of contact into `im-07` (Incident response plan and contacts)
- Enhanced ticketing with AI orchestration and analyst oversight (`im-11`)
- Refreshed KPIs (`im-01`) with MTTR, containment time, and AI triage metrics
- Added AI-assisted incident triage (`im-12`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `im-02`–`im-13` IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
