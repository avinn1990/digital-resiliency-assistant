# Code Management (evaluation service pack)

- **service_id**: `code-management`
- **Prefix**: `cdm-` (e.g. `cdm-00`, `rq-cdm-00-1`)
- **5 capabilities**, **17 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Code Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Cross-pack scope

Software supply chain security (SBOM generation, dependency scanning, third-party component policy) and AI-assisted development governance are assessed in **Application Development and Testing** v1.1 (`adt-09`, `adt-10`). This pack focuses on repository governance, lifecycle automation, secure storage, and access control—not duplicate those capabilities.

## Changelog

### 1.1

- Added service existence capability (`cdm-00`)
- Merged code management software, deployment methodology, and code updates into `cdm-01` (Code management platform and lifecycle)
- Merged code repositories and secure code storage into `cdm-02` (Enterprise code repositories and secure storage)
- Merged creation and deletion of code testing environments into `cdm-04` (Testing environment lifecycle)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Documented cross-pack boundaries with Application Development and Testing

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
