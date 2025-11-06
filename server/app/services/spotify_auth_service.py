import os
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple
from urllib.parse import urlencode

import requests
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.utils.security import create_access_token
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spotify_auth_service")


class SpotifyAuthService:
    """
    Servicio para autenticación OAuth con Spotify.
    Maneja registro, login y vinculación de cuentas.
    """

    # Use localized authorize endpoint that worked in the user's browser (/es/authorize)
    SPOTIFY_AUTH_URL = "https://accounts.spotify.com/es/authorize"
    SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
    SPOTIFY_API_URL = "https://api.spotify.com/v1"

    # Scopes necesarios para la aplicación
    SPOTIFY_SCOPES = [
        "user-read-email",
        "user-read-private",
        "playlist-modify-public",
        "playlist-modify-private",
        "playlist-read-private",
        "user-library-read",
    ]

    def __init__(self):
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")
        self.frontend_redirect = os.getenv("SPOTIFY_FRONTEND_REDIRECT")

        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            logger.error("❌ Faltan credenciales de Spotify en variables de entorno")
            raise ValueError("Credenciales de Spotify no configuradas")

        logger.info("✅ SpotifyAuthService inicializado correctamente")

    def get_authorization_url(self, state: Optional[str] = None, redirect_uri: Optional[str] = None) -> Tuple[str, str]:
        """
        Genera la URL de autorización de Spotify.

        Args:
            state: Estado opcional para vincular cuenta existente

        Returns:
            Tuple con (url, state)
        """
        if not state:
            state = secrets.token_urlsafe(32)

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri or self.redirect_uri,
            "scope": " ".join(self.SPOTIFY_SCOPES),
            "state": state,
            "show_dialog": "false",  # No mostrar diálogo si ya autorizó previamente
        }

        auth_url = f"{self.SPOTIFY_AUTH_URL}?{urlencode(params)}"
        logger.info(f"🔐 URL de autorización generada con state: {state[:10]}...")

        return auth_url, state

    def exchange_code_for_token(self, code: str) -> Dict:
        """
        Intercambia el código de autorización por tokens de acceso.

        Args:
            code: Código de autorización de Spotify

        Returns:
            Dict con access_token, refresh_token, expires_in
        """
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        try:
            response = requests.post(self.SPOTIFY_TOKEN_URL, data=data, timeout=10)
            response.raise_for_status()
            token_data = response.json()

            logger.info("✅ Tokens de Spotify obtenidos exitosamente")
            return token_data

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error intercambiando código por token: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al obtener tokens de Spotify"
            )

    def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Refresca el access token usando el refresh token.

        Args:
            refresh_token: Refresh token de Spotify

        Returns:
            Dict con nuevo access_token y expires_in
        """
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        try:
            response = requests.post(self.SPOTIFY_TOKEN_URL, data=data, timeout=10)
            response.raise_for_status()
            token_data = response.json()

            logger.info("✅ Access token refrescado exitosamente")
            return token_data

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error refrescando token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Error al refrescar token de Spotify"
            )

    def get_spotify_user_info(self, access_token: str) -> Dict:
        """
        Obtiene información del usuario desde la API de Spotify.

        Args:
            access_token: Token de acceso de Spotify

        Returns:
            Dict con información del usuario
        """
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            response = requests.get(
                f"{self.SPOTIFY_API_URL}/me",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            user_data = response.json()

            logger.info(f"✅ Información de usuario obtenida: {user_data.get('id')}")
            return user_data

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error obteniendo info de usuario: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al obtener información del usuario de Spotify"
            )

    def create_or_update_user_from_spotify(
        self,
        spotify_user_data: Dict,
        token_data: Dict,
        db: Session
    ) -> User:
        """
        Crea un nuevo usuario o actualiza uno existente con datos de Spotify.

        Args:
            spotify_user_data: Datos del usuario desde Spotify API
            token_data: Tokens de acceso de Spotify
            db: Sesión de base de datos

        Returns:
            Usuario creado o actualizado
        """
        spotify_id = spotify_user_data.get("id")
        spotify_email = spotify_user_data.get("email")
        spotify_display_name = spotify_user_data.get("display_name") or spotify_id

        # Calcular expiración del token
        expires_in = token_data.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Buscar usuario existente por spotify_id
        existing_user = db.query(User).filter(User.spotify_id == spotify_id).first()

        if existing_user:
            # Actualizar tokens y datos de Spotify
            existing_user.spotify_access_token = token_data.get("access_token")
            existing_user.spotify_refresh_token = token_data.get("refresh_token")
            existing_user.spotify_token_expires_at = expires_at
            existing_user.spotify_email = spotify_email
            existing_user.spotify_display_name = spotify_display_name
            existing_user.spotify_connected = True
            existing_user.last_login = datetime.now(timezone.utc)

            # Actualizar imagen de perfil si no tiene una
            if not existing_user.profile_picture and spotify_user_data.get("images"):
                images = spotify_user_data.get("images", [])
                if images:
                    existing_user.profile_picture = images[0].get("url")

            db.commit()
            db.refresh(existing_user)

            logger.info(f"✅ Usuario existente actualizado: {existing_user.username}")
            return existing_user

        # Crear nuevo usuario con datos de Spotify
        # Generar username único basado en display_name o spotify_id
        base_username = self._sanitize_username(spotify_display_name or spotify_id)
        username = self._generate_unique_username(base_username, db)

        # Usar email de Spotify o generar uno temporal
        email = spotify_email if spotify_email else f"{spotify_id}@spotify.temp"

        # Imagen de perfil
        profile_picture = None
        if spotify_user_data.get("images"):
            images = spotify_user_data.get("images", [])
            if images:
                profile_picture = images[0].get("url")

        new_user = User(
            email=email,
            username=username,
            password_hash=None,  # No tiene contraseña, solo Spotify
            first_name=spotify_display_name,
            spotify_id=spotify_id,
            spotify_email=spotify_email,
            spotify_display_name=spotify_display_name,
            spotify_access_token=token_data.get("access_token"),
            spotify_refresh_token=token_data.get("refresh_token"),
            spotify_token_expires_at=expires_at,
            spotify_connected=True,
            spotify_connected_at=datetime.now(timezone.utc),
            profile_picture=profile_picture,
            is_verified=True,  # Usuarios de Spotify se consideran verificados
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        logger.info(f"✅ Nuevo usuario creado desde Spotify: {new_user.username}")
        return new_user

    def link_spotify_to_existing_user(
        self,
        user: User,
        spotify_user_data: Dict,
        token_data: Dict,
        db: Session
    ) -> User:
        """
        Vincula una cuenta de Spotify a un usuario existente.

        Args:
            user: Usuario existente
            spotify_user_data: Datos del usuario desde Spotify API
            token_data: Tokens de acceso de Spotify
            db: Sesión de base de datos

        Returns:
            Usuario actualizado
        """
        spotify_id = spotify_user_data.get("id")

        # Verificar que este spotify_id no esté vinculado a otra cuenta
        existing_spotify_user = db.query(User).filter(
            User.spotify_id == spotify_id,
            User.id != user.id
        ).first()

        if existing_spotify_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cuenta de Spotify ya está vinculada a otro usuario"
            )

        # Calcular expiración del token
        expires_in = token_data.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Actualizar usuario con datos de Spotify
        user.spotify_id = spotify_id
        user.spotify_email = spotify_user_data.get("email")
        user.spotify_display_name = spotify_user_data.get("display_name")
        user.spotify_access_token = token_data.get("access_token")
        user.spotify_refresh_token = token_data.get("refresh_token")
        user.spotify_token_expires_at = expires_at
        user.spotify_connected = True
        user.spotify_connected_at = datetime.now(timezone.utc)

        # Actualizar imagen de perfil si no tiene una
        if not user.profile_picture and spotify_user_data.get("images"):
            images = spotify_user_data.get("images", [])
            if images:
                user.profile_picture = images[0].get("url")

        db.commit()
        db.refresh(user)

        logger.info(f"✅ Spotify vinculado a usuario: {user.username}")
        return user

    def disconnect_spotify(self, user: User, db: Session) -> User:
        """
        Desvincula la cuenta de Spotify de un usuario.

        Args:
            user: Usuario actual
            db: Sesión de base de datos

        Returns:
            Usuario actualizado
        """
        if not user.spotify_connected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No tienes una cuenta de Spotify vinculada"
            )

        # Verificar que el usuario tenga contraseña (no se registró solo con Spotify)
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes desvincular Spotify porque es tu único método de autenticación"
            )

        # Limpiar datos de Spotify
        user.spotify_id = None
        user.spotify_email = None
        user.spotify_display_name = None
        user.spotify_access_token = None
        user.spotify_refresh_token = None
        user.spotify_token_expires_at = None
        user.spotify_connected = False
        user.spotify_connected_at = None

        db.commit()
        db.refresh(user)

        logger.info(f"✅ Spotify desvinculado del usuario: {user.username}")
        return user

    def _sanitize_username(self, username: str) -> str:
        """Sanitiza un username para que sea válido."""
        import re
        # Mantener solo caracteres alfanuméricos, guiones y guiones bajos
        sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', username)
        # Asegurar que tenga al menos 3 caracteres
        if len(sanitized) < 3:
            sanitized = f"user_{sanitized}"
        # Limitar a 50 caracteres
        return sanitized[:50]

    def _generate_unique_username(self, base_username: str, db: Session) -> str:
        """Genera un username único agregando números si es necesario."""
        username = base_username
        counter = 1

        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        return username

    def create_user_token(self, user: User) -> str:
        """Crea un token JWT para el usuario."""
        token_data = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email
        }
        return create_access_token(token_data)


# Instancia global
spotify_auth_service = SpotifyAuthService()
