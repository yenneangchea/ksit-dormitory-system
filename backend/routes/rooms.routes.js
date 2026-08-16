const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/rooms.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/rooms/stats/summary
 * @desc    Get room statistics
 * @access  Private (Admin, Manager)
 */
router.get('/stats/summary', protect, authorize('admin', 'manager'), roomsController.getRoomStats);

/**
 * @route   GET /api/rooms/available
 * @desc    Get available rooms for assignment
 * @access  Private (Admin, Manager)
 */
router.get('/available', protect, authorize('admin', 'manager'), roomsController.getAvailableRooms);

/**
 * @route   GET /api/rooms/by-qr/:qr_code
 * @desc    Look up room by door magic QR code
 * @access  Private (Admin, Manager, Teacher)
 */
router.get('/by-qr/:qr_code', protect, authorize('admin', 'manager', 'teacher', 'student'), roomsController.getRoomByQrCode);

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms
 * @access  Private
 */
router.get('/', protect, roomsController.getAllRooms);

/**
 * @route   POST /api/rooms
 * @desc    Create new room
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), roomsController.createRoom);

/**
 * @route   GET /api/rooms/:id
 * @desc    Get single room by ID
 * @access  Private
 */
router.get('/:id', protect, roomsController.getRoomById);

/**
 * @route   PUT /api/rooms/:id
 * @desc    Update room
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), roomsController.updateRoom);

/**
 * @route   DELETE /api/rooms/:id
 * @desc    Delete room
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), roomsController.deleteRoom);

module.exports = router;
