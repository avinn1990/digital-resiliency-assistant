# Automation, Orchestration and Integration (evaluation service pack)

- **service_id**: `automation-orchestration-integration`
- **Prefix**: `aoi-` (e.g. `aoi-00`, `rq-aoi-00-1`)
- **6 capabilities**, **20 reference questions**
- **version**: 1.1

```bash
python3 "evaluation-services/Automation, Orchestration and Integration/validate_evaluation_content.py"
```

Scoring: `shared/docs/evaluation-rubric.md`

## Cross-pack scope

AI-assisted alert triage and SOC workflow AI governance are assessed in **Security Operations** v1.1 (`soc-10`). Incident workflow and AI-assisted triage are in **Incident Management** v1.1 (`im-11`, `im-12`). This pack focuses on SOAR orchestration, playbook maturity, cross-platform integration, automated remediation workflows, and automation governance—not duplicate SOC triage capabilities.

## Changelog

### 1.1

- Expanded from 2 to 6 capabilities with SOAR/playbook-focused coverage
- Added service existence (`aoi-00`), SOAR platform and orchestration (`aoi-01`), and security playbook development (`aoi-02`)
- Evolved vendor lock-in into cross-platform integration and vendor lock-in risk (`aoi-04`)
- Split automated remediation workflows (`aoi-03`) and AI-assisted automation governance (`aoi-05`) from legacy AiSecOPs (`aoi-01`)
- Added `short_name` on all capabilities; standardized quarterly review cadence language

**Note:** Saved chat drafts referencing removed capability IDs from v1.0 will not map cleanly to v1.1.
