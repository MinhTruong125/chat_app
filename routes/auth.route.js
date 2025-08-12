const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const passport = require('passport');
const jwt = require("jsonwebtoken"); 
const secret = process.env.JWT_SECRET || "secret_key";
const redis = require('../config/redis');
    
router.get('/login', ctrl.getLogin);
router.post('/login', ctrl.postLogin);
router.get('/register', ctrl.getRegister);
router.post('/register', ctrl.postRegister);
router.post('/logout', ctrl.logout);

// Login bằng Google
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', }),
  async(req, res) => {
    // Tạo token JWT
    const token = jwt.sign({ id: req.user._id }, secret, { expiresIn: "7d" });  
    console.log('Token', token)

    // LƯU TOKEN VÀO REDIS
    await redis.set(`token:${token}`, req.user._id.toString(), {
    EX: 7 * 24 * 60 * 60, // 7 ngày
    });
    
    // Gửi token vào cookie
    res.cookie("token", token,   {
      
      secure: false, // Đổi thành true nếu dùng HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    }).redirect('/posts/feeds');
  }
);

module.exports = router;