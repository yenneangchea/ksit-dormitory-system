const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllMaintenanceRequests,
  getMaintenanceById,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  getMyMaintenanceRequests,
  getMaintenanceStats,
} = require('../controllers/maintenance.controller');

// Stats
router.get('/stats', protect, authorize('admin', 'manager', 'teacher'), getMaintenanceStats);

// Student's own requests
router.get('/my', protect, authorize('student'), getMyMaintenanceRequests);

// All requests (staff)
router
  .route('/')
  .get(protect, authorize('admin', 'manager', 'teacher'), getAllMaintenanceRequests)
  .post(protect, authorize('student'), createMaintenanceRequest);

// Single request
router
  .route('/:id')
  .get(protect, getMaintenanceById)
  .put(protect, updateMaintenanceRequest);

module.exports = router;
