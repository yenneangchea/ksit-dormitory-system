const supabase = require('../config/supabase');
const { exportMonthlyBillingToDrive } = require('../services/syncManager.service');

/**
 * @desc    Get all utility bills with optional filters
 * @route   GET /api/utility-bills
 * @access  Private (Admin, Manager)
 */
const getAllUtilityBills = async (req, res, next) => {
  try {
    const { room_id, billing_month } = req.query;

    let query = supabase
      .from('utility_bills')
      .select(`
        *,
        room:rooms!utility_bills_room_id_fkey(
          id,
          room_number,
          floor_number,
          building:buildings!rooms_building_id_fkey(code, name)
        ),
        creator:users!utility_bills_created_by_fkey(id, full_name_latin)
      `)
      .order('billing_month', { ascending: false });

    if (room_id) query = query.eq('room_id', room_id);
    if (billing_month) query = query.eq('billing_month', billing_month);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching utility bills:', error);
      const err = new Error('Failed to fetch utility bills');
      err.statusCode = 500;
      return next(err);
    }

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get utility bill by ID
 * @route   GET /api/utility-bills/:id
 * @access  Private
 */
const getUtilityBillById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('utility_bills')
      .select(`
        *,
        room:rooms!utility_bills_room_id_fkey(
          *,
          building:buildings!rooms_building_id_fkey(*)
        ),
        student_bills(
          *,
          student:users!student_bills_student_id_fkey(id, full_name_latin, full_name_khmer, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      const err = new Error('Utility bill not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create utility bill and split among active students in room
 * @route   POST /api/utility-bills
 * @access  Private (Admin, Manager)
 */
const createUtilityBill = async (req, res, next) => {
  try {
    const {
      room_id,
      billing_month,
      prev_electric_reading,
      curr_electric_reading,
      electric_rate_khr,
      prev_water_reading,
      curr_water_reading,
      water_rate_khr,
      trash_fee_khr,
    } = req.body;

    if (!room_id || !billing_month) {
      const err = new Error('room_id and billing_month are required');
      err.statusCode = 400;
      return next(err);
    }

    // Validate readings
    if (curr_electric_reading < prev_electric_reading) {
      const err = new Error('Current electric reading must be >= previous reading');
      err.statusCode = 400;
      return next(err);
    }
    if (curr_water_reading < prev_water_reading) {
      const err = new Error('Current water reading must be >= previous reading');
      err.statusCode = 400;
      return next(err);
    }

    // Get active students in this room
    const { data: assignments, error: assignError } = await supabase
      .from('room_assignments')
      .select('student_id')
      .eq('room_id', room_id)
      .eq('is_active', true);

    if (assignError) {
      const err = new Error('Failed to fetch room assignments');
      err.statusCode = 500;
      return next(err);
    }

    const activeStudentsCount = assignments.length;
    if (activeStudentsCount === 0) {
      const err = new Error('No active students in this room');
      err.statusCode = 400;
      return next(err);
    }

    // Calculate totals
    const elecRate = electric_rate_khr || 800;
    const waterRate = water_rate_khr || 1500;
    const trash = trash_fee_khr || 10000;

    const elecUsage = (curr_electric_reading || 0) - (prev_electric_reading || 0);
    const waterUsage = (curr_water_reading || 0) - (prev_water_reading || 0);
    const totalElec = elecUsage * elecRate;
    const totalWater = waterUsage * waterRate;
    const totalAmount = totalElec + totalWater + trash;
    const splitPerStudent = Math.ceil(totalAmount / activeStudentsCount);

    // Insert utility bill
    const { data: bill, error: billError } = await supabase
      .from('utility_bills')
      .insert({
        room_id,
        billing_month,
        prev_electric_reading: prev_electric_reading || 0,
        curr_electric_reading: curr_electric_reading || 0,
        electric_rate_khr: elecRate,
        prev_water_reading: prev_water_reading || 0,
        curr_water_reading: curr_water_reading || 0,
        water_rate_khr: waterRate,
        trash_fee_khr: trash,
        active_students_count: activeStudentsCount,
        split_amount_per_student_khr: splitPerStudent,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (billError) {
      console.error('Error creating utility bill:', billError);
      const err = new Error(billError.message || 'Failed to create utility bill');
      err.statusCode = 500;
      return next(err);
    }

    // Generate individual student bills with a simple KHQR placeholder
    const usdRate = 4100; // approx KHR per USD
    const studentBillsData = assignments.map((a) => ({
      utility_bill_id: bill.id,
      student_id: a.student_id,
      room_id,
      billing_month,
      amount_khr: splitPerStudent,
      amount_usd: parseFloat((splitPerStudent / usdRate).toFixed(2)),
      khqr_string: `KSIT-DORM-${room_id.slice(0, 8)}-${billing_month}-${a.student_id.slice(0, 8)}`,
      bill_status: 'unpaid',
    }));

    const { error: sbError } = await supabase
      .from('student_bills')
      .insert(studentBillsData);

    if (sbError) {
      console.error('Error creating student bills:', sbError);
      // Bill was created, warn but don't fail
    }

    res.status(201).json({
      success: true,
      message: `Utility bill created. ${activeStudentsCount} student bills generated.`,
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student bills for current student
 * @route   GET /api/utility-bills/my/bills
 * @access  Private (Student)
 */
const getMyStudentBills = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('student_bills')
      .select(`
        *,
        utility_bill:utility_bills!student_bills_utility_bill_id_fkey(
          billing_month,
          total_amount_khr,
          active_students_count
        ),
        room:rooms!student_bills_room_id_fkey(room_number)
      `)
      .eq('student_id', req.user.id)
      .order('billing_month', { ascending: false });

    if (error) {
      const err = new Error('Failed to fetch student bills');
      err.statusCode = 500;
      return next(err);
    }

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark student bill as paid
 * @route   PUT /api/utility-bills/student-bills/:id/pay
 * @access  Private (Admin, Manager)
 */
const markStudentBillPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_method, transaction_ref } = req.body;

    const { data, error } = await supabase
      .from('student_bills')
      .update({
        bill_status: 'paid',
        payment_method: payment_method || 'cash',
        transaction_ref: transaction_ref || null,
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      const err = new Error('Student bill not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, message: 'Bill marked as paid', data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export a monthly utility billing summary to Google Drive
 * @route   POST /api/billing/export-drive
 * @access  Private (Admin, Manager)
 */
const exportBillingToDrive = async (req, res, next) => {
  try {
    const result = await exportMonthlyBillingToDrive(req.body.month);
    res.json({
      success: true,
      message: `Utility billing report for ${result.month} was exported to Google Drive.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get utility bill statistics
 * @route   GET /api/utility-bills/stats
 * @access  Private (Admin, Manager)
 */
const getUtilityBillStats = async (req, res, next) => {
  try {
    const { data: studentBills, error } = await supabase
      .from('student_bills')
      .select('bill_status, amount_khr');

    if (error) {
      const err = new Error('Failed to fetch bill stats');
      err.statusCode = 500;
      return next(err);
    }

    const stats = {
      total: studentBills.length,
      unpaid: studentBills.filter(b => b.bill_status === 'unpaid').length,
      paid: studentBills.filter(b => b.bill_status === 'paid').length,
      overdue: studentBills.filter(b => b.bill_status === 'overdue').length,
      total_unpaid_khr: studentBills
        .filter(b => b.bill_status !== 'paid')
        .reduce((sum, b) => sum + parseFloat(b.amount_khr), 0),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUtilityBills,
  getUtilityBillById,
  createUtilityBill,
  getMyStudentBills,
  markStudentBillPaid,
  exportBillingToDrive,
  getUtilityBillStats,
};
