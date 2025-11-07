import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);

  // Efecto parallax suave
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setShowFloatingBtn(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: '🎭',
      title: 'Análisis de Emociones',
      description: 'Tecnología de IA que detecta tu estado emocional a través de tu expresión facial',
      stat: '99.9%',
      statLabel: 'Precisión'
    },
    {
      icon: '🎵',
      title: 'Recomendaciones Personalizadas',
      description: 'Playlists de Spotify adaptadas perfectamente a tu estado de ánimo',
      stat: '10M+',
      statLabel: 'Canciones'
    },
    {
      icon: '📊',
      title: 'Historial Completo',
      description: 'Revisa tus análisis anteriores y descubre patrones en tus emociones',
      stat: '24/7',
      statLabel: 'Disponible'
    },
    {
      icon: '⭐',
      title: 'Guarda tus Favoritos',
      description: 'Crea tu colección de playlists para cada momento',
      stat: '∞',
      statLabel: 'Playlists'
    }
  ];

  const testimonials = [
    {
      name: 'María González',
      role: 'Estudiante',
      text: 'Ánima cambió mi forma de escuchar música. Cada playlist es perfecta para mi estado de ánimo.',
      rating: 5,
      emoji: '🎓'
    },
    {
      name: 'Carlos Ramírez',
      role: 'Profesional',
      text: 'Increíble cómo la IA entiende exactamente lo que necesito escuchar. ¡Impresionante!',
      rating: 5,
      emoji: '💼'
    },
    {
      name: 'Ana Martínez',
      role: 'Artista',
      text: 'La mejor app para descubrir música nueva. Las recomendaciones son siempre acertadas.',
      rating: 5,
      emoji: '🎨'
    }
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      {/* Botón flotante de contacto */}
      <button 
        className={`floating-contact-btn ${showFloatingBtn ? 'visible' : ''}`}
        onClick={() => navigate('/contact')}
        title="Contáctanos"
      >
        <span className="floating-btn-icon">💬</span>
      </button>

      {/* Hero Section con efecto parallax */}
      <div className="hero-section" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
        <div className="hero-content">
          <div className="hero-badge pulse-animation">
            <span className="badge-icon">✨</span>
            <span className="badge-text">Powered by AI & Spotify</span>
          </div>
          
          <h1 className="hero-title">
            Ánima
          </h1>
          
          <h2 className="hero-subtitle">
            La música que refleja tu alma
          </h2>
          
          <p className="hero-description">
            Captura tu emoción y deja que la inteligencia artificial encuentre 
            la banda sonora perfecta para tu momento. Música personalizada 
            basada en cómo te sientes.
          </p>
          
          <div className="hero-cta">
            <button 
              className="btn-oneui btn-primary-oneui"
              onClick={() => navigate('/register')}
            >
              <span className="btn-content">
                <span className="btn-icon">🚀</span>
                <span className="btn-text">Comenzar Gratis</span>
              </span>
            </button>
            
            <button 
              className="btn-oneui btn-secondary-oneui"
              onClick={() => navigate('/login')}
            >
              <span className="btn-content">
                <span className="btn-text">Iniciar Sesión</span>
              </span>
            </button>
          </div>

          {/* Contador de usuarios (animado) */}
          <div className="stats-badges">
            <div className="stat-badge">
              <span className="stat-number">1000+</span>
              <span className="stat-label">Usuarios Activos</span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Análisis Realizados</span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">4.9★</span>
              <span className="stat-label">Valoración</span>
            </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="emotion-cards">
            <div className="emotion-card card-1">
              <span className="emotion-emoji">😊</span>
              <span className="emotion-label">Feliz</span>
            </div>
            <div className="emotion-card card-2">
              <span className="emotion-emoji">😌</span>
              <span className="emotion-label">Tranquilo</span>
            </div>
            <div className="emotion-card card-3">
              <span className="emotion-emoji">😢</span>
              <span className="emotion-label">Triste</span>
            </div>
            <div className="emotion-card card-4">
              <span className="emotion-emoji">😮</span>
              <span className="emotion-label">Sorprendido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="features-header">
          <h3 className="section-title">¿Cómo funciona?</h3>
          <p className="section-subtitle">
            Tres simples pasos para descubrir tu música perfecta
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card-modern hover-lift">
              <div className="feature-icon-wrapper">
                <span className="feature-icon-large">{feature.icon}</span>
              </div>
              <h4 className="feature-title-modern">{feature.title}</h4>
              <p className="feature-description-modern">{feature.description}</p>
              <div className="feature-stat">
                <span className="stat-big">{feature.stat}</span>
                <span className="stat-label-small">{feature.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="testimonials-section">
        <h3 className="section-title">Lo que dicen nuestros usuarios</h3>
        <div className="testimonial-carousel">
          <div className="testimonial-card active">
            <div className="testimonial-emoji">{testimonials[currentTestimonial].emoji}</div>
            <div className="testimonial-stars">
              {'⭐'.repeat(testimonials[currentTestimonial].rating)}
            </div>
            <p className="testimonial-text">"{testimonials[currentTestimonial].text}"</p>
            <div className="testimonial-author">
              <span className="author-name">{testimonials[currentTestimonial].name}</span>
              <span className="author-role">{testimonials[currentTestimonial].role}</span>
            </div>
          </div>
          <div className="carousel-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentTestimonial ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="steps-section">
        <h3 className="section-title">Empieza en segundos</h3>
        
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4 className="step-title">Captura tu momento</h4>
              <p className="step-description">
                Toma una selfie o sube una foto que refleje cómo te sientes
              </p>
            </div>
          </div>
          
          <div className="step-divider"></div>
          
          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4 className="step-title">Análisis instantáneo</h4>
              <p className="step-description">
                Nuestra IA analiza tu expresión y detecta tu emoción dominante
              </p>
            </div>
          </div>
          
          <div className="step-divider"></div>
          
          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4 className="step-title">Disfruta tu música</h4>
              <p className="step-description">
                Recibe recomendaciones personalizadas de Spotify al instante
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-content hover-lift">
          <h3 className="cta-title">¿Listo para empezar?</h3>
          <p className="cta-description">
            Únete a miles de usuarios que ya descubrieron su música perfecta
          </p>
          
          <button 
            className="btn-oneui btn-cta-oneui"
            onClick={() => navigate('/register')}
          >
            <span className="btn-content">
              <span className="btn-text">Crear Cuenta Gratis</span>
              <span className="btn-icon">→</span>
            </span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h4 className="footer-logo">Ánima</h4>
            <p className="footer-tagline">Música que refleja tu alma</p>
          </div>
          
          <div className="footer-links">
            <button onClick={() => navigate('/contact')} className="footer-link">
              Contacto
            </button>
          </div>
          
          <div className="footer-info">
            <p className="footer-text">
              © 2025 Ánima. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;