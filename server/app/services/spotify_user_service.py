import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

import requests
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.services.spotify_auth_service import spotify_auth_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spotify_user_service")


class SpotifyUserService:
    """
    Servicio para operaciones de Spotify que requieren el token del usuario.
    Maneja creación de playlists, agregar canciones, etc.
    """

    SPOTIFY_API_URL = "https://api.spotify.com/v1"

    def __init__(self):
        logger.info("✅ SpotifyUserService inicializado")

    def _ensure_valid_token(self, user: User, db: Session) -> str:
        """
        Asegura que el usuario tenga un token válido, refrescándolo si es necesario.

        Args:
            user: Usuario actual
            db: Sesión de base de datos

        Returns:
            Access token válido
        """
        if not user.spotify_connected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes conectar tu cuenta de Spotify primero"
            )

        # Verificar si el token ha expirado
        now = datetime.now(timezone.utc)
        if user.spotify_token_expires_at and user.spotify_token_expires_at <= now:
            logger.info(f"🔄 Token expirado para usuario {user.username}, refrescando...")

            try:
                # Refrescar el token
                token_data = spotify_auth_service.refresh_access_token(
                    user.spotify_refresh_token
                )

                # Actualizar el usuario con el nuevo token
                from datetime import timedelta
                user.spotify_access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 3600)
                user.spotify_token_expires_at = now + timedelta(seconds=expires_in)

                db.commit()
                db.refresh(user)

                logger.info(f"✅ Token refrescado exitosamente para {user.username}")

            except Exception as e:
                logger.error(f"❌ Error refrescando token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Tu sesión de Spotify ha expirado. Por favor, vuelve a conectar tu cuenta."
                )

        return user.spotify_access_token

    def get_user_spotify_profile(self, user: User, db: Session) -> Dict:
        """
        Obtiene el perfil del usuario desde Spotify.

        Args:
            user: Usuario actual
            db: Sesión de base de datos

        Returns:
            Dict con información del perfil
        """
        access_token = self._ensure_valid_token(user, db)
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            response = requests.get(
                f"{self.SPOTIFY_API_URL}/me",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error obteniendo perfil de Spotify: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al obtener tu perfil de Spotify"
            )

    def create_playlist(
        self,
        user: User,
        name: str,
        description: str,
        tracks: List[str],
        public: bool = False,
        db: Session = None
    ) -> Dict:
        """
        Crea una playlist en la cuenta de Spotify del usuario y agrega canciones.

        Args:
            user: Usuario actual
            name: Nombre de la playlist
            description: Descripción de la playlist
            tracks: Lista de URIs o IDs de Spotify de las canciones
            public: Si la playlist debe ser pública
            db: Sesión de base de datos

        Returns:
            Dict con información de la playlist creada
        """
        access_token = self._ensure_valid_token(user, db)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            # 1. Crear la playlist
            create_payload = {
                "name": name,
                "description": description,
                "public": public
            }

            create_response = requests.post(
                f"{self.SPOTIFY_API_URL}/users/{user.spotify_id}/playlists",
                json=create_payload,
                headers=headers,
                timeout=10
            )
            create_response.raise_for_status()
            playlist_data = create_response.json()

            playlist_id = playlist_data.get("id")
            logger.info(f"✅ Playlist creada: {playlist_id}")

            # 2. Agregar canciones a la playlist
            if tracks:
                # Convertir track IDs a URIs si es necesario
                track_uris = []
                for track in tracks:
                    if track.startswith("spotify:track:"):
                        track_uris.append(track)
                    else:
                        track_uris.append(f"spotify:track:{track}")

                # Spotify permite agregar máximo 100 canciones por request
                for i in range(0, len(track_uris), 100):
                    batch = track_uris[i:i + 100]

                    add_payload = {"uris": batch}

                    add_response = requests.post(
                        f"{self.SPOTIFY_API_URL}/playlists/{playlist_id}/tracks",
                        json=add_payload,
                        headers=headers,
                        timeout=10
                    )
                    add_response.raise_for_status()

                logger.info(f"✅ {len(track_uris)} canciones agregadas a la playlist")

            return {
                "id": playlist_id,
                "name": playlist_data.get("name"),
                "description": playlist_data.get("description"),
                "external_url": playlist_data.get("external_urls", {}).get("spotify"),
                "uri": playlist_data.get("uri"),
                "tracks_total": len(tracks),
                "public": playlist_data.get("public"),
                "collaborative": playlist_data.get("collaborative"),
                "images": playlist_data.get("images", [])
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error creando playlist: {e}")
            error_detail = "Error al crear la playlist en Spotify"

            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("error", {}).get("message", error_detail)
                except:
                    pass

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_detail
            )

    def add_tracks_to_playlist(
        self,
        user: User,
        playlist_id: str,
        track_ids: List[str],
        db: Session = None
    ) -> Dict:
        """
        Agrega canciones a una playlist existente del usuario.

        Args:
            user: Usuario actual
            playlist_id: ID de la playlist de Spotify
            track_ids: Lista de IDs de canciones
            db: Sesión de base de datos

        Returns:
            Dict con el resultado de la operación
        """
        access_token = self._ensure_valid_token(user, db)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            # Convertir IDs a URIs
            track_uris = [f"spotify:track:{tid}" if not tid.startswith("spotify:") else tid for tid in track_ids]

            # Agregar en batches de 100
            added_count = 0
            for i in range(0, len(track_uris), 100):
                batch = track_uris[i:i + 100]

                payload = {"uris": batch}

                response = requests.post(
                    f"{self.SPOTIFY_API_URL}/playlists/{playlist_id}/tracks",
                    json=payload,
                    headers=headers,
                    timeout=10
                )
                response.raise_for_status()
                added_count += len(batch)

            logger.info(f"✅ {added_count} canciones agregadas a playlist {playlist_id}")

            return {
                "success": True,
                "tracks_added": added_count,
                "playlist_id": playlist_id
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error agregando canciones: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al agregar canciones a la playlist"
            )

    def get_user_playlists(self, user: User, db: Session, limit: int = 50) -> List[Dict]:
        """
        Obtiene las playlists del usuario desde Spotify.

        Args:
            user: Usuario actual
            db: Sesión de base de datos
            limit: Número máximo de playlists a obtener

        Returns:
            Lista de playlists del usuario
        """
        access_token = self._ensure_valid_token(user, db)
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            response = requests.get(
                f"{self.SPOTIFY_API_URL}/me/playlists",
                headers=headers,
                params={"limit": limit},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            playlists = []
            for item in data.get("items", []):
                playlists.append({
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "description": item.get("description"),
                    "external_url": item.get("external_urls", {}).get("spotify"),
                    "images": item.get("images", []),
                    "tracks_total": item.get("tracks", {}).get("total", 0),
                    "public": item.get("public"),
                    "collaborative": item.get("collaborative")
                })

            logger.info(f"✅ {len(playlists)} playlists obtenidas para {user.username}")
            return playlists

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error obteniendo playlists: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al obtener tus playlists de Spotify"
            )

    def check_playlist_ownership(self, user: User, playlist_id: str, db: Session) -> bool:
        """
        Verifica si una playlist pertenece al usuario.

        Args:
            user: Usuario actual
            playlist_id: ID de la playlist
            db: Sesión de base de datos

        Returns:
            True si el usuario es dueño de la playlist
        """
        access_token = self._ensure_valid_token(user, db)
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            response = requests.get(
                f"{self.SPOTIFY_API_URL}/playlists/{playlist_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            playlist = response.json()

            owner_id = playlist.get("owner", {}).get("id")
            return owner_id == user.spotify_id

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error verificando propiedad de playlist: {e}")
            return False


# Instancia global
spotify_user_service = SpotifyUserService()
