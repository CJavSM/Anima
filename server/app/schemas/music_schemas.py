from pydantic import BaseModel
from typing import List, Optional, Dict

class TrackResponse(BaseModel):
    """Información de una canción"""
    id: str
    name: str
    artists: List[str]
    album: str
    album_image: Optional[str]
    preview_url: Optional[str]
    external_url: str
    duration_ms: int
    popularity: int

class MusicParamsInfo(BaseModel):
    """Parámetros musicales utilizados"""
    valence: str
    energy: str
    tempo: str
    mode: str

class MusicRecommendationsResponse(BaseModel):
    """Respuesta con recomendaciones musicales"""
    success: bool
    emotion: str
    tracks: List[TrackResponse]
    total: int
    genres_used: List[str]
    music_params: MusicParamsInfo
    playlist_description: Optional[str] = None

class MusicRecommendationRequest(BaseModel):
    """Request para obtener recomendaciones"""
    emotion: str
    limit: Optional[int] = 20