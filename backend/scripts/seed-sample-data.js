require('dotenv').config({ quiet: true });

const crypto = require('crypto');
const { getSupabase } = require('../config/supabase');

const ACADEMIC_YEAR = '2025-2026';
const BILLING_MONTH = new Date().toISOString().slice(0, 7);
const DEMO_BUILDING_CODE = 'DEMO';
const KHR_PER_USD = Number(process.env.KHR_PER_USD || 4100);

const sampleStudents = [
  { email: 'sample.sokha@ksit.demo', khmer: 'សុខា សំណាង', latin: 'Sokha Samnang', gender: 'male', phone: '010100001', studentId: 'DEMO-IT-001', room: 'DEMO-101', bed: 1, year: 1 },
  { email: 'sample.dara@ksit.demo', khmer: 'ដារា វិសាល', latin: 'Dara Visal', gender: 'male', phone: '010100002', studentId: 'DEMO-IT-002', room: 'DEMO-101', bed: 2, year: 1 },
  { email: 'sample.vuthy@ksit.demo', khmer: 'វុទ្ធី ចាន់', latin: 'Vuthy Chan', gender: 'male', phone: '010100003', studentId: 'DEMO-IT-003', room: 'DEMO-101', bed: 3, year: 2 },
  { email: 'sample.sreypov@ksit.demo', khmer: 'ស្រីពៅ មុនី', latin: 'Sreypov Mony', gender: 'female', phone: '010100004', studentId: 'DEMO-IT-004', room: 'DEMO-201', bed: 1, year: 1 },
  { email: 'sample.malis@ksit.demo', khmer: 'ម៉ាលី រតនា', latin: 'Malis Ratanak', gender: 'female', phone: '010100005', studentId: 'DEMO-IT-005', room: 'DEMO-201', bed: 2, year: 2 },
  { email: 'sample.kunthea@ksit.demo', khmer: 'គន្ធា សុភា', latin: 'Kunthea Sophea', gender: 'female', phone: '010100006', studentId: 'DEMO-IT-006', room: 'DEMO-201', bed: 3, year: 2 },
];

const roomDefinitions = [
  { room_number: 'DEMO-101', floor_number: 1, capacity: 4, gender: 'male', assigned_major: 'Information Technology', assigned_year: 1, magic_qr_code: 'KSIT-DEMO-QR-101' },
  { room_number: 'DEMO-102', floor_number: 1, capacity: 4, gender: 'male', assigned_major: 'Information Technology', assigned_year: 2, magic_qr_code: 'KSIT-DEMO-QR-102' },
  { room_number: 'DEMO-201', floor_number: 2, capacity: 4, gender: 'female', assigned_major: 'Information Technology', assigned_year: 1, magic_qr_code: 'KSIT-DEMO-QR-201' },
  { room_number: 'DEMO-202', floor_number: 2, capacity: 4, gender: 'female', assigned_major: 'Information Technology', assigned_year: 2, magic_qr_code: 'KSIT-DEMO-QR-202' },
];

function fail(message) {
  throw new Error(message);
}

