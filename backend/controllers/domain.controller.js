const crypto = require('crypto');
const { getSupabase } = require('../config/supabase');

const KHR_PER_USD = Number(process.env.KHR_PER_USD || 4100);
const ACTIVE_ASSIGNMENT_YEAR = process.env.ACTIVE_ACADEMIC_YEAR || '2025-2026';

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function asNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw fail(`${label} must be a valid number.`);
  }
  return number;
}

function publicPayload(data, message) {
  return { success: true, ...(message ? { message } : {}), data };
}

function buildKhqrReference({ billId, studentId, amountKhr, billingMonth, roomId }) {
  const checksum = crypto
    .createHash('sha256')
    .update(`${billId}|${studentId}|${amountKhr}|${billingMonth}|${roomId}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();

  // A production Bakong gateway can replace this deterministic payload via the configured adapter.
  return `KSIT-KHQR|${process.env.KHQR_MERCHANT_ID || 'DEMO'}|${amountKhr.toFixed(0)}|${billingMonth}|${checksum}`;
}

async function getRoomByMagicQr(magicQrCode) {
  const supabase = getSupabase();
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, building_id, room_number, floor_number, capacity, occupied_count, gender, assigned_major, assigned_year, magic_qr_code, status, buildings(code, name)')
    .eq('magic_qr_code', magicQrCode)
    .single();

  if (error || !room) {
    throw fail('The supplied Magic QR code is not registered to a room.', 404);
  }
  return room;
}

async function getActiveAssignments(roomId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('room_assignments')
    .select('id, student_id, room_id, bed_number, academic_year, assigned_at, users(id, full_name_latin, full_name_khmer, email, phone)')
    .eq('room_id', roomId)
    .eq('is_active', true)
    .order('bed_number');

  if (error) throw error;
  return data || [];
}

async function listBuildings(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('buildings')
      .select('id, code, name, gender_restriction, total_floors, description, created_at, rooms(id, room_number, floor_number, capacity, occupied_count, gender, assigned_major, assigned_year, status, magic_qr_code)')
      .order('code');
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function createBuilding(req, res, next) {
  try {
    const { code, name, gender_restriction, total_floors, description } = req.body;
    if (!code || !name || !gender_restriction) throw fail('Code, name, and gender restriction are required.');
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('buildings')
      .insert({
        code: String(code).trim().toUpperCase(),
        name: String(name).trim(),
        gender_restriction,
        total_floors: total_floors ? asNumber(total_floors, 'Total floors') : 1,
        description: description || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(publicPayload(data, 'Building created.'));
  } catch (error) {
    next(error);
  }
}

async function listRooms(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('rooms')
      .select('id, building_id, room_number, floor_number, capacity, occupied_count, gender, assigned_major, assigned_year, magic_qr_code, status, created_at, buildings(code, name)')
      .order('room_number');
    if (req.query.buildingId) query = query.eq('building_id', req.query.buildingId);
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const { building_id, room_number, floor_number, capacity, gender, assigned_major, assigned_year, status } = req.body;
    if (!building_id || !room_number || !gender) throw fail('Building, room number, and gender are required.');
    const roomCapacity = asNumber(capacity || 4, 'Capacity');
    if (roomCapacity < 1) throw fail('Capacity must be at least one bed.');

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        building_id,
        room_number: String(room_number).trim(),
        floor_number: floor_number ? asNumber(floor_number, 'Floor number') : 1,
        capacity: roomCapacity,
        gender,
        assigned_major: assigned_major || null,
        assigned_year: assigned_year ? asNumber(assigned_year, 'Assigned academic year') : null,
        status: status || 'available',
        magic_qr_code: `KSIT:${crypto.randomUUID()}`,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(publicPayload(data, 'Room created with a Magic QR code.'));
  } catch (error) {
    next(error);
  }
}

async function listApplications(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('room_applications')
      .select('id, user_id, academic_year_applied, status, photo_4x6_attached, contract_signed, parent_guarantee_attached, family_book_attached, id_card_attached, rejection_reason, applied_at, reviewed_at, reviewed_by, users(id, full_name_latin, full_name_khmer, gender, email), academic_profiles(student_id_card, major, academic_year, class_section)')
      .order('applied_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.user.role === 'student') {
      query = query.eq('user_id', req.user.sub);
    } else if (req.query.userId) {
      query = query.eq('user_id', req.query.userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function createApplication(req, res, next) {
  try {
    const payload = {
      user_id: req.user.sub,
      academic_year_applied: req.body.academic_year_applied || ACTIVE_ASSIGNMENT_YEAR,
      status: 'submitted',
      photo_4x6_attached: Boolean(req.body.photo_4x6_attached),
      contract_signed: Boolean(req.body.contract_signed),
      parent_guarantee_attached: Boolean(req.body.parent_guarantee_attached),
      family_book_attached: Boolean(req.body.family_book_attached),
      id_card_attached: Boolean(req.body.id_card_attached),
    };

    const allDocumentsAttached = Object.entries(payload)
      .filter(([key]) => key.endsWith('_attached') || key === 'contract_signed')
      .every(([, value]) => value);
    if (!allDocumentsAttached) throw fail('All required residence application documents must be confirmed before submission.');

    const supabase = getSupabase();
    const { data, error } = await supabase.from('room_applications').insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(publicPayload(data, 'Dormitory application submitted.'));
  } catch (error) {
    next(error);
  }
}

async function reviewApplication(req, res, next) {
  try {
    const { status, rejection_reason } = req.body;
    if (!['under_review', 'approved', 'rejected'].includes(status)) {
      throw fail('Application status must be under_review, approved, or rejected.');
    }
    if (status === 'rejected' && !rejection_reason) throw fail('A rejection reason is required when rejecting an application.');

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('room_applications')
      .update({ status, rejection_reason: status === 'rejected' ? rejection_reason : null, reviewed_at: new Date().toISOString(), reviewed_by: req.user.sub })
      .eq('id', req.params.applicationId)
      .select()
      .single();
    if (error) throw error;
    res.json(publicPayload(data, `Application marked as ${status.replace('_', ' ')}.`));
  } catch (error) {
    next(error);
  }
}

async function autoAssignApplication(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data: application, error: applicationError } = await supabase
      .from('room_applications')
      .select('id, user_id, academic_year_applied, status, users(id, full_name_latin, full_name_khmer, gender), academic_profiles(major, academic_year)')
      .eq('id', req.params.applicationId)
      .single();
    if (applicationError || !application) throw fail('Application not found.', 404);
    if (application.status !== 'approved') throw fail('Only approved applications can be auto-assigned.');

    const student = application.users;
    const profile = Array.isArray(application.academic_profiles) ? application.academic_profiles[0] : application.academic_profiles;
    if (!student || !profile) throw fail('The application is missing a student profile required for room assignment.');

    const { data: existingAssignment, error: existingError } = await supabase
      .from('room_assignments')
      .select('id')
      .eq('application_id', application.id)
      .eq('is_active', true)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingAssignment) throw fail('This application already has an active room assignment.', 409);

    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, building_id, room_number, floor_number, capacity, occupied_count, gender, assigned_major, assigned_year, status, buildings(code, name)')
      .eq('gender', student.gender)
      .neq('status', 'maintenance');
    if (roomsError) throw roomsError;

    const candidates = (rooms || [])
      .filter((room) => room.occupied_count < room.capacity)
      .sort((a, b) => {
        const aCohort = a.assigned_major === profile.major && a.assigned_year === profile.academic_year ? 0 : a.assigned_major ? 2 : 1;
        const bCohort = b.assigned_major === profile.major && b.assigned_year === profile.academic_year ? 0 : b.assigned_major ? 2 : 1;
        if (aCohort !== bCohort) return aCohort - bCohort;
        // Waterfall rule: fill a compatible partially occupied room before opening a new room.
        if (a.occupied_count !== b.occupied_count) return b.occupied_count - a.occupied_count;
        const aBuilding = a.buildings?.code || '';
        const bBuilding = b.buildings?.code || '';
        if (aBuilding !== bBuilding) return aBuilding.localeCompare(bBuilding);
        if (a.floor_number !== b.floor_number) return a.floor_number - b.floor_number;
        return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
      });

    const selectedRoom = candidates[0];
    if (!selectedRoom) throw fail('No compatible bed is available for this student.', 409);

    const { data: occupiedBeds, error: occupiedBedsError } = await supabase
      .from('room_assignments')
      .select('bed_number')
      .eq('room_id', selectedRoom.id)
      .eq('academic_year', application.academic_year_applied)
      .eq('is_active', true);
    if (occupiedBedsError) throw occupiedBedsError;
    const usedBeds = new Set((occupiedBeds || []).map((assignment) => assignment.bed_number));
    const bedNumber = Array.from({ length: selectedRoom.capacity }, (_, index) => index + 1).find((bed) => !usedBeds.has(bed));
    if (!bedNumber) throw fail('No unoccupied bed is available in the selected room.', 409);

    const { data: assignment, error: assignmentError } = await supabase
      .from('room_assignments')
      .insert({
        application_id: application.id,
        student_id: application.user_id,
        room_id: selectedRoom.id,
        bed_number: bedNumber,
        academic_year: application.academic_year_applied,
        is_active: true,
      })
      .select()
      .single();
    if (assignmentError) throw assignmentError;

    const nextOccupiedCount = selectedRoom.occupied_count + 1;
    const roomPatch = {
      occupied_count: nextOccupiedCount,
      status: nextOccupiedCount >= selectedRoom.capacity ? 'full' : 'available',
      ...(selectedRoom.assigned_major ? {} : { assigned_major: profile.major, assigned_year: profile.academic_year }),
    };
    const { error: roomUpdateError } = await supabase.from('rooms').update(roomPatch).eq('id', selectedRoom.id);
    if (roomUpdateError) throw roomUpdateError;

    const { error: applicationUpdateError } = await supabase.from('room_applications').update({ status: 'assigned' }).eq('id', application.id);
    if (applicationUpdateError) throw applicationUpdateError;

    res.json(publicPayload({ assignment, room: { ...selectedRoom, ...roomPatch }, student, strategy: 'gender → major/year cohort → fill existing room → building/floor/room order' }, 'Student auto-assigned using waterfall room allocation.'));
  } catch (error) {
    next(error);
  }
}

async function listUtilityBills(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('utility_bills')
      .select('id, room_id, billing_month, prev_electric_reading, curr_electric_reading, electric_rate_khr, prev_water_reading, curr_water_reading, water_rate_khr, trash_fee_khr, total_electric_cost_khr, total_water_cost_khr, total_amount_khr, active_students_count, split_amount_per_student_khr, created_at, rooms(room_number, buildings(code, name))')
      .order('billing_month', { ascending: false });
    if (req.query.roomId) query = query.eq('room_id', req.query.roomId);
    if (req.query.month) query = query.eq('billing_month', req.query.month);
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function createUtilityBill(req, res, next) {
  try {
    const { room_id, billing_month, prev_electric_reading = 0, curr_electric_reading = 0, electric_rate_khr = 800, prev_water_reading = 0, curr_water_reading = 0, water_rate_khr = 1500, trash_fee_khr = 10000 } = req.body;
    if (!room_id || !billing_month) throw fail('Room and billing month are required.');
    if (!/^\d{4}-\d{2}$/.test(billing_month)) throw fail('Billing month must use YYYY-MM format.');

    const electricityUsed = asNumber(curr_electric_reading, 'Current electricity reading') - asNumber(prev_electric_reading, 'Previous electricity reading');
    const waterUsed = asNumber(curr_water_reading, 'Current water reading') - asNumber(prev_water_reading, 'Previous water reading');
    if (electricityUsed < 0 || waterUsed < 0) throw fail('Current meter readings cannot be lower than previous readings.');

    const activeAssignments = await getActiveAssignments(room_id);
    if (activeAssignments.length === 0) throw fail('A utility bill cannot be generated until the room has active residents.', 409);

    const electricRate = asNumber(electric_rate_khr, 'Electricity rate');
    const waterRate = asNumber(water_rate_khr, 'Water rate');
    const trashFee = asNumber(trash_fee_khr, 'Trash fee');
    const totalAmount = electricityUsed * electricRate + waterUsed * waterRate + trashFee;
    const perStudentAmount = Number((totalAmount / activeAssignments.length).toFixed(2));

    const billPayload = {
      room_id,
      billing_month,
      prev_electric_reading: asNumber(prev_electric_reading, 'Previous electricity reading'),
      curr_electric_reading: asNumber(curr_electric_reading, 'Current electricity reading'),
      electric_rate_khr: electricRate,
      prev_water_reading: asNumber(prev_water_reading, 'Previous water reading'),
      curr_water_reading: asNumber(curr_water_reading, 'Current water reading'),
      water_rate_khr: waterRate,
      trash_fee_khr: trashFee,
      active_students_count: activeAssignments.length,
      split_amount_per_student_khr: perStudentAmount,
      created_by: req.user.sub,
    };

    const supabase = getSupabase();
    const { data: utilityBill, error: utilityBillError } = await supabase
      .from('utility_bills')
      .upsert(billPayload, { onConflict: 'room_id,billing_month' })
      .select()
      .single();
    if (utilityBillError) throw utilityBillError;

    const { error: deleteOldBillsError } = await supabase
      .from('student_bills')
      .delete()
      .eq('utility_bill_id', utilityBill.id)
      .eq('bill_status', 'unpaid');
    if (deleteOldBillsError) throw deleteOldBillsError;

    const studentBills = activeAssignments.map((assignment) => ({
      utility_bill_id: utilityBill.id,
      student_id: assignment.student_id,
      room_id,
      billing_month,
      amount_khr: perStudentAmount,
      amount_usd: Number((perStudentAmount / KHR_PER_USD).toFixed(2)),
      khqr_string: buildKhqrReference({ billId: utilityBill.id, studentId: assignment.student_id, amountKhr: perStudentAmount, billingMonth: billing_month, roomId: room_id }),
      khqr_md5: crypto.createHash('md5').update(`${utilityBill.id}|${assignment.student_id}|${perStudentAmount}`).digest('hex'),
      bill_status: 'unpaid',
    }));

    const { data: createdStudentBills, error: studentBillError } = await supabase.from('student_bills').insert(studentBills).select();
    if (studentBillError) throw studentBillError;

    res.status(201).json(publicPayload({ utility_bill: utilityBill, calculations: { electricity_used: electricityUsed, water_used: waterUsed, total_amount_khr: totalAmount, split_amount_per_student_khr: perStudentAmount, active_students_count: activeAssignments.length }, student_bills: createdStudentBills }, 'Utility bill split and KHQR payment references generated.'));
  } catch (error) {
    next(error);
  }
}

async function listStudentBills(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('student_bills')
      .select('id, utility_bill_id, student_id, room_id, billing_month, amount_khr, amount_usd, khqr_string, khqr_md5, bill_status, payment_method, transaction_ref, paid_at, created_at, rooms(room_number, buildings(code, name))')
      .order('created_at', { ascending: false });
    const userId = req.query.studentId || (req.user.role === 'student' ? req.user.sub : null);
    if (userId) query = query.eq('student_id', userId);
    if (req.query.status) query = query.eq('bill_status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function recordBillPayment(req, res, next) {
  try {
    const { payment_method = 'khqr', transaction_ref } = req.body;
    if (!transaction_ref) throw fail('A payment transaction reference is required.');
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('student_bills')
      .update({ bill_status: 'paid', payment_method, transaction_ref, paid_at: new Date().toISOString() })
      .eq('id', req.params.studentBillId)
      .select()
      .single();
    if (error) throw error;
    res.json(publicPayload(data, 'Payment recorded.'));
  } catch (error) {
    next(error);
  }
}

async function resolveMagicQr(req, res, next) {
  try {
    const { magic_qr_code } = req.body;
    if (!magic_qr_code) throw fail('A Magic QR code is required.');
    const room = await getRoomByMagicQr(magic_qr_code);
    const residents = await getActiveAssignments(room.id);
    res.json(publicPayload({ room, residents }));
  } catch (error) {
    next(error);
  }
}

async function scanAttendance(req, res, next) {
  try {
    const { magic_qr_code, student_id, status = 'present', leave_reason, attendance_date } = req.body;
    if (!magic_qr_code || !student_id) throw fail('Magic QR code and student ID are required.');
    if (!['present', 'absent', 'leave'].includes(status)) throw fail('Attendance status must be present, absent, or leave.');
    if (status === 'leave' && !leave_reason) throw fail('A leave reason is required for leave attendance.');

    const room = await getRoomByMagicQr(magic_qr_code);
    const residents = await getActiveAssignments(room.id);
    if (!residents.some((assignment) => assignment.student_id === student_id)) {
      throw fail('The selected student does not have an active assignment in this QR room.', 403);
    }

    const supabase = getSupabase();
    const attendancePayload = {
      room_id: room.id,
      student_id,
      attendance_date: attendance_date || new Date().toISOString().slice(0, 10),
      status,
      leave_reason: status === 'leave' ? leave_reason : null,
      recorded_by: req.user.sub,
    };
    const { data, error } = await supabase
      .from('attendances')
      .upsert(attendancePayload, { onConflict: 'room_id,student_id,attendance_date' })
      .select()
      .single();
    if (error) throw error;
    res.json(publicPayload({ attendance: data, room }, 'Attendance recorded from the room Magic QR code.'));
  } catch (error) {
    next(error);
  }
}

async function listAttendance(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('attendances')
      .select('id, room_id, student_id, attendance_date, status, leave_reason, recorded_by, created_at, rooms(room_number, buildings(code, name)), users!attendances_student_id_fkey(id, full_name_latin, full_name_khmer)')
      .order('attendance_date', { ascending: false });
    if (req.query.date) query = query.eq('attendance_date', req.query.date);
    if (req.query.roomId) query = query.eq('room_id', req.query.roomId);
    if (req.query.studentId) query = query.eq('student_id', req.query.studentId);
    if (req.user.role === 'student') query = query.eq('student_id', req.user.sub);
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function listMaintenance(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('maintenance_requests')
      .select('id, room_id, reported_by_student_id, category, title, description, urgency, status, photo_url, resolution_notes, resolved_by, created_at, updated_at, rooms(room_number, buildings(code, name)), users!maintenance_requests_reported_by_student_id_fkey(id, full_name_latin, full_name_khmer)')
      .order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.roomId) query = query.eq('room_id', req.query.roomId);
    if (req.user.role === 'student') query = query.eq('reported_by_student_id', req.user.sub);
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function createMaintenance(req, res, next) {
  try {
    const { magic_qr_code, room_id, category = 'other', title, description, urgency = 'medium', photo_url } = req.body;
    if (!title || !description) throw fail('A maintenance title and description are required.');
    const room = magic_qr_code ? await getRoomByMagicQr(magic_qr_code) : null;
    const selectedRoomId = room?.id || room_id;
    if (!selectedRoomId) throw fail('Use a Magic QR code or provide a room ID for the ticket.');
    if (!['electricity', 'plumbing', 'furniture', 'door_lock', 'internet', 'other'].includes(category)) throw fail('Invalid maintenance category.');
    if (!['low', 'medium', 'high', 'emergency'].includes(urgency)) throw fail('Invalid maintenance urgency.');

    if (req.user.role === 'student') {
      const activeAssignments = await getActiveAssignments(selectedRoomId);
      if (!activeAssignments.some((assignment) => assignment.student_id === req.user.sub)) {
        throw fail('Students can only submit maintenance tickets for their assigned room.', 403);
      }
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({ room_id: selectedRoomId, reported_by_student_id: req.user.sub, category, title: String(title).trim(), description: String(description).trim(), urgency, photo_url: photo_url || null })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(publicPayload(data, 'Maintenance ticket created.'));
  } catch (error) {
    next(error);
  }
}

async function updateMaintenance(req, res, next) {
  try {
    const { status, resolution_notes } = req.body;
    if (!['open', 'in_progress', 'resolved', 'cancelled'].includes(status)) throw fail('Invalid maintenance status.');
    if (status === 'resolved' && !resolution_notes) throw fail('Resolution notes are required when resolving a maintenance request.');

    const patch = {
      status,
      resolution_notes: resolution_notes || null,
      updated_at: new Date().toISOString(),
      ...(status === 'resolved' ? { resolved_by: req.user.sub } : {}),
    };
    const supabase = getSupabase();
    const { data, error } = await supabase.from('maintenance_requests').update(patch).eq('id', req.params.maintenanceId).select().single();
    if (error) throw error;
    res.json(publicPayload(data, `Maintenance request marked as ${status.replace('_', ' ')}.`));
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .order('full_name_latin');
    if (req.query.role) query = query.eq('role', req.query.role);
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['admin', 'manager', 'teacher', 'student'].includes(role)) throw fail('Invalid user role.');
    const supabase = getSupabase();
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', req.params.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!targetUser) throw fail('User not found.', 404);

    if (targetUser.id === req.user.sub && targetUser.role === 'admin' && role !== 'admin') {
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if (countError) throw countError;
      if ((count || 0) <= 1) throw fail('The last administrator cannot remove their own admin access.', 409);
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', req.params.userId)
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .single();
    if (error) throw error;
    res.json(publicPayload(data, 'User role updated.'));
  } catch (error) {
    next(error);
  }
}

async function dashboardSummary(req, res, next) {
  try {
    const supabase = getSupabase();
    const [buildings, rooms, maintenance, applications, attendance] = await Promise.all([
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('rooms').select('capacity, occupied_count, status'),
      supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      supabase.from('room_applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'under_review']),
      supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('attendance_date', new Date().toISOString().slice(0, 10)),
    ]);

    if (buildings.error || rooms.error || maintenance.error || applications.error || attendance.error) {
      throw buildings.error || rooms.error || maintenance.error || applications.error || attendance.error;
    }

    const roomRows = rooms.data || [];
    const totalCapacity = roomRows.reduce((sum, room) => sum + Number(room.capacity || 0), 0);
    const occupiedBeds = roomRows.reduce((sum, room) => sum + Number(room.occupied_count || 0), 0);
    const vacantBeds = Math.max(totalCapacity - occupiedBeds, 0);
    res.json(publicPayload({
      buildings: buildings.count || 0,
      rooms_in_service: roomRows.filter((room) => room.status !== 'maintenance').length,
      rooms_total: roomRows.length,
      total_capacity: totalCapacity,
      occupied_beds: occupiedBeds,
      vacant_beds: vacantBeds,
      occupancy_percent: totalCapacity ? Math.round((occupiedBeds / totalCapacity) * 100) : 0,
      pending_maintenance: maintenance.count || 0,
      pending_applications: applications.count || 0,
      attendance_today: attendance.count || 0,
    }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBuildings,
  createBuilding,
  listRooms,
  createRoom,
  listApplications,
  createApplication,
  reviewApplication,
  autoAssignApplication,
  listUtilityBills,
  createUtilityBill,
  listStudentBills,
  recordBillPayment,
  resolveMagicQr,
  scanAttendance,
  listAttendance,
  listMaintenance,
  createMaintenance,
  updateMaintenance,
  listUsers,
  updateUserRole,
  dashboardSummary,
};
