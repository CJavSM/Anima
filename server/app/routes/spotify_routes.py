from fastapi import APIRouter, Depends, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from app.middlewares.auth_middleware import get_current_active_user
from app.config.database import get_db
from app.models.user import User
from app.services.spotify_user_service import spotify_user_service
from fastapi import HTTPException

router = APIRouter(
    prefix="/api/spotify",
    tags=["Spotify"]
)


@router.get(
    "/playlists",
    status_code=status.HTTP_200_OK,
    summary="Obtener playlists de Spotify del usuario"
)
def get_spotify_playlists(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Obtiene las playlists del usuario desde Spotify (requiere cuenta vinculada)."""
    return spotify_user_service.get_user_playlists(current_user, db, limit=limit)


@router.post(
    "/playlists",
    status_code=status.HTTP_201_CREATED,
    summary="Crear playlist en Spotify para el usuario"
)
def create_spotify_playlist(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crea una playlist en la cuenta de Spotify del usuario.

    Payload esperado:
    {
      "name": "Nombre de la playlist",
      "description": "Descripción opcional",
      "tracks": ["track_id1", "track_id2", ...],
      "public": false
    }
    """
    name = payload.get('name')
    description = payload.get('description', '')
    tracks = payload.get('tracks', [])
    public = bool(payload.get('public', False))

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El campo 'name' es requerido")

    # Validar tracks
    if not isinstance(tracks, list) or len(tracks) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El campo 'tracks' debe ser una lista con al menos una canción")

    # Asegurar que todos los elementos sean strings (ids o URIs)
    if not all(isinstance(t, str) for t in tracks):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cada elemento en 'tracks' debe ser una cadena con el id o URI de la canción")

    result = spotify_user_service.create_playlist(
        user=current_user,
        name=name,
        description=description,
        tracks=tracks,
        public=public,
        db=db
    )

    return result
