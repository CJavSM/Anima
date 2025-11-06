from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models.emotion_analysis import EmotionAnalysis, SavedPlaylist
from app.schemas.history_schemas import (
    EmotionAnalysisCreate,
    SavePlaylistRequest,
    UpdatePlaylistRequest,
    HistoryFilters
)
from fastapi import HTTPException, status
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class HistoryService:
    
    # ============ ANÁLISIS DE EMOCIONES ============
    
    @staticmethod
    def create_emotion_analysis(
        user_id: str,
        analysis_data: EmotionAnalysisCreate,
        db: Session
    ) -> EmotionAnalysis:
        """Crea un nuevo análisis de emoción"""
        try:
            new_analysis = EmotionAnalysis(
                user_id=user_id,
                dominant_emotion=analysis_data.dominant_emotion,
                confidence=analysis_data.confidence,
                emotion_details=analysis_data.emotion_details,
                photo_metadata=analysis_data.photo_metadata
            )
            
            db.add(new_analysis)
            db.commit()
            db.refresh(new_analysis)
            
            logger.info(f"Análisis creado: {new_analysis.id} para usuario {user_id}")
            return new_analysis
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error al crear análisis: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al guardar el análisis"
            )
    
    @staticmethod
    def get_user_analyses(
        user_id: str,
        db: Session,
        filters: Optional[HistoryFilters] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Obtiene los análisis de un usuario con paginación y filtros"""
        try:
            query = db.query(EmotionAnalysis).filter(
                EmotionAnalysis.user_id == user_id
            )
            
            # Aplicar filtros
            if filters:
                if filters.emotion:
                    query = query.filter(
                        EmotionAnalysis.dominant_emotion == filters.emotion.upper()
                    )
                if filters.start_date:
                    query = query.filter(EmotionAnalysis.created_at >= filters.start_date)
                if filters.end_date:
                    query = query.filter(EmotionAnalysis.created_at <= filters.end_date)
            
            # Ordenar por fecha descendente
            query = query.order_by(desc(EmotionAnalysis.created_at))
            
            # Contar total
            total = query.count()
            
            # Paginación
            offset = (page - 1) * page_size
            analyses = query.offset(offset).limit(page_size).all()
            
            total_pages = (total + page_size - 1) // page_size
            
            return {
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'items': analyses
            }
            
        except Exception as e:
            logger.error(f"Error al obtener análisis: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al obtener el historial"
            )
    
    # ============ PLAYLISTS GUARDADAS ============
    
    @staticmethod
    def save_playlist(
        user_id: str,
        playlist_data: SavePlaylistRequest,
        db: Session
    ) -> SavedPlaylist:
        """Guarda una nueva playlist"""
        try:
            # Verificar que el analysis_id pertenezca al usuario si se proporciona
            if playlist_data.analysis_id:
                analysis = db.query(EmotionAnalysis).filter(
                    EmotionAnalysis.id == playlist_data.analysis_id,
                    EmotionAnalysis.user_id == user_id
                ).first()
                
                if not analysis:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Análisis no encontrado"
                    )
            
            new_playlist = SavedPlaylist(
                user_id=user_id,
                analysis_id=playlist_data.analysis_id,
                playlist_name=playlist_data.playlist_name,
                emotion=playlist_data.emotion,
                description=playlist_data.description,
                tracks=playlist_data.tracks,
                music_params=playlist_data.music_params,
                is_favorite=playlist_data.is_favorite
            )
            
            db.add(new_playlist)
            db.commit()
            db.refresh(new_playlist)
            
            logger.info(f"Playlist guardada: {new_playlist.id} para usuario {user_id}")
            return new_playlist
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error al guardar playlist: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al guardar la playlist"
            )
    
    @staticmethod
    def get_user_playlists(
        user_id: str,
        db: Session,
        emotion: Optional[str] = None,
        is_favorite: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Obtiene las playlists guardadas de un usuario"""
        try:
            query = db.query(SavedPlaylist).filter(
                SavedPlaylist.user_id == user_id
            )
            
            # Filtros
            if emotion:
                query = query.filter(SavedPlaylist.emotion == emotion.upper())
            if is_favorite is not None:
                query = query.filter(SavedPlaylist.is_favorite == is_favorite)
            
            # Ordenar por fecha descendente
            query = query.order_by(desc(SavedPlaylist.created_at))
            
            # Contar total
            total = query.count()
            
            # Paginación
            offset = (page - 1) * page_size
            playlists = query.offset(offset).limit(page_size).all()
            
            total_pages = (total + page_size - 1) // page_size
            
            return {
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'items': playlists
            }
            
        except Exception as e:
            logger.error(f"Error al obtener playlists: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al obtener las playlists"
            )
    
    @staticmethod
    def get_playlist_by_id(
        playlist_id: str,
        user_id: str,
        db: Session
    ) -> SavedPlaylist:
        """Obtiene una playlist específica"""
        playlist = db.query(SavedPlaylist).filter(
            SavedPlaylist.id == playlist_id,
            SavedPlaylist.user_id == user_id
        ).first()
        
        if not playlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist no encontrada"
            )
        
        return playlist
    
    @staticmethod
    def update_playlist(
        playlist_id: str,
        user_id: str,
        update_data: UpdatePlaylistRequest,
        db: Session
    ) -> SavedPlaylist:
        """Actualiza una playlist"""
        try:
            playlist = HistoryService.get_playlist_by_id(playlist_id, user_id, db)
            
            # Actualizar campos
            if update_data.playlist_name is not None:
                playlist.playlist_name = update_data.playlist_name
            if update_data.description is not None:
                playlist.description = update_data.description
            if update_data.is_favorite is not None:
                playlist.is_favorite = update_data.is_favorite
            
            db.commit()
            db.refresh(playlist)
            
            logger.info(f"Playlist actualizada: {playlist_id}")
            return playlist
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error al actualizar playlist: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al actualizar la playlist"
            )
    
    @staticmethod
    def delete_playlist(
        playlist_id: str,
        user_id: str,
        db: Session
    ) -> None:
        """Elimina una playlist"""
        try:
            playlist = HistoryService.get_playlist_by_id(playlist_id, user_id, db)
            
            db.delete(playlist)
            db.commit()
            
            logger.info(f"Playlist eliminada: {playlist_id}")
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error al eliminar playlist: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al eliminar la playlist"
            )
    
    # ============ ESTADÍSTICAS ============
    
    @staticmethod
    def get_user_stats(user_id: str, db: Session) -> Dict[str, Any]:
        """Obtiene estadísticas del usuario"""
        try:
            # Total de análisis
            total_analyses = db.query(func.count(EmotionAnalysis.id)).filter(
                EmotionAnalysis.user_id == user_id
            ).scalar()
            
            # Total de playlists guardadas
            total_playlists = db.query(func.count(SavedPlaylist.id)).filter(
                SavedPlaylist.user_id == user_id
            ).scalar()
            
            # Playlists favoritas
            favorite_count = db.query(func.count(SavedPlaylist.id)).filter(
                SavedPlaylist.user_id == user_id,
                SavedPlaylist.is_favorite == True
            ).scalar()
            
            # Emoción más común
            emotion_counts = db.query(
                EmotionAnalysis.dominant_emotion,
                func.count(EmotionAnalysis.id).label('count')
            ).filter(
                EmotionAnalysis.user_id == user_id
            ).group_by(
                EmotionAnalysis.dominant_emotion
            ).order_by(
                desc('count')
            ).all()
            
            emotions_breakdown = {emotion: count for emotion, count in emotion_counts}
            most_common = emotion_counts[0][0] if emotion_counts else None
            
            # Actividad reciente (últimos 5 análisis)
            recent_analyses = db.query(EmotionAnalysis).filter(
                EmotionAnalysis.user_id == user_id
            ).order_by(
                desc(EmotionAnalysis.created_at)
            ).limit(5).all()
            
            return {
                'total_analyses': total_analyses or 0,
                'total_saved_playlists': total_playlists or 0,
                'favorite_playlists_count': favorite_count or 0,
                'most_common_emotion': most_common,
                'emotions_breakdown': emotions_breakdown,
                'recent_activity': recent_analyses
            }
            
        except Exception as e:
            logger.error(f"Error al obtener estadísticas: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al obtener estadísticas"
            )