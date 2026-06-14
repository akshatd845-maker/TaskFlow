import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const joinBoard = (boardId) => {
  if (!boardId) return;
  connectSocket();
  socket.emit('joinBoard', boardId);
};

export const leaveBoard = (boardId) => {
  if (!boardId) return;
  socket.emit('leaveBoard', boardId);
};

export const joinUser = (userId) => {
  if (!userId) return;
  connectSocket();
  socket.emit('joinUser', userId);
};

export const leaveUser = (userId) => {
  if (!userId) return;
  socket.emit('leaveUser', userId);
};

export default socket;
