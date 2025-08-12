const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment'], required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  from: { type: String, required: true },
  fromId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', notificationSchema);