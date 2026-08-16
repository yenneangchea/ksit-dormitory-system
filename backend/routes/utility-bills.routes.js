const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllUtilityBills,
  getUtilityBillById,
  createUtilityBill,
  getMyStudentBills,
  markStudentBillPaid,
  getUtilityBillStats,
} = require('../controllers/utility-bills.controller');

// Stats
router.get('/stats', protect, authorize('admin', 'manager'), getUtilityBillStats);

// Student's own bills
router.get('/my/bills', protect, authorize('student'), getMyStudentBills);

// Mark student bill as paid
router.put('/student-bills/:id/pay', protect, authorize('admin', 'manager', 'student'), markStudentBillPaid);

// Utility bills CRUD
router
  .route('/')
  .get(protect, authorize('admin', 'manager'), getAllUtilityBills)
  .post(protect, authorize('admin', 'manager'), createUtilityBill);

router
  .route('/:id')
  .get(protect, authorize('admin', 'manager'), getUtilityBillById);

module.exports = router;
