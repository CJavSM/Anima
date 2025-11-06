from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.schemas.auth_schemas import UserRegister
from app.utils.security import get_password_hash, verify_password, create_access_token
from datetime import datetime, timezone
from fastapi import HTTPException, status

class AuthService:
    
    @staticmethod
    def register_user(user_data: UserRegister, db: Session) -> User:
        """Registra un nuevo usuario"""
        
        # Verificar si el email ya existe
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        
        # Verificar si el username ya existe
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El username ya está en uso"
            )
        
        # Crear el nuevo usuario
        hashed_password = get_password_hash(user_data.password)
        
        new_user = User(
            email=user_data.email,
            username=user_data.username,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return new_user
    
    @staticmethod
    def authenticate_user(username_or_email: str, password: str, db: Session) -> User:
        """Autentica un usuario por username o email"""

        # Buscar usuario por username o email
        user = db.query(User).filter(
            or_(
                User.username == username_or_email,
                User.email == username_or_email
            )
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inactivo"
            )

        # Si el usuario no tiene password_hash, solo puede iniciar sesión con Spotify
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Esta cuenta solo puede iniciar sesión con Spotify"
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        # Actualizar last_login
        # Usar datetime con zona horaria para columnas timezone-aware
        user.last_login = datetime.now(timezone.utc)
        db.commit()

        return user
    
    @staticmethod
    def create_user_token(user: User) -> str:
        """Crea un token JWT para el usuario"""
        token_data = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email
        }
        return create_access_token(token_data)
    
    @staticmethod
    def get_user_by_id(user_id: str, db: Session) -> User:
        """Obtiene un usuario por su ID"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        return user