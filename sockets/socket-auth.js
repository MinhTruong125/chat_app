const jwt = require("jsonwebtoken");
const redis = require("../config/redis");

const secret = process.env.JWT_SECRET || "secret_key";

const userSocketMap = new Map();

function setupSocketAuth(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = jwt.verify(token, secret);

      // Kiểm tra token có trong Redis không
      const userId = await redis.get(`token:${token}`);
      if (!userId) return next(new Error("Token bị thu hồi hoặc hết hạn"));

      socket.user = {
        id: decoded.id,
        username: decoded.username || userInDb?.username
      };

      userSocketMap.set(decoded.id, socket.id, );
      next(); 
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.userSocketMap = userSocketMap;
}

module.exports = setupSocketAuth;
