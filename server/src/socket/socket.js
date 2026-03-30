import jwt from 'jsonwebtoken';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const initSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user?.role === 'ADMIN') {
      socket.disconnect(true);
      return;
    }

    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) {
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return;
        }

        const canJoin = conversation.participants.some((item) => item.toString() === socket.user.id);
        if (!canJoin) {
          return;
        }

        socket.join(conversationId);
      } catch (error) {
      }
    });

    socket.on('send_message', async ({ conversationId, text }) => {
      try {
        if (!conversationId || !text) {
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return;
        }

        const canSend = conversation.participants.some((item) => item.toString() === socket.user.id);
        if (!canSend) {
          return;
        }

        const message = await Message.create({
          conversationId,
          senderId: socket.user.id,
          text,
          isRead: false
        });

        conversation.lastMessage = text;
        conversation.updatedAt = new Date();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id).populate('senderId', 'fullName role avatar');

        io.to(conversationId).emit('receive_message', populatedMessage);
      } catch (error) {
      }
    });
  });
};

export default initSocket;
