const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const PDFDocument = require('pdfkit');
const { getSupabase } = require('../config/supabase');
const driveStorage = require('../lib/application-storage');

const APPLICATION_FIELDS = `
  id, user_id, academic_year_applied, status, photo_4x6_attached, contract_signed,
  parent_guarantee_attached, family_book_attached, id_card_attached, rejection_reason,
  applied_at, reviewed_at, reviewed_by, prefilled_pdf_url, prefilled_pdf_generated_at,
  student_photo_url, national_id_doc_url, family_book_doc_url, signed_application_doc_url,
  google_drive_folder_id, prefilled_pdf_drive_url, student_photo_drive_url,
  national_id_drive_url, family_book_drive_url, signed_application_drive_url,
  document_metadata_json, manager_notes, submission_step, submitted_for_review_at, form_data_json,
  users!room_applications_user_id_fkey(
    id, telegram_id, full_name_khmer, full_name_latin, gender, phone, email,
    academic_profiles(
      id, user_id, student_id_card, major, academic_year, class_section, scholarship_type,
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
  student_photo: { bucket: 'student-references', column: 'student_photo_url', driveColumn: 'student_photo_drive_url', attached: 'photo_4x6_attached', allowed: /^image\/(jpeg|png)$/i, maxBytes: 5 * 1024 * 1024 },
  national_id: { bucket: 'student-references', column: 'national_id_doc_url', driveColumn: 'national_id_drive_url', attached: 'id_card_attached', allowed: /^(application\/pdf|image\/(jpeg|png))$/i, maxBytes: 8 * 1024 * 1024 },
  family_book: { bucket: 'student-references', column: 'family_book_doc_url', driveColumn: 'family_book_drive_url', attached: 'family_book_attached', allowed: /^(application\/pdf|image\/(jpeg|png))$/i, maxBytes: 8 * 1024 * 1024 },
  signed_application: { bucket: 'signed-applications', column: 'signed_application_doc_url', driveColumn: 'signed_application_drive_url', attached: 'contract_signed', allowed: /^(application\/pdf|image\/(jpeg|png))$/i, maxBytes: 12 * 1024 * 1024 },
  prefilled_pdf: { bucket: 'generated-applications', column: 'prefilled_pdf_url', driveColumn: 'prefilled_pdf_drive_url', allowed: /^application\/pdf$/i },
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

function cleanArray(value, limit = 12) {
  return Array.isArray(value) ? value.slice(0, limit).map((entry) => entry && typeof entry === 'object' ? entry : {}) : [];
}

function safeFileName(name) {
  const extension = path.extname(name || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8) || '.bin';
  return `${crypto.randomUUID()}${extension}`;
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
  if (driveStorage.isDriveConfigured()) {
    const stored = await driveStorage.uploadApplicationFile({ application, student: application.users, type, fileName: name, contentType, buffer });
    return { ...stored, patch: { [definition.column]: stored.reference, [definition.driveColumn]: stored.webViewLink, google_drive_folder_id: stored.folderId } };
  }
  const objectPath = `${application.user_id}/${application.id}/${type}/${safeFileName(name)}`;
  const { error } = await supabase.storage.from(definition.bucket).upload(objectPath, buffer, { contentType, upsert: false });
  if (error) throw error;
  return { provider: 'supabase_storage', reference: objectPath, name, contentType, size: buffer.length, patch: { [definition.column]: objectPath } };
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
  const required = ['student_id_card', 'major', 'academic_year', 'date_of_birth', 'place_of_birth', 'current_address', 'father_name', 'mother_name', 'guarantor_name', 'guarantor_relation', 'guarantor_phone'];
  const missing = required.filter((key) => !profile[key]);
  if (missing.length) throw fail(`Complete the required biography fields before generating the official PDF: ${missing.join(', ')}.`);
  if (!Number.isInteger(profile.academic_year) || profile.academic_year < 1 || profile.academic_year > 4) throw fail('Academic year must be a number from 1 through 4.');
  if (profile.emergency_contacts_json.length < 1) throw fail('Add at least one emergency contact.');
  if (profile.education_history_json.length < 1) throw fail('Add at least one education history row.');
}

function pdfLines(doc, lines, startY, width = 515) {
  let y = startY;
  lines.filter(Boolean).forEach((line) => {
    doc.text(line, 42, y, { width, lineGap: 2 });
    y += 22;
  });
  return y;
}

function pdfHeader(doc, title, showPhoto) {
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
  const fontPath = path.resolve(__dirname, '../assets/fonts/NotoSerifKhmer-Regular.ttf');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42, autoFirstPage: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.registerFont('Khmer', fontPath);

    pdfHeader(doc, 'ពាក្យសុំចូលស្នាក់នៅក្នុងអន្តេវាសិកដ្ឋានសិស្ស និស្សិត', true);
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
    if (!application) {
      const { data, error } = await supabase
        .from('room_applications')
        .insert({ user_id: req.user.sub, academic_year_applied: academicYear, status: 'draft', submission_step: 1, form_data_json: formData })
        .select(APPLICATION_FIELDS)
        .single();
      if (error) throw error;
      application = data;
    } else {
      if (!['draft', 'form_completed', 'correction_needed', 'pending_signed_doc'].includes(application.status)) throw fail('This application is already in review or finalized and cannot be edited.', 409);
      const { data, error } = await supabase
        .from('room_applications')
        .update({ form_data_json: { ...(application.form_data_json || {}), ...formData }, status: application.status === 'correction_needed' ? 'draft' : application.status, submission_step: 1 })
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
    const metadata = { ...documentInfo(application), [req.params.documentType]: { name: cleanText(stored.name, 160), content_type: stored.contentType, size: stored.size, uploaded_at: new Date().toISOString(), storage_provider: stored.provider, drive_file_id: stored.fileId || null } };
    const patch = { ...stored.patch, [definition.attached]: true, document_metadata_json: metadata, status: 'form_completed', submission_step: 2 };
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
    const profile = compactProfile(req.body?.profile, existingProfile);
    validateCompleteProfile(profile);
    const { error: profileError } = await supabase.from('academic_profiles').upsert({ user_id: req.user.sub, ...profile }, { onConflict: 'user_id' });
    if (profileError) throw profileError;
    const formData = { ...(application.form_data_json || {}), ...(req.body?.form_data || {}), submitted_at: new Date().toISOString() };
    const { data: withProfile, error: refreshError } = await supabase.from('room_applications').select(APPLICATION_FIELDS).eq('id', application.id).single();
    if (refreshError) throw refreshError;
    const pdfBuffer = await generateOfficialApplicationPdf(withProfile, profile);
    const stored = await storeDocument(supabase, withProfile, 'prefilled_pdf', { buffer: pdfBuffer, name: 'prefilled_application_form.pdf', contentType: 'application/pdf' });
    const metadata = { ...documentInfo(application), prefilled_pdf: { name: stored.name, content_type: stored.contentType, size: stored.size, uploaded_at: new Date().toISOString(), storage_provider: stored.provider, drive_file_id: stored.fileId || null } };
    const { data, error } = await supabase
      .from('room_applications')
      .update({ ...stored.patch, status: 'pending_signed_doc', submission_step: 3, prefilled_pdf_generated_at: new Date().toISOString(), form_data_json: formData, document_metadata_json: metadata, manager_notes: null, rejection_reason: null })
      .eq('id', application.id)
      .select(APPLICATION_FIELDS)
      .single();
    if (error) throw error;
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
    const metadata = { ...documentInfo(application), signed_application: { name: cleanText(stored.name, 160), content_type: stored.contentType, size: stored.size, uploaded_at: new Date().toISOString(), storage_provider: stored.provider, drive_file_id: stored.fileId || null } };
    const { data, error } = await supabase
      .from('room_applications')
      .update({ ...stored.patch, contract_signed: true, parent_guarantee_attached: true, status: 'under_review', submission_step: 5, submitted_for_review_at: new Date().toISOString(), manager_notes: null, rejection_reason: null, document_metadata_json: metadata })
      .eq('id', application.id)
      .select(APPLICATION_FIELDS)
      .single();
    if (error) throw error;
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
    if (driveStorage.isDriveReference(application.prefilled_pdf_url)) return res.json(payload({ url: `/api/applications/${application.id}/documents/prefilled_pdf`, expires_in_seconds: 0, requires_authenticated_download: true }));
    const url = await createSignedUrl(supabase, 'generated-applications', application.prefilled_pdf_url);
    res.json(payload({ url, expires_in_seconds: 900 }));
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
    const safeName = String(metadata.name || `${type}.pdf`).replace(/[\r\n"]/g, '_');
    res.setHeader('Content-Type', document.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
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
    await notifyDecision(data, status, notes);
    res.json(payload(await presentApplication(supabase, data), `Application ${status.replace('_', ' ')}.`));
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
  __private: { generateOfficialApplicationPdf },
};
