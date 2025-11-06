from fastapi import APIRouter, Depends, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.controllers.auth_controller import AuthController
from app.services.spotify_auth_service import spotify_auth_service
import secrets
from app.schemas.auth_schemas import UserRegister, UserLogin, TokenResponse, UserResponse, MessageResponse
from app.middlewares.auth_middleware import get_current_active_user
from app.models.user import User
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/api/auth",
    tags=["Autenticación"]
)

@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
    description="Crea una nueva cuenta de usuario en el sistema"
)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Registra un nuevo usuario con los siguientes requisitos:
    
    - **email**: Email válido y único
    - **username**: Username único (3-50 caracteres, solo letras, números, guiones)
    - **password**: Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas, números y caracteres especiales
    - **first_name**: Nombre (opcional)
    - **last_name**: Apellido (opcional)
    """
    return AuthController.register(user_data, db)

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión",
    description="Autentica un usuario y devuelve un token JWT"
)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Inicia sesión con username o email:
    
    - **username_or_email**: Username o email del usuario
    - **password**: Contraseña del usuario
    
    Retorna un token JWT y la información del usuario
    """
    return AuthController.login(login_data, db)

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener usuario actual",
    description="Obtiene la información del usuario autenticado"
)
def get_current_user(
    current_user: User = Depends(get_current_active_user)
):
    """
    Obtiene la información del usuario actual autenticado.

    Requiere token JWT válido en el header Authorization: Bearer <token>
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        profile_picture=current_user.profile_picture,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        spotify_connected=current_user.spotify_connected,
        spotify_display_name=current_user.spotify_display_name,
        spotify_email=current_user.spotify_email
    )

@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Cerrar sesión",
    description="Cierra la sesión del usuario (cliente debe eliminar el token)"
)
def logout(
    current_user: User = Depends(get_current_active_user)
):
    """
    Cierra la sesión del usuario actual.

    Nota: Como usamos JWT stateless, el token seguirá siendo válido hasta que expire.
    El cliente debe eliminar el token de su almacenamiento local.
    """
    return MessageResponse(
        message="Sesión cerrada exitosamente",
        detail="Token debe ser eliminado del cliente"
    )

# ============================================
# SPOTIFY OAUTH ROUTES
# ============================================

@router.get(
    "/spotify/login",
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión con Spotify",
    description="Genera la URL de autorización para iniciar sesión o registrarse con Spotify"
)
def spotify_login():
    """
    Genera la URL de autorización de Spotify para login/registro.

    El cliente debe redirigir al usuario a la URL devuelta.
    """
    return AuthController.spotify_login_url()

@router.get(
    "/spotify/callback",
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    summary="Callback de Spotify",
    description="Endpoint que maneja el callback de Spotify después de la autorización"
)
def spotify_callback(
    code: str = Query(..., description="Código de autorización de Spotify"),
    state: str = Query(None, description="Estado para prevenir CSRF"),
    error: str = Query(None, description="Error si la autorización falló"),
    db: Session = Depends(get_db)
):
    """
    Maneja el callback de Spotify después de que el usuario autoriza la aplicación.

    Si es exitoso, redirige al frontend con el access_token.
    Si falla, redirige al frontend con el error.
    """
    frontend_redirect = os.getenv("SPOTIFY_FRONTEND_REDIRECT", "http://localhost:5173/auth/callback")

    # Si hay error en la autorización
    if error:
        return RedirectResponse(
            url=f"{frontend_redirect}?error={error}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )

    try:
        # Procesar el callback y obtener tokens
        token_response = AuthController.spotify_callback(code, db)

        # Redirigir al frontend con el token
        return RedirectResponse(
            url=f"{frontend_redirect}?token={token_response.access_token}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )
    except Exception as e:
        return RedirectResponse(
            url=f"{frontend_redirect}?error={str(e)}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )

@router.get(
    "/spotify/link",
    status_code=status.HTTP_200_OK,
    summary="Vincular cuenta de Spotify",
    description="Genera la URL para vincular una cuenta de Spotify a un usuario existente"
)
def spotify_link_url(
    current_user: User = Depends(get_current_active_user)
):
    """
    Genera la URL de autorización de Spotify para vincular a una cuenta existente.

    Requiere que el usuario esté autenticado.
    El cliente debe redirigir al usuario a la URL devuelta.
    """
    if current_user.spotify_connected:
        return {
            "error": "Ya tienes una cuenta de Spotify vinculada",
            "spotify_email": current_user.spotify_email
        }

    # Generar URL de autorización que redirija al frontend (sin query params).
    # Usaremos el `state` para indicar que se trata de un "link" (prefijo 'link:').
    frontend_redirect = os.getenv("SPOTIFY_FRONTEND_REDIRECT", "http://localhost:5173/auth/callback")

    # Generar estado único y prefix 'link:' para que el frontend sepa interpretar
    raw_state = secrets.token_urlsafe(24)
    prefixed_state = f"link:{raw_state}"

    auth_url, state = spotify_auth_service.get_authorization_url(state=prefixed_state, redirect_uri=frontend_redirect)
    return {"authorization_url": auth_url, "state": state}

@router.post(
    "/spotify/link/callback",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Callback para vincular Spotify",
    description="Procesa el código de Spotify y vincula la cuenta al usuario actual"
)
def spotify_link_callback(
    code: str = Query(..., description="Código de autorización de Spotify"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Procesa el código de autorización y vincula Spotify al usuario actual.

    Requiere que el usuario esté autenticado.
    Devuelve un nuevo token con la información actualizada.
    """
    return AuthController.link_spotify(code, current_user, db)

@router.post(
    "/spotify/disconnect",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Desvincular cuenta de Spotify",
    description="Desvincula la cuenta de Spotify del usuario actual"
)
def spotify_disconnect(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Desvincula la cuenta de Spotify del usuario actual.

    Requiere que el usuario esté autenticado y tenga una contraseña
    (no se puede desvincular si es el único método de autenticación).
    """
    return AuthController.disconnect_spotify(current_user, db)