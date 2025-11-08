import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Register.css';
import { authService } from '../../services/authService';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);

    if (result.success) {
      setSuccess('¡Usuario registrado exitosamente! Redirigiendo al login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Fondo animado */}
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Header con navegación */}
      <header className="auth-header">
        <div className="auth-header-container">
          <h1 className="auth-brand" onClick={() => navigate('/')}>
            Ánima
          </h1>
          <nav className="auth-nav">
            <button onClick={() => navigate('/')} className="nav-btn">
              Inicio
            </button>
            <button onClick={() => navigate('/contact')} className="nav-btn">
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
              <div className="auth-badge">
                <span className="badge-icon">✨</span>
                <span className="badge-text">Únete a nosotros</span>
              </div>
              
              <h2 className="auth-title">Ánima</h2>
              <p className="auth-subtitle">Música que refleja cómo te sentís</p>
              <h3 className="auth-heading">Crear Cuenta</h3>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">❌</span>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <span className="alert-icon">✅</span>
                  <span>{success}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="username" className="form-label">Username *</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="form-input"
                  placeholder="usuario123"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name" className="form-label">Nombre</label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    className="form-input"
                    placeholder="Juan"
                    value={formData.first_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="last_name" className="form-label">Apellido</label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    className="form-input"
                    placeholder="Pérez"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Contraseña *</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <p className="form-hint">
                  Mínimo 8 caracteres, incluye mayúsculas, minúsculas, números y caracteres especiales
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirmar Contraseña *</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
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
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <span>Registrarse</span>
                      <span className="btn-icon">🎉</span>
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
                onClick={async () => {
                  try {
                    const url = await authService.getSpotifyAuthUrl();
                    window.location.href = url;
                  } catch (e) {
                    console.error('Error iniciando OAuth Spotify', e);
                    alert('No se pudo iniciar registro con Spotify');
                  }
                }}
              >
                <span className="btn-content">
                  <span>🎵</span>
                  <span>Registrarse con Spotify</span>
                </span>
              </button>

              <div className="auth-footer">
                <p>
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/login" className="auth-link">
                    Inicia sesión aquí
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

export default Register;