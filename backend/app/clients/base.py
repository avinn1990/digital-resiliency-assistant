import asyncio

import httpx

# Render free-tier services can return 502 while waking; LLM session start can be slow.
_DEFAULT_TIMEOUT = httpx.Timeout(120.0, connect=30.0)
_RETRYABLE_STATUS = frozenset({502, 503, 504})
_MAX_ATTEMPTS = 4


class ServiceClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        url = f"{self.base_url}{path}"
        last_error: Exception | None = None

        for attempt in range(_MAX_ATTEMPTS):
            try:
                async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as client:
                    response = await client.request(method, url, **kwargs)
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
                last_error = exc
                if attempt < _MAX_ATTEMPTS - 1:
                    await asyncio.sleep(2**attempt * 2)
                    continue
                raise

            if response.status_code in _RETRYABLE_STATUS and attempt < _MAX_ATTEMPTS - 1:
                await asyncio.sleep(2**attempt * 2)
                continue
            return response

        if last_error:
            raise last_error
        raise RuntimeError(f"Request failed after {_MAX_ATTEMPTS} attempts: {method} {path}")

    async def get(self, path: str, **kwargs) -> httpx.Response:
        return await self._request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs) -> httpx.Response:
        return await self._request("POST", path, **kwargs)
