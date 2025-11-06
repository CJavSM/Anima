from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.services.spotify_service import spotify_service
from app.services.spotify_user_service import spotify_user_service
from app.schemas.music_schemas import MusicRecommendationsResponse
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

class MusicController:
    
    @staticmethod
    def get_recommendations(emotion: str, limit: int = 20) -> MusicRecommendationsResponse:
        """
        Obtiene recomendaciones musicales basadas en la emoción
        
        Args:
            emotion: Emoción detectada
            limit: Número de canciones a recomendar
            
        Returns:
            MusicRecommendationsResponse con las recomendaciones
        """
        try:
            # Validar emoción
            valid_emotions = ['HAPPY', 'SAD', 'ANGRY', 'CALM', 'SURPRISED', 'FEAR', 'DISGUSTED', 'CONFUSED']
            if emotion.upper() not in valid_emotions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Emoción inválida. Debe ser una de: {', '.join(valid_emotions)}"
                )
            
            # Validar límite
            if limit < 1 or limit > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El límite debe estar entre 1 y 100"
                )
            
            # Obtener recomendaciones
            result = spotify_service.get_recommendations(emotion.upper(), limit)
            
            if not result['success']:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=result.get('error', 'Error al obtener recomendaciones')
                )
            
            # Agregar descripción de playlist
            result['playlist_description'] = spotify_service.create_playlist_description(emotion.upper())
            
            return MusicRecommendationsResponse(**result)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error en get_recommendations: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener recomendaciones: {str(e)}"
            )

    @staticmethod
    def create_spotify_playlist(
        user: User,
        name: str,
        description: str,
        track_ids: list,
        public: bool,
        db: Session
    ) -> dict:
        """
        Crea una playlist en la cuenta de Spotify del usuario.

        Args:
            user: Usuario actual
            name: Nombre de la playlist
            description: Descripción de la playlist
            track_ids: Lista de IDs de canciones de Spotify
            public: Si la playlist debe ser pública
            db: Sesión de base de datos

        Returns:
            Dict con información de la playlist creada
        """
        try:
            if not user.spotify_connected:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debes conectar tu cuenta de Spotify para crear playlists"
                )

            if not track_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debes proporcionar al menos una canción para la playlist"
                )

            # Crear playlist en Spotify
            playlist_data = spotify_user_service.create_playlist(
                user=user,
                name=name,
                description=description,
                tracks=track_ids,
                public=public,
                db=db
            )

            logger.info(f"✅ Playlist creada en Spotify para usuario {user.username}")

            return {
                "success": True,
                "playlist": playlist_data,
                "message": "Playlist creada exitosamente en tu cuenta de Spotify"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creando playlist en Spotify: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear playlist: {str(e)}"
            )

    @staticmethod
    def get_user_spotify_playlists(user: User, db: Session, limit: int = 50) -> dict:
        """
        Obtiene las playlists del usuario desde Spotify.

        Args:
            user: Usuario actual
            db: Sesión de base de datos
            limit: Número máximo de playlists

        Returns:
            Dict con las playlists del usuario
        """
        try:
            if not user.spotify_connected:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debes conectar tu cuenta de Spotify"
                )

            playlists = spotify_user_service.get_user_playlists(user, db, limit)

            return {
                "success": True,
                "playlists": playlists,
                "total": len(playlists)
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error obteniendo playlists: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener playlists: {str(e)}"
            )