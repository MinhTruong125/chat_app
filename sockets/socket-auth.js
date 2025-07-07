const jwt = require('jsonwebtoken');
const secret = 'secret_key';

const userSocketMap = new Map();

function setupSocketAuth(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    jwt.verify(token, secret, (err, user) => {
      if (err) return next(new Error("Invalid token"));

      // ✅ Gắn cả id và username vào socket.user
      socket.user = {
        id: user.id,
        username: user.username,  // Đảm bảo payload JWT có trường này
      };

      userSocketMap.set(user.id, socket.id);
      next();
    });
  });

  io.userSocketMap = userSocketMap;
}

module.exports = setupSocketAuth;
