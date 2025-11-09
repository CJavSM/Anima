import { useState, useEffect } from 'react';
import './History.css';

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

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StarFilledIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>
);

const StarOutlineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19,6V20C19,21 18,22 17,22H7C6,22 5,21 5,20V6M8,6V4C8,3 9,2 10,2H14C15,2 16,3 16,4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const History = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('analyses'); // 'analyses' o 'playlists'
  const [analyses, setAnalyses] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [emotionFilter, setEmotionFilter] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  
  const API_URL = 'http://localhost:8000';
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadData();
  }, [activeTab, emotionFilter, favoriteFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Cargar estadísticas
      const statsRes = await fetch(`${API_URL}/api/history/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (activeTab === 'analyses') {
        // Cargar análisis
        let url = `${API_URL}/api/history/analyses?page=1&page_size=20`;
        if (emotionFilter) url += `&emotion=${emotionFilter}`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAnalyses(data.items || []);
        } else {
          throw new Error('Error al cargar historial');
        }
      } else {
        // Cargar playlists
        let url = `${API_URL}/api/history/playlists?page=1&page_size=20`;
        if (emotionFilter) url += `&emotion=${emotionFilter}`;
        if (favoriteFilter) url += `&is_favorite=true`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlaylists(data.items || []);
        } else {
          throw new Error('Error al cargar playlists');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (playlistId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/history/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_favorite: !currentStatus })
      });

      if (response.ok) {
        loadData(); // Recargar datos
      }
    } catch (err) {
      console.error('Error al actualizar favorito:', err);
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!confirm('¿Estás seguro de eliminar esta playlist?')) return;

    try {
      const response = await fetch(`${API_URL}/api/history/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadData(); // Recargar datos
      }
    } catch (err) {
      console.error('Error al eliminar playlist:', err);
    }
  };

  const getEmotionEmoji = (emotion) => {
    const emojis = {
      'HAPPY': '😊',
      'SAD': '😢',
      'ANGRY': '😠',
      'CONFUSED': '😕',
      'DISGUSTED': '🤢',
      'SURPRISED': '😮',
      'CALM': '😌',
      'FEAR': '😨'
    };
    return emojis[emotion] || '😐';
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      'HAPPY': '#10b981',
      'SAD': '#3b82f6',
      'ANGRY': '#ef4444',
      'CONFUSED': '#f59e0b',
      'DISGUSTED': '#8b5cf6',
      'SURPRISED': '#ec4899',
      'CALM': '#14b8a6',
      'FEAR': '#6366f1'
    };
    return colors[emotion] || '#6b7280';
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

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <div>
            <h2 className="history-title">Mi Historial</h2>
            <p className="history-subtitle">Revisa tus análisis y playlists guardadas</p>
          </div>
          <button onClick={onClose} className="modal-close">
            <XIcon />
          </button>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-icon">
                <CameraIcon />
              </div>
              <div className="stat-info">
                <span className="stat-label">Análisis</span>
                <span className="stat-value">{stats.total_analyses}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <MusicIcon />
              </div>
              <div className="stat-info">
                <span className="stat-label">Playlists</span>
                <span className="stat-value">{stats.total_saved_playlists}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <StarIcon />
              </div>
              <div className="stat-info">
                <span className="stat-label">Favoritas</span>
                <span className="stat-value">{stats.favorite_playlists_count}</span>
              </div>
            </div>
            {stats.most_common_emotion && (
              <div className="stat-card">
                <div className="stat-icon emotion-icon">
                  <EmotionIcon emotion={stats.most_common_emotion} size="1.5rem" />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Más común</span>
                  <span className="stat-value">{stats.most_common_emotion}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="history-tabs">
          <button
            className={`tab-button ${activeTab === 'analyses' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyses')}
          >
            <CameraIcon /> Análisis
          </button>
          <button
            className={`tab-button ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            <MusicIcon /> Playlists Guardadas
          </button>
        </div>

        {/* Filtros */}
        <div className="filters-section">
          <select
            value={emotionFilter}
            onChange={(e) => setEmotionFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas las emociones</option>
            <option value="HAPPY">😊 Feliz</option>
            <option value="SAD">😢 Triste</option>
            <option value="ANGRY">😠 Enojado</option>
            <option value="CALM">😌 Tranquilo</option>
            <option value="SURPRISED">😮 Sorprendido</option>
            <option value="FEAR">😨 Miedo</option>
          </select>

          {activeTab === 'playlists' && (
            <label className="favorite-filter">
              <input
                type="checkbox"
                checked={favoriteFilter}
                onChange={(e) => setFavoriteFilter(e.target.checked)}
              />
              Solo favoritas <StarIcon />
            </label>
          )}
        </div>

        {/* Contenido */}
        <div className="history-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Cargando...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-icon">❌</p>
              <p>{error}</p>
            </div>
          ) : (
            <>
              {activeTab === 'analyses' ? (
                <div className="analyses-list">
                  {analyses.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <CameraIcon />
                      </div>
                      <p>No hay análisis todavía</p>
                    </div>
                  ) : (
                    analyses.map((analysis) => (
                      <div key={analysis.analysis_id} className="analysis-card">
                        <div className="analysis-header">
                          <span
                            className="emotion-badge"
                            style={{ backgroundColor: getEmotionColor(analysis.dominant_emotion) }}
                          >
                            <EmotionIcon emotion={analysis.dominant_emotion} size="1rem" /> {analysis.dominant_emotion}
                          </span>
                          <span className="analysis-date">{formatDate(analysis.analyzed_at)}</span>
                        </div>
                        <div className="analysis-confidence">
                          <span>Confianza: {analysis.confidence}%</span>
                          <div className="confidence-bar">
                            <div
                              className="confidence-fill"
                              style={{
                                width: `${analysis.confidence}%`,
                                backgroundColor: getEmotionColor(analysis.dominant_emotion)
                              }}
                            ></div>
                          </div>
                        </div>
                        {analysis.has_saved_playlist && (
                          <div className="has-playlist-badge">
                            <MusicIcon /> Playlist guardada
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="playlists-list">
                  {playlists.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <MusicIcon />
                      </div>
                      <p>No hay playlists guardadas</p>
                    </div>
                  ) : (
                    playlists.map((playlist) => (
                      <div key={playlist.id} className="playlist-card">
                        <div className="playlist-header">
                          <div>
                            <h4 className="playlist-name">
                              {playlist.playlist_name}
                              {playlist.is_favorite && (
                                <span className="favorite-star">
                                  <StarFilledIcon />
                                </span>
                              )}
                            </h4>
                            <p className="playlist-emotion">
                              <EmotionIcon emotion={playlist.emotion} size="1rem" /> {playlist.emotion}
                            </p>
                          </div>
                          <div className="playlist-actions">
                            <button
                              onClick={() => toggleFavorite(playlist.id, playlist.is_favorite)}
                              className="action-btn"
                              title={playlist.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                            >
                              {playlist.is_favorite ? <StarFilledIcon /> : <StarOutlineIcon />}
                            </button>
                            <button
                              onClick={() => deletePlaylist(playlist.id)}
                              className="action-btn delete"
                              title="Eliminar playlist"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                        {playlist.description && (
                          <p className="playlist-description">{playlist.description}</p>
                        )}
                        <div className="playlist-info">
                          <span>{playlist.tracks.length} canciones</span>
                          <span>•</span>
                          <span>{formatDate(playlist.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;