import json
from typing import Any

from app.progression import OPERATING_CONTEXT_KEY, build_progression_constraints

SYSTEM_PROMPT = """You are an expert assessor.
You conduct structured interviews to evaluate organizational capabilities for the given service.

Rules:
- Ask ONE clear question at a time (conversational, not a bulleted survey).
- Use reference questions as anchors; preserve each question's intent and evaluation_focus; adapt wording to the user's operating context.
- Probe as much as needed. There is no limit on probes or dynamic follow-ups per capability.
- When the user answers yes, partial, or informal, use probe_hints from question metadata before marking a reference question covered.
- Maintain operating_context in extracted_facts (key: "operating_context"): technology_modes, scope, automation_level, integration_channels, policies_artifacts, primary_subject, ecosystem_description, and related fields from operating_context_keys.
- Technology includes spreadsheets, scripts, shared registers, dashboards, and integrated tool ecosystems — not only dedicated GRC platforms.
- Never reference an artifact the user rejected (e.g. do not say "platform" after they said no dedicated platform); use their actual subject (service, spreadsheets, team process).
- Missing a dedicated platform does not make follow-up questions irrelevant — assess the same rubric dimension through the technology ecosystem they use.
- Do not repeat questions already answered unless clarifying.
- Mark a capability "sufficient" only when operating_context and conversation provide enough detail to score rubric dimensions (people, process, technology, artifacts, cadence).
- When the user does not have a document, needs permission to share it, or will provide it later, record a pending_artifacts entry for that capability instead of treating the evidence as complete.
- Stay professional and supportive; never blame the user.
- Acknowledge progress every 2-3 capabilities resolved: brief, specific praise tied to evidence gathered.
- Vary question shape: scenarios, contrasts, scales (never/sometimes/always), or concise multiple-choice when it reduces cognitive load—still one question per turn.
- After closing a capability, give a 1-2 sentence mini-recap of what you learned before opening the next capability.
- When engagement_context.should_offer_checkpoint is true, offer a natural pause: continue now or say "pause" to stop for later.
- When engagement_context.possible_fatigue is true, use shorter simpler questions and offer a break without guilt.
- Never guilt the user for pausing, not having documents, or needing a break.
- Respond ONLY with valid JSON matching the schema provided."""


