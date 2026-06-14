import React from 'react';

const timeAgo = (dateInput) => {
  if (!dateInput) return '';
  const ts = new Date(dateInput).getTime();
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

const NotificationItem = ({ n, onMarkRead, onDelete }) => {
  const isRead = !!n.isRead;

  return (
    <div className={`p-2 rounded-lg ${isRead ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-gray-800">{n.message}</div>
          <div className="text-xs text-gray-500">{timeAgo(n.createdAt || n?.created_at)}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!isRead && (
            <button onClick={() => onMarkRead(n._id)} className="text-xs text-blue-600">
              Mark
            </button>
          )}
          <button onClick={() => onDelete(n._id)} className="text-xs text-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;

