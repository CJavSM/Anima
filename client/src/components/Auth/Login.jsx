import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import Logo from '../Shared/Logo';
import { authService } from '../../services/authService';
import Sidebar from '../Shared/Sidebar';
import useSidebar from '../../hooks/useSidebar';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username_or_email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isOpen: sidebarOpen, openSidebar, closeSidebar, toggleSidebar } = useSidebar();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData);

    if (result.success) {
      navigate('/Home');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const [spotifyLoading, setSpotifyLoading] = useState(false);

  const handleSpotify = async (e) => {
    // prevenir comportamiento por defecto por si el click proviene de un submit
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    console.log('🔔 [Login] handleSpotify invoked, spotifyLoading=', spotifyLoading);
    if (spotifyLoading) return;
    setSpotifyLoading(true);
    try {
      const url = await authService.getSpotifyAuthUrl();
      if (!url) throw new Error('No se obtuvo la URL de Spotify');
      console.log('🔗 [Login] Spotify auth URL:', url);
      // usar assign/replace es equivalente; assign mantiene historial
      window.location.assign(url);
    } catch (e) {
      console.error('Error iniciando OAuth Spotify', e);
      alert('No se pudo iniciar autenticación con Spotify');
    } finally {
      // Si la app no llega a redirigir, garantizamos reset del estado
      setSpotifyLoading(false);
    }
  };


  return (
    <div className="auth-page">
      {/* Fondo animado como LandingPage */}
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Header con navegación */}
      <header className="auth-header">
        <div className="auth-header-container">
          <div className="auth-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo width={44} height={44} title="Ánima" />
            <span className="auth-brand-text">Ánima</span>
          </div>
          <nav className="auth-nav">
            {/* Botón de menú para móvil */}
            <button onClick={toggleSidebar} className="nav-btn mobile-only">
              ☰
            </button>
            
            {/* Botones normales para desktop */}
            <button onClick={() => navigate('/')} className="nav-btn desktop-only">
              Inicio
            </button>
            <button onClick={() => navigate('/contact')} className="nav-btn desktop-only">
              Contacto
            </button>
          </nav>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="auth-content">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-hero">
              <div className="auth-badge floating">
                <span className="badge-icon">🔐</span>
                <span className="badge-text">Acceso a tu cuenta</span>
              </div>
              
              <h2 className="auth-title">Ánima</h2>
              <p className="auth-subtitle">Música que refleja cómo te sentís</p>
              <h3 className="auth-heading">Iniciar Sesión</h3>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">❌</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="username_or_email" className="form-label">
                  Username o Email
                </label>
                <input
                  id="username_or_email"
                  name="username_or_email"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ingresa tu username o email"
                  value={formData.username_or_email}
                  onChange={handleChange}
                />
                <Link to="/forgot-password" className="auth-link" style={{fontSize: '0.875rem', marginTop: '0.5rem', display: 'block', textAlign: 'right'}}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Ingresa tu contraseña"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-submit btn-primary"
              >
                <span className="btn-content">
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <span>Iniciar Sesión</span>
                      <span className="btn-icon">🚀</span>
                    </>
                  )}
                </span>
              </button>

              <div className="divider">
                <span>o</span>
              </div>

              <button
                type="button"
                className="btn-submit btn-secondary"
                onClick={(e) => { e.preventDefault(); handleSpotify(e); }}
                disabled={spotifyLoading}
              >
                <span className="btn-content">
                  {spotifyLoading ? (
                    <>
                      <span className="spinner-small"></span>
                      <span>Redirigiendo...</span>
                    </>
                  ) : (
                    <>
                      <span>🎵</span>
                      <span>Iniciar con Spotify</span>
                    </>
                  )}
                </span>
              </button>

              <div className="auth-footer">
                <p>
                  ¿No tienes cuenta?{' '}
                  <Link to="/register" className="auth-link">
                    Regístrate aquí
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;