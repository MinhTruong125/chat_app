const Message = require('../models/message.model');
const redis = require('../config/redis');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('[CHAT] User connected:', socket.user?.id, socket.id);

    socket.on('private_message', async ({ to, content }) => {
      const from = socket.user.id;
      const newMsg = new Message({ from, to, content });
      await newMsg.save();

      // Tăng số lượng tin nhắn chưa đọc cho người nhận
      await redis.incr(`unread:${to}:${from}`);

      // Lưu tin nhắn cuối theo cả 2 chiều
      const payload = JSON.stringify({
        content,
        from,
        to,
        createdAt: new Date()
      });

      await redis.set(`lastmsg:${to}:${from}`, payload);
      await redis.set(`lastmsg:${from}:${to}`, payload);

      const toSocketId = io.userSocketMap.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit('private_message', { from, content });
      }
      const fromSocketId = io.userSocketMap.get(from);
      if (fromSocketId) {
        io.to(fromSocketId).emit('private_message', { from, content });
      }
    });
    socket.on("mark_read", async ({ from }) => {
      const key = `unread:${socket.user.id}:${from}`;
      await redis.set(key, 0);
    });

    socket.on("typing", ({ to }) => {
      const toSocketId = io.userSocketMap.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("typing", {
          from: socket.user.id,
          fromName: socket.user.username // ✅ gửi kèm tên
        });
      }
    });

    socket.on("stop_typing", ({ to }) => {
      const toSocketId = io.userSocketMap.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("stop_typing", { from: socket.user.id });
      }
    });

    socket.on('disconnect', () => {
      io.userSocketMap.delete(socket.user.id);
      console.log('[CHAT] User disconnected:', socket.user?.id);
    });
  });
};
