# Enterprise Asset Management (evaluation service pack)

- **service_id**: `enterprise-asset-management`
- **Prefix**: `eam-` (e.g. `eam-00`, `rq-eam-00-1`)
- **14 capabilities** (merged from 30 in v1.0), **78 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Enterprise Asset Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- **Major merge (~53% cap reduction):** consolidated per-technology fragmentation across endpoint, network, and application domains
- Merged SSRM and procurement (`eam-03` + legacy `eam-03`/`eam-17`)
- Merged unmanaged, BYOD, and mobile assets (`eam-04` + legacy `eam-04`–`eam-07`)
- Merged managed asset security policies (`eam-05` + legacy `eam-08`–`eam-10`)
- Merged provisioning and deprovisioning policies (`eam-06` + legacy `eam-11`–`eam-16`)
- Merged inventory and registration lifecycle (`eam-07` + legacy `eam-18`–`eam-20`)
- Merged self-service and migration (`eam-08` + legacy `eam-21`–`eam-23`)
- Merged threat protection and supply chain visibility (`eam-09` + legacy `eam-24`/`eam-25`)
- Added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
