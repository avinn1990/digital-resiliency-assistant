import httpx
from fastapi import HTTPException


def detail_from_response(response: httpx.Response) -> str:
    try:
        data = response.json()
        if isinstance(data, dict) and data.get("detail"):
            detail = data["detail"]
            return detail if isinstance(detail, str) else str(detail)
    except Exception:
        pass
    text = response.text.strip()
    return text or f"HTTP {response.status_code}"


def raise_gateway_error(exc: Exception) -> None:
    if isinstance(exc, httpx.HTTPStatusError):
        detail = detail_from_response(exc.response)
        code = exc.response.status_code
        if code in (400, 401, 403, 404, 422):
            raise HTTPException(status_code=code, detail=detail) from exc
        if code in (503, 504):
            raise HTTPException(status_code=code, detail=detail) from exc
        raise HTTPException(status_code=502, detail=detail) from exc
    if isinstance(exc, (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout)):
        raise HTTPException(
            status_code=503,
            detail=(
                "Assessment service is unreachable or still waking on Render. "
                "Wait a moment and try again."
            ),
        ) from exc
    raise HTTPException(status_code=502, detail=str(exc)) from exc
