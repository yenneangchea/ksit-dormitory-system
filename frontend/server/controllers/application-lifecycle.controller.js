const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const PDFDocument = require('pdfkit');
const { getSupabase } = require('../config/supabase');
const driveStorage = require('../lib/application-storage');
const { archiveApprovedApplication } = require('../services/syncManager.service');
const { applicationNotification, systemLogNotification } = require('../services/telegram.service');

const APPLICATION_FIELDS = `
  id, user_id, academic_year_applied, status, photo_4x6_attached, contract_signed,
  parent_guarantee_attached, family_book_attached, id_card_attached, rejection_reason,
  applied_at, reviewed_at, reviewed_by, prefilled_pdf_url, prefilled_pdf_generated_at,
  student_photo_url, national_id_doc_url, family_book_doc_url, signed_application_doc_url,
  document_metadata_json, manager_notes, submission_step, step_progress, submitted_for_review_at, form_data_json, draft_data,
  users!room_applications_user_id_fkey(
    id, telegram_id, full_name_khmer, full_name_latin, gender, phone, email,
    academic_profiles(
      id, user_id, student_id_card, academic_level, academic_major_id, major, academic_year, class_section, scholarship_type,
      date_of_birth, place_of_birth, national_id_number, current_address,
      father_name, father_age, father_occupation, father_phone, father_address,
      mother_name, mother_age, mother_occupation, mother_phone, mother_address,
      guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
      ethnicity, nationality, marital_status, spouse_name, spouse_occupation,
      siblings_json, education_history_json, emergency_contacts_json
    )
  )
`;

const DOCUMENTS = {
  student_photo: { bucket: 'student-avatars', column: 'student_photo_url', driveColumn: 'student_photo_drive_url', attached: 'photo_4x6_attached', allowed: /^image\/(jpeg|png)$/i, maxBytes: 5 * 1024 * 1024 },
  national_id: { bucket: 'student-documents', column: 'national_id_doc_url', driveColumn: 'national_id_drive_url', attached: 'id_card_attached', allowed: /^(application\/pdf|image\/(jpeg|png))$/i, maxBytes: 5 * 1024 * 1024 },
  family_book: { bucket: 'student-documents', column: 'family_book_doc_url', driveColumn: 'family_book_drive_url', attached: 'family_book_attached', allowed: /^(application\/pdf|image\/(jpeg|png))$/i, maxBytes: 5 * 1024 * 1024 },
  signed_application: { bucket: 'student-documents', column: 'signed_application_doc_url', driveColumn: 'signed_application_drive_url', attached: 'contract_signed', allowed: /^(application\/pdf|image\/(jpeg|png))$/i, maxBytes: 5 * 1024 * 1024 },
  prefilled_pdf: { bucket: 'student-documents', column: 'prefilled_pdf_url', driveColumn: 'prefilled_pdf_drive_url', allowed: /^application\/pdf$/i, maxBytes: 5 * 1024 * 1024 },
};

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function payload(data, message) {
  return { success: true, ...(message ? { message } : {}), data };
}

function single(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function cleanText(value, max = 500) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function applicationDocumentSummary(application) {
  const documents = [];
  if (application?.photo_4x6_attached) documents.push('រូបថត 4×6');
  if (application?.id_card_attached) documents.push('អត្តសញ្ញាណប័ណ្ណ');
  if (application?.family_book_attached) documents.push('សៀវភៅគ្រួសារ');
  if (application?.prefilled_pdf_url || application?.prefilled_pdf_drive_url) documents.push('PDF ពាក្យសុំ');
  if (application?.contract_signed || application?.signed_application_doc_url || application?.signed_application_drive_url) documents.push('ពាក្យសុំចុះហត្ថលេខា');
  return documents.join(' + ');
}

function cleanArray(value, limit = 12) {
  return Array.isArray(value) ? value.slice(0, limit).map((entry) => entry && typeof entry === 'object' ? entry : {}) : [];
}

async function validateConfiguredAcademicSelection(supabase, profile) {
  const academicLevel = cleanText(profile.academic_level, 160);
  const academicMajorId = cleanText(profile.academic_major_id, 64);
  const academicYear = Number(profile.academic_year);
  if (!academicLevel || !academicMajorId) throw fail('Select an academic level and configured major before generating the official PDF.');
  const { data: major, error } = await supabase
    .from('academic_majors')
    .select('id, academic_level, name_khmer, available_year_levels, is_active')
    .eq('id', academicMajorId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!major) throw fail('The selected academic major is no longer active. Choose an active major before continuing.', 409);
  if (major.academic_level !== academicLevel) throw fail('The selected major does not belong to the chosen academic level.');
  if (!(major.available_year_levels || []).includes(academicYear)) throw fail('The selected year level is not available for the chosen major.');
  return { ...profile, academic_level: academicLevel, academic_major_id: major.id, major: major.name_khmer };
}

function safeFileName(name) {
  const extension = path.extname(name || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8) || '.bin';
  return `${crypto.randomUUID()}${extension}`;
}

function safeDownloadFileName(value, fallback = 'KSIT_Dorm_Application.pdf') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_ .-]+|[_ .-]+$/g, '')
    .slice(0, 150);
  return normalized || fallback;
}

