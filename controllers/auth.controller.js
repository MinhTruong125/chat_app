const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis'); // THÊM DÒNG NÀY

const secret = process.env.JWT_SECRET || 'secret_key';

exports.getLogin = (req, res) => {
  res.render('login', { title: 'Login', script: 'auth.js' });
};

exports.getRegister = (req, res) => {
  res.render('register', { title: 'Register', script: 'auth.js' });
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.render('login', { title: 'Login', error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id, username: user.username }, secret, {
    expiresIn: '1h'
  });

  
  console.log('Generated JWT token:', token); // <-- Thêm dòng này

  // ✅ LƯU TOKEN VÀO REDIS
  await redis.set(`token:${token}`, user._id.toString(), {
    EX: 60 * 60 // 1 giờ
  });  

  res.cookie('token', token, { httpOnly: false }).redirect('/posts/feeds');
};

exports.postRegister = async (req, res) => {
  const { username, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, email, passwordHash });
  await user.save();
  res.redirect('/login');
};
exports.logout = async (req, res) => {
  const token = req.cookies.token;

  if (token) {
    await redis.del(`token:${token}`);
    res.clearCookie('token');
  }

  // Logout khỏi session Passport (nếu có)
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }

    // Redirect tới URL logout của Google để đăng xuất tài khoản Google
    const googleLogoutUrl = 'https://accounts.google.com/Logout?continue=https://appengine.google.com/_ah/logout?continue=http://localhost:3000/login';
    res.redirect(googleLogoutUrl);
  });
};