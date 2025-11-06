from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.auth_schemas import UserRegister, UserLogin, TokenResponse, UserResponse, MessageResponse
from app.services.auth_service import AuthService
from app.services.spotify_auth_service import spotify_auth_service
from app.models.user import User

class AuthController:
    
    @staticmethod
    def register(user_data: UserRegister, db: Session) -> MessageResponse:
        """Controlador para registrar un nuevo usuario"""
        try:
            user = AuthService.register_user(user_data, db)
            return MessageResponse(
                message="Usuario registrado exitosamente",
                detail=f"Bienvenido {user.username}!"
            )
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al registrar usuario: {str(e)}"
            )
    
    @staticmethod
    def login(login_data: UserLogin, db: Session) -> TokenResponse:
        """Controlador para autenticar un usuario"""
        try:
            # Autenticar usuario
            user = AuthService.authenticate_user(
                login_data.username_or_email,
                login_data.password,
                db
            )
            
            # Crear token
            access_token = AuthService.create_user_token(user)
            
            # Preparar respuesta
            user_response = UserResponse(
                id=str(user.id),
                email=user.email,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                profile_picture=user.profile_picture,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                spotify_connected=user.spotify_connected,
                spotify_display_name=user.spotify_display_name,
                spotify_email=user.spotify_email
            )
            
            return TokenResponse(
                access_token=access_token,
                user=user_response
            )
        except HTTPException as e:
            raise e
        except Exception as e:
            # Log completo para debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error inesperado en AuthController.login")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno al iniciar sesión"
            )
    
    @staticmethod
    def get_current_user_info(user_id: str, db: Session) -> UserResponse:
        """Obtiene la información del usuario actual"""
        try:
            user = AuthService.get_user_by_id(user_id, db)
            return UserResponse(
                id=str(user.id),
                email=user.email,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                profile_picture=user.profile_picture,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                spotify_connected=user.spotify_connected,
                spotify_display_name=user.spotify_display_name,
                spotify_email=user.spotify_email
            )
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener información del usuario: {str(e)}"
            )

    # ============================================
    # SPOTIFY OAUTH METHODS
    # ============================================

    @staticmethod
    def spotify_login_url() -> dict:
        """Genera la URL para iniciar sesión/registro con Spotify"""
        try:
            auth_url, state = spotify_auth_service.get_authorization_url()
            return {
                "authorization_url": auth_url,
                "state": state
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al generar URL de Spotify: {str(e)}"
            )

    @staticmethod
    def spotify_callback(code: str, db: Session) -> TokenResponse:
        """Maneja el callback de Spotify después de la autorización"""
        try:
            # Intercambiar código por tokens
            token_data = spotify_auth_service.exchange_code_for_token(code)

            # Obtener información del usuario de Spotify
            spotify_user_data = spotify_auth_service.get_spotify_user_info(
                token_data["access_token"]
            )

            # Crear o actualizar usuario
            user = spotify_auth_service.create_or_update_user_from_spotify(
                spotify_user_data, token_data, db
            )

            # Crear JWT token
            access_token = spotify_auth_service.create_user_token(user)

            # Preparar respuesta
            user_response = UserResponse(
                id=str(user.id),
                email=user.email,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                profile_picture=user.profile_picture,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                spotify_connected=user.spotify_connected,
                spotify_display_name=user.spotify_display_name,
                spotify_email=user.spotify_email
            )

            return TokenResponse(
                access_token=access_token,
                user=user_response
            )
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en callback de Spotify: {str(e)}"
            )

    @staticmethod
    def link_spotify(code: str, current_user: User, db: Session) -> TokenResponse:
        """Vincula una cuenta de Spotify a un usuario existente"""
        try:
            # Intercambiar código por tokens
            token_data = spotify_auth_service.exchange_code_for_token(code)

            # Obtener información del usuario de Spotify
            spotify_user_data = spotify_auth_service.get_spotify_user_info(
                token_data["access_token"]
            )

            # Vincular Spotify al usuario existente
            user = spotify_auth_service.link_spotify_to_existing_user(
                current_user, spotify_user_data, token_data, db
            )

            # Crear nuevo JWT token con información actualizada
            access_token = spotify_auth_service.create_user_token(user)

            # Preparar respuesta
            user_response = UserResponse(
                id=str(user.id),
                email=user.email,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                profile_picture=user.profile_picture,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                spotify_connected=user.spotify_connected,
                spotify_display_name=user.spotify_display_name,
                spotify_email=user.spotify_email
            )

            return TokenResponse(
                access_token=access_token,
                user=user_response
            )
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al vincular Spotify: {str(e)}"
            )

    @staticmethod
    def disconnect_spotify(current_user: User, db: Session) -> MessageResponse:
        """Desvincula la cuenta de Spotify del usuario"""
        try:
            spotify_auth_service.disconnect_spotify(current_user, db)
            return MessageResponse(
                message="Cuenta de Spotify desvinculada exitosamente",
                detail="Puedes seguir usando tu cuenta con usuario y contraseña"
            )
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al desvincular Spotify: {str(e)}"
            )