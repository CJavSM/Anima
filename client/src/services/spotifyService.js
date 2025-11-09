import api from '../config/api';

const spotifyService = {
  getUserPlaylists: async (limit = 50) => {
    try {
      const { data } = await api.get(`/api/spotify/playlists?limit=${limit}`);
      return { success: true, data };
    } catch (error) {
      console.error('Error obteniendo playlists de Spotify:', error);
      return { success: false, error: error.response?.data || error.message };
    }
  },

  createPlaylist: async ({ name, description = '', tracks = [], isPublic = false }) => {
    try {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return { success: false, error: "El nombre de la playlist es requerido" };
      }

      if (!Array.isArray(tracks) || tracks.length === 0) {
        return { success: false, error: 'La lista de canciones está vacía' };
      }

      // Asegurar que todos los track ids sean strings
      const safeTracks = tracks.map(t => String(t)).filter(Boolean);

      const payload = { name, description, tracks: safeTracks, public: !!isPublic };
      const { data } = await api.post('/api/spotify/playlists', payload);
      return { success: true, data };
    } catch (error) {
      console.error('Error creando playlist en Spotify:', error);
      return { success: false, error: error.response?.data?.detail || error.response?.data || error.message };
    }
  }
};

export default spotifyService;
