const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  autoAssignRooms,
  vacateAssignment,
  deleteAssignment,
  getAssignmentStats,
  getMyCurrentAssignment,
} = require('../controllers/assignments.controller');

// Stats (must be before :id)
router.get('/stats/summary', protect, authorize('admin', 'manager'), getAssignmentStats);

// Student's own current assignment
router.get('/my/current', protect, authorize('student'), getMyCurrentAssignment);

// Auto-assign
router.post('/auto-assign', protect, authorize('admin', 'manager'), autoAssignRooms);

// Vacate
router.put('/:id/vacate', protect, authorize('admin', 'manager'), vacateAssignment);

router
  .route('/')
  .get(protect, authorize('admin', 'manager', 'teacher'), getAllAssignments)
  .post(protect, authorize('admin', 'manager'), createAssignment);

router
  .route('/:id')
  .get(protect, getAssignmentById)
  .delete(protect, authorize('admin'), deleteAssignment);

module.exports = router;
