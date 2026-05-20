from pydantic import BaseModel, EmailStr


class TokenData(BaseModel):
    sub: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    tier: str
