import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { authService } from '../../services/authService';
import SharedNavbar from '../Shared/SharedNavbar';
import historyService from '../../services/historyService';
import emotionService from '../../services/emotionService';
import { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';

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
  const [chartsMounted, setChartsMounted] = useState(false);

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

    // Delay chart rendering until after first mount to avoid Chart.js strict-mode double-mount issues
    setChartsMounted(true);

    return () => {
      mounted = false;
      setChartsMounted(false);
    };
  }, []);

  const getEmotionEmoji = (emotion) => emotionService.getEmotionEmoji(emotion);
  const getEmotionColor = (emotion) => emotionService.getEmotionColor(emotion);
  const translateEmotion = (emotion) => emotionService.translateEmotion(emotion);

  const formatConfidence = (conf) => {
    const v = conf === null || conf === undefined ? 0 : parseFloat(conf);
    if (isNaN(v)) return '0%';
    // If backend returns percentage (e.g., 90.04) keep it; if returns 0-1 normalize
    if (v > 1) return `${v.toFixed(2)}%`;
    return `${(v * 100).toFixed(2)}%`;
  };

  // Formatear fecha para el gráfico
  const formatDateShort = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  // Preparar datos para gráficos cuando existan stats
  const dailyChartData = (() => {
    if (!stats || !stats.daily_analyses) return null;
    const entries = Object.entries(stats.daily_analyses).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const labels = entries.map(([date]) => formatDateShort(date));
    const data = entries.map(([, count]) => count);
    return {
      labels,
      datasets: [
        {
          label: 'Análisis por día',
          data,
          backgroundColor: labels.map(() => 'rgba(54, 162, 235, 0.8)'),
          borderColor: labels.map(() => 'rgba(54, 162, 235, 1)'),
          borderWidth: 1,
        },
      ],
    };
  })();

  const sentimentChartData = (() => {
    if (!stats) return null;
    const pos = stats.positive_count || 0;
    const neg = stats.negative_count || 0;
    if (pos === 0 && neg === 0) return null;
    return {
      labels: ['Positivas', 'Negativas'],
      datasets: [
        {
          data: [pos, neg],
          backgroundColor: ['#4CAF50', '#F44336'],
          hoverBackgroundColor: ['#66BB6A', '#E57373'],
        },
      ],
    };
  })();

  const weeklyEmotionsChartData = (() => {
    if (!stats || !stats.weekly_emotions) return null;
    const entries = Object.entries(stats.weekly_emotions).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    const labels = entries.map(([emotion]) => translateEmotion(emotion));
    const data = entries.map(([, count]) => count);
    const bg = entries.map(([emotion]) => getEmotionColor(emotion) || '#888');
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: bg,
        },
      ],
    };
  })();

  return (
    <div className="dashboard">
      <SharedNavbar />

      <div className="dashboard-content">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h2 className="dashboard-title">📊 Panel de Control</h2>
            <p className="dashboard-subtitle">Análisis completo de tu actividad emocional</p>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Cargando estadísticas…</p>
            </div>
          ) : error ? (
            <p className="alert alert-error">{error}</p>
          ) : (
            <>
              {/* Estadísticas Principales */}
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
                    <div className="stat-value">
                      {stats?.most_common_emotion 
                        ? `${getEmotionEmoji(stats.most_common_emotion)} ${translateEmotion(stats.most_common_emotion)}`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de la Semana */}
              {stats && stats.daily_analyses && Object.keys(stats.daily_analyses).length > 0 && (
                <div className="weekly-summary-section">
                  <h3 className="section-title">📊 Resumen de la Última Semana</h3>
                  <div className="weekly-stats-grid">
                    <div className="weekly-stat-card">
                      <div className="weekly-stat-icon">📸</div>
                      <div className="weekly-stat-content">
                        <div className="weekly-stat-label">Análisis esta semana</div>
                        <div className="weekly-stat-value">
                          {Object.values(stats.daily_analyses).reduce((sum, count) => sum + count, 0)}
                        </div>
                      </div>
                    </div>

                    <div className="weekly-stat-card">
                      <div className="weekly-stat-icon">📈</div>
                      <div className="weekly-stat-content">
                        <div className="weekly-stat-label">Promedio diario</div>
                        <div className="weekly-stat-value">
                          {(
                            Object.keys(stats.daily_analyses).length > 0
                              ? (Object.values(stats.daily_analyses).reduce((sum, count) => sum + count, 0) /
                                  Object.keys(stats.daily_analyses).length).toFixed(1)
                              : '0'
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="weekly-stat-card">
                      <div className="weekly-stat-icon">🔥</div>
                      <div className="weekly-stat-content">
                        <div className="weekly-stat-label">Día más activo</div>
                        <div className="weekly-stat-value">
                          {(() => {
                            const entries = Object.entries(stats.daily_analyses);
                            if (entries.length === 0) return '—';
                            const maxDay = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
                            return formatDateShort(maxDay[0]);
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="weekly-stat-card">
                      <div className="weekly-stat-icon">🎯</div>
                      <div className="weekly-stat-content">
                        <div className="weekly-stat-label">Emociones únicas</div>
                        <div className="weekly-stat-value">
                          {stats.weekly_emotions ? Object.keys(stats.weekly_emotions).length : 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actividad Diaria Total (Última Semana) - Chart.js */}
              {dailyChartData && chartsMounted && (
                <div className="daily-total-section">
                  <h3 className="section-title">📅 Actividad Diaria (Última Semana)</h3>
                  <div className="daily-total-chart">
                    <Bar
                      data={dailyChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: false },
                          title: { display: false },
                        },
                        scales: {
                          y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Emociones Positivas vs Negativas (Doughnut) */}
              {sentimentChartData && chartsMounted && (
                <div className="sentiment-section">
                  <h3 className="section-title">💭 Emociones Positivas vs Negativas (Total)</h3>
                  <div className="sentiment-chart-container">
                    <Doughnut
                      data={sentimentChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Análisis por Día - Positivas vs Negativas (Última Semana) */}
              {stats && stats.sentiment_by_day && stats.sentiment_by_day.length > 0 && (
                <div className="daily-analysis-section">
                  <h3 className="section-title">📊 Positivas vs Negativas por Día (Última Semana)</h3>
                  <div className="daily-chart">
                    {stats.sentiment_by_day.map((day, index) => {
                      const total = day.positive + day.negative;
                      const maxHeight = 150; // Altura máxima en px
                      const positiveHeight = total > 0 ? (day.positive / total) * maxHeight : 0;
                      const negativeHeight = total > 0 ? (day.negative / total) * maxHeight : 0;

                      return (
                        <div key={index} className="day-column">
                          <div className="day-bars">
                            <div 
                              className="day-bar positive-bar"
                              style={{ height: `${positiveHeight}px` }}
                              title={`${day.positive} positivas`}
                            >
                              {day.positive > 0 && <span className="bar-count">{day.positive}</span>}
                            </div>
                            <div 
                              className="day-bar negative-bar"
                              style={{ height: `${negativeHeight}px` }}
                              title={`${day.negative} negativas`}
                            >
                              {day.negative > 0 && <span className="bar-count">{day.negative}</span>}
                            </div>
                          </div>
                          <div className="day-label">{formatDateShort(day.date)}</div>
                          <div className="day-date">{new Date(day.date).getDate()}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-color positive"></div>
                      <span>Positivas</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color negative"></div>
                      <span>Negativas</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Emociones de la Semana (Doughnut) */}
              {weeklyEmotionsChartData && chartsMounted && (
                <div className="weekly-emotions-section">
                  <h3 className="section-title">📈 Emociones de la Semana</h3>
                  <div className="weekly-emotions-chart">
                    <Doughnut
                      data={weeklyEmotionsChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'right' } },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actividad Reciente */}
              <div className="recent-activity-section">
                <h3 className="section-title">🕒 Actividad Reciente</h3>
                {recent && recent.length > 0 ? (
                  <div className="activity-list">
                    {recent.map((r) => (
                      <div key={r.analysis_id} className="activity-item">
                        <div className="activity-icon" style={{ backgroundColor: getEmotionColor(r.dominant_emotion) }}>
                          {getEmotionEmoji(r.dominant_emotion)}
                        </div>
                        <div className="activity-info">
                          <div className="activity-emotion">{translateEmotion(r.dominant_emotion)}</div>
                          <div className="activity-date">
                            {new Date(r.analyzed_at).toLocaleString('es-GT', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="activity-confidence">
                          {formatConfidence(r.confidence)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No hay actividad reciente.</p>
                )}
              </div>

              {/* Acciones Rápidas */}
              <div className="quick-actions">
                <button onClick={() => navigate('/home')} className="action-button primary">
                  📸 Nuevo Análisis
                </button>
                <button onClick={() => navigate('/history')} className="action-button secondary">
                  📚 Ver Historial Completo
                </button>
                <button onClick={() => navigate('/playlists')} className="action-button secondary">
                  🎵 Mis Playlists
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;