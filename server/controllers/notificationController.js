import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';

// Create notification (self only — system events use controllers directly)
export const createNotification = async (req, res) => {
  try {
    const { type, message, referenceId, data } = req.body;
    if (!message) return res.status(400).json({ message: 'message required' });

    const n = await Notification.create({
      user: req.user._id,
      actor: req.user._id,
      type,
      message,
      referenceId,
      data
    });

    // emit to user room
    try {
      const io = getIO();
      if (io) io.to(`user:${req.user._id.toString()}`).emit('notification', n);
    } catch (e) {
      console.error('Notification emit failed', e.message);
    }

    res.status(201).json(n);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    n.isRead = true;
    await n.save();
    res.json(n);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
    res.json({ message: 'All marked read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    await n.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
