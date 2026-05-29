from pydantic import BaseModel, EmailStr


class AuthUser(BaseModel):
    sub: str
    email: EmailStr
    name: str
    picture: str | None = None


class GoogleAuthRequest(BaseModel):
    id_token: str


class AuthUserResponse(BaseModel):
    email: EmailStr
    name: str
    picture: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse
