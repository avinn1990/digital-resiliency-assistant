# Privileged Access Management Service (evaluation service pack)

- **service_id**: `privileged-access-management`
- **Prefix**: `pam-` (e.g. `pam-00`, `rq-pam-00-1`)
- **7 capabilities**, **29 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Privileged Access Management Service/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Changelog

### 1.1

- Merged application and device privileged access provisioning into `pam-03`
- Added just-in-time and ephemeral privileged access (`pam-04`)
- Refreshed PAM system with JIT platform capability (`pam-01`); KPIs with standing/JIT ratio and session recording (`pam-02`)
- Expanded PAM logging with session recording and anomaly detection (`pam-06`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 (legacy separate `pam-03` and `pam-04`) will not map cleanly to v1.1.

**Cross-pack:**

- General *access provisioning* and entitlement certification remain in Access Management (`acm-03`, `acm-07`); this pack covers *privileged* access elevation and session brokering.
- Non-human *access* for workloads remains in Access Management (`acm-13`); non-human *authentication* remains in Authentication Service (`auth-06`).
- Identity lifecycle for privileged account holders remains in Identity Management; credential vaulting for privileged secrets may overlap Credential Management (`cred-03`).
