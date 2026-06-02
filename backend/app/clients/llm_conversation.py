from app.clients.base import ServiceClient


LLM_FRAMEWORK_IDS = frozenset({"information-security-strategy-planning"})


class LlmConversationClient(ServiceClient):
    async def start_session(self, framework_id: str) -> dict:
        response = await self.post(
            "/sessions",
            json={"framework_id": framework_id},
        )
        response.raise_for_status()
        return response.json()

    async def restore_session(self, framework_id: str, snapshot: dict) -> dict:
        response = await self.post(
            "/sessions/restore",
            json={"framework_id": framework_id, "snapshot": snapshot},
        )
        response.raise_for_status()
        return response.json()

    async def send_message(self, session_id: str, message: str) -> dict:
        response = await self.post(
            f"/sessions/{session_id}/messages",
            json={"message": message},
        )
        response.raise_for_status()
        return response.json()

    async def get_facts(self, session_id: str) -> dict:
        response = await self.get(f"/sessions/{session_id}/facts")
        response.raise_for_status()
        return response.json()

    async def run_assessment(self, session_id: str) -> dict:
        response = await self.post(f"/sessions/{session_id}/assess")
        response.raise_for_status()
        return response.json()
