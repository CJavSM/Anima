import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SharedNavbar from '../Shared/SharedNavbar';
import historyService from '../../services/historyService';
import emotionService from '../../services/emotionService';
import './HistoryPage.css';
import usePrivateSidebar from '../../hooks/usePrivateSidebar';
import PrivateSidebar from '../Shared/Sidebar';

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

// Componentes de íconos SVG
const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MusicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18V5L21 3V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BarChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="20" x2="12" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="18" y1="20" x2="18" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="6" y1="20" x2="6" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOpen: sidebarOpen, openSidebar, closeSidebar, toggleSidebar } = usePrivateSidebar();
  
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros y paginación
  const [emotionFilter, setEmotionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    loadData();
  }, [emotionFilter, currentPage]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Cargar estadísticas
      const statsRes = await historyService.getStats();
      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // Cargar análisis
      const filters = {
        page: currentPage,
        page_size: pageSize,
        emotion: emotionFilter || undefined
      };

      const response = await historyService.getAnalyses(filters);

      if (response.success) {
        setAnalyses(response.data.items || []);
        setTotalPages(response.data.total_pages || 1);
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmotionEmoji = (emotion) => emotionService.getEmotionEmoji(emotion);
  const getEmotionColor = (emotion) => emotionService.getEmotionColor(emotion);
  const translateEmotion = (emotion) => emotionService.translateEmotion(emotion);

  return (
    <div className="history-page">
      {/* Fondo animado estilo Landing */}
      <div className="page-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
       <SharedNavbar onToggleSidebar={toggleSidebar} />
        <PrivateSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Contenido Principal */}
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div className="badge-modern floating">
            <span className="badge-icon">
              <BarChartIcon />
            </span>
            <span>Historial Completo</span>
          </div>
          <h1 className="page-title-hero">
            Mi Historial de <span className="gradient-text">Emociones</span>
          </h1>
          <p className="page-subtitle-hero">
            Revisa todos los análisis que has realizado
          </p>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <CameraIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total de Análisis</span>
                <span className="stat-value">{stats.total_analyses}</span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <MusicIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label">Playlists Guardadas</span>
                <span className="stat-value">{stats.total_saved_playlists}</span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <StarIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label">Favoritas</span>
                <span className="stat-value">{stats.favorite_playlists_count}</span>
              </div>
            </div>
            
            {stats.most_common_emotion && (
              <div className="stat-card">
                <div className="stat-icon emotion-icon">
                  <EmotionIcon emotion={stats.most_common_emotion} size="2rem" />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Emoción Más Común</span>
                  <span className="stat-value">{translateEmotion(stats.most_common_emotion)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="filters-section">
          <div className="filters-row">
            <select
              value={emotionFilter}
              onChange={(e) => {
                setEmotionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">Todas las emociones</option>
              <option value="HAPPY">😊 Feliz</option>
              <option value="SAD">😢 Triste</option>
              <option value="ANGRY">😠 Enojado</option>
              <option value="CALM">😌 Tranquilo</option>
              <option value="SURPRISED">😮 Sorprendido</option>
              <option value="FEAR">😨 Miedo</option>
              <option value="DISGUSTED">🤢 Disgustado</option>
              <option value="CONFUSED">😕 Confundido</option>
            </select>

            {emotionFilter && (
              <button 
                onClick={() => {
                  setEmotionFilter('');
                  setCurrentPage(1);
                }}
                className="btn-clear-filter"
              >
                ✕ Limpiar filtro
              </button>
            )}
          </div>
        </div>

        {/* Lista de Análisis */}
        <div className="analyses-section">
          <h2 className="section-title">
            <BarChartIcon />
            Análisis Realizados
          </h2>
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Cargando análisis...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-icon">❌</p>
              <p>{error}</p>
              <button onClick={loadData} className="btn btn-primary">
                Reintentar
              </button>
            </div>
          ) : analyses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CameraIcon />
              </div>
              <p className="empty-text">
                {emotionFilter 
                  ? `No hay análisis con la emoción "${translateEmotion(emotionFilter)}"` 
                  : 'Aún no has realizado ningún análisis'}
              </p>
              <button onClick={() => navigate('/home')} className="btn btn-primary">
                Realizar Análisis
              </button>
            </div>
          ) : (
            <>
              <div className="analyses-grid">
                {analyses.map((analysis) => (
                  <div key={analysis.analysis_id} className="analysis-item">
                    <div className="analysis-item-header">
                      <span 
                        className="analysis-emotion-badge"
                        style={{ backgroundColor: getEmotionColor(analysis.dominant_emotion) }}
                      >
                        <EmotionIcon emotion={analysis.dominant_emotion} size="1rem" /> {translateEmotion(analysis.dominant_emotion)}
                      </span>
                      {analysis.has_saved_playlist && (
                        <span className="playlist-indicator" title="Tiene playlist guardada">
                          <MusicIcon />
                        </span>
                      )}
                    </div>

                    <div className="analysis-item-body">
                      <div className="confidence-section">
                        <div className="confidence-header">
                          <span className="confidence-label">Confianza</span>
                          <span className="confidence-value">{analysis.confidence}%</span>
                        </div>
                        <div className="confidence-bar-mini">
                          <div 
                            className="confidence-fill-mini"
                            style={{ 
                              width: `${analysis.confidence}%`,
                              backgroundColor: getEmotionColor(analysis.dominant_emotion)
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Emociones detectadas */}
                      {analysis.emotion_details && (
                        <div className="emotions-mini">
                          <span className="emotions-mini-title">Otras emociones:</span>
                          <div className="emotions-mini-list">
                            {Object.entries(analysis.emotion_details)
                              .filter(([emotion]) => emotion !== analysis.dominant_emotion)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([emotion, value]) => (
                                <div key={emotion} className="emotion-mini-item">
                                  <span><EmotionIcon emotion={emotion} size="1rem" /></span>
                                  <span className="emotion-mini-value">{value.toFixed(1)}%</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata de la foto */}
                      {analysis.photo_metadata && (
                        <div className="photo-metadata">
                          <div className="metadata-item">
                            <span className="metadata-icon">
                              <UserIcon />
                            </span>
                            <span className="metadata-text">
                              {analysis.photo_metadata.faces_detected} rostro(s)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="analysis-item-footer">
                      <span className="analysis-date">
                        <CalendarIcon /> {formatDate(analysis.analyzed_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ← Anterior
                  </button>
                  
                  <div className="pagination-info">
                    Página {currentPage} de {totalPages}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;