import api from '../config/api';

/**
 * Servicio para obtener recomendaciones musicales
 */
const musicService = {
  /**
   * Obtiene recomendaciones musicales basadas en la emoción
   * @param {string} emotion - Emoción detectada
   * @param {number} limit - Número de canciones a obtener
   * @returns {Promise} Recomendaciones musicales
   */
  /**
   * Obtiene recomendaciones musicales basadas en la emoción
   * @param {string} emotion
   * @param {number} limit
   * @param {object} options - Opciones adicionales (p. ej. { signal })
   */
  getRecommendations: async (emotion, limit = 20, options = {}) => {
    try {
      const config = {
        params: { limit },
      };

      // Pasar signal si fue provisto (para poder cancelar la petición)
      if (options.signal) {
        config.signal = options.signal;
      }

      const { data } = await api.get(`/api/music/recommendations/${emotion}`, config);

      return {
        success: true,
        data,
      };
    } catch (error) {
      // Si la petición fue cancelada por AbortController, devolver un flag para que el caller lo ignore
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        return { success: false, cancelled: true };
      }

      console.error('Error al obtener recomendaciones:', error);
      
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.error
        || 'Error al obtener recomendaciones musicales.';

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Formatea la duración en milisegundos a formato mm:ss
   * @param {number} ms - Duración en milisegundos
   * @returns {string} Duración formateada
   */
  formatDuration: (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  },

  /**
   * Abre una canción en Spotify
   * @param {string} url - URL de Spotify
   */
  openInSpotify: (url) => {
    window.open(url, '_blank');
  },
};

export default musicService;