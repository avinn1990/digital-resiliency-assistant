# Business Continuity Management (evaluation service pack)

- **service_id**: `business-continuity-management`
- **Prefix**: `bcm-` (e.g. `bcm-00`, `rq-bcm-00-1`)
- **10 capabilities**, **23 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Business Continuity Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged disaster response plan and response plan exercise into `bcm-07` (Disaster response plan and exercises)
- Added cyber resilience and ransomware recovery (`bcm-08`)
- Refreshed KPIs (`bcm-01`) with RTO/RPO, exercise completion, and recovery test metrics
- Refreshed BCP strategy (`bcm-03`) with cyber and ransomware disruption scenarios
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merge (legacy `bcm-08` Response Plan Exercise merged into `bcm-07`; new `bcm-08` is cyber resilience)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:** Incident response execution remains in Incident Management; backup and immutable storage implementation is assessed in Data Management.
