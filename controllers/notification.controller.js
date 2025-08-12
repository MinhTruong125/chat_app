const Notification = require('../models/notification.model');

exports.markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (err) {
    console.error("[markNotificationsRead] Error:", err);
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};