function officialPdfFilename(application, profile) {
  const user = application?.users || {};
  const studentName = safeDownloadFileName(user.full_name_latin || user.full_name_khmer || profile?.student_id_card || 'KSIT_Student', 'KSIT_Student');
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${studentName}_KSIT_Dorm_Application_${dateStamp}.pdf`;
}

function boundedStep(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(5, Math.max(1, parsed)) : 1;
}

function mergeDraftData(application, incoming) {
  const previous = application?.draft_data && typeof application.draft_data === 'object' ? application.draft_data : {};
  const form = application?.form_data_json && typeof application.form_data_json === 'object' ? application.form_data_json : {};
  return { ...form, ...previous, ...(incoming && typeof incoming === 'object' ? incoming : {}) };
}

function documentInfo(application) {
  return application?.document_metadata_json && typeof application.document_metadata_json === 'object' ? application.document_metadata_json : {};
}

async function createSignedUrl(supabase, bucket, objectPath) {
  if (!objectPath) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 15);
  if (error) throw error;
  return data?.signedUrl || null;
}

function hasDocument(application, type) {
  const definition = DOCUMENTS[type];
  return Boolean(definition && application?.[definition.column]);
}

function documentMetadata(application, type) {
  return documentInfo(application)?.[type] || {};
}

async function storeDocument(supabase, application, type, { buffer, name, contentType }) {
  const definition = DOCUMENTS[type];
  const objectPath = `${application.user_id}/applications/${application.id}/${type}/${safeFileName(name)}`;
  const { error } = await supabase.storage.from(definition.bucket).upload(objectPath, buffer, { contentType, upsert: false });
  if (error) throw error;
  return {
    provider: 'supabase_storage',
    bucket: definition.bucket,
    reference: objectPath,
    path: objectPath,
    name,
    contentType,
    size: buffer.length,
    patch: { [definition.column]: objectPath },
  };
}

async function documentStream(supabase, application, type) {
  const definition = DOCUMENTS[type];
  const reference = application?.[definition?.column];
  if (!definition || !reference) throw fail('Requested application document was not found.', 404);
  if (driveStorage.isDriveReference(reference)) return driveStorage.getDriveFileStream(reference);
  const { data, error } = await supabase.storage.from(definition.bucket).download(reference);
  if (error) throw error;
  return { stream: Readable.from(Buffer.from(await data.arrayBuffer())), contentType: data.type || documentMetadata(application, type).content_type || 'application/octet-stream' };
}

async function presentApplication(supabase, application) {
  if (!application) return null;
  const result = { ...application };
  delete result.student_photo_url;
  delete result.national_id_doc_url;
  delete result.family_book_doc_url;
  delete result.signed_application_doc_url;
  delete result.prefilled_pdf_url;
  result.academic_profiles = single(application.users?.academic_profiles);
  result.storage_provider = Object.values(DOCUMENTS).some((definition) => driveStorage.isDriveReference(application[definition.column])) ? 'google_drive' : 'supabase_storage';
  result.document_available = Object.fromEntries(Object.keys(DOCUMENTS).map((type) => [type, hasDocument(application, type)]));
  result.document_urls = {};
  for (const [type, definition] of Object.entries(DOCUMENTS)) {
    result.document_urls[type] = driveStorage.isDriveReference(application[definition.column]) ? null : await createSignedUrl(supabase, definition.bucket, application[definition.column]);
  }
  return result;
}

async function findApplication(supabase, applicationId, userId) {
  let query = supabase.from('room_applications').select(APPLICATION_FIELDS).eq('id', applicationId);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw fail('Dormitory application not found.', 404);
  return data;
}

async function findCurrentStudentApplication(supabase, userId, academicYear) {
  let query = supabase.from('room_applications').select(APPLICATION_FIELDS).eq('user_id', userId).order('applied_at', { ascending: false }).limit(1);
  if (academicYear) query = query.eq('academic_year_applied', academicYear);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] || null;
}

function compactProfile(raw = {}, existing = {}) {
  const value = (key, max) => cleanText(raw[key] ?? existing[key], max);
  const number = (key) => {
    const candidate = raw[key] ?? existing[key];
    return candidate === '' || candidate === null || candidate === undefined ? null : Number(candidate);
  };
  return {
    student_id_card: value('student_id_card', 50),
    academic_level: value('academic_level', 160),
    academic_major_id: value('academic_major_id', 64),
    major: value('major', 150),
    academic_year: number('academic_year'),
    class_section: value('class_section', 50) || null,
    scholarship_type: value('scholarship_type', 100) || 'Full Scholarship',
    date_of_birth: value('date_of_birth', 20),
    place_of_birth: value('place_of_birth', 500),
    national_id_number: value('national_id_number', 50) || null,
    current_address: value('current_address', 1000),
    father_name: value('father_name', 255),
    father_age: number('father_age'),
    father_occupation: value('father_occupation', 255) || null,
    father_phone: value('father_phone', 20) || null,
    father_address: value('father_address', 1000) || null,
    mother_name: value('mother_name', 255),
    mother_age: number('mother_age'),
    mother_occupation: value('mother_occupation', 255) || null,
    mother_phone: value('mother_phone', 20) || null,
    mother_address: value('mother_address', 1000) || null,
    guarantor_name: value('guarantor_name', 255),
    guarantor_relation: value('guarantor_relation', 100),
    guarantor_phone: value('guarantor_phone', 20),
    guarantor_address: value('guarantor_address', 1000) || null,
    ethnicity: value('ethnicity', 100) || 'ខ្មែរ',
    nationality: value('nationality', 100) || 'កម្ពុជា',
    marital_status: value('marital_status', 50) || 'នៅលីវ',
    spouse_name: value('spouse_name', 255) || null,
    spouse_occupation: value('spouse_occupation', 255) || null,
    siblings_json: cleanArray(raw.siblings_json ?? existing.siblings_json),
    education_history_json: cleanArray(raw.education_history_json ?? existing.education_history_json, 6),
    emergency_contacts_json: cleanArray(raw.emergency_contacts_json ?? existing.emergency_contacts_json, 2),
  };
}

function validateCompleteProfile(profile) {
  const required = ['student_id_card', 'academic_level', 'academic_major_id', 'major', 'academic_year', 'date_of_birth', 'place_of_birth', 'current_address', 'father_name', 'mother_name', 'guarantor_name', 'guarantor_relation', 'guarantor_phone'];
  const missing = required.filter((key) => !profile[key]);
  if (missing.length) throw fail(`Complete the required biography fields before generating the official PDF: ${missing.join(', ')}.`);
  if (!Number.isInteger(profile.academic_year) || profile.academic_year < 1 || profile.academic_year > 4) throw fail('Academic year must be a number from 1 through 4.');
  if (profile.emergency_contacts_json.length < 1) throw fail('Add at least one emergency contact.');
  if (profile.education_history_json.length < 1) throw fail('Add at least one education history row.');
}

function pdfLines(doc, lines, startY, width = 515) {
  let y = startY;
  doc.font('Khmer');
  lines.filter(Boolean).forEach((line) => {
    doc.text(line, 42, y, { width, lineGap: 2 });
    y += 22;
  });
  return y;
}

function pdfHeader(doc, title, showPhoto) {
  doc.font('Khmer');
  const logoPath = path.resolve(__dirname, '../assets/ksit-logo.png');
  if (fs.existsSync(logoPath)) doc.image(logoPath, 43, 35, { fit: [44, 44] });
  doc.font('Khmer').fontSize(11).text('ព្រះរាជាណាចក្រកម្ពុជា', { align: 'center' });
  doc.fontSize(9).text('ជាតិ សាសនា ព្រះមហាក្សត្រ', { align: 'center' });
  doc.moveDown(0.6);
  doc.fontSize(13).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(8).text('វិទ្យាស្ថានបច្ចេកវិទ្យាកំពង់ស្ពឺ · ប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋាននិស្សិត', { align: 'center' });
  if (showPhoto) {
    doc.rect(470, 38, 70, 92).stroke();
    doc.fontSize(7).text('រូបថត\n៤ × ៦', 481, 72, { width: 48, align: 'center' });
  }
  doc.moveDown(1.2);
}

function signatureArea(doc, label, y) {
  doc.font('Khmer').fontSize(8);
  doc.text('ស្នាមមេដៃស្តាំ', 50, y);
  doc.circle(95, y + 36, 25).stroke();
  doc.text(label, 350, y + 10, { width: 150, align: 'center' });
  doc.text('ហត្ថលេខា', 350, y + 34, { width: 150, align: 'center' });
}

function generateOfficialApplicationPdf(application, profile) {
  const user = application.users || {};
  const fontPath = path.resolve(__dirname, '../assets/fonts/KantumruyPro-Regular.ttf');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42, autoFirstPage: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.registerFont('Khmer', fontPath);
    doc.font('Khmer');

    pdfHeader(doc, `ពាក្យសុំចូលស្នាក់នៅក្នុងអន្តេវាសិកដ្ឋានសិស្ស និស្សិត (${application.academic_year_applied})`, true);
    let y = pdfLines(doc, [
      `ខ្ញុំបាទ/នាងខ្ញុំ ${user.full_name_khmer || user.full_name_latin || '................................'} ភេទ ${user.gender || '........'} ថ្ងៃខែឆ្នាំកំណើត ${profile.date_of_birth || '........'}.`,
      `សិស្ស/និស្សិតថ្នាក់ ${profile.class_section || '........'} ឆ្នាំទី ${profile.academic_year || '........'} ជំនាញ ${profile.major || '........'}.`,
      `ឪពុកឈ្មោះ ${profile.father_name || '................................'} អាយុ ${profile.father_age || '........'} ឆ្នាំ មុខរបរ ${profile.father_occupation || '........'}.`,
      `ម្តាយឈ្មោះ ${profile.mother_name || '................................'} អាយុ ${profile.mother_age || '........'} ឆ្នាំ មុខរបរ ${profile.mother_occupation || '........'}.`,
      `ទីលំនៅបច្ចុប្បន្ន៖ ${profile.current_address || '................................................................'}.`,
    ], 166);
    y += 8;
    y = pdfLines(doc, [
      'គោរពជូន លោកនាយកវិទ្យាស្ថានបច្ចេកវិទ្យាកំពង់ស្ពឺ តាមរយៈ ប្រធានគណៈកម្មការគ្រប់គ្រងអន្តេវាសិកដ្ឋាន។',
      `កម្មវត្ថុ៖ សំណើសុំស្នាក់នៅជាបណ្តោះអាសន្នក្នុងអន្តេវាសិកដ្ឋាន ឆ្នាំសិក្សា ${application.academic_year_applied} ដោយសារមកពីខេត្តឆ្ងាយ និងជីវភាពខ្វះខាត។`,
      'ខ្ញុំសូមសន្យាគោរពតាមបទបញ្ជាផ្ទៃក្នុងរបស់វិទ្យាស្ថាន និងអន្តេវាសិកដ្ឋាន។ ប្រសិនបើខ្ញុំប្រព្រឹត្តផ្ទុយ ខ្ញុំសូមទទួលខុសត្រូវតាមបទបញ្ជាជាធរមាន។',
    ], y);
    signatureArea(doc, 'ហត្ថលេខាសិស្ស/និស្សិត', Math.min(y + 10, 625));

    doc.addPage();
    pdfHeader(doc, 'ជីវប្រវត្តិសង្ខេប', true);
    y = pdfLines(doc, [
      `នាមត្រកូល និងនាមខ្លួន៖ ${user.full_name_khmer || '................................'} · អក្សរឡាតាំង៖ ${user.full_name_latin || '................................'}.`,
      `ជនជាតិ៖ ${profile.ethnicity || 'ខ្មែរ'} · សញ្ជាតិ៖ ${profile.nationality || 'កម្ពុជា'} · ស្ថានភាពគ្រួសារ៖ ${profile.marital_status || 'នៅលីវ'}.`,
      `ទីកន្លែងកំណើត៖ ${profile.place_of_birth || '................................................................'}.`,
      `លេខទូរស័ព្ទ៖ ${user.phone || '........................'} · អ៊ីមែល៖ ${user.email || '........................'}.`,
      `ឪពុក៖ ${profile.father_name || '................'} · ${profile.father_occupation || '................'} · ${profile.father_phone || '................'}.`,
      `ម្តាយ៖ ${profile.mother_name || '................'} · ${profile.mother_occupation || '................'} · ${profile.mother_phone || '................'}.`,
    ], 170);
    doc.fontSize(9).text('បងប្អូនបង្កើត', 42, y + 6);
    y += 24;
    (profile.siblings_json || []).slice(0, 4).forEach((sibling, index) => {
      y = pdfLines(doc, [`${index + 1}. ${cleanText(sibling.name, 100) || '........................'} · ${cleanText(sibling.gender, 30) || '........'} · ${cleanText(sibling.occupation, 100) || '........................'} · ${cleanText(sibling.address, 150) || '........................'}`], y);
    });
    doc.fontSize(9).text('ប្រវត្តិការសិក្សា', 42, y + 5);
    y += 23;
    (profile.education_history_json || []).slice(0, 3).forEach((education, index) => {
      y = pdfLines(doc, [`${index + 1}. ${cleanText(education.level, 100) || 'កម្រិតសិក្សា'} · ${cleanText(education.school, 150) || 'ឈ្មោះសាលា'} · ${cleanText(education.province, 100) || 'ខេត្ត/រាជធានី'} · ${cleanText(education.year, 40) || 'ឆ្នាំសិក្សា'} · ${cleanText(education.grade, 80) || 'និទ្ទេស'}`], y);
    });
    signatureArea(doc, 'ហត្ថលេខាសិស្ស/និស្សិត', Math.min(y + 10, 625));

    doc.addPage();
    pdfHeader(doc, 'កិច្ចសន្យាសាមីជន', false);
    y = pdfLines(doc, [
      `ខ្ញុំបាទ/នាងខ្ញុំ ${user.full_name_khmer || '................................'} ជានិស្សិតជំនាញ ${profile.major || '........................'} ឆ្នាំទី ${profile.academic_year || '........'} សូមសន្យាចំពោះមុខលោកនាយកវិទ្យាស្ថានថា៖`,
      '១. គោរពតាមបទបញ្ជាផ្ទៃក្នុងរបស់អន្តេវាសិកដ្ឋាន និងការណែនាំបន្ថែមរបស់គណៈកម្មការ។',
      '២. មិនធ្វើសកម្មភាពនយោបាយផ្សេងៗនៅក្នុងអន្តេវាសិកដ្ឋាន។',
      '៣. ក្រោយពេលបញ្ចប់ការសិក្សា ឬអស់ជីវភាពជាសិស្ស និស្សិត ត្រូវចាកចេញដោយមិនទាមទារលក្ខខណ្ឌអ្វីឡើយ។',
      '៤. មិនបង្កបញ្ហា និងផលវិបាកផ្សេងៗដល់វិទ្យាស្ថាន។',
      'ខ្ញុំសូមទទួលខុសត្រូវចំពោះការសន្យាខាងលើ។',
    ], 165);
    signatureArea(doc, 'ហត្ថលេខាសាមីជន', Math.min(y + 18, 540));
    signatureArea(doc, 'បានឃើញ និងឯកភាពពីឪពុកម្តាយ/អាណាព្យាបាល', Math.min(y + 108, 620));

    doc.addPage();
    pdfHeader(doc, 'លិខិតធានាពីឪពុកម្តាយ ឬអាណាព្យាបាល', false);
    y = pdfLines(doc, [
      `ខ្ញុំបាទ/នាងខ្ញុំ ${profile.guarantor_name || '................................'} ត្រូវជា ${profile.guarantor_relation || '................'} របស់សិស្ស/និស្សិត។`,
      `មុខរបរ៖ ${profile.spouse_occupation || profile.father_occupation || '........................'} · លេខទូរស័ព្ទ៖ ${profile.guarantor_phone || '........................'}.`,
      `ទីលំនៅបច្ចុប្បន្ន៖ ${profile.guarantor_address || '................................................................'}.`,
      `ខ្ញុំសូមធានាចំពោះ ${user.full_name_khmer || '................................'} ភេទ ${user.gender || '........'} ថ្ងៃខែឆ្នាំកំណើត ${profile.date_of_birth || '........'}.`,
      'ខ្ញុំទទួលខុសត្រូវចំពោះមុខច្បាប់ជាធរមាន ប្រសិនបើសិស្ស/និស្សិតប្រព្រឹត្តខុសឆ្គងពីបទបញ្ជាផ្ទៃក្នុងរបស់អន្តេវាសិកដ្ឋាន។',
    ], 165);
    doc.fontSize(9).text('បុគ្គលដែលអាចទាក់ទងបានក្នុងករណីចាំបាច់', 42, y + 12);
    y += 34;
    (profile.emergency_contacts_json || []).slice(0, 2).forEach((contact, index) => {
      y = pdfLines(doc, [`${index + 1}. ${cleanText(contact.name, 120) || '........................'} · ត្រូវជា ${cleanText(contact.relation, 80) || '................'} · ${cleanText(contact.phone, 30) || '........................'} · ${cleanText(contact.address, 180) || '................................'}`], y);
    });
    signatureArea(doc, 'ហត្ថលេខាអ្នកធានា', Math.min(y + 20, 560));
    doc.end();
  });
}

async function saveDraft(req, res, next) {
  try {
    const supabase = getSupabase();
    const academicYear = cleanText(req.body?.academic_year_applied, 20) || process.env.ACTIVE_ACADEMIC_YEAR || '2025-2026';
    let application = await findCurrentStudentApplication(supabase, req.user.sub, academicYear);
    const formData = req.body?.form_data && typeof req.body.form_data === 'object' ? req.body.form_data : {};
    const stepProgress = boundedStep(req.body?.step_progress ?? formData.step_progress);
    if (!application) {
      const { data, error } = await supabase
        .from('room_applications')
        .insert({ user_id: req.user.sub, academic_year_applied: academicYear, status: 'draft', submission_step: 1, step_progress: stepProgress, form_data_json: formData, draft_data: formData })
        .select(APPLICATION_FIELDS)
        .single();
      if (error) throw error;
      application = data;
    } else {
      if (!['draft', 'form_completed', 'correction_needed', 'pending_signed_doc'].includes(application.status)) throw fail('This application is already in review or finalized and cannot be edited.', 409);
      const mergedDraft = mergeDraftData(application, formData);
      const { data, error } = await supabase
        .from('room_applications')
        .update({ form_data_json: mergedDraft, draft_data: mergedDraft, step_progress: stepProgress, status: application.status === 'correction_needed' ? 'draft' : application.status })
        .eq('id', application.id)
        .select(APPLICATION_FIELDS)
        .single();
      if (error) throw error;
      application = data;
    }
    res.json(payload(await presentApplication(supabase, application), 'Draft saved securely.'));
  } catch (error) {
    next(error);
  }
}

async function uploadReference(req, res, next) {
  try {
    const definition = DOCUMENTS[req.params.documentType];
    const file = req.file;
    if (!definition) throw fail('Unsupported reference document type.', 404);
    if (!file) throw fail('Select a document to upload.');
    if (!definition.allowed.test(file.mimetype || '') || file.size > definition.maxBytes) throw fail('The uploaded file type or size is not allowed.');

    const supabase = getSupabase();
    const application = await findApplication(supabase, req.params.applicationId, req.user.role === 'student' ? req.user.sub : null);
    if (!['draft', 'form_completed', 'correction_needed', 'pending_signed_doc'].includes(application.status)) throw fail('This application no longer accepts reference document uploads.', 409);
    const stored = await storeDocument(supabase, application, req.params.documentType, { buffer: file.buffer, name: file.originalname, contentType: file.mimetype });
    const metadata = { ...documentInfo(application), [req.params.documentType]: { name: cleanText(stored.name, 160), fileName: cleanText(stored.name, 160), bucket: stored.bucket, path: stored.path, content_type: stored.contentType, size: stored.size, uploaded_at: new Date().toISOString(), storage_provider: stored.provider } };
    const patch = { ...stored.patch, [definition.attached]: true, document_metadata_json: metadata, status: 'form_completed', submission_step: 2, step_progress: Math.max(2, boundedStep(application.step_progress)) };
    const { data, error } = await supabase.from('room_applications').update(patch).eq('id', application.id).select(APPLICATION_FIELDS).single();
    if (error) throw error;
    res.json(payload(await presentApplication(supabase, data), 'Reference document uploaded securely.'));
  } catch (error) {
    next(error);
  }
}

async function submitForm(req, res, next) {
  try {
    const supabase = getSupabase();
    const application = await findApplication(supabase, req.body?.application_id, req.user.sub);
    if (!['draft', 'form_completed', 'correction_needed', 'pending_signed_doc'].includes(application.status)) throw fail('This application cannot be submitted at its current stage.', 409);
    if (!application.student_photo_url || !application.national_id_doc_url || !application.family_book_doc_url) throw fail('Upload the 4×6 photo, national ID, and family book before generating the PDF.', 409);
    const existingProfile = single(application.users?.academic_profiles) || {};
    const rawProfile = compactProfile(req.body?.profile, existingProfile);
    validateCompleteProfile(rawProfile);
    const profile = await validateConfiguredAcademicSelection(supabase, rawProfile);
    const { error: profileError } = await supabase.from('academic_profiles').upsert({ user_id: req.user.sub, ...profile }, { onConflict: 'user_id' });
    if (profileError) throw profileError;
    const formData = { ...mergeDraftData(application, req.body?.form_data || {}), submitted_at: new Date().toISOString() };
    const { data: withProfile, error: refreshError } = await supabase.from('room_applications').select(APPLICATION_FIELDS).eq('id', application.id).single();
    if (refreshError) throw refreshError;
    const pdfBuffer = await generateOfficialApplicationPdf(withProfile, profile);
    const stored = await storeDocument(supabase, withProfile, 'prefilled_pdf', { buffer: pdfBuffer, name: officialPdfFilename(withProfile, profile), contentType: 'application/pdf' });
    const metadata = { ...documentInfo(application), prefilled_pdf: { name: stored.name, fileName: stored.name, bucket: stored.bucket, path: stored.path, content_type: stored.contentType, size: stored.size, uploaded_at: new Date().toISOString(), storage_provider: stored.provider } };
    const { data, error } = await supabase
      .from('room_applications')
      .update({ ...stored.patch, status: 'pending_signed_doc', submission_step: 3, step_progress: 4, prefilled_pdf_generated_at: new Date().toISOString(), form_data_json: formData, draft_data: formData, document_metadata_json: metadata, manager_notes: null, rejection_reason: null })
      .eq('id', application.id)
      .select(APPLICATION_FIELDS)
      .single();
    if (error) throw error;
    const notificationProfile = single(data.users?.academic_profiles) || profile;
    await applicationNotification({
      event: 'form_submission',
      student: data.users,
      profile: notificationProfile,
      documentSummary: applicationDocumentSummary(data),
    });
    res.json(payload(await presentApplication(supabase, data), 'Official four-page application PDF generated. Download, print, sign, and upload the signed document.'));
  } catch (error) {
    next(error);
  }
}

async function uploadSignedApplication(req, res, next) {
  try {
    const file = req.file;
    if (!file) throw fail('Upload the scanned signed and thumbprinted application.');
    const definition = DOCUMENTS.signed_application;
    if (!definition.allowed.test(file.mimetype || '') || file.size > definition.maxBytes) throw fail('The signed application must be a PDF, JPG, or PNG within the upload size limit.');
    const supabase = getSupabase();
    const application = await findApplication(supabase, req.body?.application_id, req.user.sub);
    if (!['pending_signed_doc', 'correction_needed'].includes(application.status)) throw fail('Generate the official PDF before uploading the signed application.', 409);
    const stored = await storeDocument(supabase, application, 'signed_application', { buffer: file.buffer, name: file.originalname, contentType: file.mimetype });
    const metadata = { ...documentInfo(application), signed_application: { name: cleanText(stored.name, 160), fileName: cleanText(stored.name, 160), bucket: stored.bucket, path: stored.path, content_type: stored.contentType, size: stored.size, uploaded_at: new Date().toISOString(), storage_provider: stored.provider } };
    const { data, error } = await supabase
      .from('room_applications')
      .update({ ...stored.patch, contract_signed: true, parent_guarantee_attached: true, status: 'under_review', submission_step: 5, step_progress: 5, submitted_for_review_at: new Date().toISOString(), manager_notes: null, rejection_reason: null, document_metadata_json: metadata })
      .eq('id', application.id)
      .select(APPLICATION_FIELDS)
      .single();
    if (error) throw error;
    const notificationProfile = single(data.users?.academic_profiles) || {};
    await applicationNotification({
      event: 'signed_upload',
      student: data.users,
      profile: notificationProfile,
      documentSummary: applicationDocumentSummary(data),
    });
    res.json(payload(await presentApplication(supabase, data), 'Signed application submitted for manager verification.'));
  } catch (error) {
    next(error);
  }
}

async function getMyApplication(req, res, next) {
  try {
    const application = await findCurrentStudentApplication(getSupabase(), req.user.sub, req.query.academic_year);
    res.json(payload(application ? await presentApplication(getSupabase(), application) : null));
  } catch (error) {
    next(error);
  }
}

async function downloadPrefilledPdf(req, res, next) {
  try {
    const supabase = getSupabase();
    const application = await findApplication(supabase, req.params.applicationId, req.user.role === 'student' ? req.user.sub : null);
    if (!application.prefilled_pdf_url) throw fail('The official PDF has not been generated yet.', 404);
    res.json(payload({ url: `/api/applications/${application.id}/documents/prefilled_pdf`, expires_in_seconds: 0, requires_authenticated_download: true }));
  } catch (error) {
    next(error);
  }
}

async function streamApplicationDocument(req, res, next) {
  try {
    const supabase = getSupabase();
    const type = req.params.documentType;
    if (!DOCUMENTS[type]) throw fail('Unsupported application document type.', 404);
    const application = await findApplication(supabase, req.params.applicationId, req.user.role === 'student' ? req.user.sub : null);
    const document = await documentStream(supabase, application, type);
    const metadata = documentMetadata(application, type);
    const safeName = safeDownloadFileName(metadata.name || `${type}.pdf`);
    res.setHeader('Content-Type', document.contentType);
    res.setHeader('Content-Disposition', `${type === 'prefilled_pdf' ? 'attachment' : 'inline'}; filename="${safeName}"`);
    document.stream.on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}

async function listManagerApplications(req, res, next) {
  try {
    const supabase = getSupabase();
    let query = supabase.from('room_applications').select(APPLICATION_FIELDS).order('applied_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(payload(await Promise.all((data || []).map((application) => presentApplication(supabase, application)))));
  } catch (error) {
    next(error);
  }
}

async function notifyDecision(application, nextStatus, notes) {
  const student = application.users;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !student?.telegram_id) return;
  const statusLabel = { approved: 'អនុម័ត', rejected: 'បដិសេធ', correction_needed: 'ស្នើសុំកែសម្រួល' }[nextStatus] || nextStatus;
  const message = `KSIT Dormitory៖ ពាក្យសុំរបស់អ្នកត្រូវបាន ${statusLabel}។${notes ? `\nសម្គាល់៖ ${notes}` : ''}`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: student.telegram_id, text: message }) }).catch(() => undefined);
}

async function reviewManagerApplication(req, res, next) {
  try {
    const action = cleanText(req.body?.action, 32);
    const notes = cleanText(req.body?.manager_notes, 1500);
    const map = { approve: 'approved', request_correction: 'correction_needed', reject: 'rejected' };
    const status = map[action];
    if (!status) throw fail('Review action must be approve, request_correction, or reject.');
    if (['request_correction', 'reject'].includes(action) && !notes) throw fail('A clear manager note is required for a correction request or rejection.');
    const supabase = getSupabase();
    const application = await findApplication(supabase, req.params.applicationId);
    if (!['under_review', 'correction_needed'].includes(application.status)) throw fail('Only an under-review application can receive a manager decision.', 409);
    if (action === 'approve' && !application.signed_application_doc_url) throw fail('A signed application document is required before approval.', 409);
    const { data, error } = await supabase
      .from('room_applications')
      .update({ status, manager_notes: notes || null, rejection_reason: action === 'reject' ? notes : null, reviewed_at: new Date().toISOString(), reviewed_by: req.user.sub })
      .eq('id', application.id)
      .select(APPLICATION_FIELDS)
      .single();
    if (error) throw error;

    let archiveSync = null;
    let responseApplication = data;
    let message = `Application ${status.replace('_', ' ')}.`;
    if (action === 'approve') {
      try {
        archiveSync = await archiveApprovedApplication(data.id);
        responseApplication = await findApplication(supabase, data.id);
        message = 'Application approved and its Google Drive ZIP archive was created.';
      } catch (archiveError) {
        // Keep the persisted manager approval and return a retryable warning.
        console.error('Approved-application archive synchronization failed:', archiveError);
        await systemLogNotification({
          level: 'WARNING',
          description: `Google Drive archive synchronization failed for approved application ${data.id}.`,
        });
        archiveSync = { success: false, message: archiveError.message, code: archiveError.code || 'ARCHIVE_SYNC_FAILED' };
        message = 'Application approved, but its Google Drive ZIP archive could not be created yet.';
      }
    }

    await notifyDecision(responseApplication, status, notes);
    res.json({
      ...payload(await presentApplication(supabase, responseApplication), message),
      ...(archiveSync ? { sync: archiveSync.success === false ? archiveSync : { success: true, archive: archiveSync.archive } } : {}),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  saveDraft,
  uploadReference,
  submitForm,
  uploadSignedApplication,
  getMyApplication,
  downloadPrefilledPdf,
  streamApplicationDocument,
  listManagerApplications,
  reviewManagerApplication,
  __private: { generateOfficialApplicationPdf, officialPdfFilename, mergeDraftData, boundedStep },
};