async function ensureApplication(supabase, userId) {
  const { data: existing, error: existingError } = await supabase
    .from('room_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('academic_year_applied', ACADEMIC_YEAR)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('room_applications')
    .insert({
      user_id: userId,
      academic_year_applied: ACADEMIC_YEAR,
      status: 'assigned',
      photo_4x6_attached: true,
      contract_signed: true,
      parent_guarantee_attached: true,
      family_book_attached: true,
      id_card_attached: true,
      reviewed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const supabase = getSupabase();
  const { data: staff, error: staffError } = await supabase
    .from('users')
    .select('id, role')
    .in('role', ['manager', 'teacher']);
  if (staffError) throw staffError;

  const managerId = staff.find((user) => user.role === 'manager')?.id;
  const teacherId = staff.find((user) => user.role === 'teacher')?.id;
  if (!managerId || !teacherId) fail('A manager and teacher account must exist before seeding sample data.');

  const demoUsers = sampleStudents.map((student) => ({
    role: 'student',
    full_name_khmer: student.khmer,
    full_name_latin: student.latin,
    gender: student.gender,
    phone: student.phone,
    email: student.email,
  }));
  const { error: userUpsertError } = await supabase.from('users').upsert(demoUsers, { onConflict: 'email' });
  if (userUpsertError) throw userUpsertError;

  const { data: seededUsers, error: seededUserError } = await supabase
    .from('users')
    .select('id, email')
    .in('email', sampleStudents.map((student) => student.email));
  if (seededUserError) throw seededUserError;
  const usersByEmail = new Map(seededUsers.map((user) => [user.email, user.id]));

  const profiles = sampleStudents.map((student) => ({
    user_id: usersByEmail.get(student.email),
    student_id_card: student.studentId,
    major: 'Information Technology',
    academic_year: student.year,
    class_section: student.year === 1 ? 'IT-A' : 'IT-B',
    scholarship_type: 'Full Scholarship',
    date_of_birth: '2005-01-15',
    place_of_birth: 'Kampong Speu',
    national_id_number: `DEMO-NID-${student.studentId.slice(-3)}`,
    current_address: 'KSIT Demo Residence',
    father_name: 'Demo Father',
    father_age: 48,
    father_occupation: 'Farmer',
    father_phone: '011000001',
    father_address: 'Kampong Speu',
    mother_name: 'Demo Mother',
    mother_age: 45,
    mother_occupation: 'Vendor',
    mother_phone: '011000002',
    mother_address: 'Kampong Speu',
    guarantor_name: 'Demo Guardian',
    guarantor_relation: 'Parent',
    guarantor_phone: '011000003',
    guarantor_address: 'Kampong Speu',
  }));
  if (profiles.some((profile) => !profile.user_id)) fail('A sample student account could not be resolved.');
  const { error: profileUpsertError } = await supabase.from('academic_profiles').upsert(profiles, { onConflict: 'user_id' });
  if (profileUpsertError) throw profileUpsertError;

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .upsert({
      code: DEMO_BUILDING_CODE,
      name: 'Demonstration Residence Hall',
      gender_restriction: 'mixed',
      total_floors: 2,
      description: 'DEMO_SEED_V1 — safe sample data for UI testing.',
    }, { onConflict: 'code' })
    .select('id')
    .single();
  if (buildingError) throw buildingError;

  const roomsForUpsert = roomDefinitions.map((room) => ({ ...room, building_id: building.id, status: 'available' }));
  const { error: roomUpsertError } = await supabase.from('rooms').upsert(roomsForUpsert, { onConflict: 'room_number' });
  if (roomUpsertError) throw roomUpsertError;
  const { data: rooms, error: roomQueryError } = await supabase
    .from('rooms')
    .select('id, room_number, capacity')
    .in('room_number', roomDefinitions.map((room) => room.room_number));
  if (roomQueryError) throw roomQueryError;
  const roomsByNumber = new Map(rooms.map((room) => [room.room_number, room]));

  const resolvedStudents = sampleStudents.map((student) => ({ ...student, id: usersByEmail.get(student.email) }));
  for (const student of resolvedStudents) {
    const applicationId = await ensureApplication(supabase, student.id);
    const room = roomsByNumber.get(student.room);
    if (!room) fail(`Sample room ${student.room} was not created.`);

    const { data: existingAssignment, error: assignmentQueryError } = await supabase
      .from('room_assignments')
      .select('id')
      .eq('student_id', student.id)
      .eq('is_active', true)
      .maybeSingle();
    if (assignmentQueryError) throw assignmentQueryError;
    if (!existingAssignment) {
      const { error: assignmentInsertError } = await supabase.from('room_assignments').insert({
        application_id: applicationId,
        student_id: student.id,
        room_id: room.id,
        bed_number: student.bed,
        academic_year: ACADEMIC_YEAR,
        is_active: true,
      });
      if (assignmentInsertError) throw assignmentInsertError;
    }
  }

  const billingRooms = ['DEMO-101', 'DEMO-201'];
  const billSummary = [];
  for (const roomNumber of billingRooms) {
    const room = roomsByNumber.get(roomNumber);
    const residents = resolvedStudents.filter((student) => student.room === roomNumber);
    const prevElectric = roomNumber === 'DEMO-101' ? 120 : 205;
    const currElectric = roomNumber === 'DEMO-101' ? 186 : 273;
    const prevWater = roomNumber === 'DEMO-101' ? 42 : 58;
    const currWater = roomNumber === 'DEMO-101' ? 52 : 70;
    const electricRate = 800;
    const waterRate = 1500;
    const trashFee = 10000;
    const total = (currElectric - prevElectric) * electricRate + (currWater - prevWater) * waterRate + trashFee;
    const perStudent = Number((total / residents.length).toFixed(2));

    const { data: bill, error: billError } = await supabase
      .from('utility_bills')
      .upsert({
        room_id: room.id,
        billing_month: BILLING_MONTH,
        prev_electric_reading: prevElectric,
        curr_electric_reading: currElectric,
        electric_rate_khr: electricRate,
        prev_water_reading: prevWater,
        curr_water_reading: currWater,
        water_rate_khr: waterRate,
        trash_fee_khr: trashFee,
        active_students_count: residents.length,
        split_amount_per_student_khr: perStudent,
        created_by: managerId,
      }, { onConflict: 'room_id,billing_month' })
      .select('id')
      .single();
    if (billError) throw billError;

    const { error: deleteBillsError } = await supabase.from('student_bills').delete().eq('utility_bill_id', bill.id);
    if (deleteBillsError) throw deleteBillsError;
    const studentBills = residents.map((student) => ({
      utility_bill_id: bill.id,
      student_id: student.id,
      room_id: room.id,
      billing_month: BILLING_MONTH,
      amount_khr: perStudent,
      amount_usd: Number((perStudent / KHR_PER_USD).toFixed(2)),
      khqr_string: `DEMO-KHQR|${roomNumber}|${BILLING_MONTH}|${student.studentId}`,
      khqr_md5: crypto.createHash('md5').update(`${bill.id}|${student.id}|${perStudent}`).digest('hex'),
      bill_status: student.bed === 1 ? 'paid' : 'unpaid',
      payment_method: student.bed === 1 ? 'cash_demo' : null,
      transaction_ref: student.bed === 1 ? `DEMO-PAID-${student.studentId}` : null,
      paid_at: student.bed === 1 ? new Date().toISOString() : null,
    }));
    const { error: studentBillError } = await supabase.from('student_bills').insert(studentBills);
    if (studentBillError) throw studentBillError;
    billSummary.push({ room: roomNumber, residents: residents.length, total_khr: total, per_student_khr: perStudent });
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const [index, student] of resolvedStudents.entries()) {
    const room = roomsByNumber.get(student.room);
    const { error: attendanceError } = await supabase.from('attendances').upsert({
      room_id: room.id,
      student_id: student.id,
      attendance_date: today,
      status: index === resolvedStudents.length - 1 ? 'leave' : 'present',
      leave_reason: index === resolvedStudents.length - 1 ? 'Approved family visit' : null,
      recorded_by: teacherId,
    }, { onConflict: 'room_id,student_id,attendance_date' });
    if (attendanceError) throw attendanceError;
  }

  const maintenanceRows = [
    { room: 'DEMO-101', student: resolvedStudents[0], title: 'DEMO_SEED: Corridor light inspection', category: 'electricity', urgency: 'low', status: 'open' },
    { room: 'DEMO-201', student: resolvedStudents[3], title: 'DEMO_SEED: Faucet pressure check', category: 'plumbing', urgency: 'medium', status: 'in_progress' },
  ];
  for (const ticket of maintenanceRows) {
    const room = roomsByNumber.get(ticket.room);
    const { data: existingTicket, error: ticketQueryError } = await supabase
      .from('maintenance_requests')
      .select('id')
      .eq('title', ticket.title)
      .maybeSingle();
    if (ticketQueryError) throw ticketQueryError;
    if (!existingTicket) {
      const { error: maintenanceError } = await supabase.from('maintenance_requests').insert({
        room_id: room.id,
        reported_by_student_id: ticket.student.id,
        category: ticket.category,
        title: ticket.title,
        description: 'Sample maintenance request generated by the KSIT demo seed.',
        urgency: ticket.urgency,
        status: ticket.status,
      });
      if (maintenanceError) throw maintenanceError;
    }
  }

  console.log(JSON.stringify({
    seeded: true,
    building: DEMO_BUILDING_CODE,
    sample_students: resolvedStudents.length,
    demo_rooms: rooms.length,
    billing_month: BILLING_MONTH,
    bills: billSummary,
    attendance_records: resolvedStudents.length,
    maintenance_tickets: maintenanceRows.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ seeded: false, error: error.message, details: error.details || null }));
  process.exit(1);
});
