const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const secret = process.env.JWT_SECRET || 'secret_key';

module.exports = (io) => {
  io.userSocketMap = new Map(); // userId => socket.id

  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth?.userId;
    const token = socket.handshake.auth?.token;

    if (!userId && token) {
      try {
        const decoded = jwt.verify(token, secret);
        const redisUserId = await redis.get(`token:${token}`);
        if (redisUserId && redisUserId === decoded.id.toString()) {
          socket.handshake.auth.userId = decoded.id.toString();
        }
      } catch (err) {
        console.error(`[SOCKET] Invalid token for socket ${socket.id}:`, err.message);
      }
    }

    if (socket.handshake.auth.userId) {
      socket.join(socket.handshake.auth.userId);
      io.userSocketMap.set(socket.handshake.auth.userId, socket.id);
      console.log(`[SOCKET] User ${socket.handshake.auth.userId} connected with socket ${socket.id}`);
    } else {
      console.error(`[SOCKET] No userId provided for socket ${socket.id}`);
    }

    socket.on('join_post', (postId) => {
      if (postId) {
        socket.join(`post_${postId}`);
        console.log(`[SOCKET] User ${socket.handshake.auth.userId || 'undefined'} joined post_${postId}`);
      } else {
        console.error(`[SOCKET] Invalid postId for socket ${socket.id}`);
      }
    });

    socket.on('leave_post', (postId) => {
      if (postId) {
        socket.leave(`post_${postId}`);
        console.log(`[SOCKET] User ${socket.handshake.auth.userId || 'undefined'} left post_${postId}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.handshake.auth.userId) {
        io.userSocketMap.delete(socket.handshake.auth.userId);
        console.log(`[SOCKET] User ${socket.handshake.auth.userId} disconnected`);
      }
    });
  });
};