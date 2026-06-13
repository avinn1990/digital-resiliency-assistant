# Update and Patch Management Service (evaluation service pack)

- **service_id**: `update-patch-management`
- **Prefix**: `upm-` (e.g. `upm-00`, `rq-upm-00-1`)
- **8 capabilities**, **34 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Update and Patch Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged enterprise and third-party patch processes into `upm-01` (Unified patch management process)
- Streamlined patch orchestration questions in `upm-03`; unified device, network, and application policies in `upm-04`
- Renamed hierarchy model to patch management teams (`upm-05`); renumbered SOC logging to `upm-06`
- Refreshed KPIs (`upm-02`) with MTTR, patch velocity, and critical vulnerability SLA metrics
- Added AI-assisted patch prioritization (`upm-07`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
