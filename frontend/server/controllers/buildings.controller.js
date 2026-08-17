const supabase = require('../config/supabase');

/**
 * @desc    Get all buildings
 * @route   GET /api/buildings
 * @access  Private (All roles)
 */
const getAllBuildings = async (req, res, next) => {
  try {
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      const err = new Error('Failed to fetch buildings');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      count: buildings.length,
      buildings
    });
  } catch (error) {
    console.error('Get all buildings error:', error);
    next(error);
  }
};

/**
 * @desc    Get single building by ID
 * @route   GET /api/buildings/:id
 * @access  Private (All roles)
 */
const getBuildingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: building, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !building) {
      const err = new Error('Building not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      success: true,
      building
    });
  } catch (error) {
    console.error('Get building by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Create new building
 * @route   POST /api/buildings
 * @access  Private (Admin, Manager)
 */
const createBuilding = async (req, res, next) => {
  try {
    const {
      code,
      name,
      gender_restriction,
      total_floors,
      description
    } = req.body;

    // Validation
    if (!code || !name || !gender_restriction || !total_floors) {
      const error = new Error('Please provide code, name, gender_restriction, and total_floors');
      error.statusCode = 400;
      return next(error);
    }

    // Check if code already exists
    const { data: existingBuilding } = await supabase
      .from('buildings')
      .select('id')
      .eq('code', code)
      .single();

    if (existingBuilding) {
      const error = new Error('Building code already exists');
      error.statusCode = 400;
      return next(error);
    }

    // Create building
    const { data: newBuilding, error: insertError } = await supabase
      .from('buildings')
      .insert([{
        code,
        name,
        gender_restriction,
        total_floors,
        description
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      const error = new Error('Failed to create building');
      error.statusCode = 500;
      return next(error);
    }

    res.status(201).json({
      success: true,
      message: 'Building created successfully',
      building: newBuilding
    });
  } catch (error) {
    console.error('Create building error:', error);
    next(error);
  }
};

/**
 * @desc    Update building
 * @route   PUT /api/buildings/:id
 * @access  Private (Admin, Manager)
 */
const updateBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      gender_restriction,
      total_floors,
      description
    } = req.body;

    // Build update object
    const updateData = {};
    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (gender_restriction) updateData.gender_restriction = gender_restriction;
    if (total_floors !== undefined) updateData.total_floors = total_floors;
    if (description !== undefined) updateData.description = description;

    // Update building
    const { data: updatedBuilding, error } = await supabase
      .from('buildings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      const err = new Error('Failed to update building');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      message: 'Building updated successfully',
      building: updatedBuilding
    });
  } catch (error) {
    console.error('Update building error:', error);
    next(error);
  }
};

/**
 * @desc    Delete building
 * @route   DELETE /api/buildings/:id
 * @access  Private (Admin only)
 */
const deleteBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if building has rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('building_id', id)
      .limit(1);

    if (rooms && rooms.length > 0) {
      const error = new Error('Cannot delete building with existing rooms');
      error.statusCode = 400;
      return next(error);
    }

    // Delete building
    const { error: deleteError } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      const error = new Error('Failed to delete building');
      error.statusCode = 500;
      return next(error);
    }

    res.json({
      success: true,
      message: 'Building deleted successfully'
    });
  } catch (error) {
    console.error('Delete building error:', error);
    next(error);
  }
};

/**
 * @desc    Get building statistics
 * @route   GET /api/buildings/stats
 * @access  Private (Admin, Manager)
 */
const getBuildingStats = async (req, res, next) => {
  try {
    // Get total buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, gender_restriction');

    if (buildingsError) {
      console.error('Database error:', buildingsError);
      const error = new Error('Failed to fetch building statistics');
      error.statusCode = 500;
      return next(error);
    }

    // Get total rooms by building
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('building_id, status');

    if (roomsError) {
      console.error('Database error:', roomsError);
      const error = new Error('Failed to fetch room statistics');
      error.statusCode = 500;
      return next(error);
    }

    const stats = {
      totalBuildings: buildings.length,
      maleBuildings: buildings.filter(b => b.gender_restriction === 'male').length,
      femaleBuildings: buildings.filter(b => b.gender_restriction === 'female').length,
      mixedBuildings: buildings.filter(b => b.gender_restriction === 'mixed').length,
      totalRooms: rooms.length,
      availableRooms: rooms.filter(r => r.status === 'available').length,
      fullRooms: rooms.filter(r => r.status === 'full').length,
      maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get building stats error:', error);
    next(error);
  }
};

module.exports = {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingStats
};
