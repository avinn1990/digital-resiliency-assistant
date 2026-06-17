# Identity Management Service (evaluation service pack)

- **service_id**: `identity-management`
- **Prefix**: `idm-` (e.g. `idm-00`, `rq-idm-00-1`)
- **10 capabilities**, **42 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Identity Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged subject and object profiles into `idm-04`
- Merged identity provisioning and deprovisioning into `idm-05`
- Merged third-party vendor provisioning and deprovisioning into `idm-06`
- Added machine and workload identity lifecycle (`idm-07`) with automation and AI agent identity governance
- Refreshed KPIs with orphaned identity, deprovisioning velocity, and machine identity metrics (`idm-01`)
- Refreshed identity store with cloud IdP/federation (`idm-02`); expanded lifecycle logging with anomaly detection (`idm-09`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 (legacy `idm-04`–`idm-11` as separate caps) will not map cleanly to v1.1.

**Cross-pack:**

- Non-human *authentication* methods remain in Authentication Service (`auth-06`); this pack covers non-human *identity lifecycle* in the identity store.
- Non-human *access* policies remain in Access Management (`acm-13`); AI-era *access* governance remains in Access Management (`acm-14`).
- Credential storage and rotation policies remain in Credential Management; certificate issuance remains in Certificate Management.
