import {
  createUserNotification,
  getNotificationsForUser,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById
} from '../services/notificationService.js';
import logger from '../config/logger.js';

// ─── Error Handler ────────────────────────────────────────────────────────────

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  logger.error(error.message, { error: error.stack });
  return res.status(status).json({ message: error.message });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Create notification (self only — system events use services directly)
// @route   POST /api/notifications
// @access  Private
export const createNotification = async (req, res) => {
  try {
    const { type, message, referenceId, data } = req.body;
    const n = await createUserNotification({
      userId: req.user._id,
      type,
      message,
      referenceId,
      data
    });
    res.status(201).json(n);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const notifications = await getNotificationsForUser(req.user._id);
    res.json(notifications);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCountController = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const n = await markNotificationRead(req.params.id, req.user._id);
    res.json(n);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllRead = async (req, res) => {
  try {
    await markAllNotificationsRead(req.user._id);
    res.json({ message: 'All marked read' });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    await deleteNotificationById(req.params.id, req.user._id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    handleServiceError(res, error);
  }
};
