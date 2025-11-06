from sqlalchemy import Column, String, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.config.database import Base
import uuid

class EmotionAnalysis(Base):
    __tablename__ = "emotion_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    dominant_emotion = Column(String(50), nullable=False)
    confidence = Column(Numeric(5, 2), nullable=False)
    emotion_details = Column(JSONB, nullable=True)
    photo_metadata = Column(JSONB, nullable=True)  # Info sobre la foto (no la foto en sí)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    user = relationship("User", back_populates="emotion_analyses")
    saved_playlists = relationship("SavedPlaylist", back_populates="analysis", cascade="all, delete-orphan")
    music_recommendations = relationship("MusicRecommendation", back_populates="analysis", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<EmotionAnalysis(user_id='{self.user_id}', emotion='{self.dominant_emotion}')>"


class SavedPlaylist(Base):
    __tablename__ = "saved_playlists"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey('emotion_analyses.id', ondelete='SET NULL'), nullable=True)
    playlist_name = Column(String(255), nullable=False)
    emotion = Column(String(50), nullable=False)
    description = Column(String, nullable=True)
    tracks = Column(JSONB, nullable=False)
    music_params = Column(JSONB, nullable=True)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relaciones
    user = relationship("User", back_populates="saved_playlists")
    analysis = relationship("EmotionAnalysis", back_populates="saved_playlists")
    
    def __repr__(self):
        return f"<SavedPlaylist(name='{self.playlist_name}', emotion='{self.emotion}')>"


class MusicRecommendation(Base):
    __tablename__ = "music_recommendations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey('emotion_analyses.id', ondelete='CASCADE'), nullable=False)
    spotify_playlist_id = Column(String(255), nullable=True)
    playlist_name = Column(String(255), nullable=True)
    tracks = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    analysis = relationship("EmotionAnalysis", back_populates="music_recommendations")
    
    def __repr__(self):
        return f"<MusicRecommendation(analysis_id='{self.analysis_id}')>"