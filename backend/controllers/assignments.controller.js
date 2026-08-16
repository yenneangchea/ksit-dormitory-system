const supabase = require('../config/supabase');

/**
 * @desc    Get all room assignments with optional filters
 * @route   GET /api/assignments
 * @access  Private (Admin, Manager, Teacher)
 */
const getAllAssignments = async (req, res, next) => {
  try {
    const { room_id, student_id, academic_year, is_active } = req.query;

    let query = supabase
      .from('room_assignments')
      .select(`
        *,
        student:users!room_assignments_student_id_fkey(
          id,
          full_name_latin,
          full_name_khmer,
          email,
          phone,
          gender
        ),
        room:rooms!room_assignments_room_id_fkey(
          id,
          room_number,
          floor_number,
          capacity,
          occupied_count,
          building:buildings!rooms_building_id_fkey(
            code,
            name
          )
        ),
        application:room_applications!room_assignments_application_id_fkey(
          id,
          status,
          applied_at
        )
      `)
      .order('assigned_at', { ascending: false });

    if (room_id) {
      query = query.eq('room_id', room_id);
    }

    if (student_id) {
      query = query.eq('student_id', student_id);
    }

    if (academic_year) {
      query = query.eq('academic_year', academic_year);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching assignments:', error);
      const err = new Error('Failed to fetch assignments');
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
 * @desc    Get assignment by ID
 * @route   GET /api/assignments/:id
 * @access  Private
 */
const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('room_assignments')
      .select(`
        *,
        student:users!room_assignments_student_id_fkey(*),
        room:rooms!room_assignments_room_id_fkey(
          *,
          building:buildings!rooms_building_id_fkey(*)
        ),
        application:room_applications!room_assignments_application_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      const err = new Error('Assignment not found');
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
 * @desc    Manual room assignment
 * @route   POST /api/assignments
 * @access  Private (Admin, Manager)
 */
const createAssignment = async (req, res, next) => {
  try {
    const { application_id, student_id, room_id, bed_number, academic_year } = req.body;

    // Validation
    if (!application_id || !student_id || !room_id || !bed_number || !academic_year) {
      const err = new Error('Please provide all required fields');
      err.statusCode = 400;
      return next(err);
    }

    // Check if room has available space
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('capacity, occupied_count')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      const err = new Error('Room not found');
      err.statusCode = 404;
      return next(err);
    }

    if (room.occupied_count >= room.capacity) {
      const err = new Error('Room is at full capacity');
      err.statusCode = 400;
      return next(err);
    }

    // Check if bed is already taken
    const { data: existingBed } = await supabase
      .from('room_assignments')
      .select('id')
      .eq('room_id', room_id)
      .eq('bed_number', bed_number)
      .eq('is_active', true)
      .single();

    if (existingBed) {
      const err = new Error('Bed number is already assigned');
      err.statusCode = 400;
      return next(err);
    }

    // Create assignment
    const { data, error } = await supabase
      .from('room_assignments')
      .insert({
        application_id,
        student_id,
        room_id,
        bed_number,
        academic_year,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      const err = new Error('Failed to create assignment');
      err.statusCode = 500;
      return next(err);
    }

    // Update application status to 'assigned'
    await supabase
      .from('room_applications')
      .update({ status: 'assigned' })
      .eq('id', application_id);

    res.status(201).json({
      success: true,
      message: 'Room assignment created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Waterfall auto-assignment algorithm
 * @route   POST /api/assignments/auto-assign
 * @access  Private (Admin, Manager)
 *
 * Algorithm:
 * 1. Get all approved applications
 * 2. Group students by gender, major, and academic year
 * 3. Find available rooms matching student criteria
 * 4. Assign students to rooms prioritizing same major/year grouping
 * 5. Fill rooms to capacity before moving to next room
 */
const autoAssignRooms = async (req, res, next) => {
  try {
    const { academic_year } = req.body;

    if (!academic_year) {
      const err = new Error('Please provide academic_year');
      err.statusCode = 400;
      return next(err);
    }

    // Get all approved applications for this academic year
    const { data: applications, error: appsError } = await supabase
      .from('room_applications')
      .select(`
        *,
        user:users!room_applications_user_id_fkey(
          id,
          full_name_latin,
          gender
        ),
        academic_profile:academic_profiles!academic_profiles_user_id_fkey(
          major,
          academic_year
        )
      `)
      .eq('academic_year_applied', academic_year)
      .eq('status', 'approved');

    if (appsError) {
      console.error('Error fetching applications:', appsError);
      const err = new Error('Failed to fetch applications');
      err.statusCode = 500;
      return next(err);
    }

    if (!applications || applications.length === 0) {
      return res.json({
        success: true,
        message: 'No approved applications to assign',
        assigned: 0,
        failed: 0
      });
    }

    // Get all available rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .neq('status', 'maintenance')
      .order('room_number');

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      const err = new Error('Failed to fetch rooms');
      err.statusCode = 500;
      return next(err);
    }

    // Waterfall Assignment Algorithm
    const assignments = [];
    const failed = [];

    // Group students by gender (null-safe)
    const maleStudents = applications.filter(app => app.user && app.user.gender === 'male');
    const femaleStudents = applications.filter(app => app.user && app.user.gender === 'female');

    // Process male students
    await processGenderGroup(maleStudents, rooms.filter(r => r.gender === 'male'), academic_year, assignments, failed);

    // Process female students
    await processGenderGroup(femaleStudents, rooms.filter(r => r.gender === 'female'), academic_year, assignments, failed);

    // Insert all assignments
    if (assignments.length > 0) {
      const { error: insertError } = await supabase
        .from('room_assignments')
        .insert(assignments);

      if (insertError) {
        console.error('Error inserting assignments:', insertError);
        const err = new Error('Failed to create assignments');
        err.statusCode = 500;
        return next(err);
      }

      // Update application statuses to 'assigned'
      const applicationIds = assignments.map(a => a.application_id);
      await supabase
        .from('room_applications')
        .update({ status: 'assigned' })
        .in('id', applicationIds);
    }

    res.json({
      success: true,
      message: `Auto-assignment completed: ${assignments.length} assigned, ${failed.length} failed`,
      assigned: assignments.length,
      failed: failed.length,
      failedDetails: failed
    });
  } catch (error) {
    console.error('Auto-assign error:', error);
    next(error);
  }
};

/**
 * Helper function to process students of same gender
 */
async function processGenderGroup(students, rooms, academic_year, assignments, failed) {
  // Sort students by academic year and major
  students.sort((a, b) => {
    if (a.academic_profile.academic_year !== b.academic_profile.academic_year) {
      return a.academic_profile.academic_year - b.academic_profile.academic_year;
    }
    return a.academic_profile.major.localeCompare(b.academic_profile.major);
  });

  // Track room occupancy
  const roomOccupancy = {};
  rooms.forEach(room => {
    roomOccupancy[room.id] = room.occupied_count;
  });

  for (const student of students) {
    const major = student.academic_profile.major;
    const year = student.academic_profile.academic_year;

    // Find best matching room (waterfall priority)
    let assignedRoom = null;
    let bedNumber = null;

    // Priority 1: Room with same major AND year (not full)
    assignedRoom = rooms.find(room =>
      room.assigned_major === major &&
      room.assigned_year === year &&
      roomOccupancy[room.id] < room.capacity
    );

    // Priority 2: Room with same major (not full)
    if (!assignedRoom) {
      assignedRoom = rooms.find(room =>
        room.assigned_major === major &&
        roomOccupancy[room.id] < room.capacity
      );
    }

    // Priority 3: Room with same year (not full)
    if (!assignedRoom) {
      assignedRoom = rooms.find(room =>
        room.assigned_year === year &&
        roomOccupancy[room.id] < room.capacity
      );
    }

    // Priority 4: Any available room (not full)
    if (!assignedRoom) {
      assignedRoom = rooms.find(room =>
        roomOccupancy[room.id] < room.capacity
      );
    }

    if (assignedRoom) {
      // Assign bed number
      bedNumber = roomOccupancy[assignedRoom.id] + 1;

      assignments.push({
        application_id: student.id,
        student_id: student.user_id,
        room_id: assignedRoom.id,
        bed_number: bedNumber,
        academic_year: academic_year,
        is_active: true
      });

      // Update room occupancy tracking
      roomOccupancy[assignedRoom.id]++;

      // Update room assignment metadata
      if (!assignedRoom.assigned_major) {
        assignedRoom.assigned_major = major;
      }
      if (!assignedRoom.assigned_year) {
        assignedRoom.assigned_year = year;
      }
    } else {
      failed.push({
        student_id: student.user_id,
        student_name: student.user.full_name_latin,
        reason: 'No available room found'
      });
    }
  }
}


/**
 * @desc    Vacate/deactivate room assignment
 * @route   PUT /api/assignments/:id/vacate
 * @access  Private (Admin, Manager)
 */
const vacateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('room_assignments')
      .update({
        is_active: false,
        vacated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error vacating assignment:', error);
      const err = new Error('Failed to vacate assignment');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      message: 'Assignment vacated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete assignment
 * @route   DELETE /api/assignments/:id
 * @access  Private (Admin only)
 */
const deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('room_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting assignment:', error);
      const err = new Error('Failed to delete assignment');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get assignment statistics
 * @route   GET /api/assignments/stats/summary
 * @access  Private (Admin, Manager)
 */
const getAssignmentStats = async (req, res, next) => {
  try {
    const { academic_year } = req.query;

    let query = supabase
      .from('room_assignments')
      .select('is_active, academic_year');

    if (academic_year) {
      query = query.eq('academic_year', academic_year);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stats:', error);
      const err = new Error('Failed to fetch statistics');
      err.statusCode = 500;
      return next(err);
    }

    const stats = {
      total: data.length,
      active: data.filter(a => a.is_active).length,
      vacated: data.filter(a => !a.is_active).length
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
 * @desc    Get current student's active room assignment
 * @route   GET /api/assignments/my/current
 * @access  Private (Student)
 */
const getMyCurrentAssignment = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('room_assignments')
      .select(`
        *,
        room:rooms!room_assignments_room_id_fkey(
          id, room_number, floor_number, capacity, occupied_count, magic_qr_code, gender,
          building:buildings!rooms_building_id_fkey(id, code, name)
        ),
        application:room_applications!room_assignments_application_id_fkey(
          id, status, academic_year_applied
        )
      `)
      .eq('student_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, that's fine
      console.error('Error fetching assignment:', error);
      const err = new Error('Failed to fetch assignment');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  autoAssignRooms,
  vacateAssignment,
  deleteAssignment,
  getAssignmentStats,
  getMyCurrentAssignment,
};
