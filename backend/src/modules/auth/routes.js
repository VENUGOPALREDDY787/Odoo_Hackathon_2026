const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { authenticate } = require('../../middleware/auth');

// Public auth endpoints
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protected auth endpoints
router.post('/logout', authenticate, authController.logout);

module.exports = router;
