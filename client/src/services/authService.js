import api from '../config/api';

const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
};

const saveSession = ({ access_token, user }) => {
  console.log('💾 [AuthService] Guardando sesión');
  if (access_token) localStorage.setItem(STORAGE_KEYS.token, access_token);
  if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
};

const clearSession = () => {
  console.log('🗑️  [AuthService] Limpiando sesión');
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
};

const getStoredUser = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    console.error('❌ [AuthService] Error parseando usuario almacenado');
    return null;
  }
};

const login = async ({ username_or_email, password }) => {
  console.log('🔑 [AuthService] Iniciando login para:', username_or_email);
  console.log('📡 [AuthService] URL del API:', api.defaults.baseURL);
  
  try {
    console.log('⏳ [AuthService] Enviando petición a /api/auth/login...');
    
    const { data } = await api.post('/api/auth/login', { 
      username_or_email, 
      password 
    });
    
    console.log('✅ [AuthService] Login exitoso:', {
      user: data.user?.username,
      hasToken: !!data.access_token
    });
    
    saveSession(data);
    return data;
    
  } catch (error) {
    console.error('❌ [AuthService] Error en login:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code
    });

    // Mensajes de error más útiles
    if (error.code === 'ERR_NETWORK') {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('La petición tardó demasiado. Intenta de nuevo.');
    }

    if (error.response?.status === 401) {
      throw new Error(error.response.data?.detail || 'Credenciales incorrectas');
    }

    if (error.response?.status === 400) {
      throw new Error(error.response.data?.detail || 'Datos inválidos');
    }

    if (error.response?.status === 500) {
      throw new Error('Error del servidor. Intenta más tarde.');
    }

    throw error;
  }
};

const register = async (payload) => {
  console.log('📝 [AuthService] Registrando usuario:', payload.username);
  console.log('📡 [AuthService] URL del API:', api.defaults.baseURL);
  
  try {
    console.log('⏳ [AuthService] Enviando petición a /api/auth/register...');
    
    const { data } = await api.post('/api/auth/register', payload);
    
    console.log('✅ [AuthService] Registro exitoso:', data);
    
    return data;
    
  } catch (error) {
    console.error('❌ [AuthService] Error en registro:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code
    });

    // Mensajes de error más útiles
    if (error.code === 'ERR_NETWORK') {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    }

    if (error.response?.status === 400) {
      const detail = error.response.data?.detail;
      if (typeof detail === 'string') {
        throw new Error(detail);
      }
      // Si detail es un array (errores de validación)
      if (Array.isArray(detail)) {
        const messages = detail.map(err => err.msg || err.message).join(', ');
        throw new Error(messages);
      }
      throw new Error('Datos inválidos. Verifica el formulario.');
    }

    if (error.response?.status === 422) {
      throw new Error('Error de validación. Verifica los datos ingresados.');
    }

    if (error.response?.status === 500) {
      throw new Error('Error del servidor. Intenta más tarde.');
    }

    throw error;
  }
};

const me = async () => {
  console.log('👤 [AuthService] Obteniendo usuario actual');
  
  try {
    const { data } = await api.get('/api/auth/me');
    console.log('✅ [AuthService] Usuario obtenido:', data.username);
    return data;
  } catch (error) {
    console.error('❌ [AuthService] Error obteniendo usuario:', error);
    throw error;
  }
};

const logout = () => {
  console.log('👋 [AuthService] Cerrando sesión');
  clearSession();
};

/**
 * Spotify / OAuth helpers
 */
const getSpotifyAuthUrl = async () => {
  try {
    const { data } = await api.get('/api/auth/spotify/login', { skipAuth: true });
    return data.authorization_url;
  } catch (error) {
    console.error('❌ [AuthService] Error obteniendo URL de Spotify:', error);
    throw error;
  }
};

const getSpotifyLinkUrl = async () => {
  try {
    const { data } = await api.get('/api/auth/spotify/link');
    if (data.error) throw new Error(data.error);
    return data.authorization_url;
  } catch (error) {
    console.error('❌ [AuthService] Error obteniendo URL de enlace Spotify:', error);
    throw error;
  }
};

const linkSpotify = async (code) => {
  try {
    const { data } = await api.post(`/api/auth/spotify/link/callback?code=${encodeURIComponent(code)}`);
    saveSession({ access_token: data.access_token, user: data.user });
    return data;
  } catch (error) {
    console.error('❌ [AuthService] Error vinculando Spotify:', error);
    throw error;
  }
};

const exchangeSpotifyCode = async (code) => {
  try {
    const { data } = await api.post(`/api/auth/spotify/exchange`, { code }, { skipAuth: true });
    if (data?.access_token) saveSession({ access_token: data.access_token, user: data.user });
    return data;
  } catch (error) {
    console.error('❌ [AuthService] Error intercambiando código de Spotify:', error);
    throw error;
  }
};

const disconnectSpotify = async () => {
  try {
    const { data } = await api.post('/api/auth/spotify/disconnect');
    return data;
  } catch (error) {
    console.error('❌ [AuthService] Error desconectando Spotify:', error);
    throw error;
  }
};

