import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; // Reutilizar estilos del login
import Logo from '../Shared/Logo';
import { authService } from '../../services/authService';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }
    
    setLoading(true);
    setError('');
    console.log('🔄 Enviando solicitud de recuperación para:', email);

    try {
      const result = await authService.requestPasswordReset(email.trim());
      
      console.log('📧 Resultado de recuperación:', result);
      
      if (result.success) {
        setSuccess(true);
        console.log('✅ Código enviado exitosamente');
      } else {
        setError(result.error || 'Error desconocido al enviar código');
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
                  <span className="badge-icon">✉️</span>
                  <span className="badge-text">Código enviado</span>
                </div>
                
                <h2 className="auth-title">Ánima</h2>
                <h3 className="auth-heading">Revisa tu email</h3>
              </div>

              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                <span>Te hemos enviado un código de recuperación a <strong>{email}</strong></span>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <p style={{ marginBottom: '1rem', color: 'var(--gray-600)' }}>
                  El código es válido por <strong>30 minutos</strong>
                </p>
                
                <div style={{ 
                  background: 'var(--gray-50)', 
                  padding: '1rem', 
                  borderRadius: '0.75rem',
                  border: '1px solid var(--gray-200)',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                    💡 <strong>¿No encuentras el email?</strong>
                  </p>
                  <ul style={{ 
                    textAlign: 'left', 
                    fontSize: '0.875rem', 
                    color: 'var(--gray-600)',
                    paddingLeft: '1rem',
                    margin: 0
                  }}>
                    <li>Revisa tu carpeta de spam o correo no deseado</li>
                    <li>Verifica que el email esté escrito correctamente</li>
                    <li>Espera unos minutos, a veces demora en llegar</li>
                  </ul>
                </div>
              </div>

              <div className="auth-footer">
                <p>
                  <Link to="/reset-password" className="auth-link">
                    ¿Ya tienes el código? Cambiar contraseña
                  </Link>
                </p>
                <p style={{ marginTop: '0.75rem' }}>
                  <button 
                    onClick={() => {
                      setSuccess(false);
                      setEmail('');
                      setError('');
                    }}
                    className="auth-link"
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Enviar a otro email
                  </button>
                </p>
                <p style={{ marginTop: '0.75rem' }}>
                  <Link to="/login" className="auth-link">
                    Volver al login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Fondo animado */}
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Header */}
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

      {/* Contenido principal */}
      <div className="auth-content">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-hero">
              <div className="auth-badge floating">
                <span className="badge-icon">🔑</span>
                <span className="badge-text">Recupera tu acceso</span>
              </div>
              
              <h2 className="auth-title">Ánima</h2>
              <p className="auth-subtitle">Música que refleja cómo te sentís</p>
              <h3 className="auth-heading">¿Olvidaste tu contraseña?</h3>
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
                  placeholder="Ingresa tu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-submit btn-primary"
              >
                <span className="btn-content">
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      <span>Enviando código...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar código</span>
                      <span className="btn-icon">📧</span>
                    </>
                  )}
                </span>
              </button>

              <div className="auth-footer">
                <p>
                  ¿Recordaste tu contraseña?{' '}
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

export default ForgotPassword;