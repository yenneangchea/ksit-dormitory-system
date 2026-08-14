const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const domain = require('../controllers/domain.controller');

const router = express.Router();

router.use(authenticate);

router.get('/dashboard/summary', requireRole('admin', 'manager'), domain.dashboardSummary);
router.get('/users', requireRole('admin'), domain.listUsers);
router.patch('/users/:userId/role', requireRole('admin'), domain.updateUserRole);

router.route('/buildings')
  .get(requireRole('admin', 'manager'), domain.listBuildings)
  .post(requireRole('admin', 'manager'), domain.createBuilding);

router.route('/rooms')
  .get(requireRole('admin', 'manager'), domain.listRooms)
  .post(requireRole('admin', 'manager'), domain.createRoom);

router.route('/applications')
  .get(requireRole('admin', 'manager', 'student'), domain.listApplications)
  .post(requireRole('student'), domain.createApplication);
router.patch('/applications/:applicationId/review', requireRole('admin', 'manager'), domain.reviewApplication);
router.post('/applications/:applicationId/auto-assign', requireRole('admin', 'manager'), domain.autoAssignApplication);

router.route('/utility-bills')
  .get(requireRole('admin', 'manager'), domain.listUtilityBills)
  .post(requireRole('admin', 'manager'), domain.createUtilityBill);
router.get('/student-bills', requireRole('admin', 'manager', 'student'), domain.listStudentBills);
router.patch('/student-bills/:studentBillId/payment', requireRole('admin', 'manager', 'student'), domain.recordBillPayment);

router.post('/magic-qr/resolve', requireRole('admin', 'manager', 'teacher'), domain.resolveMagicQr);
router.post('/attendance/scan', requireRole('admin', 'manager', 'teacher'), domain.scanAttendance);
router.get('/attendance', requireRole('admin', 'manager', 'teacher', 'student'), domain.listAttendance);

router.route('/maintenance')
  .get(requireRole('student', 'admin', 'manager', 'teacher'), domain.listMaintenance)
  .post(requireRole('student', 'admin', 'manager', 'teacher'), domain.createMaintenance);
router.patch('/maintenance/:maintenanceId', requireRole('admin', 'manager'), domain.updateMaintenance);

module.exports = router;
