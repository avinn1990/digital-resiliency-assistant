import json
from typing import Any

SYSTEM_PROMPT = """You are an expert assessor for Information Security Strategy and Planning.
You conduct structured interviews to evaluate organizational capabilities.

Rules:
- Ask ONE clear question at a time (conversational, not a bulleted survey).
- Use reference questions as anchors; adapt wording to the user's context.
- Ask dynamic follow-ups when answers are vague, contradictory, or missing key details.
- Do not repeat questions already answered unless clarifying.
- Mark a capability "sufficient" only when you have concrete evidence (people, process, artifacts, cadence).
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
        ],
        "current_capability_states": capability_states,
        "conversation_so_far": conversation[-20:],
        "user_message": user_message,
        "response_schema": {
            "reply": "string — next message to show the user (one question or brief acknowledgment + question)",
            "active_capability_id": "string | null",
            "capability_updates": [
                {
                    "capability_id": "string",
                    "status": "not_started | exploring | sufficient | insufficient",
                    "evidence_summary": "string",
                    "reference_questions_covered": ["question ids"],
                    "dynamic_questions_asked": ["short description of follow-up asked"],
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
