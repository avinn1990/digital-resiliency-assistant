# Data Management (evaluation service pack)

- **service_id**: `data-management`
- **Prefix**: `dtm-` (e.g. `dtm-00`, `rq-dtm-00-1`)
- **18 capabilities** (merged from 35 in v1.0), **88 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Data Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- **Major merge (~49% cap reduction):** consolidated per-technology fragmentation and duplicate policy/process pairs
- Merged governance, privacy officer, and stewardship (`dtm-04` + legacy `dtm-04`/`dtm-09`/`dtm-31`)
- Merged lifecycle policies (`dtm-05` + legacy `dtm-05`–`dtm-07`)
- Merged retention policies and process (`dtm-06` + legacy `dtm-08`/`dtm-30`)
- Merged architecture and modelling (`dtm-07` + legacy `dtm-10`/`dtm-12`)
- Merged DLP and encryption (`dtm-08` + legacy `dtm-13`–`dtm-16`)
- Merged classification, labelling, and flows (`dtm-09` + legacy `dtm-18`/`dtm-20`/`dtm-21`)
- Merged quality and master data (`dtm-10` + legacy `dtm-17`/`dtm-22`); warehousing folded into platform (`dtm-02`)
- Merged lifecycle processes (`dtm-13` + legacy `dtm-24`–`dtm-26`)
- Merged resiliency, backup, and RPO/RTO (`dtm-14` + legacy `dtm-27`–`dtm-29`)
- Added AI-era data governance (`dtm-17`)
- Added `short_name` on all capabilities; standardized quarterly review cadence

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
