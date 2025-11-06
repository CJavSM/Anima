/**
 * Archivo: client/src/components/Shared/SharedNavbar.jsx
 * Componente de navegación compartido entre páginas
 */
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './SharedNavbar.css';

const SharedNavbar = () => {
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
          <h1 
            className="navbar-brand" 
            onClick={() => navigate('/home')}
            style={{ cursor: 'pointer' }}
          >
            Ánima
          </h1>
          
          <div className="navbar-menu">
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
          </div>
          
          <div className="navbar-user">
            <span className="navbar-username">
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