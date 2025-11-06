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
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2 className="register-title">Ánima</h2>
          <p className="register-subtitle">Música que refleja cómo te sentís</p>
          <h3 className="register-heading">Crear Cuenta</h3>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>{success}</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email" className="form-label">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="username" className="form-label">Username *</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              placeholder="usuario123"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="first_name" className="form-label">Nombre</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="Juan"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label htmlFor="last_name" className="form-label">Apellido</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Pérez"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password" className="form-label">Contraseña *</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
            <p className="form-hint">
              Mínimo 8 caracteres, incluye mayúsculas, minúsculas, números y caracteres especiales
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword" className="form-label">Confirmar Contraseña *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
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
                  alert('No se pudo iniciar registro con Spotify');
                }
              }}
            >
              Registrarse con Spotify
            </button>
          </div>

          <div className="register-footer">
            <p>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="register-link">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;