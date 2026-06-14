import React from 'react';
import dayjs from 'dayjs';

const CommentList = ({ comments, onDelete }) => {
  return (
    <div className="space-y-3">
      {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet</p>}
      {comments.map((c) => (
        <div key={c._id} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                {c.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{c.userId?.name || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{dayjs(c.createdAt).format('MMM D, YYYY h:mm A')}</div>
              </div>
            </div>
            {onDelete && (
              <button onClick={() => onDelete(c._id)} className="text-red-500 text-sm">Delete</button>
            )}
          </div>
          <div className="text-sm text-gray-700">{c.text}</div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
