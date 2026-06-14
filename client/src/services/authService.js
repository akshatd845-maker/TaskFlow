import { authAPI } from './api';

export const authService = {
  register: async (name, email, password) => {
    const response = await authAPI.register({ name, email, password });
    return response.data;
  },

  login: async (email, password) => {
    const response = await authAPI.login({ email, password });
    return response.data;
  },

  logout: async () => {
    const response = await authAPI.logout();
    return response.data;
  },

  getProfile: async () => {
    const response = await authAPI.getMe();
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await authAPI.updateProfile(data);
    return response.data;
  },

  updatePassword: async (currentPassword, newPassword) => {
    const response = await authAPI.updatePassword({ currentPassword, newPassword });
    return response.data;
  }
};

export default authService;
