# Network Management Service (evaluation service pack)

- **service_id**: `network-management`
- **Prefix**: `nm-` (e.g. `nm-00`, `rq-nm-00-1`)
- **8 capabilities**, **25 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Network Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged capacity planning and scale (`nm-04` + legacy `nm-09`)
- Merged network visibility and fault correlation (`nm-05` + legacy `nm-08`)
- Added zero-trust segmentation alignment to network management process (`nm-02`)
- Added segmentation visibility to NMS observability (`nm-05`)
- Refreshed KPIs (`nm-01`); added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
