const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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

const USER_FIELDS = 'id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at';
const VALID_ROLES = ['admin', 'manager', 'teacher', 'student'];
const VALID_GENDERS = ['male', 'female'];
const RESET_REQUEST_FIELDS = 'id, user_id, email, reason, status, created_at, resolved_at, resolved_by';

async function ensureAdminContinuity(supabase, targetUser, requestedRole) {
  if (!targetUser || targetUser.role !== 'admin' || requestedRole === 'admin') return;
  const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin');
  if (error) throw error;
  if ((count || 0) <= 1) throw fail('The last administrator cannot lose administrator access.', 409);
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

function profileFromUser(user) {
  const profiles = user?.academic_profiles;
  return Array.isArray(profiles) ? profiles[0] || null : profiles || null;
}

function applicationWithProfile(application, userOverride) {
  const user = userOverride || application?.users || null;
  return { ...application, users: user, academic_profiles: profileFromUser(user) };
}

async function getConfiguredUtilityRates(supabase) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', 'system_settings')
    .maybeSingle();
  if (error) throw error;
  const rates = data?.setting_value?.utility_rates || {};
  return {
    electricity_khr_per_kwh: Number.isFinite(Number(rates.electricity_khr_per_kwh)) ? Number(rates.electricity_khr_per_kwh) : 800,
    water_khr_per_m3: Number.isFinite(Number(rates.water_khr_per_m3)) ? Number(rates.water_khr_per_m3) : 1500,
    trash_khr_per_room: Number.isFinite(Number(rates.trash_khr_per_room)) ? Number(rates.trash_khr_per_room) : 10000,
  };
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

async function updateBuilding(req, res, next) {
  try {
    const { code, name, gender_restriction, total_floors, description } = req.body;
    const patch = {};
    if (code !== undefined) patch.code = String(code).trim().toUpperCase();
    if (name !== undefined) patch.name = String(name).trim();
    if (gender_restriction !== undefined) {
      if (!['male', 'female', 'mixed'].includes(gender_restriction)) throw fail('Invalid building gender restriction.');
      patch.gender_restriction = gender_restriction;
    }
    if (total_floors !== undefined) patch.total_floors = asNumber(total_floors, 'Total floors');
    if (description !== undefined) patch.description = description || null;
    if (Object.keys(patch).length === 0) throw fail('Provide at least one building value to update.');

    const supabase = getSupabase();
    const { data, error } = await supabase.from('buildings').update(patch).eq('id', req.params.buildingId).select().single();
    if (error) throw error;
    res.json(publicPayload(data, 'Building updated.'));
  } catch (error) {
    next(error);
  }
}

async function deleteBuilding(req, res, next) {
  try {
    const supabase = getSupabase();
    const { count, error: roomError } = await supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('building_id', req.params.buildingId);
    if (roomError) throw roomError;
    if ((count || 0) > 0) throw fail('Remove or reassign this building’s rooms before deleting the building.', 409);
    const { error } = await supabase.from('buildings').delete().eq('id', req.params.buildingId);
    if (error) throw error;
    res.json(publicPayload({ id: req.params.buildingId }, 'Building deleted.'));
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

async function updateRoom(req, res, next) {
  try {
    const { building_id, room_number, floor_number, capacity, gender, assigned_major, assigned_year, status, regenerate_magic_qr } = req.body;
    const patch = {};
    if (building_id !== undefined) patch.building_id = building_id;
    if (room_number !== undefined) patch.room_number = String(room_number).trim();
    if (floor_number !== undefined) patch.floor_number = asNumber(floor_number, 'Floor number');
    if (capacity !== undefined) {
      const roomCapacity = asNumber(capacity, 'Capacity');
      if (roomCapacity < 1) throw fail('Capacity must be at least one bed.');
      patch.capacity = roomCapacity;
    }
    if (gender !== undefined) {
      if (!VALID_GENDERS.includes(gender)) throw fail('Invalid room gender.');
      patch.gender = gender;
    }
    if (assigned_major !== undefined) patch.assigned_major = assigned_major || null;
    if (assigned_year !== undefined) patch.assigned_year = assigned_year ? asNumber(assigned_year, 'Assigned academic year') : null;
    if (status !== undefined) {
      if (!['available', 'full', 'maintenance'].includes(status)) throw fail('Invalid room status.');
      patch.status = status;
    }
    if (regenerate_magic_qr) patch.magic_qr_code = `KSIT:${crypto.randomUUID()}`;
    if (Object.keys(patch).length === 0) throw fail('Provide at least one room value to update.');

    const supabase = getSupabase();
    const { data, error } = await supabase.from('rooms').update(patch).eq('id', req.params.roomId).select().single();
    if (error) throw error;
    res.json(publicPayload(data, 'Room updated.'));
  } catch (error) {
    next(error);
  }
}

async function deleteRoom(req, res, next) {
  try {
    const supabase = getSupabase();
    const { count, error: assignmentError } = await supabase.from('room_assignments').select('*', { count: 'exact', head: true }).eq('room_id', req.params.roomId).eq('is_active', true);
    if (assignmentError) throw assignmentError;
    if ((count || 0) > 0) throw fail('A room with active residents cannot be deleted.', 409);
    const { error } = await supabase.from('rooms').delete().eq('id', req.params.roomId);
    if (error) throw error;
    res.json(publicPayload({ id: req.params.roomId }, 'Room deleted.'));
  } catch (error) {
    next(error);
  }
}

async function listApplications(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('room_applications')
      .select('id, user_id, academic_year_applied, status, photo_4x6_attached, contract_signed, parent_guarantee_attached, family_book_attached, id_card_attached, rejection_reason, applied_at, reviewed_at, reviewed_by, users!room_applications_user_id_fkey(id, full_name_latin, full_name_khmer, gender, email, academic_profiles(student_id_card, major, academic_year, class_section))')
      .order('applied_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.user.role === 'student') {
      query = query.eq('user_id', req.user.sub);
    } else if (req.query.userId) {
      query = query.eq('user_id', req.query.userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload((data || []).map((application) => applicationWithProfile(application))));
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
      .select('id, user_id, academic_year_applied, status, users!room_applications_user_id_fkey(id, full_name_latin, full_name_khmer, gender, academic_profiles(major, academic_year))')
      .eq('id', req.params.applicationId)
      .single();
    if (applicationError || !application) throw fail('Application not found.', 404);
    if (application.status !== 'approved') throw fail('Only approved applications can be auto-assigned.');

    const student = application.users;
    const profile = profileFromUser(student);
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

async function getAssignmentBoard(req, res, next) {
  try {
    const supabase = getSupabase();
    const [{ data: rooms, error: roomsError }, { data: applications, error: applicationsError }] = await Promise.all([
      supabase
        .from('rooms')
        .select('id, building_id, room_number, floor_number, capacity, occupied_count, gender, assigned_major, assigned_year, status, buildings(code, name), room_assignments(id, application_id, student_id, bed_number, academic_year, is_active, assigned_at, users(id, full_name_latin, full_name_khmer, email, gender, academic_profiles(major, academic_year)), room_applications(id, status, academic_year_applied))')
        .order('room_number'),
      supabase
        .from('room_applications')
        .select('id, user_id, academic_year_applied, status, users!room_applications_user_id_fkey(id, full_name_latin, full_name_khmer, email, gender, academic_profiles(major, academic_year))')
        .eq('status', 'approved')
        .order('applied_at'),
    ]);
    if (roomsError || applicationsError) throw roomsError || applicationsError;

    const roomRows = (rooms || []).map((room) => ({
      ...room,
      residents: (room.room_assignments || []).filter((assignment) => assignment?.is_active && assignment.users).sort((a, b) => a.bed_number - b.bed_number).map((assignment) => ({ ...assignment, room_applications: assignment.room_applications ? applicationWithProfile(assignment.room_applications, assignment.users) : null })),
    }));
    const assignedApplicationIds = new Set(roomRows.flatMap((room) => room.residents.map((resident) => resident.application_id)));
    const pendingStudents = (applications || []).map((application) => applicationWithProfile(application)).filter((application) => !assignedApplicationIds.has(application.id));

    res.json(publicPayload({ rooms: roomRows, unassigned_students: pendingStudents }));
  } catch (error) {
    next(error);
  }
}

async function manuallyMoveRoomAssignment(req, res, next) {
  try {
    const applicationId = String(req.body?.application_id || '').trim();
    const targetRoomId = String(req.body?.target_room_id || '').trim();
    if (!applicationId || !targetRoomId) throw fail('An application and target room are required.');

    const supabase = getSupabase();
    const { data: application, error: applicationError } = await supabase
      .from('room_applications')
      .select('id, user_id, academic_year_applied, status, users!room_applications_user_id_fkey(id, full_name_latin, full_name_khmer, email, gender, academic_profiles(major, academic_year))')
      .eq('id', applicationId)
      .single();
    if (applicationError || !application) throw fail('Room application not found.', 404);
    if (!['approved', 'assigned'].includes(application.status)) throw fail('Only approved or currently assigned applications may be manually placed.', 409);

    const student = application.users;
    const profile = profileFromUser(student);
    if (!student || !profile) throw fail('The student profile is incomplete and cannot be assigned.', 409);

    const [{ data: targetRoom, error: targetRoomError }, { data: sourceAssignment, error: sourceAssignmentError }] = await Promise.all([
      supabase
        .from('rooms')
        .select('id, room_number, capacity, occupied_count, gender, assigned_major, assigned_year, status, buildings(code, name)')
        .eq('id', targetRoomId)
        .single(),
      supabase
        .from('room_assignments')
        .select('id, room_id, bed_number, academic_year')
        .eq('application_id', application.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);
    if (targetRoomError || !targetRoom) throw fail('Target room not found.', 404);
    if (sourceAssignmentError) throw sourceAssignmentError;
    if (sourceAssignment?.room_id === targetRoom.id) throw fail('This student is already assigned to the selected room.', 409);
    if (targetRoom.status === 'maintenance') throw fail('Students cannot be placed in a room under maintenance.', 409);
    if (targetRoom.gender !== student.gender) throw fail('The selected room is not compatible with the student gender.', 409);

    const { data: targetAssignments, error: targetAssignmentsError } = await supabase
      .from('room_assignments')
      .select('bed_number')
      .eq('room_id', targetRoom.id)
      .eq('academic_year', application.academic_year_applied)
      .eq('is_active', true);
    if (targetAssignmentsError) throw targetAssignmentsError;
    const usedBeds = new Set((targetAssignments || []).map((assignment) => assignment.bed_number));
    const bedNumber = Array.from({ length: targetRoom.capacity }, (_, index) => index + 1).find((bed) => !usedBeds.has(bed));
    if (!bedNumber) throw fail('The target room is already at full capacity.', 409);

    const targetCount = (targetAssignments || []).length;
    const nextTargetCount = targetCount + 1;
    const targetPatch = {
      occupied_count: nextTargetCount,
      status: nextTargetCount >= targetRoom.capacity ? 'full' : 'available',
      ...(targetRoom.assigned_major ? {} : { assigned_major: profile.major, assigned_year: profile.academic_year }),
    };
    const { data: updatedTargetRoom, error: targetUpdateError } = await supabase
      .from('rooms')
      .update(targetPatch)
      .eq('id', targetRoom.id)
      .eq('occupied_count', Number(targetRoom.occupied_count || 0))
      .select('id, room_number, capacity, occupied_count, status, buildings(code, name)')
      .maybeSingle();
    if (targetUpdateError) throw targetUpdateError;
    if (!updatedTargetRoom) throw fail('The target room changed while the move was being prepared. Refresh and try again.', 409);

    let assignment;
    if (sourceAssignment) {
      const { data, error } = await supabase
        .from('room_assignments')
        .update({ room_id: targetRoom.id, bed_number: bedNumber, academic_year: application.academic_year_applied })
        .eq('id', sourceAssignment.id)
        .eq('is_active', true)
        .select()
        .single();
      if (error) {
        await supabase.from('rooms').update({ occupied_count: targetRoom.occupied_count, status: targetRoom.status }).eq('id', targetRoom.id);
        throw error;
      }
      assignment = data;

      const { data: sourceRoom, error: sourceRoomError } = await supabase
        .from('rooms')
        .select('id, capacity, occupied_count, status')
        .eq('id', sourceAssignment.room_id)
        .single();
      if (sourceRoomError || !sourceRoom) throw sourceRoomError || fail('Source room no longer exists.', 409);
      const nextSourceCount = Math.max(0, Number(sourceRoom.occupied_count || 0) - 1);
      const { error: sourceUpdateError } = await supabase
        .from('rooms')
        .update({ occupied_count: nextSourceCount, status: 'available' })
        .eq('id', sourceRoom.id)
        .eq('occupied_count', Number(sourceRoom.occupied_count || 0));
      if (sourceUpdateError) throw sourceUpdateError;
    } else {
      const { data, error } = await supabase
        .from('room_assignments')
        .insert({ application_id: application.id, student_id: application.user_id, room_id: targetRoom.id, bed_number: bedNumber, academic_year: application.academic_year_applied, is_active: true })
        .select()
        .single();
      if (error) {
        await supabase.from('rooms').update({ occupied_count: targetRoom.occupied_count, status: targetRoom.status }).eq('id', targetRoom.id);
        throw error;
      }
      assignment = data;
    }

    const { error: applicationUpdateError } = await supabase.from('room_applications').update({ status: 'assigned' }).eq('id', application.id);
    if (applicationUpdateError) throw applicationUpdateError;

    res.json(publicPayload({ assignment, student, room: updatedTargetRoom, move_type: sourceAssignment ? 'transfer' : 'assignment' }, sourceAssignment ? 'Student moved to the selected room.' : 'Student assigned to the selected room.'));
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
    const { room_id, billing_month, prev_electric_reading = 0, curr_electric_reading = 0, electric_rate_khr, prev_water_reading = 0, curr_water_reading = 0, water_rate_khr, trash_fee_khr } = req.body;
    if (!room_id || !billing_month) throw fail('Room and billing month are required.');
    if (!/^\d{4}-\d{2}$/.test(billing_month)) throw fail('Billing month must use YYYY-MM format.');

    const supabase = getSupabase();
    const configuredRates = await getConfiguredUtilityRates(supabase);

    const electricityUsed = asNumber(curr_electric_reading, 'Current electricity reading') - asNumber(prev_electric_reading, 'Previous electricity reading');
    const waterUsed = asNumber(curr_water_reading, 'Current water reading') - asNumber(prev_water_reading, 'Previous water reading');
    if (electricityUsed < 0 || waterUsed < 0) throw fail('Current meter readings cannot be lower than previous readings.');

    const activeAssignments = await getActiveAssignments(room_id);
    if (activeAssignments.length === 0) throw fail('A utility bill cannot be generated until the room has active residents.', 409);

    const electricRate = asNumber(electric_rate_khr ?? configuredRates.electricity_khr_per_kwh, 'Electricity rate');
    const waterRate = asNumber(water_rate_khr ?? configuredRates.water_khr_per_m3, 'Water rate');
    const trashFee = asNumber(trash_fee_khr ?? configuredRates.trash_khr_per_room, 'Trash fee');
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

async function getMyResidence(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data: assignment, error } = await supabase
      .from('room_assignments')
      .select('id, room_id, bed_number, academic_year, assigned_at, rooms(id, room_number, floor_number, capacity, occupied_count, gender, status, buildings(code, name))')
      .eq('student_id', req.user.sub)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!assignment) return res.json(publicPayload({ assignment: null, roommates: [] }));
    const roommates = await getActiveAssignments(assignment.room_id);
    res.json(publicPayload({ assignment, roommates }));
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
    const userId = req.user.role === 'student' ? req.user.sub : req.query.studentId || null;
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
    const { data: targetBill, error: targetBillError } = await supabase
      .from('student_bills')
      .select('id, student_id')
      .eq('id', req.params.studentBillId)
      .maybeSingle();
    if (targetBillError) throw targetBillError;
    if (!targetBill) throw fail('Student bill not found.', 404);
    if (req.user.role === 'student' && targetBill.student_id !== req.user.sub) {
      throw fail('Students can only record payments for their own bills.', 403);
    }

    let updateQuery = supabase
      .from('student_bills')
      .update({ bill_status: 'paid', payment_method, transaction_ref, paid_at: new Date().toISOString() })
      .eq('id', req.params.studentBillId);
    if (req.user.role === 'student') updateQuery = updateQuery.eq('student_id', req.user.sub);
    const { data, error } = await updateQuery.select().single();
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

async function createUser(req, res, next) {
  try {
    const { full_name_khmer, full_name_latin, email, phone, gender, role = 'student', password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!String(full_name_khmer || '').trim() || !String(full_name_latin || '').trim() || !normalizedEmail || !String(phone || '').trim() || !VALID_GENDERS.includes(gender) || !VALID_ROLES.includes(role) || typeof password !== 'string' || password.length < 8) {
      throw fail('Khmer name, Latin name, email, phone, gender, role, and a temporary password of at least 8 characters are required.');
    }
    const supabase = getSupabase();
    const { data, error } = await supabase.from('users').insert({
      full_name_khmer: String(full_name_khmer).trim(),
      full_name_latin: String(full_name_latin).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      gender,
      role,
      password_hash: await bcrypt.hash(password, 12),
    }).select(USER_FIELDS).single();
    if (error) throw error;
    res.status(201).json(publicPayload(data, 'User account created.'));
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const { full_name_khmer, full_name_latin, email, phone, gender, role, password } = req.body;
    const supabase = getSupabase();
    const { data: targetUser, error: targetError } = await supabase.from('users').select('id, role').eq('id', req.params.userId).maybeSingle();
    if (targetError) throw targetError;
    if (!targetUser) throw fail('User not found.', 404);
    if (role !== undefined && !VALID_ROLES.includes(role)) throw fail('Invalid user role.');
    if (gender !== undefined && !VALID_GENDERS.includes(gender)) throw fail('Invalid gender.');
    if (role !== undefined) await ensureAdminContinuity(supabase, targetUser, role);

    const patch = { updated_at: new Date().toISOString() };
    if (full_name_khmer !== undefined) patch.full_name_khmer = String(full_name_khmer).trim();
    if (full_name_latin !== undefined) patch.full_name_latin = String(full_name_latin).trim();
    if (email !== undefined) patch.email = String(email).trim().toLowerCase();
    if (phone !== undefined) patch.phone = String(phone).trim();
    if (gender !== undefined) patch.gender = gender;
    if (role !== undefined) patch.role = role;
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) throw fail('Temporary password must be at least 8 characters.');
      patch.password_hash = await bcrypt.hash(password, 12);
    }
    const { data, error } = await supabase.from('users').update(patch).eq('id', targetUser.id).select(USER_FIELDS).single();
    if (error) throw error;
    res.json(publicPayload(data, 'User account updated.'));
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const supabase = getSupabase();
    const { data: targetUser, error: targetError } = await supabase.from('users').select('id, role').eq('id', req.params.userId).maybeSingle();
    if (targetError) throw targetError;
    if (!targetUser) throw fail('User not found.', 404);
    if (targetUser.id === req.user.sub) throw fail('Administrators cannot delete their own account.', 409);
    await ensureAdminContinuity(supabase, targetUser, 'deleted');
    const { error } = await supabase.from('users').delete().eq('id', targetUser.id);
    if (error) throw error;
    res.json(publicPayload({ id: targetUser.id }, 'User account deleted.'));
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

    await ensureAdminContinuity(supabase, targetUser, role);

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

async function resetUserPassword(req, res, next) {
  try {
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 8) throw fail('The new password must be at least 8 characters.');
    const supabase = getSupabase();
    const { data: targetUser, error: targetError } = await supabase.from('users').select('id').eq('id', req.params.userId).maybeSingle();
    if (targetError) throw targetError;
    if (!targetUser) throw fail('User not found.', 404);
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: await bcrypt.hash(password, 12), updated_at: new Date().toISOString() })
      .eq('id', targetUser.id)
      .select(USER_FIELDS)
      .single();
    if (error) throw error;
    res.json(publicPayload(data, 'Password reset successfully. Share the temporary password only through a secure channel.'));
  } catch (error) {
    next(error);
  }
}

async function listPasswordResetRequests(req, res, next) {
  try {
    const status = req.query.status || 'pending';
    if (!['pending', 'resolved', 'rejected', 'all'].includes(status)) throw fail('Invalid password-reset request status.');
    const supabase = getSupabase();
    let query = supabase.from('password_reset_requests').select(RESET_REQUEST_FIELDS).order('created_at', { ascending: false }).limit(100);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(publicPayload(data || []));
  } catch (error) {
    next(error);
  }
}

async function resolvePasswordResetRequest(req, res, next) {
  try {
    const action = req.body?.action;
    const password = req.body?.password;
    if (!['resolve', 'reject'].includes(action)) throw fail('Choose resolve or reject for this request.');
    if (action === 'resolve' && (typeof password !== 'string' || password.length < 8)) throw fail('A new password of at least 8 characters is required to resolve this request.');
    const supabase = getSupabase();
    const { data: request, error: requestError } = await supabase
      .from('password_reset_requests')
      .select(RESET_REQUEST_FIELDS)
      .eq('id', req.params.requestId)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!request) throw fail('Password reset request not found.', 404);
    if (request.status !== 'pending') throw fail('This password reset request has already been processed.', 409);
    if (action === 'resolve') {
      const { error: passwordError } = await supabase
        .from('users')
        .update({ password_hash: await bcrypt.hash(password, 12), updated_at: new Date().toISOString() })
        .eq('id', request.user_id);
      if (passwordError) throw passwordError;
    }
    const { data, error } = await supabase
      .from('password_reset_requests')
      .update({ status: action === 'resolve' ? 'resolved' : 'rejected', resolved_at: new Date().toISOString(), resolved_by: req.user.sub })
      .eq('id', request.id)
      .select(RESET_REQUEST_FIELDS)
      .single();
    if (error) throw error;
    res.json(publicPayload(data, action === 'resolve' ? 'Password reset request resolved.' : 'Password reset request rejected.'));
  } catch (error) {
    next(error);
  }
}

async function getPublicAnnouncements(req, res, next) {
  try {
    const supabase = getSupabase();
    const [settingsResponse, newsResponse] = await Promise.all([
      supabase.from('site_settings').select('setting_key, setting_value, updated_at').in('setting_key', ['top_ticker', 'registration_deadline', 'homepage_hero', 'homepage_features', 'footer_contact']),
      supabase.from('news_posts').select('id, title, body, image_url, external_url, published_at, created_at').eq('is_visible', true).order('published_at', { ascending: false }).limit(12),
    ]);
    if (settingsResponse.error || newsResponse.error) throw settingsResponse.error || newsResponse.error;
    const settings = Object.fromEntries((settingsResponse.data || []).map((item) => [item.setting_key, item.setting_value]));
    res.json(publicPayload({ settings, news_posts: newsResponse.data || [] }));
  } catch (error) {
    next(error);
  }
}

async function getAnnouncementManagement(req, res, next) {
  try {
    const supabase = getSupabase();
    const [settingsResponse, newsResponse] = await Promise.all([
      supabase.from('site_settings').select('setting_key, setting_value, updated_at').in('setting_key', ['top_ticker', 'registration_deadline', 'homepage_hero', 'homepage_features', 'footer_contact', 'system_settings']),
      supabase.from('news_posts').select('id, title, body, image_url, external_url, is_visible, published_at, created_at, updated_at').order('published_at', { ascending: false }),
    ]);
    if (settingsResponse.error || newsResponse.error) throw settingsResponse.error || newsResponse.error;
    const settings = Object.fromEntries((settingsResponse.data || []).map((item) => [item.setting_key, item.setting_value]));
    res.json(publicPayload({ settings, news_posts: newsResponse.data || [] }));
  } catch (error) {
    next(error);
  }
}

async function updateAnnouncementSettings(req, res, next) {
  try {
    const { top_ticker, registration_deadline, homepage_hero, homepage_features, footer_contact, system_settings } = req.body;
    const rows = [];
    if (top_ticker !== undefined) {
      if (!top_ticker || typeof top_ticker.text !== 'string' || !top_ticker.text.trim()) throw fail('Ticker text is required.');
      rows.push({ setting_key: 'top_ticker', setting_value: { text: top_ticker.text.trim(), link: typeof top_ticker.link === 'string' ? top_ticker.link.trim() : '' }, updated_at: new Date().toISOString() });
    }
    if (registration_deadline !== undefined) {
      if (!registration_deadline || typeof registration_deadline.title !== 'string' || !registration_deadline.title.trim() || typeof registration_deadline.deadline_at !== 'string') throw fail('Deadline title and deadline date are required.');
      rows.push({ setting_key: 'registration_deadline', setting_value: { title: registration_deadline.title.trim(), badge: typeof registration_deadline.badge === 'string' ? registration_deadline.badge.trim() : '', deadline_at: registration_deadline.deadline_at }, updated_at: new Date().toISOString() });
    }
    if (homepage_hero !== undefined) {
      if (!homepage_hero || typeof homepage_hero.title !== 'string' || !homepage_hero.title.trim()) throw fail('Hero title is required.');
      rows.push({ setting_key: 'homepage_hero', setting_value: homepage_hero, updated_at: new Date().toISOString() });
    }
    if (homepage_features !== undefined) {
      if (!Array.isArray(homepage_features) || homepage_features.length !== 4) throw fail('Provide exactly four homepage feature cards.');
      rows.push({ setting_key: 'homepage_features', setting_value: homepage_features, updated_at: new Date().toISOString() });
    }
    if (footer_contact !== undefined) {
      if (!footer_contact || typeof footer_contact.address !== 'string' || typeof footer_contact.phones !== 'string' || typeof footer_contact.email !== 'string') throw fail('Footer address, phones, and email are required.');
      rows.push({ setting_key: 'footer_contact', setting_value: footer_contact, updated_at: new Date().toISOString() });
    }
    if (system_settings !== undefined) {
      if (!system_settings || !Array.isArray(system_settings.academic_levels) || !system_settings.utility_rates || !system_settings.housing_fee) throw fail('Academic levels, utility rates, and housing fee settings are required.');
      rows.push({ setting_key: 'system_settings', setting_value: {
        academic_levels: system_settings.academic_levels.map((item) => String(item).trim()).filter(Boolean).slice(0, 16),
        utility_rates: {
          electricity_khr_per_kwh: Math.max(0, Number(system_settings.utility_rates.electricity_khr_per_kwh || 0)),
          water_khr_per_m3: Math.max(0, Number(system_settings.utility_rates.water_khr_per_m3 || 0)),
          trash_khr_per_room: Math.max(0, Number(system_settings.utility_rates.trash_khr_per_room || 0)),
        },
        housing_fee: { annual_khr: Math.max(0, Number(system_settings.housing_fee.annual_khr || 0)) },
        telegram: { username: String(system_settings.telegram?.username || '@KSITDorm_bot').trim() || '@KSITDorm_bot', webhook_configured: Boolean(process.env.TELEGRAM_BOT_TOKEN) },
      }, updated_at: new Date().toISOString() });
    }
    if (rows.length === 0) throw fail('Provide homepage settings to update.');
    const supabase = getSupabase();
    const { data, error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' }).select('setting_key, setting_value, updated_at');
    if (error) throw error;
    res.json(publicPayload(data || [], 'Homepage announcement settings updated.'));
  } catch (error) {
    next(error);
  }
}

async function createNewsPost(req, res, next) {
  try {
    const { title, body = '', image_url = '', external_url = '', is_visible = true, published_at } = req.body;
    if (!String(title || '').trim()) throw fail('News post title is required.');
    const supabase = getSupabase();
    const { data, error } = await supabase.from('news_posts').insert({
      title: String(title).trim(),
      body: String(body || '').trim(),
      image_url: String(image_url || '').trim() || null,
      external_url: String(external_url || '').trim() || null,
      is_visible: Boolean(is_visible),
      published_at: published_at || new Date().toISOString(),
      created_by: req.user.sub,
    }).select().single();
    if (error) throw error;
    res.status(201).json(publicPayload(data, 'News post created.'));
  } catch (error) {
    next(error);
  }
}

async function updateNewsPost(req, res, next) {
  try {
    const { title, body, image_url, external_url, is_visible, published_at } = req.body;
    const patch = { updated_at: new Date().toISOString() };
    if (title !== undefined) {
      if (!String(title).trim()) throw fail('News post title cannot be empty.');
      patch.title = String(title).trim();
    }
    if (body !== undefined) patch.body = String(body || '').trim();
    if (image_url !== undefined) patch.image_url = String(image_url || '').trim() || null;
    if (external_url !== undefined) patch.external_url = String(external_url || '').trim() || null;
    if (is_visible !== undefined) patch.is_visible = Boolean(is_visible);
    if (published_at !== undefined) patch.published_at = published_at;
    const supabase = getSupabase();
    const { data, error } = await supabase.from('news_posts').update(patch).eq('id', req.params.newsPostId).select().single();
    if (error) throw error;
    res.json(publicPayload(data, 'News post updated.'));
  } catch (error) {
    next(error);
  }
}

async function deleteNewsPost(req, res, next) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('news_posts').delete().eq('id', req.params.newsPostId);
    if (error) throw error;
    res.json(publicPayload({ id: req.params.newsPostId }, 'News post deleted.'));
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

async function dashboardAnalytics(req, res, next) {
  try {
    const supabase = getSupabase();
    const [applicationsResponse, roomsResponse, attendanceResponse, billsResponse] = await Promise.all([
      supabase.from('room_applications').select('status'),
      supabase.from('rooms').select('capacity, occupied_count, status'),
      supabase.from('attendances').select('attendance_date, status').gte('attendance_date', new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)),
      supabase.from('student_bills').select('amount_khr, bill_status, billing_month'),
    ]);
    if (applicationsResponse.error || roomsResponse.error || attendanceResponse.error || billsResponse.error) throw applicationsResponse.error || roomsResponse.error || attendanceResponse.error || billsResponse.error;
    const countStatuses = (rows, key = 'status') => rows.reduce((result, row) => ({ ...result, [row[key] || 'unknown']: (result[row[key] || 'unknown'] || 0) + 1 }), {});
    const rooms = roomsResponse.data || [];
    const bills = billsResponse.data || [];
    const attendance = attendanceResponse.data || [];
    res.json(publicPayload({
      applications: countStatuses(applicationsResponse.data || []),
      occupancy: { occupied: rooms.reduce((sum, room) => sum + Number(room.occupied_count || 0), 0), capacity: rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0) },
      attendance: countStatuses(attendance),
      attendance_days: [...new Set(attendance.map((row) => row.attendance_date))].sort().map((date) => ({ date, ...countStatuses(attendance.filter((row) => row.attendance_date === date)) })),
      billing: { total_khr: bills.reduce((sum, bill) => sum + Number(bill.amount_khr || 0), 0), ...countStatuses(bills, 'bill_status') },
    }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  listApplications,
  createApplication,
  reviewApplication,
  autoAssignApplication,
  getAssignmentBoard,
  manuallyMoveRoomAssignment,
  listUtilityBills,
  createUtilityBill,
  getMyResidence,
  listStudentBills,
  recordBillPayment,
  resolveMagicQr,
  scanAttendance,
  listAttendance,
  listMaintenance,
  createMaintenance,
  updateMaintenance,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  resetUserPassword,
  listPasswordResetRequests,
  resolvePasswordResetRequest,
  getPublicAnnouncements,
  getAnnouncementManagement,
  updateAnnouncementSettings,
  createNewsPost,
  updateNewsPost,
  deleteNewsPost,
  dashboardSummary,
  dashboardAnalytics,
};
