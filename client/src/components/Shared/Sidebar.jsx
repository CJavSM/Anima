import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, menuItems = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeItem, setActiveItem] = useState('');

  useEffect(() => {
    setActiveItem(location.pathname);
  }, [location.pathname]);

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  // Menú por defecto para páginas públicas
  const defaultPublicItems = [
    { path: '/', label: 'Inicio', icon: '🏠' },
    { path: '/contact', label: 'Contacto', icon: '💬' },
    { path: '/login', label: 'Iniciar Sesión', icon: '🔐' },
    { path: '/register', label: 'Registrarse', icon: '✨' }
  ];

  // Menú por defecto para páginas privadas
  const defaultPrivateItems = [
    { path: '/home', label: 'Inicio', icon: '🏠' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/profile', label: 'Perfil', icon: '👤' },
    { path: '/history', label: 'Historial', icon: '📈' },
    { path: '/playlists', label: 'Playlists', icon: '🎵' }
  ];

  const items = menuItems.length > 0 
    ? menuItems 
    : (user ? defaultPrivateItems : defaultPublicItems);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => handleNavigation('/')}>
            <Logo width={40} height={40} title="Ánima" />
            <span className="sidebar-brand-text">Ánima</span>
          </div>
          <button className="sidebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* User Info (solo si está logueado) */}
        {user && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {user.first_name?.[0] || user.username?.[0] || '👤'}
            </div>
            <div className="user-info">
              <div className="user-name">
                {user.first_name || user.username}
              </div>
              <div className="user-email">
                {user.email}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.path}
              className={`sidebar-nav-item ${activeItem === item.path ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {user ? (
            <button className="sidebar-logout" onClick={handleLogout}>
              <span className="nav-icon">🚪</span>
              <span className="nav-label">Cerrar Sesión</span>
            </button>
          ) : (
            <div className="sidebar-cta">
              <p className="cta-text">¿Listo para descubrir tu música perfecta?</p>
              <button 
                className="cta-button"
                onClick={() => handleNavigation('/register')}
              >
                Comenzar Ahora
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;