def build_turn_prompt(
    bundle: dict[str, Any],
    capability_states: dict[str, Any],
    conversation: list[dict[str, str]],
    user_message: str | None,
    is_start: bool,
    engagement_context: dict[str, Any] | None = None,
    current_facts: dict[str, Any] | None = None,
) -> str:
    caps = bundle["capabilities"]["capabilities"]
    refs_by_capability = bundle["reference_questions"]["capability_questions"]

    payload = {
        "task": "start_session" if is_start else "process_user_message",
        "service": bundle["capabilities"]["service_name"],
        "capabilities_to_assess": caps,
        "reference_questions_by_capability": refs_by_capability,
        "rules": [
            "Each reference question evaluates exactly one capability_id in its group.",
            "Preserve question intent and evaluation_focus; adapt subject wording using dependency_type, subject_fallbacks, and reframe_rules.",
            "dependency_type guide: independent=ask as anchored; subject_bound=substitute subject from operating_context; mode_bound=ask via technology_modes/automation_level; ecosystem_bound=ask about integration and data flows.",
            "Mark reference_questions_covered only after probe_hints are satisfied when probe_on matches the user's answer.",
            "Append every probe to dynamic_questions_asked; there is no probe limit.",
            "In capability_updates, send only new ids for reference_questions_covered and dynamic_questions_asked; the server merges them with prior values.",
            "Update extracted_facts with field_key values and merge operating_context (key: operating_context) using operating_context_keys from each question.",
            "Set active_evaluation_focus to the specific rubric focus (evaluation_focus string) you are assessing this turn.",
            "Set active_capability_label to a short, natural phrase for the capability (2-4 words, lowercase, e.g. service existence, risk monitoring technology).",
            "Set active_rubric_label to one simple rubric word/phrase: Documentation, Enterprise adoption, Automation, Integration, or Monitoring.",
            "When the user lacks a document, needs permission to share it, or will provide it later, add pending_artifacts on the relevant capability_updates entry.",
            "pending_artifacts reason must be one of: not_available, needs_permission, will_provide_later.",
            "Do not mark a capability sufficient while a required pending_artifacts entry remains unresolved.",
            "Use engagement_context to pace the interview: acknowledge milestones, offer checkpoints when should_offer_checkpoint is true, and simplify when possible_fatigue is true.",
            "When a capability is closed, include a brief recap in reply before the next question.",
        ],
        "engagement_context": engagement_context or {},
        "progression_constraints": build_progression_constraints(capability_states),
        "current_facts": current_facts or {},
        "operating_context": (current_facts or {}).get(OPERATING_CONTEXT_KEY, {}),
        "current_capability_states": capability_states,
        "conversation_so_far": conversation,
        "user_message": user_message,
        "response_schema": {
            "reply": "string — next message to show the user (one question or brief acknowledgment + question)",
            "active_capability_id": "string | null",
            "active_evaluation_focus": "string | null — rubric focus being assessed (from capability evaluation_focus or reference question)",
            "active_capability_label": "string | null — short human label for the capability (e.g. service existence)",
            "active_rubric_label": "string | null — simple rubric label: Documentation | Enterprise adoption | Automation | Integration | Monitoring",
            "capability_updates": [
                {
                    "capability_id": "string",
                    "status": "not_started | exploring | sufficient | insufficient",
                    "evidence_summary": "string",
                    "reference_questions_covered": ["question ids"],
                    "dynamic_questions_asked": ["short description of probe or follow-up asked"],
                    "pending_artifacts": [
                        {
                            "id": "stable string id",
                            "label": "human-readable artifact name",
                            "reason": "not_available | needs_permission | will_provide_later",
                            "notes": "optional context",
                            "status": "pending | fulfilled",
                        }
                    ],
                    "confidence": "0.0-1.0",
                }
            ],
            "extracted_facts": {
                "field_key": "value from user messages",
                "operating_context": {
                    "primary_subject": "service | technology_ecosystem | platform | team | process",
                    "technology_modes": ["excel_spreadsheets", "grc_platform", "..."],
                    "ecosystem_description": "string",
                    "scope": "enterprise_wide | partial | unknown",
                    "automation_level": "manual | partial | enterprise_wide",
                    "integration_channels": ["email", "api", "..."],
                    "policies_artifacts": ["..."],
                },
            },
            "completed": "boolean — true when all capabilities are sufficient or insufficient with enough evidence",
            "completion_note": "string | null",
        },
    }
    return json.dumps(payload, indent=2)


def build_assessment_prompt(
    bundle: dict[str, Any],
    capability_states: dict[str, Any],
    facts: dict[str, Any],
) -> str:
    operating_context = facts.get(OPERATING_CONTEXT_KEY, {})
    return json.dumps(
        {
            "task": "assess_capabilities",
            "service": bundle["capabilities"]["service_name"],
            "capabilities": bundle["capabilities"]["capabilities"],
            "capability_states": capability_states,
            "facts": facts,
            "operating_context": operating_context,
            "assessment_rules": [
                "Score each capability using operating_context and field_key facts as primary evidence.",
                "For Technology capabilities, score from technology_modes and ecosystem_description — spreadsheets and manual tools are technology.",
                "Do not mark a gap solely because the user denied a dedicated platform if operating_context shows partial implementation via other technology.",
                "Score Automatable and Integrated lower for spreadsheet-only or manual workflows than for integrated GRC ecosystems.",
                "Evidence strings must cite concrete tools, scope, cadence, and owners from facts and operating_context.",
                "Use capability_states evidence_summary to supplement facts.",
            ],
            "response_schema": {
                "overall_score": "0-100",
                "maturity_label": "Initial | Emerging | Developing | Managed | Optimized",
                "summary": "string",
                "capability_results": [
                    {
                        "capability_id": "string",
                        "score": "0-100",
                        "status": "met | partial | gap | unknown",
                        "evidence": "string — must reference operating_context where available",
                        "recommendations": ["string"],
                    }
                ],
            },
        },
        indent=2,
    )
