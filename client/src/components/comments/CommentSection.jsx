import React, { useEffect, useState } from 'react';
import { commentAPI } from '../../services/api';
import CommentForm from './CommentForm';
import CommentList from './CommentList';
import socket from '../../services/socket';

const CommentSection = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await commentAPI.getByTask(taskId);
      setComments(res.data);
    } catch (err) {
      console.error('Error fetching comments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    fetch();
    const onComment = (payload) => {
      try {
        if (!payload) return;
        if (String(payload.taskId) === String(taskId)) {
          // If payload contains comment object
          const newComment = payload.comment && payload.comment._id ? payload.comment : null;
          if (newComment) setComments(prev => [newComment, ...prev]);
          else fetch();
        }
      } catch (e) { console.error(e); }
    };

    socket.on('commentAdded', onComment);
    return () => { socket.off('commentAdded', onComment); };
  }, [taskId]);

  const handleSubmit = async (text) => {
    setPosting(true);
    try {
      const res = await commentAPI.create({ taskId, text });
      setComments(prev => [res.data, ...prev]);
    } catch (err) {
      console.error('Error posting comment', err);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await commentAPI.delete(id);
      setComments(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      console.error('Error deleting comment', err);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Comments</h3>
      <CommentForm onSubmit={handleSubmit} loading={posting} />
      <div className="mt-4">
        {loading ? <p className="text-sm text-gray-500">Loading comments...</p> : (
          <CommentList comments={comments} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
};

export default CommentSection;
