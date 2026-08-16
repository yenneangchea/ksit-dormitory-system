const express = require('express');
const router = express.Router();
const buildingsController = require('../controllers/buildings.controller');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/buildings/stats
 * @desc    Get building statistics
 * @access  Private (Admin, Manager)
 */
router.get('/stats', authorize('admin', 'manager'), buildingsController.getBuildingStats);

/**
 * @route   GET /api/buildings
 * @desc    Get all buildings
 * @access  Private (All authenticated users)
 */
router.get('/', buildingsController.getAllBuildings);

/**
 * @route   POST /api/buildings
 * @desc    Create new building
 * @access  Private (Admin, Manager)
 */
router.post('/', authorize('admin', 'manager'), buildingsController.createBuilding);

/**
 * @route   GET /api/buildings/:id
 * @desc    Get building by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', buildingsController.getBuildingById);

/**
 * @route   PUT /api/buildings/:id
 * @desc    Update building
 * @access  Private (Admin, Manager)
 */
router.put('/:id', authorize('admin', 'manager'), buildingsController.updateBuilding);

/**
 * @route   DELETE /api/buildings/:id
 * @desc    Delete building
 * @access  Private (Admin only)
 */
router.delete('/:id', authorize('admin'), buildingsController.deleteBuilding);

module.exports = router;
