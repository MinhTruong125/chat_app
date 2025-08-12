const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const redis = require("../config/redis"); // Thêm dòng này
const secret = process.env.JWT_SECRET || "secret_key";

module.exports = async function (req, res, next) {
  const token = req.cookies.token;
  if (!token) return next();

  try {
    // ✅ Kiểm tra token có tồn tại trong Redis không
    const userId = await redis.get(`token:${token}`);
    if (!userId) {
      console.log("Token không tồn tại trong Redis (có thể đã bị xoá)");
      return next();
    }

    // ✅ Giải mã token để lấy thông tin user
    const decoded = jwt.verify(token, secret);

    const userDoc = await User.findById(decoded.id);
    if (userDoc) {
      const user = userDoc.toObject();
      user.id = user._id.toString();
      req.user = user;
      res.locals.user = user;
      res.locals.userJSON = JSON.stringify(user);
    }
  } catch (err) {
    console.error("attachUser error:", err);
  }

  next();
};
