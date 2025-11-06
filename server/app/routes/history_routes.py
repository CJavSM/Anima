from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models.emotion_analysis import SavedPlaylist
from app.middlewares.auth_middleware import get_current_active_user
from app.models.user import User
from app.services.history_service import HistoryService
from app.schemas.history_schemas import (
    SavePlaylistRequest,
    UpdatePlaylistRequest,
    SavedPlaylistResponse,
    HistoryResponse,
    HistoryStatsResponse,
    HistoryItemResponse,
    EmotionAnalysisResponse
)
from app.schemas.auth_schemas import MessageResponse
from typing import Optional, List

router = APIRouter(
    prefix="/api/history",
    tags=["Historial y Playlists"]
)

# ============ RUTAS DE ANÁLISIS/HISTORIAL ============

@router.get(
    "/analyses",
    response_model=dict,
    summary="Obtener historial de análisis",
    description="Obtiene el historial de análisis de emociones del usuario con paginación"
)
def get_user_analyses(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Elementos por página"),
    emotion: Optional[str] = Query(None, description="Filtrar por emoción"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el historial de análisis del usuario autenticado.
    
    Parámetros:
    - **page**: Número de página (default: 1)
    - **page_size**: Elementos por página (default: 20, máx: 100)
    - **emotion**: Filtrar por emoción específica (opcional)
    """
    from app.schemas.history_schemas import HistoryFilters
    
    filters = None
    if emotion:
        filters = HistoryFilters(emotion=emotion)
    
    result = HistoryService.get_user_analyses(
        user_id=str(current_user.id),
        db=db,
        filters=filters,
        page=page,
        page_size=page_size
    )
    
    # Convertir a response con información de playlists guardadas
    items_with_playlists = []
    for analysis in result['items']:
        # Verificar si tiene playlist guardada (consulta simple y clara)
        has_saved = db.query(SavedPlaylist).filter(
            SavedPlaylist.analysis_id == analysis.id
        ).first() is not None

        items_with_playlists.append({
            'analysis_id': str(analysis.id),
            'dominant_emotion': analysis.dominant_emotion,
            'confidence': float(analysis.confidence),
            'emotion_details': analysis.emotion_details,
            'analyzed_at': analysis.created_at,
            'has_saved_playlist': has_saved,
            'photo_metadata': analysis.photo_metadata
        })
    
    return {
        'total': result['total'],
        'page': result['page'],
        'page_size': result['page_size'],
        'total_pages': result['total_pages'],
        'items': items_with_playlists
    }

@router.get(
    "/stats",
    response_model=dict,
    summary="Obtener estadísticas del usuario",
    description="Obtiene estadísticas y resumen del historial del usuario"
)
def get_user_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas del usuario:
    - Total de análisis realizados
    - Total de playlists guardadas
    - Emoción más común
    - Desglose de emociones
    - Actividad reciente
    """
    stats = HistoryService.get_user_stats(
        user_id=str(current_user.id),
        db=db
    )
    
    # Convertir recent_activity a dict
    recent_activity = []
    for analysis in stats['recent_activity']:
        recent_activity.append({
            'analysis_id': str(analysis.id),
            'dominant_emotion': analysis.dominant_emotion,
            'confidence': float(analysis.confidence),
            'analyzed_at': analysis.created_at
        })
    
    return {
        'total_analyses': stats['total_analyses'],
        'total_saved_playlists': stats['total_saved_playlists'],
        'favorite_playlists_count': stats['favorite_playlists_count'],
        'most_common_emotion': stats['most_common_emotion'],
        'emotions_breakdown': stats['emotions_breakdown'],
        'recent_activity': recent_activity
    }

# ============ RUTAS DE PLAYLISTS ============

@router.post(
    "/playlists",
    response_model=SavedPlaylistResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Guardar una playlist",
    description="Guarda una playlist generada a partir de un análisis de emoción"
)
def save_playlist(
    playlist_data: SavePlaylistRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Guarda una playlist para el usuario autenticado.
    
    Campos:
    - **analysis_id**: ID del análisis asociado (opcional)
    - **playlist_name**: Nombre de la playlist
    - **emotion**: Emoción asociada
    - **description**: Descripción de la playlist (opcional)
    - **tracks**: Array de tracks de Spotify
    - **music_params**: Parámetros musicales utilizados
    - **is_favorite**: Marcar como favorita
    """
    playlist = HistoryService.save_playlist(
        user_id=str(current_user.id),
        playlist_data=playlist_data,
        db=db
    )
    
    return SavedPlaylistResponse(
        id=str(playlist.id),
        user_id=str(playlist.user_id),
        analysis_id=str(playlist.analysis_id) if playlist.analysis_id else None,
        playlist_name=playlist.playlist_name,
        emotion=playlist.emotion,
        description=playlist.description,
        tracks=playlist.tracks,
        music_params=playlist.music_params,
        is_favorite=playlist.is_favorite,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at
    )

@router.get(
    "/playlists",
    response_model=dict,
    summary="Obtener playlists guardadas",
    description="Obtiene las playlists guardadas del usuario con filtros opcionales"
)
def get_saved_playlists(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Elementos por página"),
    emotion: Optional[str] = Query(None, description="Filtrar por emoción"),
    is_favorite: Optional[bool] = Query(None, description="Filtrar solo favoritas"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene las playlists guardadas del usuario.
    
    Filtros disponibles:
    - **emotion**: Filtrar por emoción específica
    - **is_favorite**: Mostrar solo playlists favoritas
    """
    result = HistoryService.get_user_playlists(
        user_id=str(current_user.id),
        db=db,
        emotion=emotion,
        is_favorite=is_favorite,
        page=page,
        page_size=page_size
    )
    
    # Convertir items a response
    playlists = []
    for playlist in result['items']:
        playlists.append({
            'id': str(playlist.id),
            'user_id': str(playlist.user_id),
            'analysis_id': str(playlist.analysis_id) if playlist.analysis_id else None,
            'playlist_name': playlist.playlist_name,
            'emotion': playlist.emotion,
            'description': playlist.description,
            'tracks': playlist.tracks,
            'music_params': playlist.music_params,
            'is_favorite': playlist.is_favorite,
            'created_at': playlist.created_at,
            'updated_at': playlist.updated_at
        })
    
    return {
        'total': result['total'],
        'page': result['page'],
        'page_size': result['page_size'],
        'total_pages': result['total_pages'],
        'items': playlists
    }

@router.get(
    "/playlists/{playlist_id}",
    response_model=SavedPlaylistResponse,
    summary="Obtener playlist específica",
    description="Obtiene los detalles de una playlist guardada"
)
def get_playlist(
    playlist_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene una playlist específica por su ID.
    """
    playlist = HistoryService.get_playlist_by_id(
        playlist_id=playlist_id,
        user_id=str(current_user.id),
        db=db
    )
    
    return SavedPlaylistResponse(
        id=str(playlist.id),
        user_id=str(playlist.user_id),
        analysis_id=str(playlist.analysis_id) if playlist.analysis_id else None,
        playlist_name=playlist.playlist_name,
        emotion=playlist.emotion,
        description=playlist.description,
        tracks=playlist.tracks,
        music_params=playlist.music_params,
        is_favorite=playlist.is_favorite,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at
    )

@router.patch(
    "/playlists/{playlist_id}",
    response_model=SavedPlaylistResponse,
    summary="Actualizar playlist",
    description="Actualiza el nombre, descripción o marca como favorita una playlist"
)
def update_playlist(
    playlist_id: str,
    update_data: UpdatePlaylistRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza una playlist existente.
    
    Campos actualizables:
    - **playlist_name**: Nuevo nombre
    - **description**: Nueva descripción
    - **is_favorite**: Marcar/desmarcar como favorita
    """
    playlist = HistoryService.update_playlist(
        playlist_id=playlist_id,
        user_id=str(current_user.id),
        update_data=update_data,
        db=db
    )
    
    return SavedPlaylistResponse(
        id=str(playlist.id),
        user_id=str(playlist.user_id),
        analysis_id=str(playlist.analysis_id) if playlist.analysis_id else None,
        playlist_name=playlist.playlist_name,
        emotion=playlist.emotion,
        description=playlist.description,
        tracks=playlist.tracks,
        music_params=playlist.music_params,
        is_favorite=playlist.is_favorite,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at
    )

@router.delete(
    "/playlists/{playlist_id}",
    response_model=MessageResponse,
    summary="Eliminar playlist",
    description="Elimina una playlist guardada"
)
def delete_playlist(
    playlist_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Elimina una playlist del usuario.
    """
    HistoryService.delete_playlist(
        playlist_id=playlist_id,
        user_id=str(current_user.id),
        db=db
    )
    
    return MessageResponse(
        message="Playlist eliminada exitosamente",
        detail=f"La playlist {playlist_id} ha sido eliminada"
    )