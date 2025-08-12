const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const upload = require('../middlewares/upload.middleware');
const { verifyTokenMiddleware } = require('../middlewares/auth.middleware');
 
router.use(verifyTokenMiddleware);

router.get('/profile', ctrl.getProfile);
router.post('/profile/avatar', upload.single('avatar'), ctrl.updateAvatar);
router.get('/search', ctrl.searchUsers);
router.post('/:id/request', ctrl.sendRequest);
router.post('/:id/accept', ctrl.acceptRequest);
router.post('/:id/decline', ctrl.declineRequest);
router.post('/:id/unfriend', ctrl.unfriend);
router.get('/pending', ctrl.getPendingRequests);
router.get('/chat-data', ctrl.getChatData);
router.get('/profile', ctrl.getProfile);
router.post('/profile/avatar', upload.single('avatar'), ctrl.updateAvatar);

router.get('/:id', ctrl.viewPublicProfile);

module.exports = router;