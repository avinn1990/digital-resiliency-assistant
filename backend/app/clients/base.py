import httpx


class ServiceClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def get(self, path: str, **kwargs) -> httpx.Response:
        async with httpx.AsyncClient() as client:
            return await client.get(f"{self.base_url}{path}", **kwargs)

    async def post(self, path: str, **kwargs) -> httpx.Response:
        async with httpx.AsyncClient() as client:
            return await client.post(f"{self.base_url}{path}", **kwargs)
