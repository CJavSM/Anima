import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un usuario almacenado al cargar la aplicación
    const storedUser = authService.getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.detail || 'Error al iniciar sesión' };
    }
  };

  // Permitir que componentes hijos reemplacen el usuario del contexto
  // (útil para flows OAuth donde el token se establece fuera del login normal)
  const setUserFromCallback = (userObj) => {
    setUser(userObj);
    try {
      if (userObj) localStorage.setItem('user', JSON.stringify(userObj));
      else localStorage.removeItem('user');
    } catch (e) {
      console.error('❌ [AuthContext] Error guardando user en localStorage', e);
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.detail || 'Error al registrar usuario' };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    setUser: setUserFromCallback,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};