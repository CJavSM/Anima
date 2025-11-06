import api from '../config/api';

const historyService = {
  /**
   * Guarda una playlist
   * @param {Object} playlistData - Datos de la playlist
   * @returns {Promise} Resultado de guardar
   */
  savePlaylist: async (playlistData) => {
    try {
      const { data } = await api.post('/api/history/playlists', playlistData);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al guardar playlist:', error);
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.error
        || 'Error al guardar la playlist';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Obtiene las playlists guardadas
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise} Lista de playlists
   */
  getPlaylists: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.page_size) params.append('page_size', filters.page_size);
      if (filters.emotion) params.append('emotion', filters.emotion);
      if (filters.is_favorite !== undefined) params.append('is_favorite', filters.is_favorite);

      const { data } = await api.get(`/api/history/playlists?${params.toString()}`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al obtener playlists:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al obtener playlists',
      };
    }
  },

  /**
   * Obtiene una playlist específica
   * @param {string} playlistId - ID de la playlist
   * @returns {Promise} Playlist
   */
  getPlaylist: async (playlistId) => {
    try {
      const { data } = await api.get(`/api/history/playlists/${playlistId}`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al obtener playlist:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al obtener la playlist',
      };
    }
  },

  /**
   * Actualiza una playlist
   * @param {string} playlistId - ID de la playlist
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise} Playlist actualizada
   */
  updatePlaylist: async (playlistId, updateData) => {
    try {
      const { data } = await api.patch(`/api/history/playlists/${playlistId}`, updateData);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al actualizar playlist:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al actualizar la playlist',
      };
    }
  },

  /**
   * Elimina una playlist
   * @param {string} playlistId - ID de la playlist
   * @returns {Promise} Resultado de eliminación
   */
  deletePlaylist: async (playlistId) => {
    try {
      const { data } = await api.delete(`/api/history/playlists/${playlistId}`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al eliminar playlist:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al eliminar la playlist',
      };
    }
  },

  /**
   * Obtiene el historial de análisis
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise} Historial de análisis
   */
  getAnalyses: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.page_size) params.append('page_size', filters.page_size);
      if (filters.emotion) params.append('emotion', filters.emotion);

      const { data } = await api.get(`/api/history/analyses?${params.toString()}`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al obtener el historial',
      };
    }
  },

  /**
   * Obtiene estadísticas del usuario
   * @returns {Promise} Estadísticas
   */
  getStats: async () => {
    try {
      const { data } = await api.get('/api/history/stats');
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al obtener estadísticas',
      };
    }
  },
};

export default historyService;