import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import historyService from '../../services/historyService';
import emotionService from '../../services/emotionService';
import './HistoryPage.css';

const HistoryPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
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

  const handleLogout = () => {
    logout();
    navigate('/login');
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
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            <h1 className="navbar-brand" onClick={() => navigate('/home')}>Ánima</h1>
            <div className="navbar-menu">
              <button onClick={() => navigate('/home')} className="nav-link">
                Analizar
              </button>
              <button onClick={() => navigate('/history')} className="nav-link active">
                Historial
              </button>
              <button onClick={() => navigate('/playlists')} className="nav-link">
                Playlists
              </button>
              <button onClick={() => navigate('/dashboard')} className="nav-link">
                Dashboard
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

      {/* Contenido Principal */}
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">📊 Mi Historial de Emociones</h1>
            <p className="page-subtitle">
              Revisa todos los análisis que has realizado
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📸</div>
              <div className="stat-content">
                <span className="stat-label">Total de Análisis</span>
                <span className="stat-value">{stats.total_analyses}</span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎵</div>
              <div className="stat-content">
                <span className="stat-label">Playlists Guardadas</span>
                <span className="stat-value">{stats.total_saved_playlists}</span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <span className="stat-label">Favoritas</span>
                <span className="stat-value">{stats.favorite_playlists_count}</span>
              </div>
            </div>
            
            {stats.most_common_emotion && (
              <div className="stat-card">
                <div className="stat-icon">{getEmotionEmoji(stats.most_common_emotion)}</div>
                <div className="stat-content">
                  <span className="stat-label">Emoción Más Común</span>
                  <span className="stat-value">{translateEmotion(stats.most_common_emotion)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desglose de Emociones */}
        {stats && stats.emotions_breakdown && Object.keys(stats.emotions_breakdown).length > 0 && (
          <div className="emotions-chart-section">
            <h2 className="section-title">Distribución de Emociones</h2>
            <div className="emotions-chart">
              {Object.entries(stats.emotions_breakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([emotion, count]) => {
                  const percentage = stats.total_analyses > 0 
                    ? ((count / stats.total_analyses) * 100).toFixed(1) 
                    : 0;
                  
                  return (
                    <div key={emotion} className="emotion-chart-item">
                      <div className="emotion-chart-label">
                        <span className="emotion-chart-emoji">{getEmotionEmoji(emotion)}</span>
                        <span className="emotion-chart-name">{translateEmotion(emotion)}</span>
                        <span className="emotion-chart-count">{count} veces</span>
                      </div>
                      <div className="emotion-chart-bar-container">
                        <div 
                          className="emotion-chart-bar"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: getEmotionColor(emotion)
                          }}
                        >
                          <span className="emotion-chart-percentage">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
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
          <h2 className="section-title">Análisis Realizados</h2>
          
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
              <p className="empty-icon">📸</p>
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
                        {getEmotionEmoji(analysis.dominant_emotion)} {translateEmotion(analysis.dominant_emotion)}
                      </span>
                      {analysis.has_saved_playlist && (
                        <span className="playlist-indicator" title="Tiene playlist guardada">
                          🎵
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
                                  <span>{getEmotionEmoji(emotion)}</span>
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
                            <span className="metadata-icon">👤</span>
                            <span className="metadata-text">
                              {analysis.photo_metadata.faces_detected} rostro(s)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="analysis-item-footer">
                      <span className="analysis-date">
                        📅 {formatDate(analysis.analyzed_at)}
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