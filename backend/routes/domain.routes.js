const express = require('express');
const { authenticate, allowRoles } = require('../middleware/auth');
const domain = require('../controllers/domain.controller');

const router = express.Router();

router.use(authenticate);

router.get('/dashboard/summary', domain.dashboardSummary);
router.get('/users', allowRoles('admin'), domain.listUsers);
router.patch('/users/:userId/role', allowRoles('admin'), domain.updateUserRole);

router.route('/buildings')
  .get(domain.listBuildings)
  .post(allowRoles('admin', 'manager'), domain.createBuilding);

router.route('/rooms')
  .get(domain.listRooms)
  .post(allowRoles('admin', 'manager'), domain.createRoom);

router.route('/applications')
  .get(domain.listApplications)
  .post(allowRoles('student'), domain.createApplication);
router.patch('/applications/:applicationId/review', allowRoles('admin', 'manager'), domain.reviewApplication);
router.post('/applications/:applicationId/auto-assign', allowRoles('admin', 'manager'), domain.autoAssignApplication);

router.route('/utility-bills')
  .get(allowRoles('admin', 'manager'), domain.listUtilityBills)
  .post(allowRoles('admin', 'manager'), domain.createUtilityBill);
router.get('/student-bills', domain.listStudentBills);
router.patch('/student-bills/:studentBillId/payment', allowRoles('admin', 'manager', 'student'), domain.recordBillPayment);

router.post('/magic-qr/resolve', domain.resolveMagicQr);
router.post('/attendance/scan', allowRoles('admin', 'manager', 'teacher'), domain.scanAttendance);
router.get('/attendance', domain.listAttendance);

router.route('/maintenance')
  .get(domain.listMaintenance)
  .post(allowRoles('student', 'admin', 'manager', 'teacher'), domain.createMaintenance);
router.patch('/maintenance/:maintenanceId', allowRoles('admin', 'manager'), domain.updateMaintenance);

module.exports = router;
