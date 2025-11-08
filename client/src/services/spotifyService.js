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
      const payload = { name, description, tracks, public: !!isPublic };
      const { data } = await api.post('/api/spotify/playlists', payload);
      return { success: true, data };
    } catch (error) {
      console.error('Error creando playlist en Spotify:', error);
      return { success: false, error: error.response?.data || error.message };
    }
  }
};

export default spotifyService;
