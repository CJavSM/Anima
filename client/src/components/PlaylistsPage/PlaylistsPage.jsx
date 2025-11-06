import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import historyService from '../../services/historyService';
import emotionService from '../../services/emotionService';
import musicService from '../../services/musicService';
import './PlaylistsPage.css';

const PlaylistsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros y paginación
  const [emotionFilter, setEmotionFilter] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  // Estado para reproducir preview
  const [playingPreview, setPlayingPreview] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  useEffect(() => {
    loadPlaylists();
    
    // Cleanup audio
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [emotionFilter, favoriteFilter, currentPage]);

  const loadPlaylists = async () => {
    setLoading(true);
    setError('');

    try {
      const filters = {
        page: currentPage,
        page_size: pageSize,
        emotion: emotionFilter || undefined,
        is_favorite: favoriteFilter || undefined
      };

      const response = await historyService.getPlaylists(filters);

      if (response.success) {
        setPlaylists(response.data.items || []);
        setTotalPages(response.data.total_pages || 1);
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleFavorite = async (playlistId, currentStatus) => {
    try {
      const response = await historyService.updatePlaylist(playlistId, {
        is_favorite: !currentStatus
      });

      if (response.success) {
        loadPlaylists();
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist({...selectedPlaylist, is_favorite: !currentStatus});
        }
      }
    } catch (err) {
      console.error('Error al actualizar favorito:', err);
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!confirm('¿Estás seguro de eliminar esta playlist?')) return;

    try {
      const response = await historyService.deletePlaylist(playlistId);

      if (response.success) {
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(null);
        }
        loadPlaylists();
      }
    } catch (err) {
      console.error('Error al eliminar playlist:', err);
    }
  };

  const togglePreview = (track) => {
    if (!track.preview_url) {
      alert('Esta canción no tiene preview disponible. Abre en Spotify para escucharla completa.');
      return;
    }

    if (playingPreview === track.id) {
      audioElement.pause();
      setPlayingPreview(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(track.preview_url);
    audio.volume = 0.5;
    
    audio.play();
    audio.onended = () => setPlayingPreview(null);
    
    setAudioElement(audio);
    setPlayingPreview(track.id);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEmotionEmoji = (emotion) => emotionService.getEmotionEmoji(emotion);
  const getEmotionColor = (emotion) => emotionService.getEmotionColor(emotion);
  const translateEmotion = (emotion) => emotionService.translateEmotion(emotion);

  return (
    <div className="playlists-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            <h1 className="navbar-brand" onClick={() => navigate('/home')}>Ánima</h1>
            <div className="navbar-menu">
              <button onClick={() => navigate('/home')} className="nav-link">
                Analizar
              </button>
              <button onClick={() => navigate('/history')} className="nav-link">
                Historial
              </button>
              <button onClick={() => navigate('/playlists')} className="nav-link active">
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
        <div className="playlists-layout">
          {/* Panel Izquierdo - Lista de Playlists */}
          <div className="playlists-panel">
            <div className="panel-header">
              <h1 className="panel-title">🎵 Mis Playlists</h1>
              <p className="panel-subtitle">
                {playlists.length} playlist{playlists.length !== 1 ? 's' : ''} guardada{playlists.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Filtros */}
            <div className="filters-compact">
              <select
                value={emotionFilter}
                onChange={(e) => {
                  setEmotionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select-compact"
              >
                <option value="">Todas las emociones</option>
                <option value="HAPPY">😊 Feliz</option>
                <option value="SAD">😢 Triste</option>
                <option value="ANGRY">😠 Enojado</option>
                <option value="CALM">😌 Tranquilo</option>
                <option value="SURPRISED">😮 Sorprendido</option>
                <option value="FEAR">😨 Miedo</option>
              </select>

              <label className="favorite-toggle">
                <input
                  type="checkbox"
                  checked={favoriteFilter}
                  onChange={(e) => {
                    setFavoriteFilter(e.target.checked);
                    setCurrentPage(1);
                  }}
                />
                <span>⭐ Solo favoritas</span>
              </label>
            </div>

            {/* Lista */}
            {loading ? (
              <div className="loading-compact">
                <div className="spinner-small"></div>
                <p>Cargando...</p>
              </div>
            ) : error ? (
              <div className="error-compact">
                <p>❌ {error}</p>
              </div>
            ) : playlists.length === 0 ? (
              <div className="empty-compact">
                <p className="empty-icon-large">🎵</p>
                <p>No hay playlists guardadas</p>
                <button onClick={() => navigate('/home')} className="btn btn-primary">
                  Crear Playlist
                </button>
              </div>
            ) : (
              <>
                <div className="playlists-list">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className={`playlist-list-item ${selectedPlaylist?.id === playlist.id ? 'active' : ''}`}
                      onClick={() => setSelectedPlaylist(playlist)}
                    >
                      <div className="playlist-list-header">
                        <h4 className="playlist-list-name">
                          {playlist.playlist_name}
                          {playlist.is_favorite && <span className="star-small">⭐</span>}
                        </h4>
                        <span 
                          className="playlist-list-emotion"
                          style={{ color: getEmotionColor(playlist.emotion) }}
                        >
                          {getEmotionEmoji(playlist.emotion)}
                        </span>
                      </div>
                      <div className="playlist-list-info">
                        <span>{playlist.tracks.length} canciones</span>
                        <span>•</span>
                        <span>{formatDate(playlist.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="pagination-compact">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn-compact"
                    >
                      ←
                    </button>
                    <span>{currentPage} / {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="pagination-btn-compact"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Panel Derecho - Detalles de Playlist */}
          <div className="playlist-details-panel">
            {selectedPlaylist ? (
              <>
                <div className="playlist-details-header" style={{ borderTopColor: getEmotionColor(selectedPlaylist.emotion) }}>
                  <div className="playlist-details-title-section">
                    <h2 className="playlist-details-title">{selectedPlaylist.playlist_name}</h2>
                    <p className="playlist-details-emotion">
                      {getEmotionEmoji(selectedPlaylist.emotion)} {translateEmotion(selectedPlaylist.emotion)}
                    </p>
                    {selectedPlaylist.description && (
                      <p className="playlist-details-description">{selectedPlaylist.description}</p>
                    )}
                    <div className="playlist-details-meta">
                      <span>{selectedPlaylist.tracks.length} canciones</span>
                      <span>•</span>
                      <span>Creada el {formatDate(selectedPlaylist.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="playlist-details-actions">
                    <button
                      onClick={() => toggleFavorite(selectedPlaylist.id, selectedPlaylist.is_favorite)}
                      className="action-btn-large"
                      title={selectedPlaylist.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      {selectedPlaylist.is_favorite ? '⭐' : '☆'}
                    </button>
                    <button
                      onClick={() => deletePlaylist(selectedPlaylist.id)}
                      className="action-btn-large delete"
                      title="Eliminar playlist"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Tracks */}
                <div className="tracks-section-full">
                  {selectedPlaylist.tracks.map((track, index) => (
                    <div key={track.id || index} className="track-row">
                      <div className="track-number">{index + 1}</div>
                      
                      <div className="track-image-wrapper">
                        {track.album_image && (
                          <img src={track.album_image} alt={track.album} className="track-img" />
                        )}
                        {track.preview_url && (
                          <button 
                            className="track-play-overlay"
                            onClick={() => togglePreview(track)}
                          >
                            {playingPreview === track.id ? '⏸️' : '▶️'}
                          </button>
                        )}
                      </div>

                      <div className="track-info-full">
                        <div className="track-name-full">{track.name}</div>
                        <div className="track-artists-full">{track.artists?.join(', ')}</div>
                      </div>

                      <div className="track-album-full">{track.album}</div>

                      <div className="track-duration-full">
                        {musicService.formatDuration(track.duration_ms)}
                      </div>

                      <button
                        className="track-spotify-btn-small"
                        onClick={() => window.open(track.external_url, '_blank')}
                        title="Abrir en Spotify"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-selection">
                <p className="no-selection-icon">🎵</p>
                <p className="no-selection-text">Selecciona una playlist para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistsPage;