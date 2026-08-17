const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllAttendances,
  getRoomAttendanceByDate,
  recordAttendance,
  bulkRecordAttendance,
  getMyAttendance,
  exportAttendanceToDrive,
  getAttendanceStats,
} = require('../controllers/attendances.controller');

// Export a selected month before generic routes can capture the path.
router.post('/export-drive', protect, authorize('admin', 'manager'), exportAttendanceToDrive);

// Stats
router.get('/stats', protect, authorize('admin', 'manager', 'teacher'), getAttendanceStats);

// Student's own attendance
router.get('/my', protect, authorize('student'), getMyAttendance);

// Get attendance for a room on a specific date
router.get(
  '/room/:roomId/date/:date',
  protect,
  authorize('admin', 'manager', 'teacher'),
  getRoomAttendanceByDate
);

// Bulk record
router.post('/bulk', protect, authorize('admin', 'manager', 'teacher'), bulkRecordAttendance);

// Single record
router
  .route('/')
  .get(protect, authorize('admin', 'manager', 'teacher'), getAllAttendances)
  .post(protect, authorize('admin', 'manager', 'teacher'), recordAttendance);

module.exports = router;
