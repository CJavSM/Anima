import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

console.log('🌐 [API Config] Configurando axios con URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// ============================================
// INTERCEPTOR DE REQUEST
// ============================================
api.interceptors.request.use(
  (config) => {
    console.log('📤 [API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
    });

    // Solo agregar token si existe y NO es una petición de auth
    const token = localStorage.getItem('token');
    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
    
    if (token && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 [API Request] Token agregado');
    } else if (isAuthEndpoint) {
      console.log('🔓 [API Request] Endpoint de auth - sin token');
    }

    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]:', error);
    return Promise.reject(error);
  }
);

// ============================================
// INTERCEPTOR DE RESPONSE
// ============================================
api.interceptors.response.use(
  (response) => {
    console.log('✅ [API Response]', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Crear un objeto de error más útil
    const errorInfo = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    };

    console.error('❌ [API Response Error]:', errorInfo);

    // Si es error 401, limpiar sesión
    if (error.response?.status === 401) {
      console.warn('⚠️  Error 401 - Token inválido o expirado');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Solo redirigir si NO estamos ya en login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Si es error de red (CORS, conexión, etc.)
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      console.error('❌ [Network Error]', {
        message: 'No se pudo conectar con el servidor',
        possibleCauses: [
          'El backend no está corriendo',
          'Problema de CORS',
          'Firewall bloqueando la conexión',
          'URL incorrecta'
        ],
        expectedURL: API_URL,
        actualURL: error.config?.baseURL
      });
    }

    // Si es timeout
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('⏱️  [Timeout Error] La petición tardó demasiado');
    }

    return Promise.reject(error);
  }
);

export default api;