# Certificate Management Service (evaluation service pack)

- **service_id**: `certificate-management`
- **Prefix**: `cert-` (e.g. `cert-00`, `rq-cert-00-1`)
- **6 capabilities**, **21 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Certificate Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Added KPIs/KRIs with expiry, auto-renewal, and shadow certificate metrics (`cert-01`)
- Renamed centralized certificate store to certificate platform (`cert-02`)
- Merged creation, distribution, and revocation processes into `cert-03` with ACME automation
- Added machine identity and short-lived certificate governance (`cert-04`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 (legacy separate `cert-02`–`cert-04`) will not map cleanly to v1.1.

**Cross-pack:**

- Certificate *age policy* in credential lifecycle remains in Credential Management (`cred-02`); this pack covers PKI *issuance and lifecycle*.
- Cryptographic *key* material for signing certificates remains in Cryptographic Key Management (`ckm-03`); certificate-based *authentication* remains in Authentication Service (`auth-06`).
- Machine *identity lifecycle* in the identity store remains in Identity Management (`idm-07`).
