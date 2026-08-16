const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { exportBillingToDrive } = require('../controllers/utility-bills.controller');

const router = express.Router();

// Compatibility namespace for administrative report exports.
router.post('/export-drive', protect, authorize('admin', 'manager'), exportBillingToDrive);

module.exports = router;
