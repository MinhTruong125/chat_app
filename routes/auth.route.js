const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');

router.get('/login', ctrl.getLogin);
router.post('/login', ctrl.postLogin);
router.get('/register', ctrl.getRegister);
router.post('/register', ctrl.postRegister);
router.post('/logout', ctrl.logout);

module.exports = router;