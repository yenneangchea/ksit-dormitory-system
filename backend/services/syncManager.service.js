const archiver = require('archiver');
const { requireStorageConfiguration } = require('../config/supabase');
const { uploadFileToDrive } = require('./googleDrive.service');

const STUDENT_DOCUMENTS_BUCKET = 'student-documents';

const createHttpError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toBuffer = async (value) => {
  if (Buffer.isBuffer(value)) return value;
  if (value && typeof value.arrayBuffer === 'function') {
    return Buffer.from(await value.arrayBuffer());
  }
  throw createHttpError('The storage provider returned an unreadable file.', 500);
};

const safeFilenamePart = (value, fallback) => {
  const normalized = String(value || fallback || '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
};

const getDocumentEntries = (application) => {
  const metadata = application.document_metadata_json || {};
  const legacyFields = {
    photo_4x6: application.student_photo_url,
    id_card: application.national_id_doc_url,
    family_book: application.family_book_doc_url,
    contract: application.signed_application_doc_url,
  };

  const merged = { ...legacyFields, ...metadata };
  return Object.entries(merged)
    .map(([key, value]) => {
      const document = typeof value === 'string' ? { path: value } : value;
      return {
        key,
        bucket: document?.bucket || (['photo_4x6', 'student_photo'].includes(key) ? 'student-avatars' : STUDENT_DOCUMENTS_BUCKET),
        path: document?.path || document?.storage_path || '',
        fileName: document?.fileName || document?.name || '',
      };
    })
    .filter((document) => document.path && !document.path.startsWith('local:'));
};

const createZipBuffer = async (documents) => new Promise((resolve, reject) => {
  const chunks = [];
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', (warning) => {
    if (warning.code !== 'ENOENT') reject(warning);
  });
  archive.on('error', reject);
  archive.on('data', (chunk) => chunks.push(chunk));
  archive.on('end', () => resolve(Buffer.concat(chunks)));

  for (const document of documents) {
    archive.append(document.buffer, { name: document.archiveName });
  }

  archive.finalize();
});

/**
 * Downloads one approved application’s private documents, creates one archive,
 * stores it in Google Drive, then persists the Drive view link on the record.
 */
const archiveApprovedApplication = async (applicationId) => {
  const supabase = requireStorageConfiguration();
  const { data: application, error } = await supabase
    .from('room_applications')
    .select(`
      id,
      user_id,
      document_metadata_json,
      student_photo_url,
      national_id_doc_url,
      family_book_doc_url,
      signed_application_doc_url,
      user:users!room_applications_user_id_fkey(
        id,
        full_name_khmer,
        full_name_latin,
        academic_profiles!academic_profiles_user_id_fkey(student_id_card)
      ),
      room_assignments!room_assignments_application_id_fkey(
        room:rooms!room_assignments_room_id_fkey(room_number)
      )
    `)
    .eq('id', applicationId)
    .single();

  if (error || !application) {
    throw createHttpError('Application not found while creating its Google Drive archive.', 404);
  }

  const documentEntries = getDocumentEntries(application);
  if (!documentEntries.length) {
    throw createHttpError('No Supabase Storage documents are available to archive for this application.', 422);
  }

  const downloadedDocuments = [];
  for (const document of documentEntries) {
    const { data: blob, error: downloadError } = await supabase
      .storage
      .from(document.bucket)
      .download(document.path);

    if (downloadError) {
      throw createHttpError(`Could not download ${document.fileName || document.key} for archiving: ${downloadError.message}`, 502);
    }

    const defaultName = document.path.split('/').pop() || `${document.key}.bin`;
    downloadedDocuments.push({
      buffer: await toBuffer(blob),
      archiveName: safeFilenamePart(document.fileName || defaultName, `${document.key}.bin`),
    });
  }

  const zipBuffer = await createZipBuffer(downloadedDocuments);
  const roomNumber = application.room_assignments?.[0]?.room?.room_number || 'UNASSIGNED';
  const academicProfile = Array.isArray(application.user?.academic_profiles)
    ? application.user.academic_profiles[0]
    : application.user?.academic_profiles;
  const studentId = academicProfile?.student_id_card || application.user_id;
  const studentName = application.user?.full_name_khmer || application.user?.full_name_latin || 'Student';
  const fileName = [
    safeFilenamePart(roomNumber, 'UNASSIGNED'),
    safeFilenamePart(studentId, 'STUDENT'),
    safeFilenamePart(studentName, 'Student'),
  ].join('_') + '.zip';

  const driveFile = await uploadFileToDrive({
    fileName,
    mimeType: 'application/zip',
    fileBuffer: zipBuffer,
    folderId: process.env.GOOGLE_DRIVE_APPROVED_STUDENTS_FOLDER_ID,
  });

  const { data: updated, error: updateError } = await supabase
    .from('room_applications')
    .update({ drive_archive_url: driveFile.webViewLink || null })
    .eq('id', applicationId)
    .select()
    .single();

  if (updateError) {
    throw createHttpError(`Archive uploaded but the application link could not be saved: ${updateError.message}`, 500);
  }

  return {
    application: updated,
    archive: {
      id: driveFile.id,
      name: driveFile.name,
      url: driveFile.webViewLink || driveFile.webContentLink || null,
      documentCount: downloadedDocuments.length,
    },
  };
};

