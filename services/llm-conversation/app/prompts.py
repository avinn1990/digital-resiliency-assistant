import json
from typing import Any

from app.progression import build_progression_constraints

SYSTEM_PROMPT = """You are an expert assessor.
You conduct structured interviews to evaluate organizational capabilities for the given service.

Rules:
- Ask ONE clear question at a time (conversational, not a bulleted survey).
- Use reference questions as anchors; adapt wording to the user's context. There is no limit on reference questions per capability.
- Ask dynamic follow-ups when answers are vague, contradictory, or missing key details.
- Do not exceed 5 dynamic follow-ups per capability (tracked in dynamic_questions_asked). When at the limit, mark the capability sufficient or insufficient and move on.
- Do not repeat questions already answered unless clarifying.
- Mark a capability "sufficient" only when you have concrete evidence (people, process, artifacts, cadence).
- When the user does not have a document, needs permission to share it, or will provide it later, record a pending_artifacts entry for that capability instead of treating the evidence as complete.
- Stay professional and supportive; never blame the user.
- Respond ONLY with valid JSON matching the schema provided."""


def build_turn_prompt(
    bundle: dict[str, Any],
    capability_states: dict[str, Any],
    conversation: list[dict[str, str]],
    user_message: str | None,
    is_start: bool,
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
            "Do not use a question to score a different capability.",
            "Mark reference_questions_covered using the question id from the active capability group.",
            "Reference questions are not limited in count; ask all that apply for the capability.",
            "Dynamic follow-ups are limited to 5 per capability (append to dynamic_questions_asked).",
            "When progression_constraints shows a capability at the follow-up limit, mark it sufficient or insufficient and move to the next capability.",
            "In capability_updates, send only new ids for reference_questions_covered and dynamic_questions_asked; the server merges them with prior values.",
            "Set active_evaluation_focus to the specific rubric focus (evaluation_focus string) you are assessing this turn.",
            "Set active_capability_label to a short, natural phrase for the capability (2-4 words, lowercase, e.g. service existence, security program).",
            "Set active_rubric_label to one simple rubric word/phrase: Documentation, Enterprise adoption, Automation, Integration, or Monitoring.",
            "When the user lacks a document, needs permission to share it, or will provide it later, add pending_artifacts on the relevant capability_updates entry.",
            "pending_artifacts reason must be one of: not_available, needs_permission, will_provide_later.",
            "Do not mark a capability sufficient while a required pending_artifacts entry remains unresolved.",
        ],
        "progression_constraints": build_progression_constraints(capability_states),
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
                    "dynamic_questions_asked": ["short description of follow-up asked"],
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
            "extracted_facts": {"field_key": "value from user messages"},
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
    return json.dumps(
        {
            "task": "assess_capabilities",
            "service": bundle["capabilities"]["service_name"],
            "capabilities": bundle["capabilities"]["capabilities"],
            "capability_states": capability_states,
            "facts": facts,
            "response_schema": {
                "overall_score": "0-100",
                "maturity_label": "Initial | Emerging | Developing | Managed | Optimized",
                "summary": "string",
                "capability_results": [
                    {
                        "capability_id": "string",
                        "score": "0-100",
                        "status": "met | partial | gap | unknown",
                        "evidence": "string",
                        "recommendations": ["string"],
                    }
                ],
            },
        },
        indent=2,
    )
