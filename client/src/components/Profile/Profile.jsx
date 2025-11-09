import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { authService } from '../../services/authService';
import SharedNavbar from '../Shared/SharedNavbar';
import { useState } from 'react';

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

 

  const handleDisconnectSpotify = async () => {
    try {
      await authService.disconnectSpotify();
      alert('Spotify desvinculado correctamente.');
      window.location.reload();
    } catch (e) {
      console.error('Error desconectando Spotify', e);
      alert('No se pudo desvincular Spotify');
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
          <div className="profile-grid">
            <div className="profile-field">
              <span className="profile-label">Username</span>
              <p className="profile-value">{user?.username}</p>
            </div>

            <div className="profile-field">
              <span className="profile-label">Email</span>
              {!editing ? (
                <p className="profile-value">{user?.email}</p>
              ) : (
                <input name="email" value={form.email} onChange={handleChange} />
              )}
            </div>

            <div className="profile-field">
              <span className="profile-label">Nombre</span>
              {!editing ? (
                <p className="profile-value">{user?.first_name} {user?.last_name}</p>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Nombre" />
                  <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Apellido" />
                </div>
              )}
            </div>

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
                    <button onClick={handleDisconnectSpotify} className="btn btn-link" style={{ marginLeft: 8 }}>
                      Desvincular
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
