from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ============ SCHEMAS PARA ANÁLISIS DE EMOCIONES ============

class EmotionAnalysisCreate(BaseModel):
    """Schema para crear un análisis de emoción"""
    dominant_emotion: str
    confidence: float
    emotion_details: Dict[str, Any]
    photo_metadata: Optional[Dict[str, Any]] = None

class EmotionAnalysisResponse(BaseModel):
    """Respuesta de análisis de emoción"""
    id: str
    user_id: str
    dominant_emotion: str
    confidence: float
    emotion_details: Dict[str, Any]
    photo_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    has_saved_playlist: bool = False
    
    class Config:
        from_attributes = True


# ============ SCHEMAS PARA PLAYLISTS GUARDADAS ============

class SavePlaylistRequest(BaseModel):
    """Request para guardar una playlist"""
    analysis_id: Optional[str] = None
    playlist_name: str = Field(..., min_length=1, max_length=255)
    emotion: str
    description: Optional[str] = None
    tracks: List[Dict[str, Any]]
    music_params: Optional[Dict[str, Any]] = None
    is_favorite: bool = False

class UpdatePlaylistRequest(BaseModel):
    """Request para actualizar una playlist"""
    playlist_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_favorite: Optional[bool] = None

class SavedPlaylistResponse(BaseModel):
    """Respuesta de playlist guardada"""
    id: str
    user_id: str
    analysis_id: Optional[str]
    playlist_name: str
    emotion: str
    description: Optional[str]
    tracks: List[Dict[str, Any]]
    music_params: Optional[Dict[str, Any]]
    is_favorite: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============ SCHEMAS PARA HISTORIAL ============

class HistoryItemResponse(BaseModel):
    """Item individual del historial"""
    analysis_id: str
    dominant_emotion: str
    confidence: float
    emotion_details: Dict[str, Any]
    analyzed_at: datetime
    has_saved_playlist: bool
    saved_playlist: Optional[SavedPlaylistResponse] = None

class HistoryResponse(BaseModel):
    """Respuesta completa del historial"""
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[HistoryItemResponse]

class HistoryStatsResponse(BaseModel):
    """Estadísticas del historial del usuario"""
    total_analyses: int
    total_saved_playlists: int
    most_common_emotion: Optional[str]
    emotions_breakdown: Dict[str, int]
    recent_activity: List[HistoryItemResponse]
    favorite_playlists_count: int


# ============ SCHEMAS PARA FILTROS ============

class HistoryFilters(BaseModel):
    """Filtros para consultar el historial"""
    emotion: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    has_saved_playlist: Optional[bool] = None
    is_favorite: Optional[bool] = None