const express = require('express');
const router = express.Router();
const { verifyTokenMiddleware } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const ctrl = require('../controllers/post.controller');
const notificationController = require('../controllers/notification.controller');

router.get('/', verifyTokenMiddleware, ctrl.getCreatePostPage);
router.post('/', verifyTokenMiddleware, upload.single('image'), ctrl.createPost);
router.get('/feeds', verifyTokenMiddleware, ctrl.getFeeds);
router.post('/:id/like', verifyTokenMiddleware, ctrl.toggleLike);
router.post('/:id/comment', verifyTokenMiddleware, ctrl.addComment);
router.post('/:postId/comment/:commentId/delete', verifyTokenMiddleware, ctrl.deleteComment);
router.post('/:id/delete', verifyTokenMiddleware, ctrl.deletePost);
router.post('/notifications/mark-read', verifyTokenMiddleware, notificationController.markNotificationsRead);

module.exports = router;
