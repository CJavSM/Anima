from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.config.database import Base
from sqlalchemy.orm import relationship
import uuid

class User(Base):

    __tablename__ = "users"

    emotion_analyses = relationship("EmotionAnalysis", back_populates="user")
    saved_playlists = relationship("SavedPlaylist", back_populates="user")

    # Campos básicos
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable para usuarios de Spotify
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
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

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}', spotify_connected={self.spotify_connected})>"