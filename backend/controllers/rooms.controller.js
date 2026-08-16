const supabase = require('../config/supabase');

/**
 * @desc    Get all rooms with optional filters
 * @route   GET /api/rooms
 * @access  Private
 */
const getAllRooms = async (req, res, next) => {
  try {
    const { building_id, status, gender, floor_number } = req.query;

    let query = supabase
      .from('rooms')
      .select(`
        *,
        building:buildings!rooms_building_id_fkey(
          id,
          code,
          name,
          gender_restriction
        )
      `)
      .order('room_number', { ascending: true });

    if (building_id) {
      query = query.eq('building_id', building_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (gender) {
      query = query.eq('gender', gender);
    }

    if (floor_number) {
      query = query.eq('floor_number', parseInt(floor_number));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching rooms:', error);
      const err = new Error('Failed to fetch rooms');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single room by ID
 * @route   GET /api/rooms/:id
 * @access  Private
 */
const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        building:buildings!rooms_building_id_fkey(*),
        assignments:room_assignments!room_assignments_room_id_fkey(
          *,
          student:users!room_assignments_student_id_fkey(
            id,
            full_name_latin,
            full_name_khmer,
            email,
            phone,
            gender
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      const err = new Error('Room not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new room
 * @route   POST /api/rooms
 * @access  Private (Admin, Manager)
 */
const createRoom = async (req, res, next) => {
  try {
    const {
      building_id,
      room_number,
      floor_number,
      capacity,
      gender,
      assigned_major,
      assigned_year,
      magic_qr_code
    } = req.body;

    // Validation
    if (!building_id || !room_number || !floor_number || !capacity || !gender || !magic_qr_code) {
      const err = new Error('Please provide all required fields');
      err.statusCode = 400;
      return next(err);
    }

    // Check if room number already exists
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_number', room_number)
      .single();

    if (existing) {
      const err = new Error('Room number already exists');
      err.statusCode = 400;
      return next(err);
    }

    // Check if Magic QR code already exists
    const { data: existingQR } = await supabase
      .from('rooms')
      .select('id')
      .eq('magic_qr_code', magic_qr_code)
      .single();

    if (existingQR) {
      const err = new Error('Magic QR code already exists');
      err.statusCode = 400;
      return next(err);
    }

    // Create room
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        building_id,
        room_number,
        floor_number,
        capacity,
        gender,
        assigned_major,
        assigned_year,
        magic_qr_code,
        status: 'available',
        occupied_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      const err = new Error('Failed to create room');
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Update room
 * @route   PUT /api/rooms/:id
 * @access  Private (Admin, Manager)
 */
const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      room_number,
      floor_number,
      capacity,
      gender,
      assigned_major,
      assigned_year,
      magic_qr_code,
      status
    } = req.body;

    // Build update object
    const updateData = {};
    if (room_number) updateData.room_number = room_number;
    if (floor_number !== undefined) updateData.floor_number = floor_number;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (gender) updateData.gender = gender;
    if (assigned_major !== undefined) updateData.assigned_major = assigned_major;
    if (assigned_year !== undefined) updateData.assigned_year = assigned_year;
    if (magic_qr_code) updateData.magic_qr_code = magic_qr_code;
    if (status) updateData.status = status;

    // Update room
    const { data, error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating room:', error);
      const err = new Error('Failed to update room');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete room
 * @route   DELETE /api/rooms/:id
 * @access  Private (Admin only)
 */
const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if room has active assignments
    const { data: assignments } = await supabase
      .from('room_assignments')
      .select('id')
      .eq('room_id', id)
      .eq('is_active', true)
      .limit(1);

    if (assignments && assignments.length > 0) {
      const err = new Error('Cannot delete room with active student assignments');
      err.statusCode = 400;
      return next(err);
    }

    // Delete room
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting room:', error);
      const err = new Error('Failed to delete room');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available rooms for assignment
 * @route   GET /api/rooms/available
 * @access  Private (Admin, Manager)
 */
const getAvailableRooms = async (req, res, next) => {
  try {
    const { gender, major, academic_year } = req.query;

    let query = supabase
      .from('rooms')
      .select(`
        *,
        building:buildings!rooms_building_id_fkey(code, name)
      `)
      .eq('status', 'available')
      .lt('occupied_count', supabase.raw('capacity'));

    if (gender) {
      query = query.eq('gender', gender);
    }

    if (major) {
      query = query.or(`assigned_major.is.null,assigned_major.eq.${major}`);
    }

    if (academic_year) {
      query = query.or(`assigned_year.is.null,assigned_year.eq.${academic_year}`);
    }

    const { data, error } = await query.order('room_number');

    if (error) {
      console.error('Error fetching available rooms:', error);
      const err = new Error('Failed to fetch available rooms');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get room statistics
 * @route   GET /api/rooms/stats/summary
 * @access  Private (Admin, Manager)
 */
const getRoomStats = async (req, res, next) => {
  try {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('status, capacity, occupied_count, gender');

    if (error) {
      console.error('Error fetching room stats:', error);
      const err = new Error('Failed to fetch statistics');
      err.statusCode = 500;
      return next(err);
    }

    const stats = {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      full: rooms.filter(r => r.status === 'full').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length,
      male: rooms.filter(r => r.gender === 'male').length,
      female: rooms.filter(r => r.gender === 'female').length,
      totalCapacity: rooms.reduce((sum, r) => sum + r.capacity, 0),
      totalOccupied: rooms.reduce((sum, r) => sum + r.occupied_count, 0),
      occupancyRate: rooms.length > 0
        ? ((rooms.reduce((sum, r) => sum + r.occupied_count, 0) / rooms.reduce((sum, r) => sum + r.capacity, 0)) * 100).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get room by magic QR code (public scan endpoint)
 * @route   GET /api/rooms/by-qr/:qr_code
 * @access  Private
 */
const getRoomByQrCode = async (req, res, next) => {
  try {
    const { qr_code } = req.params;

    const { data, error } = await supabase
      .from('rooms')
      .select(`
        id,
        room_number,
        floor_number,
        capacity,
        occupied_count,
        gender,
        assigned_major,
        assigned_year,
        magic_qr_code,
        status,
        building:buildings!rooms_building_id_fkey(id, code, name)
      `)
      .eq('magic_qr_code', qr_code)
      .single();

    if (error || !data) {
      const err = new Error('Room not found for this QR code');
      err.statusCode = 404;
      return next(err);
    }

    // Also get active students for this room
    const { data: assignments } = await supabase
      .from('room_assignments')
      .select(`
        student_id,
        bed_number,
        student:users!room_assignments_student_id_fkey(
          id, full_name_latin, full_name_khmer, gender, telegram_id
        )
      `)
      .eq('room_id', data.id)
      .eq('is_active', true)
      .order('bed_number');

    res.json({
      success: true,
      data: {
        ...data,
        active_students: assignments || [],
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRooms,
  getRoomStats,
  getRoomByQrCode,
};
