from datetime import datetime, timedelta, timezone

import jwt

from app.auth.models import AuthUser
from app.config import settings


def create_access_token(user: AuthUser) -> str:
    if not settings.jwt_secret:
        raise ValueError("JWT signing is not configured")

    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user.sub,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "exp": expires,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> AuthUser:
    if not settings.jwt_secret:
        raise ValueError("JWT signing is not configured")

    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    return AuthUser(
        sub=str(payload["sub"]),
        email=payload["email"],
        name=str(payload.get("name") or payload["email"]),
        picture=payload.get("picture"),
    )
