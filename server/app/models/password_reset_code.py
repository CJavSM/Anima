from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.config.database import Base
import uuid
from datetime import datetime, timezone, timedelta

class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(6), nullable=False)
    email = Column(String(255), nullable=False)  # Para verificación adicional
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relación con el usuario
    user = relationship("User", back_populates="reset_codes")
    
    def is_expired(self) -> bool:
        """Verifica si el código ha expirado"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_valid(self) -> bool:
        """Verifica si el código es válido (no usado y no expirado)"""
        return not self.is_used and not self.is_expired()
    
    @classmethod
    def create_code(cls, user_id: uuid.UUID, email: str, expiration_minutes: int = 30):
        """Crea un nuevo código de recuperación"""
        import random
        import string
        
        # Generar código de 6 dígitos
        code = ''.join(random.choices(string.digits, k=6))
        
        # Calcular expiración
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes)
        
        return cls(
            user_id=user_id,
            code=code,
            email=email,
            expires_at=expires_at
        )