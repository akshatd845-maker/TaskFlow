import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { joinUser, leaveUser, connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      // Clear legacy token storage from pre-cookie auth
      localStorage.removeItem('token');

      try {
        const userData = await authService.getProfile();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        connectSocket();
      } catch {
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (user?._id) {
      joinUser(user._id);
    }
    return () => {
      if (user?._id) leaveUser(user._id);
    };
  }, [user]);

  const register = async (name, email, password) => {
    setError(null);
    try {
      const userData = await authService.register(name, email, password);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      connectSocket();
      return userData;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const userData = await authService.login(email, password);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      connectSocket();
      return userData;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('user');
      if (user?._id) leaveUser(user._id);
      disconnectSocket();
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    setError(null);
    try {
      const userData = await authService.updateProfile(data);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      const message = err.response?.data?.message || 'Profile update failed';
      setError(message);
      throw new Error(message);
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    setError(null);
    try {
      return await authService.updatePassword(currentPassword, newPassword);
    } catch (err) {
      const message = err.response?.data?.message || 'Password update failed';
      setError(message);
      throw new Error(message);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    updatePassword,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
