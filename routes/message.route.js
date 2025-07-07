const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/message.controller');
const { verifyTokenMiddleware } = require('../middlewares/auth.middleware');

router.use(verifyTokenMiddleware);
router.get('/:id', ctrl.getMessages);
router.post('/:id/mark-read', ctrl.markAsRead);
router.get('/:userId/unread-count', ctrl.getUnreadCount);

module.exports = router;
