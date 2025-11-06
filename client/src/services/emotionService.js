import api from '../config/api';

/**
 * Servicio para análisis de emociones
 */
const emotionService = {
  /**
   * Analiza las emociones en una imagen
   * @param {File} imageFile - Archivo de imagen a analizar
   * @returns {Promise} Resultado del análisis
   */
  analyzeEmotion: async (imageFile) => {
    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', imageFile);

      // Hacer la petición al backend
      const { data } = await api.post('/api/emotions/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error al analizar emoción:', error);
      
      // Extraer mensaje de error
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.error
        || 'Error al analizar la imagen. Por favor intenta de nuevo.';

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Traduce las emociones de inglés a español
   * @param {string} emotion - Emoción en inglés
   * @returns {string} Emoción en español
   */
  translateEmotion: (emotion) => {
    const translations = {
      'HAPPY': 'Feliz',
      'SAD': 'Triste',
      'ANGRY': 'Enojado',
      'CONFUSED': 'Confundido',
      'DISGUSTED': 'Disgustado',
      'SURPRISED': 'Sorprendido',
      'CALM': 'Tranquilo',
      'FEAR': 'Miedo',
    };

    return translations[emotion] || emotion;
  },

  /**
   * Obtiene un emoji basado en la emoción
   * @param {string} emotion - Emoción en inglés
   * @returns {string} Emoji correspondiente
   */
  getEmotionEmoji: (emotion) => {
    const emojis = {
      'HAPPY': '😊',
      'SAD': '😢',
      'ANGRY': '😠',
      'CONFUSED': '😕',
      'DISGUSTED': '🤢',
      'SURPRISED': '😮',
      'CALM': '😌',
      'FEAR': '😨',
    };

    return emojis[emotion] || '😐';
  },

  /**
   * Obtiene el color asociado a una emoción
   * @param {string} emotion - Emoción en inglés
   * @returns {string} Código de color
   */
  getEmotionColor: (emotion) => {
    const colors = {
      'HAPPY': '#10b981',      // Verde
      'SAD': '#3b82f6',        // Azul
      'ANGRY': '#ef4444',      // Rojo
      'CONFUSED': '#f59e0b',   // Naranja
      'DISGUSTED': '#8b5cf6',  // Púrpura
      'SURPRISED': '#ec4899',  // Rosa
      'CALM': '#14b8a6',       // Teal
      'FEAR': '#6366f1',       // Índigo
    };

    return colors[emotion] || '#6b7280';
  },
};

export default emotionService;