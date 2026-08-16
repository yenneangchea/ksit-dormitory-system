const supabase = require('../config/supabase');

/**
 * @desc    Get all maintenance requests
 * @route   GET /api/maintenance
 * @access  Private (Admin, Manager, Teacher)
 */
const getAllMaintenanceRequests = async (req, res, next) => {
  try {
    const { room_id, status, urgency, category } = req.query;

    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        room:rooms!maintenance_requests_room_id_fkey(
          id, room_number,
          building:buildings!rooms_building_id_fkey(code, name)
        ),
        reporter:users!maintenance_requests_reported_by_student_id_fkey(
          id, full_name_latin, full_name_khmer, email, phone
        ),
        resolver:users!maintenance_requests_resolved_by_fkey(id, full_name_latin)
      `)
      .order('created_at', { ascending: false });

    if (room_id) query = query.eq('room_id', room_id);
    if (status) query = query.eq('status', status);
    if (urgency) query = query.eq('urgency', urgency);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenance requests:', error);
      const err = new Error('Failed to fetch maintenance requests');
      err.statusCode = 500;
      return next(err);
    }

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get maintenance request by ID
 * @route   GET /api/maintenance/:id
 * @access  Private
 */
const getMaintenanceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        room:rooms!maintenance_requests_room_id_fkey(
          *, building:buildings!rooms_building_id_fkey(*)
        ),
        reporter:users!maintenance_requests_reported_by_student_id_fkey(*),
        resolver:users!maintenance_requests_resolved_by_fkey(id, full_name_latin)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      const err = new Error('Maintenance request not found');
      err.statusCode = 404;
      return next(err);
    }

    // Students can only view their own requests
    if (req.user.role === 'student' && data.reported_by_student_id !== req.user.id) {
      const err = new Error('Not authorized to view this request');
      err.statusCode = 403;
      return next(err);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create maintenance request (Student)
 * @route   POST /api/maintenance
 * @access  Private (Student)
 */
const createMaintenanceRequest = async (req, res, next) => {
  try {
    const { category, title, description, urgency, photo_url } = req.body;

    if (!category || !title || !description) {
      const err = new Error('category, title, and description are required');
      err.statusCode = 400;
      return next(err);
    }

    // Get student's current room assignment
    const { data: assignment, error: assignError } = await supabase
      .from('room_assignments')
      .select('room_id')
      .eq('student_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (assignError || !assignment) {
      const err = new Error('You must be assigned to a room to submit a maintenance request');
      err.statusCode = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({
        room_id: assignment.room_id,
        reported_by_student_id: req.user.id,
        category,
        title,
        description,
        urgency: urgency || 'medium',
        status: 'open',
        photo_url: photo_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance request:', error);
      const err = new Error('Failed to create maintenance request');
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Maintenance request submitted successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update maintenance request status (Manager/Admin) or details (Student, if open)
 * @route   PUT /api/maintenance/:id
 * @access  Private
 */
const updateMaintenanceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      const err = new Error('Maintenance request not found');
      err.statusCode = 404;
      return next(err);
    }

    const updateData = {};

    if (req.user.role === 'student') {
      // Students can only update their own open requests
      if (existing.reported_by_student_id !== req.user.id) {
        const err = new Error('Not authorized');
        err.statusCode = 403;
        return next(err);
      }
      if (existing.status !== 'open') {
        const err = new Error('Cannot update a request that is already being processed');
        err.statusCode = 400;
        return next(err);
      }
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.urgency) updateData.urgency = req.body.urgency;
      if (req.body.photo_url !== undefined) updateData.photo_url = req.body.photo_url;
    } else {
      // Admin/Manager/Teacher can update status
      if (req.body.status) {
        updateData.status = req.body.status;
        if (req.body.status === 'resolved' || req.body.status === 'cancelled') {
          updateData.resolved_by = req.user.id;
        }
      }
      if (req.body.resolution_notes !== undefined) updateData.resolution_notes = req.body.resolution_notes;
      if (req.body.urgency) updateData.urgency = req.body.urgency;
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance request:', error);
      const err = new Error('Failed to update maintenance request');
      err.statusCode = 500;
      return next(err);
    }

    res.json({ success: true, message: 'Maintenance request updated', data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's own maintenance requests
 * @route   GET /api/maintenance/my
 * @access  Private (Student)
 */
const getMyMaintenanceRequests = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        room:rooms!maintenance_requests_room_id_fkey(room_number)
      `)
      .eq('reported_by_student_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      const err = new Error('Failed to fetch maintenance requests');
      err.statusCode = 500;
      return next(err);
    }

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get maintenance statistics
 * @route   GET /api/maintenance/stats
 * @access  Private (Admin, Manager, Teacher)
 */
const getMaintenanceStats = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('status, urgency');

    if (error) {
      const err = new Error('Failed to fetch maintenance stats');
      err.statusCode = 500;
      return next(err);
    }

    const stats = {
      total: data.length,
      open: data.filter(m => m.status === 'open').length,
      in_progress: data.filter(m => m.status === 'in_progress').length,
      resolved: data.filter(m => m.status === 'resolved').length,
      cancelled: data.filter(m => m.status === 'cancelled').length,
      emergency: data.filter(m => m.urgency === 'emergency').length,
      high: data.filter(m => m.urgency === 'high').length,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMaintenanceRequests,
  getMaintenanceById,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  getMyMaintenanceRequests,
  getMaintenanceStats,
};
