import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import historyService from '../../services/historyService';
import spotifyService from '../../services/spotifyService';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const error = params.get('error');
  const code = params.get('code');
  const state = params.get('state');

  // Idempotency: evitar procesar la misma query string más de una vez
  const processedKey = `oauth_processed:${location.search}`;
  if (sessionStorage.getItem(processedKey)) {
    console.log('[AuthCallback] Callback ya procesado, ignorando.');
    return;
  }
  // Marcar como procesado inmediatamente para evitar reentradas
  sessionStorage.setItem(processedKey, '1');

    (async () => {
      try {
        if (error) {
          // Si el usuario canceló en Spotify, redirigir a la app en lugar de mostrar 404.
          console.warn('OAuth error from Spotify:', error);
          try {
            // Si el usuario ya tiene token, llevarlo a Home, sino a Login
            const tokenNow = localStorage.getItem('token');
            if (tokenNow) {
              alert('Autenticación cancelada en Spotify');
              navigate('/home');
            } else {
              alert('Autenticación cancelada en Spotify. Puedes iniciar sesión normalmente.');
              navigate('/login');
            }
          } catch (e) {
            navigate('/login');
          }
          return;
        }

        // Caso 1: backend devolvió token (login/registro con Spotify)
        if (token) {
          // Guardar token y solicitar usuario
          localStorage.setItem('token', token);
          try {
            const user = await authService.me();
            // Actualizar el contexto de autenticación para que ProtectedRoute
            // reconozca al usuario sin necesidad de recargar la app.
            try {
              if (typeof setUser === 'function') setUser(user);
            } catch (e) {
              console.warn('No se pudo actualizar AuthContext.setUser:', e);
            }
            localStorage.setItem('user', JSON.stringify(user));
          } catch (e) {
            console.error('Error al obtener usuario después de OAuth', e);
          }
          navigate('/Home');
          return;
        }

        // Caso 2: frontend recibió code y state indica link (usado para linking)
        if (code && state && state.startsWith('link:')) {
          // Enviar code al backend para vincular
          try {
            const result = await authService.linkSpotify(code);
            // linkSpotify guarda el nuevo token en localStorage
            alert('Cuenta de Spotify vinculada correctamente');
            // Actualizar AuthContext sin recargar toda la app
            try {
              let refreshed = null;
              if (typeof refreshUser === 'function') refreshed = await refreshUser();

              // Si había una playlist pendiente, procesarla ahora
              const pendingRaw = localStorage.getItem('pending_playlist_save');
              if (pendingRaw) {
                try {
                  const pending = JSON.parse(pendingRaw);

                  // Guardar en Anima primero
                  const saveResult = await historyService.savePlaylist(pending);
                  if (!saveResult.success) {
                    console.warn('No se pudo guardar la playlist pendiente en Anima:', saveResult.error);
                    // No eliminar el pending para que el usuario pueda reintentar
                  } else {
                    // Si el usuario ahora está vinculado, intentar crear en Spotify
                    const currentUser = refreshed?.user || JSON.parse(localStorage.getItem('user') || 'null');
                    if (currentUser && currentUser.spotify_connected) {
                      try {
                        const trackIds = (pending.tracks || []).map(t => t.id).filter(Boolean);
                        const spRes = await spotifyService.createPlaylist({
                          name: pending.playlist_name,
                          description: pending.description || '',
                          tracks: trackIds,
                          isPublic: false
                        });
                        if (!spRes.success) {
                          console.warn('No se pudo crear la playlist en Spotify tras vincular:', spRes.error);
                          // dejar al usuario saber que la guardó en Anima
                          alert('Playlist guardada en Anima, pero no se pudo crear en Spotify automáticamente. Puedes intentar crearla manualmente.');
                        }
                      } catch (e) {
                        console.error('Error creando playlist en Spotify tras vincular:', e);
                      }
                    }

                    // Borrar pending (ya procesada en Anima)
                    localStorage.removeItem('pending_playlist_save');
                  }
                } catch (e) {
                  console.error('Error procesando pending_playlist_save:', e);
                }
              }

              navigate('/Home');
            } catch (err) {
              // Si por alguna razón no podemos refrescar el contexto, recargar la página
              try {
                window.location.replace('/home');
                window.location.reload();
              } catch {
                navigate('/Home');
              }
            }
          } catch (e) {
            console.error('Error vinculando Spotify:', e);
            alert('No se pudo vincular la cuenta de Spotify');
            navigate('/Home');
          }
          return;
        }

        // Si llegó sólo el code sin action, llamar al endpoint JSON que intercambia el code
        if (code) {
          try {
            const response = await authService.exchangeSpotifyCode(code);
            // exchangeSpotifyCode guarda el token y el user en localStorage
            if (response?.access_token) {
              try {
                if (typeof setUser === 'function') setUser(response.user);
              } catch (e) {
                console.warn('No se pudo actualizar AuthContext.setUser después de exchange:', e);
              }
              localStorage.setItem('token', response.access_token);
              localStorage.setItem('user', JSON.stringify(response.user));
            }
            navigate('/Home');
          } catch (e) {
            console.error('Error procesando code (exchange):', e);
            // Mostrar un mensaje amigable si viene detail del backend
            const errDetail = e?.response?.data?.detail || e?.message || 'Error al procesar autenticación con Spotify';
            alert(errDetail);
            navigate('/login');
          }
          return;
        }

        // Si no hay nada útil, redirigir a login
        navigate('/login');
      } catch (e) {
        console.error('Error en callback de OAuth:', e);
        navigate('/login');
      }
    })();
  }, [location.search, navigate, setUser, refreshUser]);

  return (
    <div style={{ padding: 24 }}>
      <p>Procesando autenticación... Por favor espera.</p>
    </div>
  );
};

export default AuthCallback;
