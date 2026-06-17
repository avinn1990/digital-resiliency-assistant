# Security Architecture Management (evaluation service pack)

- **service_id**: `security-architecture-management`
- **Prefix**: `sam-` (e.g. `sam-00`, `rq-sam-00-1`)
- **10 capabilities**, **32 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Security Architecture Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Renamed service existence capability (`sam-00`) and added `short_name` on all capabilities
- Merged network segmentation and application isolation into `sam-02` (Network and application segmentation)
- Renamed and refreshed network encryption (`sam-03`), network resiliency (`sam-04`), and design reviews (`sam-05`) with AI-era and zero-trust considerations
- Refreshed KPIs (`sam-01`) with segmentation, design review, and API security metrics
- Enhanced AMO team capability (`sam-09`) with AI-era threat awareness
- Standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `sam-02`–`sam-10` IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
