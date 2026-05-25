from app.clients.base import ServiceClient


class FrameworkClient(ServiceClient):
    async def list_frameworks(self) -> list[dict]:
        response = await self.get("/frameworks")
        response.raise_for_status()
        return response.json()

    async def get_framework(self, framework_id: str) -> dict:
        response = await self.get(f"/frameworks/{framework_id}")
        response.raise_for_status()
        return response.json()

    async def register_framework(self, framework: dict) -> dict:
        response = await self.post("/frameworks", json=framework)
        response.raise_for_status()
        return response.json()
