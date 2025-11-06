import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import { authService } from '../../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username_or_email: '',
    password: ''
  });
  const [error, setError] = useState('');
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

    const result = await login(formData);

    if (result.success) {
      navigate('/Home');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Ánima</h2>
          <p className="login-subtitle">Música que refleja cómo te sentís</p>
          <h3 className="login-heading">Iniciar Sesión</h3>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <input
              id="username_or_email"
              name="username_or_email"
              type="text"
              required
              className="form-input"
              placeholder="Username o Email"
              value={formData.username_or_email}
              onChange={handleChange}
            />
            <input
              id="password"
              name="password"
              type="password"
              required
              className="form-input"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const url = await authService.getSpotifyAuthUrl();
                  window.location.href = url;
                } catch (e) {
                  console.error('Error iniciando OAuth Spotify', e);
                  alert('No se pudo iniciar autenticación con Spotify');
                }
              }}
            >
              Iniciar con Spotify
            </button>
          </div>

          <div className="login-footer">
            <p>
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="login-link">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;