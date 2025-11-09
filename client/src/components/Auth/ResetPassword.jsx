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
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('El email es requerido');
      return false;
    }
    
    if (!formData.code.trim()) {
      setError('El código es requerido');
      return false;
    }
    
    if (formData.code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return false;
    }
    
    if (!formData.newPassword) {
      setError('La nueva contraseña es requerida');
      return false;
    }
    
    if (formData.newPassword.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    console.log('🔄 Cambiando contraseña para:', formData.email);

    try {
      const result = await authService.resetPassword({
        email: formData.email.trim(),
        code: formData.code.trim(),
        new_password: formData.newPassword
      });

      console.log('🔑 Resultado de cambio de contraseña:', result);

      if (result.success) {
        setSuccess(true);
        console.log('✅ Contraseña cambiada exitosamente');
      } else {
        setError(result.error || 'Error desconocido al cambiar contraseña');
        console.error('❌ Error en resultado:', result.error);
      }
    } catch (err) {
      console.error('❌ Error capturado en catch:', err);
      setError(err.message || 'Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
                  <span className="badge-icon">✅</span>
                  <span className="badge-text">Contraseña cambiada</span>
                </div>
                
                <h2 className="auth-title">Ánima</h2>
                <h3 className="auth-heading">¡Contraseña cambiada exitosamente!</h3>
              </div>

              <div className="alert alert-success">
                <span className="alert-icon">🎉</span>
                <span>Tu contraseña ha sido cambiada. Ya puedes iniciar sesión con tu nueva contraseña.</span>
              </div>

              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-submit btn-primary"
                  style={{ width: '100%' }}
                >
                  <span className="btn-content">
                    <span>Iniciar Sesión</span>
                    <span className="btn-icon">🚀</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  disabled={loading}
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
                  maxLength="6"
                  className="form-input"
                  placeholder="123456"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={loading}
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '1.125rem',
                    letterSpacing: '0.2em',
                    textAlign: 'center'
                  }}
                />
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                  Ingresa el código de 6 dígitos que recibiste por email
                </p>
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
                  disabled={loading}
                />
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                  Mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos
                </p>
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
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !formData.email.trim() || !formData.code.trim() || !formData.newPassword || !formData.confirmPassword}
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
                    Solicitar nuevo código
                  </Link>
                </p>
                <p style={{ marginTop: '0.75rem' }}>
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