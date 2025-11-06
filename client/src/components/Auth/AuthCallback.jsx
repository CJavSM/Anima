import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const error = params.get('error');
  const code = params.get('code');
  const state = params.get('state');

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
            navigate('/Home');
          } catch (e) {
            console.error('Error vinculando Spotify:', e);
            alert('No se pudo vincular la cuenta de Spotify');
            navigate('/Home');
          }
          return;
        }

        // Si llegó sólo el code sin action, intentar canjear en backend (posible flow directo)
        if (code) {
          try {
            // Llamar al endpoint que hace el intercambio en backend
            const response = await fetch(`/api/auth/spotify/callback?code=${encodeURIComponent(code)}`);
            // backend redirect normally handles this, pero por seguridad
            navigate('/Home');
          } catch (e) {
            console.error('Error procesando code:', e);
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
  }, [location.search, navigate]);

  return (
    <div style={{ padding: 24 }}>
      <p>Procesando autenticación... Por favor espera.</p>
    </div>
  );
};

export default AuthCallback;
