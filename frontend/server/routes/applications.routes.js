const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applications.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/applications/stats/summary
 * @desc    Get application statistics
 * @access  Private (Admin, Manager)
 */
router.get('/stats/summary', protect, authorize('admin', 'manager'), applicationsController.getApplicationStats);

/**
 * @route   GET /api/applications/my/list
 * @desc    Get student's own applications
 * @access  Private (Student)
 */
router.get('/my/list', protect, authorize('student'), applicationsController.getMyApplications);

/**
 * @route   GET /api/applications
 * @desc    Get all applications
 * @access  Private (Admin, Manager)
 */
router.get('/', protect, authorize('admin', 'manager'), applicationsController.getAllApplications);

/**
 * @route   POST /api/applications
 * @desc    Create new application
 * @access  Private (Student)
 */
router.post('/', protect, authorize('student'), applicationsController.createApplication);

/**
 * @route   GET /api/applications/:id
 * @desc    Get single application by ID
 * @access  Private
 */
router.get('/:id', protect, applicationsController.getApplicationById);

/**
 * @route   PUT /api/applications/:id
 * @desc    Update application
 * @access  Private
 */
router.put('/:id', protect, applicationsController.updateApplication);

/**
 * @route   DELETE /api/applications/:id
 * @desc    Delete application
 * @access  Private (Student)
 */
router.delete('/:id', protect, authorize('student'), applicationsController.deleteApplication);

module.exports = router;
