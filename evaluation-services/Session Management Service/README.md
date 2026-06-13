# Session Management Service (evaluation service pack)

- **service_id**: `session-management`
- **Prefix**: `ses-` (e.g. `ses-00`, `rq-ses-00-1`)
- **6 capabilities**, **21 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Session Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Added service existence (`ses-00`) and KPIs/KRIs (`ses-01`)
- Merged network and application session enforcement into `ses-02`
- Refreshed SSO with OIDC/SAML federation (`ses-03`)
- Added continuous session validation and risk-based renewal (`ses-04`)
- Added session lifecycle logging to SOC (`ses-05`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language
- Renumbered capabilities (removed legacy `ses-00`–`ses-02` IDs from v1.0)

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.

**Cross-pack:**

- *Authentication* (proving identity at login) remains in Authentication Service (`auth-01`, `auth-05` adaptive auth); this pack covers *session* lifecycle after authentication.
- *Access* policy decisions remain in Access Management (`acm-04` context-aware access); remote access gateways remain in Access Management (`acm-05`).
- Privileged *session recording* for admin access remains in PAM (`pam-06`).
