// const Like = require('../models/like.model');
// const Comment = require('../models/comment.model');
// const Notification = require('../models/notification.model');
// const Post = require('../models/post.model');

// exports.addComment = async (req, res) => {
//   try {
//     const { content } = req.body;
//     const postId = req.params.postId;
//     const userId = req.user._id;

//     const comment = await Comment.create({ post: postId, user: userId, content });

//     await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

//     const post = await Post.findById(postId);

//     if (post.user.toString() !== userId.toString()) {
//       await Notification.create({
//         recipient: post.user,
//         sender: userId,
//         type: 'comment',
//         post: postId
//       });

//       req.io.to(post.user.toString()).emit('new_notification', {
//         type: 'comment',
//         from: userId,
//         postId
//       });
//     }

//     req.io.to(postId.toString()).emit('new_comment', {
//       postId,
//       comment
//     });

//     res.status(200).json({ message: 'Comment added', comment });
//   } catch (err) {
//     res.status(500).json({ message: 'Error adding comment', error: err.message });
//   }
// };

// exports.toggleLike = async (req, res) => {
//   try {
//     const postId = req.params.postId;
//     const userId = req.user._id;

//     const existingLike = await Like.findOne({ post: postId, user: userId });

//     if (existingLike) {
//       await existingLike.deleteOne();
//       await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

//       res.json({ liked: false });
//     } else {
//       await Like.create({ post: postId, user: userId });
//       await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

//       const post = await Post.findById(postId);
//       if (post.user.toString() !== userId.toString()) {
//         await Notification.create({
//           recipient: post.user,
//           sender: userId,
//           type: 'like',
//           post: postId
//         });

//         req.io.to(post.user.toString()).emit('new_notification', {
//           type: 'like',
//           from: userId,
//           postId
//         });
//       }

//       req.io.to(postId.toString()).emit('new_like', {
//         postId,
//         userId
//       });

//       res.json({ liked: true });
//     }
//   } catch (err) {
//     res.status(500).json({ message: 'Error toggling like', error: err.message });
//   }
// };