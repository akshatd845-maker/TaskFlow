import React, { useEffect, useState } from 'react';
import socket, { connectSocket } from '../../services/socket';
import { notificationService } from '../../services/notificationService';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.data);

      const countRes = await notificationService.getUnreadCount();
      setUnread(countRes.data.count || 0);
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    connectSocket();
    fetchAll();

    const onNotification = (n) => {
      setNotifications((prev) => [n, ...prev]);
      if (!n.isRead) setUnread((u) => u + 1);
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
    };
  }, []);

  const handleMarkRead = async (id) => {
    await notificationService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAll = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const handleDelete = async (id) => {
    await notificationService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    setUnread((prev) => {
      const deletedWasUnread = notifications.find((x) => x._id === id && !x.isRead);
      return deletedWasUnread ? Math.max(0, prev - 1) : prev;
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
            {unread}
          </span>
        )}
      </button>

      <NotificationDropdown
        open={open}
        onClose={() => setOpen(false)}
        loading={loading}
        notifications={notifications}
        onMarkAll={handleMarkAll}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default NotificationBell;

