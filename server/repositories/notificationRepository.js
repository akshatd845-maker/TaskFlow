import Notification from '../models/Notification.js';

class NotificationRepository {
  async findById(id) {
    return Notification.findById(id);
  }

  async findOne(query = {}) {
    return Notification.findOne(query);
  }

  async find(query = {}, sort = { createdAt: -1 }, limit = 100) {
    return Notification.find(query).sort(sort).limit(limit);
  }

  /**
   * Convenience method: fetch all notifications for a user, newest first.
   */
  async findByUser(userId, limit = 100) {
    return Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async count(query = {}) {
    return Notification.countDocuments(query);
  }

  async create(notificationData) {
    return Notification.create(notificationData);
  }

  async updateMany(query = {}, updateData = {}) {
    return Notification.updateMany(query, updateData);
  }

  async delete(id) {
    return Notification.findByIdAndDelete(id);
  }
}

export default new NotificationRepository();