const validateMonth = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) {
    throw createHttpError('month must use YYYY-MM format.', 400);
  }
  return month;
};

const getMonthRange = (month) => {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
  return { start, end };
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const toCsvBuffer = (headers, rows) => Buffer.from(
  '\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n'),
  'utf8'
);

const exportMonthlyAttendanceToDrive = async (month) => {
  const supabase = requireStorageConfiguration();
  const reportMonth = validateMonth(month);
  const { start, end } = getMonthRange(reportMonth);
  const { data, error } = await supabase
    .from('attendances')
    .select(`
      attendance_date, status, leave_reason,
      student:users!attendances_student_id_fkey(full_name_latin, full_name_khmer),
      room:rooms!attendances_room_id_fkey(room_number, building:buildings!rooms_building_id_fkey(code))
    `)
    .gte('attendance_date', start)
    .lte('attendance_date', end)
    .order('attendance_date', { ascending: true });

  if (error) throw createHttpError(`Could not generate the attendance report: ${error.message}`, 500);

  const buffer = toCsvBuffer(
    ['Date', 'Building', 'Room', 'Student (Latin)', 'Student (Khmer)', 'Status', 'Leave Reason'],
    data.map((record) => [
      record.attendance_date,
      record.room?.building?.code,
      record.room?.room_number,
      record.student?.full_name_latin,
      record.student?.full_name_khmer,
      record.status,
      record.leave_reason,
    ])
  );

  const driveFile = await uploadFileToDrive({
    fileName: `KSIT_Attendance_${reportMonth}.csv`,
    mimeType: 'text/csv',
    fileBuffer: buffer,
    folderId: process.env.GOOGLE_DRIVE_ATTENDANCE_FOLDER_ID,
  });

  return { month: reportMonth, records: data.length, url: driveFile.webViewLink || driveFile.webContentLink || null, file: driveFile };
};

const exportMonthlyBillingToDrive = async (month) => {
  const supabase = requireStorageConfiguration();
  const reportMonth = validateMonth(month);
  const { data, error } = await supabase
    .from('utility_bills')
    .select(`
      id, billing_month, prev_electric_reading, curr_electric_reading,
      electricity_used_kwh, free_electricity_kwh, subsidized_electricity_kwh, chargeable_electricity_kwh, total_electric_cost_khr,
      prev_water_reading, curr_water_reading, water_used_m3, free_water_m3, subsidized_water_m3, chargeable_water_m3, total_water_cost_khr,
      trash_fee_khr, total_amount_khr,
      active_students_count, split_amount_per_student_khr,
      room:rooms!utility_bills_room_id_fkey(room_number, building:buildings!rooms_building_id_fkey(code))
    `)
    .eq('billing_month', reportMonth)
    .order('created_at', { ascending: true });

  if (error) throw createHttpError(`Could not generate the billing report: ${error.message}`, 500);

  const buffer = toCsvBuffer(
    ['Month', 'Building', 'Room', 'Electric Previous', 'Electric Current', 'Electric Used (kWh)', 'Free Electric (kWh)', 'Chargeable Electric (kWh)', 'Electric Cost (KHR)', 'Water Previous', 'Water Current', 'Water Used (m³)', 'Free Water (m³)', 'Chargeable Water (m³)', 'Water Cost (KHR)', 'Trash Fee (KHR)', 'Total (KHR)', 'Residents', 'Per Student (KHR)'],
    data.map((bill) => [
      bill.billing_month,
      bill.room?.building?.code,
      bill.room?.room_number,
      bill.prev_electric_reading,
      bill.curr_electric_reading,
      bill.electricity_used_kwh,
      bill.subsidized_electricity_kwh,
      bill.chargeable_electricity_kwh,
      bill.total_electric_cost_khr,
      bill.prev_water_reading,
      bill.curr_water_reading,
      bill.water_used_m3,
      bill.subsidized_water_m3,
      bill.chargeable_water_m3,
      bill.total_water_cost_khr,
      bill.trash_fee_khr,
      bill.total_amount_khr,
      bill.active_students_count,
      bill.split_amount_per_student_khr,
    ])
  );

  const driveFile = await uploadFileToDrive({
    fileName: `KSIT_Utility_Billing_${reportMonth}.csv`,
    mimeType: 'text/csv',
    fileBuffer: buffer,
    folderId: process.env.GOOGLE_DRIVE_BILLING_FOLDER_ID,
  });
  const reportUrl = driveFile.webViewLink || driveFile.webContentLink || null;

  if (data.length) {
    const { error: updateError } = await supabase
      .from('utility_bills')
      .update({ drive_report_url: reportUrl })
      .eq('billing_month', reportMonth);
    if (updateError) throw createHttpError(`Report uploaded but report links could not be saved: ${updateError.message}`, 500);
  }

  return { month: reportMonth, records: data.length, url: reportUrl, file: driveFile };
};

module.exports = {
  archiveApprovedApplication,
  exportMonthlyAttendanceToDrive,
  exportMonthlyBillingToDrive,
};
