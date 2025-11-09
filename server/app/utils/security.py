from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración de hashing de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 horas

def get_password_hash(password: str) -> str:
    """Genera el hash de una contraseña"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña coincide con su hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT de acceso
    
    Args:
        data: Datos a incluir en el token
        expires_delta: Tiempo de expiración personalizado (opcional)
        
    Returns:
        str: Token JWT codificado
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica y valida un token JWT
    
    Args:
        token: Token JWT a decodificar
        
    Returns:
        dict: Payload del token si es válido, None si no
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verificar que el token no haya expirado
        exp = payload.get("exp")
        if exp is None:
            return None
        
        # Verificar expiración
        expire_timestamp = datetime.fromtimestamp(exp, timezone.utc)
        if datetime.now(timezone.utc) > expire_timestamp:
            return None
            
        return payload
        
    except JWTError:
        return None

def create_user_token(user_data: Dict[str, Any]) -> str:
    """
    Crea un token JWT específico para usuarios
    
    Args:
        user_data: Datos del usuario (debe incluir al menos 'sub' con el user_id)
        
    Returns:
        str: Token JWT
    """
    # Datos mínimos requeridos para el token
    token_data = {
        "sub": user_data.get("sub"),  # user_id
        "username": user_data.get("username"),
        "email": user_data.get("email"),
        "token_type": "access",
    }
    
    return create_access_token(token_data)

def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extrae el user_id de un token JWT válido
    
    Args:
        token: Token JWT
        
    Returns:
        str: User ID si el token es válido, None si no
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")
    return None