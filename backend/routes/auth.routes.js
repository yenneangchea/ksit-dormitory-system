const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/telegram/register
 * @desc    Verify Telegram Mini App identity and create a default Student account
 * @access  Public
 */
router.post('/telegram/register', authController.registerWithTelegram);

/**
 * @route   POST /api/auth/telegram
 * @desc    Verify Telegram Mini App login data and issue a local role session
 * @access  Public
 */
router.post('/telegram', authController.loginWithTelegram);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
