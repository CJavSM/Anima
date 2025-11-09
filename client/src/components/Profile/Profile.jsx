import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { authService } from '../../services/authService';
import SharedNavbar from '../Shared/SharedNavbar';
import { useState } from 'react';

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [disconnecting, setDisconnecting] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

 

  const handleDisconnectSpotify = async () => {
    try {
      // Deshabilitar doble envío usando un flag local; actualizar contexto en lugar de recargar
      setDisconnecting(true);
      await authService.disconnectSpotify();
      // Obtener usuario actualizado del backend y actualizar el contexto/localStorage
      try {
        const refreshed = await authService.me();
        if (typeof setUser === 'function') setUser(refreshed);
      } catch (e) {
        // Si no podemos obtener el usuario, limpiar la sesión por seguridad
        console.warn('No se pudo refrescar usuario tras desconectar Spotify:', e);
      }
      alert('Spotify desvinculado correctamente.');
    } catch (e) {
      console.error('Error desconectando Spotify', e);
      alert('No se pudo desvincular Spotify');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnectSpotify = async () => {
    try {
      const url = await authService.getSpotifyLinkUrl();
      window.location.href = url;
    } catch (e) {
      console.error('Error obteniendo URL de enlace Spotify', e);
      alert('No se pudo iniciar el enlace con Spotify');
    }
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || ''
  });

  // Iniciales para avatar fallback
  const initials = (() => {
    try {
      if (user?.first_name) return (user.first_name[0] || '').toUpperCase();
      if (user?.username) return (user.username[0] || '').toUpperCase();
      return '';
    } catch { return ''; }
  })();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSave = async () => {
    // Nota: No existe endpoint PUT/PATCH para actualizar usuario en el cliente actualmente.
    // Guardamos los cambios localmente en el contexto para que la UI refleje la edición.
    const updated = { ...user, ...form };
    try {
      // Actualizar contexto y localStorage
      setUser(updated);
      setEditing(false);
      alert('Perfil actualizado localmente. Si deseas persistir cambios, implementa endpoint en el backend.');
    } catch (e) {
      console.error('Error guardando perfil localmente', e);
      alert('No se pudo guardar el perfil');
    }
  };

  return (
    <div className="profile-page">
      <SharedNavbar />

      <div className="profile-content">
        <div className="profile-card">
          <h3 className="profile-title">Tu Perfil</h3>

          <div className="profile-header">
            <div className="avatar-wrapper">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar-initials">{initials}</div>
              )}
            </div>
            <div className="header-info">
              <h4 className="header-name">{user?.first_name} {user?.last_name}</h4>
              <p className="header-email">{user?.email}</p>
              <p className="header-username">@{user?.username}</p>
            </div>
          </div>

          <div className="profile-grid">

            <div className="profile-field">
              <span className="profile-label">Estado</span>
              <p className="profile-value">
                <span className={`badge ${user?.is_verified ? 'badge-success' : 'badge-warning'}`}>
                  {user?.is_verified ? '✓ Verificado' : '⏳ Pendiente de verificación'}
                </span>
              </p>
            </div>

            <div className="profile-field">
              <span className="profile-label">Spotify</span>
              <p className="profile-value">
                {user?.spotify_connected ? (
                  <>
                    <span className="badge badge-success">Conectado</span>
                    <button
                      onClick={handleDisconnectSpotify}
                      className="btn btn-link"
                      style={{ marginLeft: 8 }}
                      disabled={disconnecting}
                    >
                      {disconnecting ? 'Desvinculando...' : 'Desvincular'}
                    </button>
                  </>
                ) : (
                  <button onClick={handleConnectSpotify} className="btn btn-secondary">
                    Conectar con Spotify
                  </button>
                )}
              </p>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn btn-primary">Editar perfil</button>
            ) : (
              <>
                <button onClick={handleSave} className="btn btn-primary">Guardar</button>
                <button onClick={() => { setEditing(false); setForm({ first_name: user?.first_name||'', last_name: user?.last_name||'', email: user?.email||'' }); }} className="btn btn-secondary">Cancelar</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
