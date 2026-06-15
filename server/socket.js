/**
 * TaskFlow Socket.IO Server
 *
 * Production-hardened WebSocket implementation with:
 * - JWT authentication
 * - Connection rate limiting
 * - Room management
 * - Standardized event payloads
 * - Memory leak prevention
 * - Reconnection handling
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Board from './models/Board.js';
import { isBoardMember } from './utils/boardAccess.js';
import { getTokenFromSocketHandshake } from './utils/authCookie.js';
import logger from './config/logger.js';
import { socketLimiter } from './config/rateLimiter.js';

let io;

// Track online users: userId -> Set(socketId)
const onlineUsers = new Map();

// Track socket to user mapping for quick lookup
const socketToUser = new Map();

// Maximum sockets per user to prevent abuse
const MAX_SOCKETS_PER_USER = 5;

// Standard event payload wrapper
const createPayload = (event, data) => ({
  event,
  data,
  timestamp: new Date().toISOString()
});

// Validation helpers
const isValidObjectId = (id) => {
  try {
    return id && /^[a-f\d]{24}$/i.test(String(id));
  } catch {
    return false;
  }
};

export const initSocket = (httpServer) => {
  // Strict production CORS for Socket.IO
  const isProduction = process.env.NODE_ENV === 'production';
  const clientUrl = process.env.CLIENT_URL;

  // In production, require CLIENT_URL
  if (isProduction && !clientUrl) {
    throw new Error('CLIENT_URL is required in production for Socket.IO CORS');
  }

  // Development allowed origins
  const allowedOrigins = isProduction
    ? [clientUrl]
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        clientUrl // Also allow explicit client URL in development
      ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    transports: ['websocket', 'polling'],
    // Prevent connection floods
    maxHttpBufferSize: 1e6 // 1MB
  });

  // Wire connection rate limiting
  socketLimiter(io);

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = getTokenFromSocketHandshake(socket);
      if (!token) {
        logger.warn('Socket auth failed: No token', { socketId: socket.id });
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email');

      if (!user) {
        logger.warn('Socket auth failed: User not found', {
          socketId: socket.id,
          userId: decoded.id
        });
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = {
        _id: user._id,
        name: user.name,
        email: user.email
      };

      logger.debug('Socket authenticated', {
        socketId: socket.id,
        userId: user._id
      });

      next();
    } catch (error) {
      logger.warn('Socket auth error', {
        socketId: socket.id,
        error: error.message
      });
      next(new Error('Not authorized'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    logger.info('Socket connected', {
      socketId: socket.id,
      userId
    });

    // Track socket to user mapping
    socketToUser.set(socket.id, userId);

    // Join user's personal notification room
    socket.join(`user:${userId}`);

    // Track online users
    const userSockets = onlineUsers.get(userId) || new Set();

    // Prevent excessive socket connections per user
    if (userSockets.size >= MAX_SOCKETS_PER_USER) {
      logger.warn('Too many sockets for user', {
        userId,
        count: userSockets.size
      });
      socket.emit('error', createPayload('error', { message: 'Too many connections' }));
      socket.disconnect(true);
      return;
    }

    userSockets.add(socket.id);
    onlineUsers.set(userId, userSockets);

    // Broadcast user online status
    io.emit('userOnline', createPayload('userOnline', { userId, count: getOnlineCount() }));

    // Send online count to the new connection
    socket.emit('onlineUsersCount', createPayload('onlineUsersCount', { count: getOnlineCount() }));

    // Handle board room joining
    socket.on('joinBoard', async (boardId) => {
      if (!isValidObjectId(boardId)) {
        socket.emit('error', createPayload('error', { message: 'Invalid board ID' }));
        return;
      }

      try {
        const board = await Board.findById(boardId);
        if (!board) {
          socket.emit('error', createPayload('error', { message: 'Board not found' }));
          return;
        }

        if (!isBoardMember(board, socket.user._id)) {
          socket.emit('error', createPayload('error', { message: 'Not authorized' }));
          return;
        }

        const room = `board:${boardId}`;
        socket.join(room);
        logger.debug('Socket joined board', { userId, boardId });

        socket.emit('joinedBoard', createPayload('joinedBoard', { boardId }));
      } catch (error) {
        logger.error('joinBoard error', { error: error.message });
        socket.emit('error', createPayload('error', { message: 'Failed to join board' }));
      }
    });

    // Handle board room leaving
    socket.on('leaveBoard', (boardId) => {
      if (!isValidObjectId(boardId)) return;

      const room = `board:${boardId}`;
      socket.leave(room);
      logger.debug('Socket left board', { userId, boardId });
    });

    // Handle card updates in a board
    socket.on('cardUpdated', (data) => {
      const { boardId, cardId } = data || {};
      if (!isValidObjectId(boardId) || !isValidObjectId(cardId)) return;

      // Only emit to board room
      io.to(`board:${boardId}`).emit(
        'cardUpdated',
        createPayload('cardUpdated', {
          cardId,
          updatedBy: userId,
          ...data
        })
      );
    });

    // Handle card moved events
    socket.on('cardMoved', (data) => {
      const { boardId, cardId, fromList, toList, position } = data || {};
      if (!isValidObjectId(boardId)) return;

      io.to(`board:${boardId}`).emit(
        'cardMoved',
        createPayload('cardMoved', {
          cardId,
          fromList,
          toList,
          position,
          movedBy: userId
        })
      );
    });

    // Handle new card events
    socket.on('cardCreated', (data) => {
      const { boardId, card } = data || {};
      if (!isValidObjectId(boardId)) return;

      io.to(`board:${boardId}`).emit(
        'cardCreated',
        createPayload('cardCreated', { card, createdBy: userId })
      );
    });

    // Handle card deleted events
    socket.on('cardDeleted', (data) => {
      const { boardId, cardId } = data || {};
      if (!isValidObjectId(boardId) || !isValidObjectId(cardId)) return;

      io.to(`board:${boardId}`).emit(
        'cardDeleted',
        createPayload('cardDeleted', { cardId, deletedBy: userId })
      );
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId,
        reason
      });

      // Clean up socket to user mapping
      socketToUser.delete(socket.id);

      // Remove from user's socket set
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('userOffline', createPayload('userOffline', { userId }));
        }
      }

      // Broadcast updated online count
      io.emit('onlineUsersCount', createPayload('onlineUsersCount', { count: getOnlineCount() }));
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        error: error.message
      });
    });
  });

  // Periodic cleanup of stale entries
  setInterval(() => {
    cleanupStaleConnections();
  }, 5 * 60 * 1000); // Every 5 minutes

  return io;
};

/**
 * Get count of unique online users
 */
const getOnlineCount = () => onlineUsers.size;

/**
 * Clean up stale socket connections
 */
const cleanupStaleConnections = () => {
  let cleaned = 0;

  for (const [userId, sockets] of onlineUsers.entries()) {
    // Filter out any stale socket IDs
    const activeSockets = [...sockets].filter((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      return socket && socket.connected;
    });

    if (activeSockets.length !== sockets.size) {
      if (activeSockets.length === 0) {
        onlineUsers.delete(userId);
        io.emit('userOffline', createPayload('userOffline', { userId }));
      } else {
        onlineUsers.set(userId, new Set(activeSockets));
      }
      cleaned += sockets.size - activeSockets.length;
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned stale connections', { count: cleaned });
  }
};

/**
 * Emit notification to specific user
 */
export const emitNotification = (userId, notification) => {
  if (!io || !userId) return;

  const payload = createPayload('notification', notification);
  io.to(`user:${userId}`).emit('notification', payload);
};

/**
 * Emit to all members of a board
 */
export const emitToBoard = (boardId, event, data) => {
  if (!io || !boardId) return;

  io.to(`board:${boardId}`).emit(event, createPayload(event, data));
};

/**
 * Get IO instance
 */
export const getIO = () => io;