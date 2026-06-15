import Notification from '../models/Notification.js';
import notificationRepository from '../repositories/notificationRepository.js';
import { getIO } from '../socket.js';
import logger from '../config/logger.js';

// ─── Internal Emit Helper ─────────────────────────────────────────────────────

/**
 * Tries to emit a socket event to a specific user room.
 * Errors are swallowed so they never break the main request flow.
 */
const emitToUser = (userId, event, payload) => {
  try {
    const io = getIO();
    if (io) io.to(`user:${userId.toString()}`).emit(event, payload);
  } catch (e) {
    logger.error(`[socket] emit "${event}" to user:${userId} failed`, { error: e.message });
  }
};

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Creates a single notification and emits it over the socket.
 * Safe to call from any other service — never throws (errors are logged only).
 */
export const notify = async ({ userId, actorId, type = 'custom', message, referenceId, data }) => {
  try {
    const n = await Notification.create({
      user: userId,
      actor: actorId,
      type,
      message,
      referenceId,
      data
    });
    emitToUser(userId, 'notification', n);
    return n;
  } catch (e) {
    logger.error('[notificationService] create failed', { error: e.message });
    return null;
  }
};

/**
 * Notifies multiple recipients (excluding the actor) in bulk.
 */
export const notifyMany = async ({ userIds, actorId, type = 'custom', message, referenceId, data }) => {
  const uniqueIds = [...new Set(
    userIds.map((id) => id.toString()).filter((id) => id !== actorId.toString())
  )];

  await Promise.allSettled(
    uniqueIds.map((userId) =>
      notify({ userId, actorId, type, message, referenceId, data })
    )
  );
};

// ─── User-facing Service Methods ─────────────────────────────────────────────

/**
 * Fetches paginated notifications for a user.
 */
export const getNotificationsForUser = async (userId, { limit = 100 } = {}) => {
  return notificationRepository.findByUser(userId, limit);
};

/**
 * Gets the unread notification count for a user.
 */
export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ user: userId, isRead: false });
};

/**
 * Marks a single notification as read; enforces ownership.
 */
export const markNotificationRead = async (notificationId, userId) => {
  const n = await Notification.findOne({ _id: notificationId, user: userId });
  if (!n) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  n.isRead = true;
  return n.save();
};

/**
 * Marks all of a user's unread notifications as read.
 */
export const markAllNotificationsRead = async (userId) => {
  return Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
};

/**
 * Deletes a single notification; enforces ownership.
 */
export const deleteNotificationById = async (notificationId, userId) => {
  const n = await Notification.findOne({ _id: notificationId, user: userId });
  if (!n) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  await n.deleteOne();
};

/**
 * Creates a user-initiated custom notification (self-notification for testing/demo).
 */
export const createUserNotification = async ({ userId, type, message, referenceId, data }) => {
  if (!message) {
    const err = new Error('message required');
    err.statusCode = 400;
    throw err;
  }
  return notify({ userId, actorId: userId, type, message, referenceId, data });
};
