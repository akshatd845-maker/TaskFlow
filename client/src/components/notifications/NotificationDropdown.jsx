import React from 'react';
import NotificationItem from './NotificationItem';

const NotificationDropdown = ({
  open,
  onClose,
  loading,
  notifications,
  onMarkAll,
  onMarkRead,
  onDelete
}) => {
  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="text-sm font-medium">Notifications</div>
        <div className="flex items-center gap-2">
          <button onClick={onMarkAll} className="text-xs text-gray-500">
            Mark all
          </button>
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
            Close
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto p-2 space-y-2">
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {!loading && notifications.length === 0 && <div className="text-sm text-gray-500">No notifications</div>}
        {!loading && notifications.map((n) => (
          <NotificationItem key={n._id} n={n} onMarkRead={onMarkRead} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

export default NotificationDropdown;

