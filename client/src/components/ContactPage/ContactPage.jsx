import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ContactPage.css';

const ContactPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  
  const WHATSAPP_NUMBER = '50247483696'; 
  
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

    try {
      const response = await fetch('http://localhost:8000/api/contact/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        
        // Ocultar mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(data.detail || 'Error al enviar el mensaje');
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta de nuevo.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!WHATSAPP_NUMBER) {
      alert('El número de WhatsApp aún no está configurado. Por favor contacta al administrador.');
      return;
    }
    
    const message = encodeURIComponent('Hola! Me gustaría obtener más información sobre Ánima.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  return (
    <div className="contact-page">
      {/* Header con navegación */}
      <header className="contact-header">
        <div className="contact-header-container">
          <h1 className="contact-brand" onClick={() => navigate('/')}>
            Ánima
          </h1>
          <nav className="contact-nav">
            <button onClick={() => navigate('/')} className="nav-btn">
              Inicio
            </button>
            <button onClick={() => navigate('/login')} className="nav-btn nav-btn-primary">
              Iniciar Sesión
            </button>
          </nav>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="contact-content">
        <div className="contact-hero">
          <div className="contact-hero-badge">
            <span className="badge-icon">💬</span>
            <span className="badge-text">Estamos aquí para ayudarte</span>
          </div>
          
          <h2 className="contact-title">Contáctanos</h2>
          
          <p className="contact-description">
            ¿Tienes preguntas sobre Ánima? ¿Necesitas ayuda? 
            Estamos para escucharte. Escoge la forma que prefieras para contactarnos.
          </p>
        </div>

        <div className="contact-container">
          {/* Columna izquierda - Métodos de contacto rápido */}
          <div className="contact-methods">
            <div className="method-card">
              <div className="method-icon-wrapper whatsapp-icon">
                <span className="method-icon">💚</span>
              </div>
              <h3 className="method-title">WhatsApp</h3>
              <p className="method-description">
                Chatea con nosotros directamente y obtén respuestas inmediatas
              </p>
              <button 
                onClick={handleWhatsApp}
                className="btn-method btn-whatsapp"
                disabled={!WHATSAPP_NUMBER}
              >
                <span className="btn-content">
                  <span className="btn-icon">📱</span>
                  <span className="btn-text">
                    {WHATSAPP_NUMBER ? 'Abrir WhatsApp' : 'Próximamente'}
                  </span>
                </span>
              </button>
            </div>

            <div className="method-card">
              <div className="method-icon-wrapper email-icon">
                <span className="method-icon">📧</span>
              </div>
              <h3 className="method-title">Email</h3>
              <p className="method-description">
                Completa el formulario y te responderemos en menos de 24 horas
              </p>
              <div className="method-info">
                <span className="info-label">Nuestro email:</span>
                <a href="mailto:equipo.soporte.anima@gmail.com" className="info-link">
                  equipo.soporte.anima@gmail.com
                </a>
              </div>
            </div>

            <div className="method-card">
              <div className="method-icon-wrapper info-icon">
                <span className="method-icon">ℹ️</span>
              </div>
              <h3 className="method-title">Centro de Ayuda</h3>
              <p className="method-description">
                Encuentra respuestas rápidas en nuestras preguntas frecuentes
              </p>
              <button className="btn-method btn-secondary">
                <span className="btn-content">
                  <span className="btn-text">Ver FAQ</span>
                  <span className="btn-icon">→</span>
                </span>
              </button>
            </div>
          </div>

          {/* Columna derecha - Formulario */}
          <div className="contact-form-container">
            <div className="form-card">
              <h3 className="form-title">Envíanos un mensaje</h3>
              <p className="form-subtitle">
                Completa el formulario y nos pondremos en contacto contigo
              </p>

              {success && (
                <div className="alert alert-success">
                  <span className="alert-icon">✅</span>
                  <span>¡Mensaje enviado exitosamente! Te responderemos pronto.</span>
                </div>
              )}

              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">❌</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject" className="form-label">
                    Asunto *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="¿En qué podemos ayudarte?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message" className="form-label">
                    Mensaje *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="6"
                    className="form-textarea"
                    placeholder="Cuéntanos más sobre tu consulta..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-submit"
                >
                  <span className="btn-content">
                    {loading ? (
                      <>
                        <span className="spinner-small"></span>
                        <span className="btn-text">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <span className="btn-text">Enviar Mensaje</span>
                        <span className="btn-icon">✉️</span>
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="contact-footer">
        <div className="footer-content">
          <p className="footer-text">
            © 2025 Ánima. Música que refleja tu alma.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;