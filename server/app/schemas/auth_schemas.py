from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
import re

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match("^[a-zA-Z0-9_-]+$", v):
            raise ValueError('El username solo puede contener letras, números, guiones y guiones bajos')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        if not re.search("[a-z]", v):
            raise ValueError('La contraseña debe contener al menos una letra minúscula')
        if not re.search("[A-Z]", v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula')
        if not re.search("[0-9]", v):
            raise ValueError('La contraseña debe contener al menos un número')
        if not re.search("[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError('La contraseña debe contener al menos un carácter especial')
        return v

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    first_name: Optional[str]
    last_name: Optional[str]
    profile_picture: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime

    # Campos de Spotify
    spotify_connected: bool = False
    spotify_display_name: Optional[str] = None
    spotify_email: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None