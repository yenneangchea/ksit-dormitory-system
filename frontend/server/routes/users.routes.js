const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/me/academic-profile', usersController.getMyAcademicProfile);
router.put('/me/academic-profile', usersController.updateMyAcademicProfile);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin, Manager)
 */
router.get('/stats', authorize('admin', 'manager'), usersController.getUserStats);

/**
 * @route   GET /api/users
 * @desc    Get all users with optional filters
 * @access  Private (Admin only)
 */
router.get('/', authorize('admin'), usersController.getAllUsers);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post('/', authorize('admin'), usersController.createUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin, Manager, or own profile)
 */
router.get('/:id', usersController.getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin, or own profile)
 */
router.put('/:id', usersController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:id', authorize('admin'), usersController.deleteUser);

module.exports = router;
