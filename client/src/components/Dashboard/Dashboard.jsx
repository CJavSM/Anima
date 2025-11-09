import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { authService } from '../../services/authService';
import SharedNavbar from '../Shared/SharedNavbar';
import historyService from '../../services/historyService';
import { useEffect, useState } from 'react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const handleDisconnectSpotify = async () => {
    try {
      await authService.disconnectSpotify();
      alert('Spotify desvinculado correctamente.');
      // Forzar refresco de sesión
      window.location.reload();
    } catch (e) {
      console.error('Error desconectando Spotify', e);
      alert('No se pudo desvincular Spotify');
    }
  };
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      setLoading(true);
      try {
        const res = await historyService.getStats();
        if (res.success && mounted) {
          setStats(res.data);
          setRecent(res.data.recent_activity || []);
        }
      } catch (e) {
        console.error('Error cargando estadísticas:', e);
        if (mounted) setError('No se pudieron cargar las estadísticas');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="dashboard">
      <SharedNavbar />

      <div className="dashboard-content">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h2 className="dashboard-title">Panel de Control</h2>
            <p className="dashboard-subtitle">Resumen rápido de tu actividad</p>
          </div>

          {loading ? (
            <p>Cargando estadísticas…</p>
          ) : error ? (
            <p className="alert alert-error">{error}</p>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📸</div>
                  <div className="stat-content">
                    <div className="stat-label">Análisis realizados</div>
                    <div className="stat-value">{stats?.total_analyses ?? '—'}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🎵</div>
                  <div className="stat-content">
                    <div className="stat-label">Playlists guardadas</div>
                    <div className="stat-value">{stats?.total_saved_playlists ?? '—'}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-label">Emoción más común</div>
                    <div className="stat-value">{stats?.most_common_emotion ?? '—'}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20 }} className="features-grid">
                <div className="feature-card feature-card-purple">
                  <div className="feature-icon">📈</div>
                  <h4 className="feature-title">Desglose de emociones</h4>
                  <p className="feature-description">{stats?.emotions_breakdown ? 'Disponible' : 'Sin datos'}</p>
                </div>

                <div className="feature-card feature-card-blue">
                  <div className="feature-icon">�</div>
                  <h4 className="feature-title">Actividad reciente</h4>
                  <p className="feature-description">Últimos análisis realizados</p>
                </div>

                <div className="feature-card feature-card-green">
                  <div className="feature-icon">⚙️</div>
                  <h4 className="feature-title">Integraciones</h4>
                  <p className="feature-description">Conexión con Spotify: {user?.spotify_connected ? '✅' : '—'}</p>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <h3 style={{ marginBottom: 8 }}>Actividad reciente</h3>
                {recent && recent.length > 0 ? (
                  <ul>
                    {recent.map((r) => (
                      <li key={r.analysis_id}>
                        {new Date(r.analyzed_at).toLocaleString()} — {r.dominant_emotion} ({Math.round((r.confidence ?? 0) * 100)}%)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No hay actividad reciente.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;