import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; 
import Logo from '../Shared/Logo';
import { authService } from '../../services/authService';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    code: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    const result = await authService.resetPassword({
      email: formData.email,
      code: formData.code,
      new_password: formData.newPassword
    });

    if (result.success) {
      alert('¡Contraseña cambiada exitosamente!');
      navigate('/login');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <header className="auth-header">
        <div className="auth-header-container">
          <div className="auth-brand" onClick={() => navigate('/')}>
            <Logo width={44} height={44} title="Ánima" />
            <span className="auth-brand-text">Ánima</span>
          </div>
          <nav className="auth-nav">
            <button onClick={() => navigate('/')} className="nav-btn">Inicio</button>
            <button onClick={() => navigate('/contact')} className="nav-btn">Contacto</button>
          </nav>
        </div>
      </header>

      <div className="auth-content">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-hero">
              <div className="auth-badge floating">
                <span className="badge-icon">🔐</span>
                <span className="badge-text">Nueva contraseña</span>
              </div>
              
              <h2 className="auth-title">Ánima</h2>
              <p className="auth-subtitle">Música que refleja cómo te sentís</p>
              <h3 className="auth-heading">Cambiar Contraseña</h3>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">❌</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
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
                <label htmlFor="code" className="form-label">
                  Código de verificación
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ingresa el código que recibiste"
                  value={formData.code}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">
                  Nueva contraseña
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirmar contraseña
                </label>
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
                      <span>Cambiando contraseña...</span>
                    </>
                  ) : (
                    <>
                      <span>Cambiar contraseña</span>
                      <span className="btn-icon">✅</span>
                    </>
                  )}
                </span>
              </button>

              <div className="auth-footer">
                <p>
                  ¿No recibiste el código?{' '}
                  <Link to="/forgot-password" className="auth-link">
                    Reenviar código
                  </Link>
                </p>
                <p>
                  <Link to="/login" className="auth-link">
                    Volver al login
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

export default ResetPassword;