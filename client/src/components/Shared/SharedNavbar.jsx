/**
 * Archivo: client/src/components/Shared/SharedNavbar.jsx
 * Componente de navegación compartido entre páginas
 */
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './SharedNavbar.css';
import Logo from './Logo';


// Agregar al inicio del componente (después de las declaraciones de hooks)
const SharedNavbar = ({ onToggleSidebar }) => {  // Agregar esta prop
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          {/* Agregar botón hamburguesa ANTES del brand */}
          <button 
            className="navbar-toggle mobile-only"
            onClick={onToggleSidebar}
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <div
            className="navbar-brand"
            onClick={() => navigate('/home')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Logo width={40} height={40} className="navbar-logo" title="Ánima" />
            <span className="brand-text">Ánima</span>
          </div>
          
          {/* Agregar clase desktop-only a navbar-menu */}
          <div className="navbar-menu desktop-only">
            <button 
              onClick={() => navigate('/home')} 
              className={`nav-link ${isActive('/home')}`}
            >
              📸 Analizar
            </button>
            <button 
              onClick={() => navigate('/history')} 
              className={`nav-link ${isActive('/history')}`}
            >
              📊 Historial
            </button>
            <button 
              onClick={() => navigate('/playlists')} 
              className={`nav-link ${isActive('/playlists')}`}
            >
              🎵 Playlists
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className={`nav-link ${isActive('/dashboard')}`}
            >
              🏠 Dashboard
            </button>
            <button
              onClick={() => navigate('/profile')}
              className={`nav-link ${isActive('/profile')}`}
            >
              👤 Perfil
            </button>
          </div>
          
          {/* Agregar clase desktop-only a navbar-user */}
          <div className="navbar-user desktop-only">
            <span
              className="navbar-username"
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer' }}
              title="Ver perfil"
            >
              <span>{user?.username || user?.first_name}</span>
            </span>
            <button onClick={handleLogout} className="btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SharedNavbar;