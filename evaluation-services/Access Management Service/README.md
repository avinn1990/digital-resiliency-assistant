# Access Management Service (evaluation service pack)

- **service_id**: `access-management`
- **Prefix**: `acm-` (e.g. `acm-00`, `rq-acm-00-1`)
- **15 capabilities**, **51 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Access Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged network and application access provisioning into `acm-03`
- Merged identity, device posture, and asset attribute rules into `acm-04` (context-aware access)
- Refreshed KPIs (`acm-01`), remote access/ZTNA (`acm-05`), access matrix and recertification (`acm-07`), and SOC logging (`acm-12`)
- Added non-human/workload identity access (`acm-13`) and AI-era access governance (`acm-14`)
- Added `short_name` on all capabilities; clarified jargon; standardized review cadence language
- Renumbered capabilities after merges (removed legacy `acm-04`–`acm-07` IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
