const User = require('../models/user.model');
const redis = require('../config/redis');

exports.searchUsers = async (req, res) => {
  const { q } = req.query;
  const query = q ? { username: { $regex: q, $options: 'i' } } : {};
  const users = await User.find(query, '_id username friends pendingRequests sentRequests');
  res.json(users);
};

exports.sendRequest = async (req, res) => {
  const receiver = await User.findById(req.params.id);
  const sender = await User.findById(req.user.id);
  if (!receiver || !sender) return res.status(400).json({ message: 'User not found' });

  if (!receiver.pendingRequests.includes(sender._id)) {
    receiver.pendingRequests.push(sender._id);
  }
  if (!sender.sentRequests.includes(receiver._id)) {
    sender.sentRequests.push(receiver._id);
  }

  await receiver.save();
  await sender.save();

  // Emit socket.io realtime
  const io = req.app.get('io');
  const toSocketId = io.userSocketMap?.get(receiver._id.toString());
  if (toSocketId) {
    io.to(toSocketId).emit('friend_request', {
      from: sender._id,
      fromName: sender.username
    });
    console.log("[EMIT] Sent friend_request to", toSocketId);
  } else {
    console.log("[WARN] SocketId not found for", receiver._id.toString());
  }

  res.json({ message: 'Friend request sent' });
};


exports.acceptRequest = async (req, res) => {
  const receiver = await User.findById(req.user.id);
  const sender = await User.findById(req.params.id);
  if (!receiver || !sender) return res.status(400).json({ message: 'User not found' });

  if (!receiver.friends.includes(sender._id)) {
    receiver.friends.push(sender._id);
  }
  if (!sender.friends.includes(receiver._id)) {
    sender.friends.push(receiver._id);
  }

  receiver.pendingRequests = receiver.pendingRequests.filter(id => !id.equals(sender._id));
  sender.sentRequests = sender.sentRequests.filter(id => !id.equals(receiver._id));

  await receiver.save();
  await sender.save();

  res.json({ message: 'Friend added' });

};

exports.declineRequest = async (req, res) => {
    const receiver = await User.findById(req.user.id);
    const sender = await User.findById(req.params.id);
    if (!receiver || !sender) return res.status(400).json({ message: 'User not found' });

    receiver.pendingRequests = receiver.pendingRequests.filter(id => !id.equals(sender._id));
    sender.sentRequests = sender.sentRequests.filter(id => !id.equals(receiver._id));

    await receiver.save();
    await sender.save();

    res.json({ message: 'Friend request declined' });
  };

exports.unfriend = async (req, res) => {
  const user = await User.findById(req.user.id);
  const target = await User.findById(req.params.id);
  if (!user || !target) return res.status(400).json({ message: "User not found" });

  user.friends = user.friends.filter(id => !id.equals(target._id));
  target.friends = target.friends.filter(id => !id.equals(user._id));

  await user.save();
  await target.save();

  res.json({ message: "Unfriended" });
};

exports.getPendingRequests = async (req, res) => {
  const user = await User.findById(req.user.id).populate('pendingRequests', '_id username');
  res.json(user.pendingRequests);
};

exports.getChatData = async (req, res) => {
  const currentUser = await User.findById(req.user.id).populate('friends', '_id username');

  const friends = await Promise.all(currentUser.friends.map(async (friend) => {
    const lastKey = `lastmsg:${req.user.id}:${friend._id}`; // chú ý chiều
    const unreadKey = `unread:${req.user.id}:${friend._id}`;

    const lastMessageRaw = await redis.get(lastKey);
    const unreadCountRaw = await redis.get(unreadKey);

    let lastMessage = "";
    let isOwnMessage = false;

    try {
      const parsed = JSON.parse(lastMessageRaw);
      lastMessage = parsed.content;
      isOwnMessage = parsed.from === req.user.id;
    } catch (err) {
      lastMessage = lastMessageRaw || "";
    }

    const unread = isOwnMessage ? 0 : parseInt(unreadCountRaw || 0);

    return {
      _id: friend._id,
      username: friend.username,
      lastMessage: isOwnMessage ? `Bạn: ${lastMessage}` : lastMessage,
      unread
    };
  }));

  res.json(friends);
};

