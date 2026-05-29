from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.deps import get_current_user
from app.auth.google import verify_google_id_token
from app.auth.jwt_tokens import create_access_token
from app.auth.models import AuthUser, AuthUserResponse, GoogleAuthRequest, TokenResponse
from app.config import settings

router = APIRouter()


@router.post("/google", response_model=TokenResponse)
async def auth_with_google(body: GoogleAuthRequest) -> TokenResponse:
    if not settings.auth_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google auth is not configured on the server",
        )

    try:
        user = verify_google_id_token(body.id_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    access_token = create_access_token(user)
    return TokenResponse(
        access_token=access_token,
        user=AuthUserResponse(email=user.email, name=user.name, picture=user.picture),
    )


@router.get("/me", response_model=AuthUserResponse)
async def auth_me(user: AuthUser | None = Depends(get_current_user)) -> AuthUserResponse:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthUserResponse(email=user.email, name=user.name, picture=user.picture)
