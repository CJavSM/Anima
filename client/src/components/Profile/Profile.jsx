import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { authService } from '../../services/authService';
import SharedNavbar from '../Shared/SharedNavbar';
import { useState } from 'react';
import usePrivateSidebar from '../../hooks/usePrivateSidebar';
import PrivateSidebar from '../Shared/Sidebar';

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const { isOpen: sidebarOpen, openSidebar, closeSidebar, toggleSidebar } = usePrivateSidebar();

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
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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
    setErrors(null);
    setSuccessMessage('');
    const updated = { ...user, ...form };

    // Validación en cliente para username (evitar espacios y caracteres inválidos)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (form.username && !usernameRegex.test(form.username)) {
      setErrors('El nombre de usuario sólo puede contener letras, números, guiones y guiones bajos, sin espacios, y debe tener entre 3 y 50 caracteres.');
      return;
    }

    setSaving(true);
    try {
      if (typeof authService.updateProfile === 'function') {
        const resp = await authService.updateProfile(form);
        const userResp = resp || updated;
        if (typeof setUser === 'function') setUser(userResp);
        setEditing(false);
        setSuccessMessage('Perfil guardado correctamente.');
        return;
      }

      // Fallback local
      setUser(updated);
      setEditing(false);
      setSuccessMessage('Perfil actualizado localmente.');
    } catch (e) {
      console.error('Error guardando perfil', e);
      // Extraer mensaje útil
      let msg = 'No se pudo guardar el perfil';
      if (e?.message) msg = e.message;
      if (e?.response?.data?.detail) msg = e.response.data.detail;
      if (Array.isArray(e?.response?.data)) {
        msg = e.response.data.map(it => it.msg || it.message || JSON.stringify(it)).join('; ');
      }
      setErrors(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
       <SharedNavbar onToggleSidebar={toggleSidebar} />
        <PrivateSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="profile-content">
        <div className="profile-card">
          <h3 className="profile-title">Tu Perfil</h3>

          {successMessage && (
            <div className="form-success" role="status">{successMessage}</div>
          )}

          {errors && (
            <div className="form-error" role="alert">
              {typeof errors === 'string' ? (
                <p>{errors}</p>
              ) : (
                <ul>
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="profile-header">
            <div className="avatar-wrapper">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar-initials">{initials}</div>
              )}
            </div>
            <div className="header-info">
              {!editing ? (
                <>
                  <h4 className="header-name">{user?.first_name} {user?.last_name}</h4>
                  <p className="header-email">{user?.email}</p>
                  <p className="header-username">@{user?.username}</p>
                </>
              ) : (
                <div className="edit-fields">
                  <label className="input-label">Usuario</label>
                  <input name="username" value={form.username} onChange={handleChange} className="input-field" />

                  <label className="input-label">Nombre</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange} className="input-field" />

                  <label className="input-label">Apellido</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange} className="input-field" />

                  <label className="input-label">Email</label>
                  <input name="email" value={form.email} onChange={handleChange} className="input-field" />
                </div>
              )}
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
                <button onClick={handleSave} className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => { setEditing(false); setForm({ username: user?.username||'', first_name: user?.first_name||'', last_name: user?.last_name||'', email: user?.email||'' }); setErrors(null); setSuccessMessage(''); }} className="btn btn-secondary">Cancelar</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
