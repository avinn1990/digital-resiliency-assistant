from app.clients.base import ServiceClient


class ConversationClient(ServiceClient):
    async def start_session(self, framework_id: str) -> dict:
        response = await self.post(
            "/sessions",
            json={"framework_id": framework_id},
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
