const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const redis = require("../config/redis");

const secret = process.env.JWT_SECRET || "secret_key";

exports.verifyTokenMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    console.error("[Auth] No token provided");
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, secret);
    const userId = await redis.get(`token:${token}`);
    if (!userId) {
      console.error("[Auth] Token not found in Redis:", token);
      res.clearCookie("token");
      return res.redirect("/login");
    }

    const user = await User.findById(userId).select('username avatarUrl');
    if (!user) {
      console.error("[Auth] User not found for userId:", userId);
      res.clearCookie("token");
      return res.redirect("/login");
    }

    req.user = user;
    req.user.id = user._id.toString();
    res.locals.user = user;
    res.locals.userJSON = JSON.stringify({
      _id: user._id.toString(),
      username: user.username,
      avatarUrl: user.avatarUrl
    });
    console.log("[Auth] res.locals.userJSON:", res.locals.userJSON);

    next();
  } catch (err) {
    console.error("[Auth] Token verification error:", err.message);
    res.clearCookie("token");
    return res.redirect("/login");
  }
};