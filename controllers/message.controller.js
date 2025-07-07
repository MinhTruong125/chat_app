const redis = require('../config/redis');
const Message = require('../models/message.model');

exports.getMessages = async (req, res) => {
  const messages = await Message.find({
    $or: [
      { from: req.user.id, to: req.params.id },
      { from: req.params.id, to: req.user.id }
    ]
  });
  res.json(messages);
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
