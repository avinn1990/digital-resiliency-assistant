"""Tracks which gateway sessions use the LLM conversation service."""

_llm_session_ids: set[str] = set()


def register_llm_session(session_id: str) -> None:
    _llm_session_ids.add(session_id)


def is_llm_session(session_id: str) -> bool:
    return session_id in _llm_session_ids
