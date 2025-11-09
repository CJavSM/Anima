import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { authService } from '../../services/authService';
import SharedNavbar from '../Shared/SharedNavbar';
import historyService from '../../services/historyService';
import emotionService from '../../services/emotionService';
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Componentes de íconos SVG
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Componente confiable para emociones que combina emoji + SVG como fallback
const EmotionIcon = ({ emotion, size = "1.5rem" }) => {
  const emotionMap = {
    'HAPPY': { emoji: '😊', color: '#10B981' },
    'SAD': { emoji: '😢', color: '#3B82F6' },
    'ANGRY': { emoji: '😠', color: '#EF4444' },
    'CONFUSED': { emoji: '😕', color: '#F59E0B' },
    'DISGUSTED': { emoji: '🤢', color: '#8B5CF6' },
    'SURPRISED': { emoji: '😮', color: '#EC4899' },
    'CALM': { emoji: '😌', color: '#14B8A6' },
    'FEAR': { emoji: '😨', color: '#6366F1' }
  };

  const emotionData = emotionMap[emotion] || { emoji: '😐', color: '#6B7280' };
  
  return (
    <span 
      style={{ 
        fontSize: size,
        color: emotionData.color,
        fontFamily: 'Arial, sans-serif',
        display: 'inline-block',
        lineHeight: 1
      }}
      role="img"
      aria-label={emotion}
    >
      {emotionData.emoji}
    </span>
  );
};

const MusicIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18V5L21 3V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BarChartIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="20" x2="12" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="18" y1="20" x2="18" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="6" y1="20" x2="6" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Calendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Clock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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

  // Formatear fecha para el gráfico (parsea como fecha local para evitar desplazamientos de zona horaria)
  const formatDateShort = (dateStr) => {
    if (!dateStr) return '—';
    // Extraer la parte de fecha antes de la "T" para formatos ISO y evitar que Date interprete como UTC
    const datePart = String(dateStr).split('T')[0];
    const parts = datePart.split('-');
    let dt;
    if (parts.length === 3 && parts[0].length === 4) {
      // Construir fecha local usando year, monthIndex, day para evitar shift por zona horaria
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      dt = new Date(year, month, day);
    } else {
      // Fallback para otros formatos
      dt = new Date(dateStr);
    }
    if (isNaN(dt)) return '—';
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dt.getDay()];
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
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  })();

  // Nueva gráfica: Evolución del Estado de Ánimo Semanal
  const emotionalTrendData = (() => {
    if (!stats || !stats.sentiment_by_day) return null;
    const sortedDays = [...stats.sentiment_by_day].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedDays.map(day => formatDateShort(day.date));
    const positiveData = sortedDays.map(day => day.positive);
    const negativeData = sortedDays.map(day => day.negative);
    const wellnessIndex = sortedDays.map(day => {
      const total = day.positive + day.negative;
      return total > 0 ? Math.round((day.positive / total) * 100) : 50;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Emociones Positivas',
          data: positiveData,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#10B981',
          pointBorderWidth: 2,
        },
        {
          label: 'Emociones Negativas', 
          data: negativeData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#EF4444',
          pointBorderWidth: 2,
        },
        {
          label: 'Índice de Bienestar (%)',
          data: wellnessIndex,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#8B5CF6',
          pointBorderWidth: 2,
          yAxisID: 'y1',
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
          backgroundColor: ['#10B981', '#EF4444'],
          hoverBackgroundColor: ['#34D399', '#F87171'],
          borderWidth: 0,
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
          borderWidth: 0,
        },
      ],
    };
  })();

  return (
    
    <div className="dashboard">
      {/* Fondo animado estilo Landing */}
      <div className="page-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      <SharedNavbar />

      <div className="dashboard-content">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div className="badge-modern floating">
              <span className="badge-icon"><BarChartIcon /></span>
              <span>Dashboard Inteligente</span>
            </div>
            <h1 className="page-title-hero">
              Panel de <span className="gradient-text">Control</span>
            </h1>
            <p className="page-subtitle-hero">
              Análisis completo de tu actividad emocional
            </p>
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
                  <div className="stat-icon">
                    <CameraIcon />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Análisis realizados</div>
                    <div className="stat-value">{stats?.total_analyses ?? '—'}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <MusicIcon />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Playlists guardadas</div>
                    <div className="stat-value">{stats?.total_saved_playlists ?? '—'}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <TrendingUpIcon />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Emoción más común</div>
                    <div className="stat-value">
                      {stats?.most_common_emotion 
                        ? (
                          <>
                            {' ' + translateEmotion(stats.most_common_emotion)}
                          </>
                        )
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de la Semana - MOVIDO ANTES DE LAS GRÁFICAS */}
              {stats && stats.daily_analyses && Object.keys(stats.daily_analyses).length > 0 && (
                <div className="weekly-summary-section">
                  <h3 className="section-title">
                    <BarChartIcon />
                    Resumen de la Última Semana
                  </h3>
                  <div className="weekly-stats-grid">
                    <div className="weekly-stat-card">
                      <div className="weekly-stat-icon"><CameraIcon /></div>
                      <div className="weekly-stat-content">
                        <div className="weekly-stat-label">Análisis esta semana</div>
                        <div className="weekly-stat-value">
                          {Object.values(stats.daily_analyses).reduce((sum, count) => sum + count, 0)}
                        </div>
                      </div>
                    </div>

                    <div className="weekly-stat-card">
                      <div className="weekly-stat-icon"><TrendingUpIcon /></div>
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
                            const maxDay = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));

                            // Parse date string reliably (handles "YYYY-MM-DD", "YYYY-MM-DDTHH:MM:SSZ", timestamps, etc.)
                            const getDayNameFromDateStr = (dateStr) => {
                              if (!dateStr) return '—';
                              // Try to extract the date part before any time designator
                              const datePart = String(dateStr).split('T')[0];
                              const parts = datePart.split('-');
                              let dt;
                              if (parts.length === 3) {
                                const year = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10) - 1;
                                const day = parseInt(parts[2], 10);
                                // Use new Date(year, monthIndex, day) to create a local date (avoids timezone shift)
                                dt = new Date(year, month, day);
                              } else {
                                // Fallback to Date constructor for other formats
                                dt = new Date(dateStr);
                              }
                              if (isNaN(dt)) return '—';
                              const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                              return days[dt.getDay()];
                            };

                            return getDayNameFromDateStr(maxDay[0]);
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

              {/* Grid de Gráficas */}
              <div className="charts-grid">
                {/* Evolución del Estado de Ánimo Semanal */}
                {emotionalTrendData && chartsMounted && (
                  <div className="chart-card full-width">
                    <h3 className="section-title">
                      <TrendingUpIcon />
                      Evolución del Estado de Ánimo Semanal - Ánima
                    </h3>
                    <div className="chart-container">
                      <Line
                        data={emotionalTrendData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: {
                            mode: 'index',
                            intersect: false,
                          },
                          plugins: {
                            title: {
                              display: true,
                              text: 'Análisis de Bienestar Emocional por Día'
                            },
                            legend: {
                              position: 'top',
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  if (context.dataset.label === 'Índice de Bienestar (%)') {
                                    return `${context.dataset.label}: ${context.parsed.y}%`;
                                  }
                                  return `${context.dataset.label}: ${context.parsed.y} emociones`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              display: true,
                              title: {
                                display: true,
                                text: 'Días de la Semana'
                              },
                              grid: {
                                display: false
                              }
                            },
                            y: {
                              type: 'linear',
                              display: true,
                              position: 'left',
                              title: {
                                display: true,
                                text: 'Cantidad de Emociones'
                              },
                              beginAtZero: true,
                              grid: {
                                color: 'rgba(156, 163, 175, 0.2)'
                              }
                            },
                            y1: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              title: {
                                display: true,
                                text: 'Índice de Bienestar (%)'
                              },
                              min: 0,
                              max: 100,
                              grid: {
                                drawOnChartArea: false,
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Distribución de Emociones Total */}
                {stats && stats.emotions_breakdown && Object.keys(stats.emotions_breakdown).length > 0 && (
                  <div className="chart-card full-width">
                    <h3 className="section-title">
                      <BarChartIcon />
                      Distribución de Emociones (Total Histórico)
                    </h3>
                    <div className="emotions-distribution-chart">
                      {Object.entries(stats.emotions_breakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([emotion, count]) => {
                          const percentage = stats.total_analyses > 0 
                            ? ((count / stats.total_analyses) * 100).toFixed(1) 
                            : 0;
                          
                          return (
                            <div key={emotion} className="emotion-distribution-item">
                              <div className="emotion-distribution-label">
                                <span className="emotion-distribution-emoji">
                                  <EmotionIcon emotion={emotion} size="1.5rem" />
                                </span>
                                <span className="emotion-distribution-name">{translateEmotion(emotion)}</span>
                                <span className="emotion-distribution-count">{count} veces</span>
                              </div>
                              <div className="emotion-distribution-bar-container">
                                <div 
                                  className="emotion-distribution-bar"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: getEmotionColor(emotion)
                                  }}
                                >
                                  <span className="emotion-distribution-percentage">{percentage}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Actividad Diaria */}
                {dailyChartData && chartsMounted && (
                  <div className="chart-card">
                    <h3 className="section-title">
                      <Calendar />
                      Actividad Diaria (Última Semana)
                    </h3>
                    <div className="chart-container">
                      <Bar
                        data={dailyChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            title: { display: false },
                          },
                          scales: {
                            y: { 
                              beginAtZero: true, 
                              ticks: { stepSize: 1 },
                              grid: { color: 'rgba(156, 163, 175, 0.2)' }
                            },
                            x: {
                              grid: { display: false }
                            }
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Sentimiento General */}
                {sentimentChartData && chartsMounted && (
                  <div className="chart-card">
                    <h3 className="section-title">
                      <TrendingUpIcon />
                      Sentimiento General
                    </h3>
                    <div className="chart-container">
                      <Doughnut
                        data={sentimentChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { 
                            legend: { position: 'bottom' }
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Emociones Semanales */}
                {weeklyEmotionsChartData && chartsMounted && (
                  <div className="chart-card">
                    <h3 className="section-title">
                      <Calendar />
                      Emociones de la Semana
                    </h3>
                    <div className="chart-container">
                      <Doughnut
                        data={weeklyEmotionsChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { 
                            legend: { position: 'bottom' }
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actividad Reciente - MOVIDO ANTES DE LAS GRÁFICAS */}
              <div className="recent-activity-section">
                <h3 className="section-title">
                  <Clock />
                  Actividad Reciente
                </h3>
                {recent && recent.length > 0 ? (
                  <div className="activity-list">
                    {recent.map((r) => (
                      <div key={r.analysis_id} className="activity-item">
                        <div className="activity-icon" style={{ backgroundColor: getEmotionColor(r.dominant_emotion) }}>
                          <EmotionIcon emotion={r.dominant_emotion} size="1.25rem" />
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
                  <CameraIcon /> Nuevo Análisis
                </button>
                <button onClick={() => navigate('/history')} className="action-button secondary">
                  📚 Ver Historial Completo
                </button>
                <button onClick={() => navigate('/playlists')} className="action-button secondary">
                  <MusicIcon /> Mis Playlists
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