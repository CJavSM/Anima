from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.config.database import Base
import uuid
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable para usuarios que solo usan Spotify
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Campos de Spotify
    spotify_id = Column(String(255), unique=True, nullable=True, index=True)
    spotify_email = Column(String(255), nullable=True)
    spotify_display_name = Column(String(255), nullable=True)
    spotify_access_token = Column(Text, nullable=True)
    spotify_refresh_token = Column(Text, nullable=True)
    spotify_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    spotify_connected = Column(Boolean, default=False)
    spotify_connected_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relación con códigos de recuperación
    reset_codes = relationship("PasswordResetCode", back_populates="user", cascade="all, delete-orphan")
    # Relación con análisis de emociones y playlists guardadas
    emotion_analyses = relationship("EmotionAnalysis", back_populates="user", cascade="all, delete-orphan")
    saved_playlists = relationship("SavedPlaylist", back_populates="user", cascade="all, delete-orphan")
    
    def get_display_name(self) -> str:
        """Obtiene el nombre para mostrar del usuario"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.spotify_display_name:
            return self.spotify_display_name
        else:
            return self.username
    
    def __repr__(self):
        return f"<User(id='{self.id}', username='{self.username}', email='{self.email}')>"