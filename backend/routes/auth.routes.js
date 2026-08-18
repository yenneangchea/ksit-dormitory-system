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
 * @route   POST /api/auth/telegram/link
 * @desc    Link verified Telegram Mini App identity to the current signed-in KSIT account
 * @access  Private
 */
router.post('/telegram/link', authenticate, authController.linkTelegramToCurrentUser);

/**
 * @route   POST /api/auth/phone/send-otp
 * @desc    Send a six-digit sign-in code to the registered user's linked Telegram chat
 * @access  Public
 */
router.post('/phone/send-otp', authController.sendPhoneOtp);

/**
 * @route   POST /api/auth/phone/verify-otp
 * @desc    Verify a phone sign-in code and issue a role-aware JWT session
 * @access  Public
 */
router.post('/phone/verify-otp', authController.verifyPhoneOtp);

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
router.post('/change-password', authenticate, authController.changePassword);
router.post('/request-password-reset', authController.requestPasswordReset);

module.exports = router;
