import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data)
};

// Board API
export const boardAPI = {
  getAll: () => api.get('/boards'),
  getOne: (id) => api.get(`/boards/${id}`),
  create: (data) => api.post('/boards', data),
  update: (id, data) => api.put(`/boards/${id}`, data),
  delete: (id) => api.delete(`/boards/${id}`),
  addMember: (id, data) => api.post(`/boards/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/boards/${id}/members/${userId}`)
};

// List API
export const listAPI = {
  create: (data) => api.post('/lists', data),
  update: (id, data) => api.put(`/lists/${id}`, data),
  delete: (id) => api.delete(`/lists/${id}`),
  reorder: (data) => api.put('/lists/reorder', data)
};

// Card API
export const cardAPI = {
  getAll: (params) => api.get('/cards', { params }),
  create: (data) => api.post('/cards', data),
  getOne: (id) => api.get(`/cards/${id}`),
  update: (id, data) => api.put(`/cards/${id}`, data),
  delete: (id) => api.delete(`/cards/${id}`),
  move: (id, data) => api.put(`/cards/${id}/move`, data),
  addComment: (id, text) => api.post(`/cards/${id}/comments`, { text }),
  assignUser: (id, userId) => api.put(`/cards/${id}/assign`, { userId }),
  unassignUser: (id, userId) => api.put(`/cards/${id}/unassign`, { userId })
};

// Project API
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  getBoard: (id) => api.get(`/projects/${id}/board`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getTeam: (id, params) => api.get(`/projects/${id}/members`, { params }),
  addMember: (id, email, role) => api.post(`/projects/${id}/members`, { email, role }),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) => api.put(`/projects/${id}/members/${userId}`, { role })
};

// Comment API
export const commentAPI = {
  create: (data) => api.post('/comments', data),
  getByTask: (taskId) => api.get(`/comments/task/${taskId}`),
  delete: (id) => api.delete(`/comments/${id}`)
};

// Notification API
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export default api;
