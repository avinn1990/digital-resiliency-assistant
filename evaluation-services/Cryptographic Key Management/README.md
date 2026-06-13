# Cryptographic Key Management (evaluation service pack)

- **service_id**: `cryptographic-key-management`
- **Prefix**: `ckm-` (e.g. `ckm-00`, `rq-ckm-00-1`)
- **10 capabilities**, **40 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Cryptographic Key Management/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Added KPIs/KRIs with rotation compliance, HSM/cloud KMS coverage, and orphaned key metrics (`ckm-01`)
- Merged encryption policy and key provisioning/deprovisioning policies into `ckm-02`
- Merged key inventory system and secure storage into KMS/HSM platform (`ckm-03`)
- Merged key provisioning and deprovisioning processes into `ckm-05`
- Merged activation, deactivation, suspension, archival, and recovery into `ckm-07` (Key lifecycle state management)
- Merged key revocation and compromise response into `ckm-08`
- Added cloud KMS and machine identity key governance (`ckm-09`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Reduced from 17 to 10 capabilities (removed legacy `ckm-01`–`ckm-16` as separate lifecycle caps)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:**

- Certificate *issuance and PKI lifecycle* remain in Certificate Management (`cert-02`, `cert-03`); signing keys for CA operations are assessed here.
- Credential *storage* for passwords and API secrets remains in Credential Management (`cred-03`); this pack covers cryptographic *key material*.
- Machine *identity lifecycle* in the identity store remains in Identity Management (`idm-07`); machine *authentication* remains in Authentication Service (`auth-06`).
