const redis = require('../config/redis');
const Message = require('../models/message.model');

exports.getMessages = async (req, res) => {
  const { limit = 10, before } = req.query;
  const query = {
    $or: [
      { from: req.user.id, to: req.params.id },
      { from: req.params.id, to: req.user.id }
    ]
  };
  if (before) {
    query._id = { $lt: before }; // Giả sử _id tăng dần theo thời gian
  }
  const messages = await Message.find(query)
    .sort({ _id: -1 }) // Mới nhất trước
    .limit(parseInt(limit));
  res.json(messages.reverse()); // Đảo lại để cũ nhất lên đầu
};

exports.markAsRead = async (req, res) => {
  const key = `unread:${req.user.id}:${req.params.id}`;
  await redis.del(key);
  res.sendStatus(200);
};

exports.getUnreadCount = async (req, res) => {
  const key = `unread:${req.user.id}:${req.params.id}`;
  const count = parseInt(await redis.get(key)) || 0;
  res.json({ count });
};