const updateProfile = async (payload) => {
  try {
    const { data } = await api.patch('/api/auth/me', payload);
    try {
      if (data) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data));
    } catch (e) {
      console.warn('[AuthService] No se pudo guardar user actualizado en localStorage', e);
    }
    return data;
  } catch (error) {
    console.error('❌ [AuthService] Error actualizando perfil:', error);
    if (error.response?.data?.detail) throw new Error(error.response.data.detail);
    throw error;
  }
};

// ============================================
// RECUPERACIÓN DE CONTRASEÑA MEJORADA
// ============================================

const requestPasswordReset = async (email) => {
  console.log('🔄 [AuthService] Solicitando reset de contraseña para:', email);
  
  try {
    const { data } = await api.post('/api/auth/forgot-password', { email });
    console.log('✅ [AuthService] Código de reset enviado exitosamente');
    return { success: true, data };
  } catch (error) {
    console.error('❌ [AuthService] Error enviando código:', error);
    
    // Manejar diferentes tipos de errores
    if (error.code === 'ERR_NETWORK') {
      return { 
        success: false, 
        error: 'No se pudo conectar con el servidor. Verifica tu conexión a internet y que el servidor esté funcionando.' 
      };
    }
    
    if (error.code === 'ECONNABORTED') {
      return { 
        success: false, 
        error: 'La petición tardó demasiado tiempo. Verifica tu conexión e intenta de nuevo.' 
      };
    }
    
    if (error.response?.status === 404) {
      return { 
        success: false, 
        error: 'No existe una cuenta registrada con ese email. Verifica que esté escrito correctamente.' 
      };
    }
    
    if (error.response?.status === 400) {
      const detail = error.response.data?.detail || '';
      if (detail.includes('Spotify')) {
        return { 
          success: false, 
          error: 'Esta cuenta solo puede acceder con Spotify. No tiene contraseña para recuperar.' 
        };
      }
      return { 
        success: false, 
        error: detail || 'Email inválido. Verifica el formato.' 
      };
    }
    
    if (error.response?.status === 403) {
      return { 
        success: false, 
        error: 'La cuenta está inactiva. Contacta al soporte técnico.' 
      };
    }
    
    if (error.response?.status >= 500) {
      return { 
        success: false, 
        error: 'Error del servidor. Por favor intenta más tarde.' 
      };
    }
    
    // Error genérico
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Error inesperado. Intenta de nuevo o contacta al soporte.' 
    };
  }
};

const resetPassword = async ({ email, code, new_password }) => {
  console.log('🔑 [AuthService] Reseteando contraseña para:', email);
  
  try {
    const { data } = await api.post('/api/auth/reset-password', {
      email,
      code,
      new_password
    });
    console.log('✅ [AuthService] Contraseña cambiada exitosamente');
    return { success: true, data };
  } catch (error) {
    console.error('❌ [AuthService] Error cambiando contraseña:', error);
    
    // Manejar diferentes tipos de errores
    if (error.code === 'ERR_NETWORK') {
      return { 
        success: false, 
        error: 'No se pudo conectar con el servidor. Verifica tu conexión.' 
      };
    }
    
    if (error.code === 'ECONNABORTED') {
      return { 
        success: false, 
        error: 'La petición tardó demasiado tiempo. Intenta de nuevo.' 
      };
    }
    
    if (error.response?.status === 400) {
      const detail = error.response.data?.detail || '';
      if (detail.includes('código') || detail.includes('inválido') || detail.includes('expirado')) {
        return { 
          success: false, 
          error: 'El código es incorrecto o ha expirado. Solicita un nuevo código.' 
        };
      }
      if (detail.includes('contraseña')) {
        return { 
          success: false, 
          error: 'La nueva contraseña no cumple los requisitos: mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.' 
        };
      }
      return { 
        success: false, 
        error: detail || 'Datos inválidos. Verifica la información ingresada.' 
      };
    }
    
    if (error.response?.status === 404) {
      return { 
        success: false, 
        error: 'Usuario no encontrado. Verifica que el email sea correcto.' 
      };
    }
    
    if (error.response?.status === 422) {
      const detail = error.response.data?.detail || '';
      if (Array.isArray(detail)) {
        const messages = detail.map(err => err.msg || err.message).join(', ');
        return { 
          success: false, 
          error: `Error de validación: ${messages}` 
        };
      }
      return { 
        success: false, 
        error: 'Error de validación. Verifica que el código tenga 6 dígitos y la contraseña sea segura.' 
      };
    }
    
    if (error.response?.status >= 500) {
      return { 
        success: false, 
        error: 'Error del servidor. Intenta más tarde.' 
      };
    }
    
    // Error genérico
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Error inesperado al cambiar contraseña. Intenta de nuevo.' 
    };
  }
};

// Actualizar la exportación para incluir las nuevas funciones:
export const authService = {
  login,
  register,
  me,
  logout,
  getStoredUser,
  getSpotifyAuthUrl,
  getSpotifyLinkUrl,
  linkSpotify,
  exchangeSpotifyCode,
  disconnectSpotify,
  updateProfile,
  requestPasswordReset,  
  resetPassword,         
};