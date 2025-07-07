const jwt = require('jsonwebtoken');
const secret = 'secret_key';

exports.verifyTokenMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');
  jwt.verify(token, secret, (err, decoded) => {
    if (err) return res.redirect('/login');
    req.user = decoded;
    next();
  });
};