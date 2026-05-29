from google.auth.transport import requests
from google.oauth2 import id_token

from app.auth.models import AuthUser
from app.config import settings


def verify_google_id_token(token: str) -> AuthUser:
    if not settings.google_client_id:
        raise ValueError("Google auth is not configured")

    payload = id_token.verify_oauth2_token(
        token,
        requests.Request(),
        settings.google_client_id,
    )

    email = payload.get("email")
    if not email:
        raise ValueError("Google token did not include an email address")

    if not payload.get("email_verified", False):
        raise ValueError("Google email address is not verified")

    return AuthUser(
        sub=str(payload.get("sub") or email),
        email=email,
        name=str(payload.get("name") or email),
        picture=payload.get("picture"),
    )
