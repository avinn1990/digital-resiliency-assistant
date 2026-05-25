from app.clients.base import ServiceClient


class AssessmentClient(ServiceClient):
    async def run_assessment(self, session_id: str, framework_id: str, facts: dict) -> dict:
        response = await self.post(
            "/assessments",
            json={
                "session_id": session_id,
                "framework_id": framework_id,
                "facts": facts,
            },
        )
        response.raise_for_status()
        return response.json()
