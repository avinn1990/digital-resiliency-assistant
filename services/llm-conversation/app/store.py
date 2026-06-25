from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


@dataclass
class LlmSession:
    session_id: str
    framework_id: str
    service_id: str
    messages: list[dict[str, str]] = field(default_factory=list)
    capability_states: dict[str, Any] = field(default_factory=dict)
    facts: dict[str, Any] = field(default_factory=dict)
    confidence: dict[str, float] = field(default_factory=dict)
    completed: bool = False
    paused: bool = False
    user_message_lengths: list[int] = field(default_factory=list)
    evaluation_path: str = ""
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, LlmSession] = {}

    def create(
        self,
        framework_id: str,
        service_id: str,
        evaluation_path: str,
        initial_states: dict[str, Any],
    ) -> LlmSession:
        session = LlmSession(
            session_id=str(uuid4()),
            framework_id=framework_id,
            service_id=service_id,
            capability_states=initial_states,
            evaluation_path=evaluation_path,
        )
        self._sessions[session.session_id] = session
        return session

    def create_restored(
        self,
        framework_id: str,
        service_id: str,
        evaluation_path: str,
        capability_states: dict[str, Any],
        facts: dict[str, Any],
        messages: list[dict[str, str]],
        completed: bool,
    ) -> LlmSession:
        session = LlmSession(
            session_id=str(uuid4()),
            framework_id=framework_id,
            service_id=service_id,
            capability_states=capability_states,
            facts=facts,
            messages=list(messages),
            completed=completed,
            evaluation_path=evaluation_path,
        )
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> LlmSession | None:
        return self._sessions.get(session_id)


store = SessionStore()


def initial_capability_states(capabilities: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        cap["id"]: {
            "capability_id": cap["id"],
            "name": cap["name"],
            "status": "not_started",
            "evidence_summary": "",
            "reference_questions_covered": [],
            "dynamic_questions_asked": [],
            "pending_artifacts": [],
            "confidence": 0.0,
        }
        for cap in capabilities
    }
