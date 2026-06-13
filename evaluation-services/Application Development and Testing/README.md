# Application Development and Testing (evaluation service pack)

- **service_id**: `application-development-testing`
- **Prefix**: `adt-` (e.g. `adt-00`, `rq-adt-00-1`)
- **11 capabilities**, **36 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Application Development and Testing/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged application testing, static testing, dynamic testing, and proactive issue identification into `adt-05` (Application security testing)
- Merged application owners and business analysts into `adt-03` (Application ownership and governance)
- Renamed and streamlined developer production isolation (`adt-06`, formerly `adt-09`)
- Added software supply chain security (`adt-09`) and AI-assisted development governance (`adt-10`)
- Refreshed KPIs, secure development strategy (AI-era threat model), and expert code review for AI-generated code
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
