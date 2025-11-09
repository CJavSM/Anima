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

    @staticmethod
    def update_user(user: User, update_data: dict, db: Session) -> User:
        """Actualiza campos permitidos del usuario, validando unicidad"""
        # Validar cambios de email/username para unicidad
        new_username = update_data.get('username')
        new_email = update_data.get('email')

        if new_username and new_username != user.username:
            exists = db.query(User).filter(User.username == new_username).first()
            if exists:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='El username ya está en uso')
            user.username = new_username

        if new_email and new_email != user.email:
            exists = db.query(User).filter(User.email == new_email).first()
            if exists:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='El email ya está registrado')
            user.email = new_email

        # Campos opcionales
        if 'first_name' in update_data:
            user.first_name = update_data.get('first_name')
        if 'last_name' in update_data:
            user.last_name = update_data.get('last_name')

        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    # ============================================
    # MÉTODOS PARA RECUPERACIÓN DE CONTRASEÑA
    # ============================================
    
    @staticmethod
    def request_password_reset(email: str, db: Session) -> dict:
        """
        Solicita recuperación de contraseña enviando código por email
        
        Args:
            email: Email del usuario
            db: Sesión de base de datos
            
        Returns:
            dict: Resultado de la operación
            
        Raises:
            HTTPException: Si el usuario no existe o hay errores
        """
        from app.models.password_reset_code import PasswordResetCode
        from app.services.email_service import email_service
        
        # Buscar usuario por email
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No existe una cuenta con ese email"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta está inactiva"
            )
        
        # Si el usuario solo usa Spotify (sin contraseña), no puede recuperar
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cuenta solo puede acceder con Spotify. No tiene contraseña para recuperar."
            )
        
        # Invalidar códigos anteriores del usuario
        old_codes = db.query(PasswordResetCode).filter(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.is_used == False
        ).all()
        
        for old_code in old_codes:
            old_code.is_used = True
        
        # Crear nuevo código
        reset_code = PasswordResetCode.create_code(
            user_id=user.id,
            email=email,
            expiration_minutes=30
        )
        
        db.add(reset_code)
        db.commit()
        
        # Enviar email con el código
        try:
            email_service.send_password_reset_code(
                email=email,
                name=user.get_display_name(),
                code=reset_code.code
            )
            
            return {
                "message": "Código de recuperación enviado",
                "detail": f"Revisa tu email {email} para obtener el código"
            }
            
        except Exception as e:
            # Si falla el email, marcar el código como usado para evitar uso
            reset_code.is_used = True
            db.commit()
            
            # Re-raise la excepción del email service
            raise e
    
    @staticmethod
    def reset_password_with_code(email: str, code: str, new_password: str, db: Session) -> dict:
        """
        Resetea la contraseña usando el código de recuperación
        
        Args:
            email: Email del usuario
            code: Código de recuperación de 6 dígitos
            new_password: Nueva contraseña
            db: Sesión de base de datos
            
        Returns:
            dict: Resultado de la operación
            
        Raises:
            HTTPException: Si el código es inválido o hay errores
        """
        from app.models.password_reset_code import PasswordResetCode
        
        # Buscar código válido
        reset_code = db.query(PasswordResetCode).filter(
            PasswordResetCode.email == email,
            PasswordResetCode.code == code,
            PasswordResetCode.is_used == False
        ).order_by(PasswordResetCode.created_at.desc()).first()
        
        if not reset_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código inválido o ya utilizado"
            )
        
        if reset_code.is_expired():
            # Marcar como usado
            reset_code.is_used = True
            db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código ha expirado. Solicita uno nuevo"
            )
        
        # Buscar usuario
        user = db.query(User).filter(User.id == reset_code.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Actualizar contraseña
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.now(timezone.utc)
        
        # Marcar código como usado
        reset_code.is_used = True
        
        db.commit()
        
        return {
            "message": "Contraseña cambiada exitosamente",
            "detail": "Ya puedes iniciar sesión con tu nueva contraseña"
        }