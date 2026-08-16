const supabase = require('../config/supabase');
const { exportMonthlyAttendanceToDrive } = require('../services/syncManager.service');

/**
 * @desc    Get attendances with optional filters
 * @route   GET /api/attendances
 * @access  Private (Admin, Manager, Teacher)
 */
const getAllAttendances = async (req, res, next) => {
  try {
    const { room_id, student_id, attendance_date, status } = req.query;

    let query = supabase
      .from('attendances')
      .select(`
        *,
        student:users!attendances_student_id_fkey(
          id, full_name_latin, full_name_khmer, gender
        ),
        room:rooms!attendances_room_id_fkey(
          id, room_number,
          building:buildings!rooms_building_id_fkey(code, name)
        ),
        recorder:users!attendances_recorded_by_fkey(id, full_name_latin)
      `)
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (room_id) query = query.eq('room_id', room_id);
    if (student_id) query = query.eq('student_id', student_id);
    if (attendance_date) query = query.eq('attendance_date', attendance_date);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendances:', error);
      const err = new Error('Failed to fetch attendances');
      err.statusCode = 500;
      return next(err);
    }

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance for a specific room on a specific date
 * @route   GET /api/attendances/room/:roomId/date/:date
 * @access  Private (Admin, Manager, Teacher)
 */
const getRoomAttendanceByDate = async (req, res, next) => {
  try {
    const { roomId, date } = req.params;

    // Get all active students in the room
    const { data: assignments, error: assignError } = await supabase
      .from('room_assignments')
      .select(`
        student_id,
        bed_number,
        student:users!room_assignments_student_id_fkey(
          id, full_name_latin, full_name_khmer, gender
        )
      `)
      .eq('room_id', roomId)
      .eq('is_active', true);

    if (assignError) {
      const err = new Error('Failed to fetch room assignments');
      err.statusCode = 500;
      return next(err);
    }

    // Get existing attendance records for that date
    const { data: existing, error: attError } = await supabase
      .from('attendances')
      .select('*')
      .eq('room_id', roomId)
      .eq('attendance_date', date);

    if (attError) {
      const err = new Error('Failed to fetch attendance records');
      err.statusCode = 500;
      return next(err);
    }

    // Merge: for each assigned student, attach their attendance record if exists
    const attendanceMap = {};
    existing.forEach(a => { attendanceMap[a.student_id] = a; });

    const merged = assignments.map(a => ({
      student_id: a.student_id,
      bed_number: a.bed_number,
      student: a.student,
      attendance: attendanceMap[a.student_id] || null,
    }));

    res.json({ success: true, date, room_id: roomId, data: merged });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record/update attendance for a student
 * @route   POST /api/attendances
 * @access  Private (Admin, Manager, Teacher)
 */
const recordAttendance = async (req, res, next) => {
  try {
    const { room_id, student_id, attendance_date, status, leave_reason } = req.body;

    if (!room_id || !student_id || !attendance_date || !status) {
      const err = new Error('room_id, student_id, attendance_date, and status are required');
      err.statusCode = 400;
      return next(err);
    }

    // Upsert attendance record (unique: room_id + student_id + attendance_date)
    const { data, error } = await supabase
      .from('attendances')
      .upsert(
        {
          room_id,
          student_id,
          attendance_date,
          status,
          leave_reason: leave_reason || null,
          recorded_by: req.user.id,
        },
        { onConflict: 'room_id,student_id,attendance_date' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error recording attendance:', error);
      const err = new Error('Failed to record attendance');
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({ success: true, message: 'Attendance recorded', data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk record attendance for a whole room on a date
 * @route   POST /api/attendances/bulk
 * @access  Private (Admin, Manager, Teacher)
 */
const bulkRecordAttendance = async (req, res, next) => {
  try {
    const { room_id, attendance_date, records } = req.body;
    // records: [{ student_id, status, leave_reason? }]

    if (!room_id || !attendance_date || !records || !Array.isArray(records)) {
      const err = new Error('room_id, attendance_date, and records array are required');
      err.statusCode = 400;
      return next(err);
    }

    const upsertData = records.map(r => ({
      room_id,
      student_id: r.student_id,
      attendance_date,
      status: r.status,
      leave_reason: r.leave_reason || null,
      recorded_by: req.user.id,
    }));

    const { data, error } = await supabase
      .from('attendances')
      .upsert(upsertData, { onConflict: 'room_id,student_id,attendance_date' })
      .select();

    if (error) {
      console.error('Error bulk recording attendance:', error);
      const err = new Error('Failed to record attendance');
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: `Attendance recorded for ${data.length} students`,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's own attendance
 * @route   GET /api/attendances/my
 * @access  Private (Student)
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('student_id', req.user.id)
      .order('attendance_date', { ascending: false })
      .limit(90);

    if (error) {
      const err = new Error('Failed to fetch attendance');
      err.statusCode = 500;
      return next(err);
    }

    // Summary stats
    const total = data.length;
    const present = data.filter(a => a.status === 'present').length;
    const absent = data.filter(a => a.status === 'absent').length;
    const leave = data.filter(a => a.status === 'leave').length;

    res.json({
      success: true,
      summary: { total, present, absent, leave },
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export one month's attendance register to Google Drive
 * @route   POST /api/attendances/export-drive
 * @access  Private (Admin, Manager)
 */
const exportAttendanceToDrive = async (req, res, next) => {
  try {
    const result = await exportMonthlyAttendanceToDrive(req.body.month);
    res.json({
      success: true,
      message: `Attendance report for ${result.month} was exported to Google Drive.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance statistics
 * @route   GET /api/attendances/stats
 * @access  Private (Admin, Manager, Teacher)
 */
const getAttendanceStats = async (req, res, next) => {
  try {
    const { room_id, date_from, date_to } = req.query;

    let query = supabase.from('attendances').select('status, attendance_date');
    if (room_id) query = query.eq('room_id', room_id);
    if (date_from) query = query.gte('attendance_date', date_from);
    if (date_to) query = query.lte('attendance_date', date_to);

    const { data, error } = await query;

    if (error) {
      const err = new Error('Failed to fetch attendance stats');
      err.statusCode = 500;
      return next(err);
    }

    const stats = {
      total: data.length,
      present: data.filter(a => a.status === 'present').length,
      absent: data.filter(a => a.status === 'absent').length,
      leave: data.filter(a => a.status === 'leave').length,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAttendances,
  getRoomAttendanceByDate,
  recordAttendance,
  bulkRecordAttendance,
  getMyAttendance,
  exportAttendanceToDrive,
  getAttendanceStats,
};
