const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  email: { type: String, required: true, unique: true },
  passwordHash: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  avatarUrl: { type: String, default: "/images/default-avatar.png" },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  googleId: String,
  avatar: String,
});
module.exports = mongoose.model('User', UserSchema);
