import { notificationAPI } from './api';

export const notificationService = {
  getNotifications: () => notificationAPI.getAll(),
  getUnreadCount: () => notificationAPI.getUnreadCount(),
  markRead: (id) => notificationAPI.markRead(id),
  markAllRead: () => notificationAPI.markAllRead(),
  deleteNotification: (id) => notificationAPI.delete(id)
};

