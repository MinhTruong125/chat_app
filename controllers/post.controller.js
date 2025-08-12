const Post = require('../models/post.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { uploadToMinIO } = require('../config/minio');

exports.getCreatePostPage = (req, res) => {
  res.render('new-post', {
    title: 'Đăng bài viết',
    user: req.user,
    userJSON: JSON.stringify(req.user),
    script: 'post.route.js'
  });
};

exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const imageUrl = await uploadToMinIO(req.file);

    const post = new Post({
      author: req.user.id,
      content,
      imageUrl,
      createdAt: new Date()
    });

    await post.save();
    res.redirect('/posts/feeds');
  } catch (err) {
    console.error("Lỗi khi đăng bài:", err);
    res.status(500).send("Lỗi khi đăng bài");
  }
};

exports.getFeeds = async (req, res) => {
  try {
    if (!req.user) {
      console.error("[getFeeds] req.user is undefined");
      return res.redirect('/login');
    }
    console.log("[getFeeds] req.user:", req.user);

    const posts = await Post.find()
      .populate([
        { path: 'author', select: 'username avatarUrl' },
        { path: 'comments.author', select: 'username avatarUrl' }
      ])
      .sort({ createdAt: -1 });

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.render('feeds', {
      title: 'Bảng Tin',
      posts,
      user: req.user,
      notifications,
      userJSON: JSON.stringify({
        _id: req.user._id.toString(),
        username: req.user.username,
        avatarUrl: req.user.avatarUrl
      })
    });
  } catch (err) {
    console.error("Lỗi khi tải feeds:", err);
    res.status(500).send("Không thể tải bảng tin");
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user.id;
    const liked = post.likes.includes(userId);
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }
    await post.save();
    const likeCount = post.likes.length;

    res.json({ likes: likeCount, liked: !liked });

    const io = req.app.get("io");

    io.to(`post_${post._id}`).emit("post_liked", {
      postId: post._id,
      likes: likeCount,
      liker: req.user.username,
      
    });

    if (!liked && post.author._id.toString() !== userId) {
      const ownerId = post.author._id.toString();
      const notification = new Notification({
        userId: ownerId,
        type: "like",
        postId: post._id,
        from: req.user.username,
        fromId: userId,
        createdAt: new Date()
      });
      await notification.save();
      io.to(ownerId).emit("receive_notification", {
        _id: notification._id,
        type: "like",
        postId: post._id,
        from: req.user.username,
        fromId: userId,
        createdAt: notification.createdAt,
        isRead: false
      });
      console.log("[toggleLike] Emitted receive_notification to user:", ownerId, notification);
    }
  } catch (err) {
    console.error("Lỗi khi toggle like:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    console.log("[addComment] Adding comment for post:", id, "by user:", userId);

    const post = await Post.findById(id).populate('author');
    if (!post) {
      console.error("[addComment] Post not found:", id);
      return res.status(404).json({ error: 'Post not found' });
    }

    post.comments.push({ author: userId, content });
    await post.save();
    console.log("[addComment] Comment saved:", content);

    await post.populate('comments.author');
    const newComment = post.comments.at(-1);
    if (!newComment.author) {
      console.error("[addComment] Author not populated for comment:", newComment);
      return res.status(500).json({ error: 'Failed to populate comment author' });
    }
    console.log("[addComment] Populated comment:", newComment);

    res.json({ comment: newComment });

    const io = req.app.get("io");

    io.to(`post_${id}`).emit("post_commented", {
      postId: id,
      comment: {
        _id: newComment._id,
        content: newComment.content,
        author: {
          _id: newComment.author._id.toString(),
          username: newComment.author.username,
          avatarUrl: newComment.author.avatarUrl
        }
      }
    });
    console.log("[addComment] Emitted post_commented to room:", `post_${id}`);

    if (post.author._id.toString() !== userId) {
      const notification = new Notification({
        userId: post.author._id,
        type: "comment",
        postId: id,
        from: req.user.username,
        fromId: userId,
        content,
        createdAt: new Date()
      });
      await notification.save();
      io.to(post.author._id.toString()).emit("receive_notification", {
        _id: notification._id,
        type: "comment",
        postId: id,
        from: req.user.username,
        fromId: userId,
        content,
        createdAt: notification.createdAt,
        isRead: false
      });
      console.log("[addComment] Emitted receive_notification to user:", post.author._id.toString(), notification);
    }
  } catch (err) {
    console.error("[addComment] Error:", err);
    res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};

exports.deleteComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user.id;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const isPostOwner = post.author.toString() === userId;
    const isCommentOwner = comment.author.toString() === userId;

    if (!isPostOwner && !isCommentOwner) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa bình luận này' });
    }

    post.comments = post.comments.filter(c => c._id.toString() !== commentId);
    await post.save();

    res.json({ message: 'Đã xóa bình luận' });
  } catch (err) {
    console.error("Lỗi khi xóa bình luận:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.deletePost = async (req, res) => {
  const postId = req.params.id;
  const userId = req.user._id?.toString?.();

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).send("Post not found");

    if (post.author.toString() !== userId) {
      return res.status(403).send("Bạn không có quyền xóa bài viết này");
    }

    await post.deleteOne();
    res.redirect('/users/profile');
  } catch (err) {
    console.error("Lỗi khi xoá bài viết:", err);
    res.status(500).send("Lỗi server");
  }
};