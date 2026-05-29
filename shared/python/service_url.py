"""Normalize service URLs for local dev, Render host env vars, and full URLs."""


def normalize_service_url(value: str) -> str:
    value = value.strip().rstrip("/")
    if not value:
        return value
    if value.startswith(("http://", "https://")):
        return value
    if "localhost" in value or value.startswith("127.") or value.startswith("0.0.0.0"):
        return f"http://{value}"
    # Render private-network host / host:port (no dots) — use HTTP, not https://host
    host = value.split(":")[0]
    if "." not in host:
        return f"http://{value}"
    return f"https://{value}"
