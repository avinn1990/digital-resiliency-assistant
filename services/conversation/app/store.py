from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


@dataclass
class SessionState:
    session_id: str
    framework_id: str
    question_index: int = 0
    facts: dict[str, Any] = field(default_factory=dict)
    confidence: dict[str, float] = field(default_factory=dict)
    messages: list[dict[str, str]] = field(default_factory=list)
    completed: bool = False
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}

    def create(self, framework_id: str) -> SessionState:
        session = SessionState(session_id=str(uuid4()), framework_id=framework_id)
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> SessionState | None:
        return self._sessions.get(session_id)


store = SessionStore()
