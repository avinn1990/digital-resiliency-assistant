# Credential Management Service (evaluation service pack)

- **service_id**: `credential-management`
- **Prefix**: `cred-` (e.g. `cred-00`, `rq-cred-00-1`)
- **7 capabilities**, **26 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Credential Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Added KPIs/KRIs with rotation compliance, secrets sprawl, and passkey adoption (`cred-01`)
- Refreshed credential lifecycle policy with passkey support (`cred-02`)
- Renamed and refreshed secure credential vault (`cred-03`)
- Merged provisioning, deprovisioning, and storage processes into `cred-04` (Credential lifecycle operations)
- Added non-human and API credential governance (`cred-05`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 (legacy separate `cred-03`–`cred-05` lifecycle caps) will not map cleanly to v1.1.

**Cross-pack:**

- Non-human *authentication* methods (OAuth flows, client credentials) remain in Authentication Service (`auth-06`); this pack covers credential *storage, rotation, and lifecycle*.
- Non-human *identity* provisioning remains in Identity Management (`idm-07`); non-human *access* policies remain in Access Management (`acm-13`).
- Certificate *issuance and PKI* operations remain in Certificate Management; cryptographic *key* material remains in Cryptographic Key Management.
