# Policy Management Service (evaluation service pack)

- **service_id**: `policy-management`
- **Prefix**: `plm-` (e.g. `plm-00`, `rq-plm-00-1`)
- **10 capabilities**, **38 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Policy Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged rule provisioning and de-provisioning into `plm-04` (Rule lifecycle management)
- Merged network, authentication, authorization, application, and data context-based policies into `plm-07` (Context-based domain policies)
- Refreshed KPIs with policy drift, exception, and deployment metrics (`plm-02`)
- Refreshed rule management system with policy-as-code (`plm-03`)
- Expanded policy change monitoring with anomalous change detection (`plm-08`)
- Added AI-era policy governance (`plm-09`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities after merges (removed legacy `plm-04`–`plm-14` v1.0 ID layout)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:** Subject/object access matrix certification remains in Access Management (`acm-07`); context-aware *enforcement* at PEPs is assessed in Access Management (`acm-04`). AI tool *access* boundaries overlap Access Management (`acm-14`)—this pack covers the *policy* layer.
