from fastapi import APIRouter, Depends, Query, status, Body
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.controllers.music_controller import MusicController
from app.schemas.music_schemas import MusicRecommendationsResponse
from app.middlewares.auth_middleware import get_current_active_user
from app.models.user import User
from pydantic import BaseModel, Field
from typing import List

router = APIRouter(
    prefix="/api/music",
    tags=["Recomendaciones Musicales"]
)

# Schema para crear playlist en Spotify
class CreateSpotifyPlaylistRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre de la playlist")
    description: str = Field(default="", max_length=300, description="Descripción de la playlist")
    track_ids: List[str] = Field(..., min_items=1, description="IDs de las canciones de Spotify")
    public: bool = Field(default=False, description="Si la playlist debe ser pública")

@router.get(
    "/recommendations/{emotion}",
    response_model=MusicRecommendationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener recomendaciones musicales",
    description="Obtiene recomendaciones de canciones de Spotify basadas en la emoción detectada"
)
def get_music_recommendations(
    emotion: str,
    limit: int = Query(20, ge=1, le=100, description="Número de canciones a recomendar"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Obtiene recomendaciones musicales personalizadas:
    
    - **emotion**: Emoción detectada (HAPPY, SAD, ANGRY, CALM, SURPRISED, FEAR, DISGUSTED, CONFUSED)
    - **limit**: Número de canciones (1-100, default: 20)
    
    Las recomendaciones se basan en:
    - **Valence**: Nivel de positividad musical
    - **Energy**: Nivel de intensidad y actividad
    - **Tempo**: Velocidad en BPM (beats por minuto)
    - **Mode**: Tonalidad (Mayor o Menor)
    - **Danceability**: Qué tan bailable es la canción
    
    Retorna una lista de canciones con:
    - Información del track (nombre, artistas, álbum)
    - URL de Spotify
    - Preview de audio (si disponible)
    - Imagen del álbum
    """
    return MusicController.get_recommendations(emotion, limit)

@router.post(
    "/spotify/create-playlist",
    status_code=status.HTTP_201_CREATED,
    summary="Crear playlist en Spotify",
    description="Crea una playlist en la cuenta de Spotify del usuario con las canciones seleccionadas"
)
def create_spotify_playlist(
    playlist_data: CreateSpotifyPlaylistRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Crea una playlist en la cuenta de Spotify del usuario.

    Requiere:
    - Tener una cuenta de Spotify vinculada
    - **name**: Nombre de la playlist (1-100 caracteres)
    - **description**: Descripción opcional (max 300 caracteres)
    - **track_ids**: Lista de IDs de canciones de Spotify
    - **public**: Si la playlist debe ser pública (default: false)

    Retorna información de la playlist creada incluyendo el enlace de Spotify.
    """
    return MusicController.create_spotify_playlist(
        user=current_user,
        name=playlist_data.name,
        description=playlist_data.description,
        track_ids=playlist_data.track_ids,
        public=playlist_data.public,
        db=db
    )

@router.get(
    "/spotify/playlists",
    status_code=status.HTTP_200_OK,
    summary="Obtener playlists de Spotify",
    description="Obtiene las playlists del usuario desde su cuenta de Spotify"
)
def get_spotify_playlists(
    limit: int = Query(50, ge=1, le=50, description="Número máximo de playlists"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene las playlists del usuario desde Spotify.

    Requiere tener una cuenta de Spotify vinculada.

    - **limit**: Número máximo de playlists a obtener (1-50, default: 50)

    Retorna lista de playlists con:
    - ID y nombre de la playlist
    - Descripción
    - URL de Spotify
    - Número de canciones
    - Imágenes
    """
    return MusicController.get_user_spotify_playlists(current_user, db, limit)