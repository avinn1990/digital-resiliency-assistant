# Authentication Service (evaluation service pack)

- **service_id**: `authentication-service`
- **Prefix**: `auth-` (e.g. `auth-00`, `rq-auth-00-1`)
- **8 capabilities**, **27 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Authentication Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged MFA, passwordless, and phishing-resistant authentication into `auth-04` (Modern and phishing-resistant authentication)
- Added risk-based and adaptive authentication (`auth-05`)
- Added non-human and API authentication (`auth-06`)
- Refreshed authentication system with cloud IdP/federation support (`auth-01`)
- Refreshed KPIs with MFA/passkey coverage and credential attack metrics (`auth-03`)
- Expanded authentication logging with anomaly detection (`auth-07`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 (legacy `auth-04`–`auth-06` as separate MFA/passwordless/phishing caps) will not map cleanly to v1.1.

**Cross-pack:** Non-human *access* policies remain in Access Management (`acm-13`); this pack covers non-human *authentication* methods.
