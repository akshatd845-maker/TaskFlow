import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { emitNotification } from '../socket.js';
import { canAccessTaskOrCard } from '../utils/boardAccess.js';

// @desc Create comment
// @route POST /api/comments
// @access Private
export const createComment = async (req, res) => {
  try {
    // Support both 'text' (legacy) and 'content' (validator) field names
    const { taskId, text, content } = req.body;
    const commentText = text || content;

    if (!taskId || !commentText) {
      return res.status(400).json({ message: 'taskId and text are required' });
    }

    const access = await canAccessTaskOrCard(taskId, req.user._id);
    if (!access) {
      return res.status(403).json({ message: 'Not authorized to comment on this item' });
    }

    const { type, target } = access;

    const comment = await Comment.create({ taskId, userId: req.user._id, text: commentText });
    await comment.populate('userId', 'name email avatar');

    try {
      const recipients = new Set();

      if (type === 'task') {
        (target.assignedTo || []).forEach((u) => recipients.add(u.toString()));
      } else {
        (target.assignedTo || []).forEach((u) => recipients.add(u.toString()));
        if (target.list?.board) {
          const board = target.list.board;
          recipients.add(board.owner.toString());
          (board.members || []).forEach((m) => recipients.add(m.user.toString()));
        }
      }

      recipients.delete(req.user._id.toString());

      for (const userId of recipients) {
        const n = await Notification.create({
          user: userId,
          actor: req.user._id,
          type: 'comment_added',
          message: `${req.user.name} commented on ${type}`,
          referenceId: taskId,
          data: { text: commentText }
        });
        // FIXED: Use emitNotification which uses correct 'user:${userId}' room
        emitNotification(userId, n);
      }
    } catch (e) {
      console.error('Notification creation failed', e.message);
    }

    try {
      const { getIO } = await import('../socket.js');
      const io = getIO();
      if (type === 'card' && target.list?.board && io) {
        io.to(`board:${target.list.board._id.toString()}`).emit('commentAdded', { comment, taskId });
      }
    } catch (e) {
      console.error('Emit commentAdded error', e.message);
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get comments for a task or card
// @route GET /api/comments/task/:taskId
// @access Private
export const getCommentsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const access = await canAccessTaskOrCard(taskId, req.user._id);
    if (!access) {
      return res.status(403).json({ message: 'Not authorized to view these comments' });
    }

    const comments = await Comment.find({ taskId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email avatar');
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete comment
// @route DELETE /api/comments/:id
// @access Private
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
