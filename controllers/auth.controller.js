const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret = 'secret_key';

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
  const token = jwt.sign({ id: user._id, username: user.username }, secret);
  res.cookie('token', token).redirect('/chat');
};

exports.postRegister = async (req, res) => {
  const { username, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, email, passwordHash });
  await user.save();
  res.redirect('/login');
};

exports.logout = (req, res) => {
  res.clearCookie('token').redirect('/login');
};