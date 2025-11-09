import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import Logo from '../Shared/Logo';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Detectar scroll para navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Seguir mouse para efectos parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      emoji: "📸",
      title: "Análisis de Emoción",
      description: "Capturá tu expresión tomándote una fotografía y descubrí qué emoción estás sintiendo en el momento",
      color: "#4424d4"
    },
    {
      emoji: "🎵",
      title: "Música Personalizada",
      description: "Recibí recomendaciones de Spotify que se adaptan perfectamente a tu estado de ánimo",
      color: "#764ba2"
    },
    {
      emoji: "💾",
      title: "Guardá tus Playlists",
      description: "Creá y guardá tus playlists favoritas para escucharlas cuando quieras",
      color: "#C98DFF"
    },
    {
      emoji: "📊",
      title: "Seguimiento Emocional",
      description: "Visualizá tu historial emocional y descubrí patrones en tu estado de ánimo",
      color: "#A355FF"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Usuario frecuente",
      text: "¡Increíble! Nunca pensé que una app pudiera entender tan bien cómo me siento",
      avatar: "M",
      rating: 5
    },
    {
      name: "Carlos Pérez",
      role: "Amante de la música",
      text: "Las recomendaciones son perfectas. Es como tener un DJ personal que lee mi mente",
      avatar: "C",
      rating: 5
    },
    {
      name: "Ana Rodríguez",
      role: "Psicóloga",
      text: "Una herramienta fascinante para conectar emociones con música. Mis pacientes la aman",
      avatar: "A",
      rating: 5
    }
  ];

  return (
    <div className="landing-page">
      {/* Navbar mejorada de ContactPage */}
      <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-brand" onClick={() => navigate('/')}>
            <Logo width={48} height={48} className="brand-logo" title="Ánima" />
            <span className="brand-text">Ánima</span>
          </div>

          <button className="navbar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? '✕' : '☰'}
          </button>

          <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
            <a href="#features" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Características
            </a>
            <a href="#how-it-works" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Cómo Funciona
            </a>
            <a href="#testimonials" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Testimonios
            </a>
            <button onClick={() => navigate('/contact')} className="nav-link-button contact-btn">
              Contacto
            </button>
            <button onClick={() => navigate('/login')} className="nav-link-button">
              Iniciar Sesión
            </button>
            <button onClick={() => navigate('/register')} className="nav-link-button primary">
              Registrarse
            </button>
          </div>
        </div>
      </nav>

      {/* Fondo animado con parallax */}
      <div className="animated-background">
        <div 
          className="gradient-orb orb-1"
          style={{
            transform: `translate(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px)`
          }}
        />
        <div 
          className="gradient-orb orb-2"
          style={{
            transform: `translate(${-mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px)`
          }}
        />
        <div 
          className="gradient-orb orb-3"
          style={{
            transform: `translate(${mousePosition.x * 0.04}px, ${-mousePosition.y * 0.04}px)`
          }}
        />
      </div>

      {/* Hero Section Mejorado */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge floating">
            <span className="badge-emoji">✨</span>
            <span>Powered by AWS Rekognition & Spotify</span>
          </div>
          
          <h1 className="hero-title">
            Música que refleja <span className="gradient-text">cómo te sentís</span>
          </h1>
          
          <p className="hero-subtitle">
            Descubrí el poder de la inteligencia artificial que analiza tus emociones
            y crea la banda sonora perfecta para tu momento
          </p>

          <div className="hero-stats">
            <div className="stat-item floating" style={{animationDelay: '0s'}}>
              <div className="stat-number">+1000</div>
              <div className="stat-label">Análisis realizados</div>
            </div>
            <div className="stat-item floating" style={{animationDelay: '0.2s'}}>
              <div className="stat-number">8</div>
              <div className="stat-label">Emociones detectadas</div>
            </div>
            <div className="stat-item floating" style={{animationDelay: '0.4s'}}>
              <div className="stat-number">∞</div>
              <div className="stat-label">Playlists únicas</div>
            </div>
          </div>

          {/* Emotions preview interactivo */}
          <div className="emotions-preview">
            {['😊', '😢', '😠', '😌', '😮', '😨'].map((emoji, index) => (
              <div
                key={index}
                className="emotion-bubble floating"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationDuration: `${3 + index * 0.5}s`
                }}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section INTERACTIVA */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">
              ¿Qué hace a <span className="gradient-text">Ánima</span> especial?
            </h2>
            <p className="section-subtitle">
              Combinamos tecnología de vanguardia con diseño intuitivo para crear experiencias únicas
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-card interactive ${activeFeature === index ? 'active' : ''}`}
                onMouseEnter={() => setActiveFeature(index)}
                onMouseLeave={() => setActiveFeature(null)}
                style={{
                  '--feature-color': feature.color,
                  animationDelay: `${index * 0.15}s`
                }}
              >
                <div className="feature-icon-wrapper">
                  <span className="feature-emoji">{feature.emoji}</span>
                  <div className="icon-pulse"></div>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-hover-effect"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* How it works - Animado */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">
              ¿Cómo funciona <span className="gradient-text">Ánima</span>?
            </h2>
            <p className="section-subtitle">
              Tres simples pasos para descubrir tu música perfecta
            </p>
          </div>

          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">📸</div>
              <h3>Capturá tu emoción</h3>
              <p>Tomá una selfie o subí una foto. Nuestra IA analiza tu expresión facial</p>
            </div>

            <div className="step-connector">
              <div className="connector-line"></div>
              <div className="connector-dot"></div>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">🤖</div>
              <h3>Análisis inteligente</h3>
              <p>AWS Rekognition detecta tu emoción con precisión</p>
            </div>

            <div className="step-connector">
              <div className="connector-line"></div>
              <div className="connector-dot"></div>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">🎵</div>
              <h3>Disfrutá la música</h3>
              <p>Recibí una playlist personalizada de Spotify que refleja tu estado de ánimo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">
              Lo que dicen nuestros <span className="gradient-text">usuarios</span>
            </h2>
            <p className="section-subtitle">
              Miles de personas ya usan Ánima para descubrir nueva música
            </p>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="testimonial-card floating"
                style={{animationDelay: `${index * 0.15}s`}}
              >
                <div className="testimonial-header">
                  <div className="testimonial-avatar">
                    {testimonial.avatar}
                  </div>
                  <div className="testimonial-info">
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.role}</p>
                  </div>
                  <div className="testimonial-rating">
                    {'⭐'.repeat(testimonial.rating)}
                  </div>
                </div>
                <p className="testimonial-text">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="final-cta-section">
        <div className="cta-content">
          <h2 className="cta-title">
            ¿Listo para descubrir tu música perfecta?
          </h2>
          <p className="cta-subtitle">
            Únete a miles de usuarios que ya disfrutan de Ánima
          </p>
          <div className="cta-buttons">
            <button 
              className="cta-button primary large pulse"
              onClick={() => navigate('/register')}
            >
              <span>Comenzar Ahora</span>
            </button>
            <button 
              className="cta-button secondary large"
              onClick={() => navigate('/contact')}
            >
              ¿Tienes preguntas? Contáctanos
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>Ánima</h3>
            <p>Música que refleja cómo te sentís</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Soporte</h4>
              <a href="/contact">Contacto</a>
              <a href="https://wa.me/50212345678" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#privacy">Privacidad</a>
              <a href="#terms">Términos</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Ánima. Todos los derechos reservados.</p>
          <p>Powered by AWS Rekognition & Spotify API</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;