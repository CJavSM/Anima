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
    // skipAuth: true evita que el interceptor adjunte Authorization
    // (el endpoint de Spotify no requiere token y debe ser público)
    const { data } = await api.get('/api/auth/spotify/login', { skipAuth: true });
    return data.authorization_url;
  } catch (error) {
    console.error('❌ [AuthService] Error obteniendo URL de Spotify:', error);
    throw error;
  }
};

const getSpotifyLinkUrl = async () => {
  try {
    // Este endpoint requiere usuario autenticado (vincular a cuenta existente).
    // No pasar skipAuth para que el interceptor adjunte el token si existe.
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
    // El endpoint espera el código como query param
    const { data } = await api.post(`/api/auth/spotify/link/callback?code=${encodeURIComponent(code)}`);
    // Devuelve TokenResponse con nuevo access_token y user
    saveSession({ access_token: data.access_token, user: data.user });
    return data;
  } catch (error) {
    console.error('❌ [AuthService] Error vinculando Spotify:', error);
    throw error;
  }
};

const exchangeSpotifyCode = async (code) => {
  try {
    // Intercambiar el code por token en el backend y evitar seguir redirects
    const { data } = await api.post(`/api/auth/spotify/exchange`, { code }, { skipAuth: true });
    // Guardar sesión si viene el token
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
    // Guardar usuario actualizado en localStorage si viene
    try {
      if (data) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data));
    } catch (e) {
      console.warn('[AuthService] No se pudo guardar user actualizado en localStorage', e);
    }
    return data;
  } catch (error) {
    console.error('❌ [AuthService] Error actualizando perfil:', error);
    // Normalizar errores si vienen con detalle
    if (error.response?.data?.detail) throw new Error(error.response.data.detail);
    throw error;
  }
};

// Agregar al final del objeto authService, antes de la exportación:

const requestPasswordReset = async (email) => {
  console.log('🔄 [AuthService] Solicitando reset de contraseña para:', email);
  
  try {
    const { data } = await api.post('/api/auth/forgot-password', { email });
    console.log('✅ [AuthService] Código de reset enviado exitosamente');
    return { success: true, data };
  } catch (error) {
    console.error('❌ [AuthService] Error enviando código:', error);
    
    if (error.code === 'ERR_NETWORK') {
      throw new Error('No se pudo conectar con el servidor.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('No existe una cuenta con ese email.');
    }
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.detail || 'Email inválido.');
    }
    
    return { success: false, error: error.response?.data?.detail || 'Error al enviar código' };
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
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.detail || 'Código inválido o expirado.');
    }
    
    return { success: false, error: error.response?.data?.detail || 'Error al cambiar contraseña' };
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
  requestPasswordReset,  // AGREGAR
  resetPassword,         // AGREGAR
};