import { io } from 'socket.io-client';

let socket = null;

const getSocket = () => {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    return null;
  }

  if (!socket) {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '');
    socket = io(baseUrl, {
      transports: ['websocket'],
      auth: { token }
    });
  }

  return socket;
};

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export { disconnectSocket, getSocket };
