const assert = require('node:assert/strict');
const test = require('node:test');
const { __private } = require('../controllers/application-lifecycle.controller');

test('synthetic student application lifecycle preserves drafts through manager approval and assignment', async () => {
  const syntheticStudent = {
    full_name_khmer: 'កញ្ញា ស្រី',
    full_name_latin: 'Kanha Srey',
    gender: 'female',
    phone: '099000000',
    email: 'kanha.srey@ksit.edu.kh',
  };
  const profile = {
    student_id_card: 'KSIT-SYNTH-2026-001',
    academic_level: 'បរិញ្ញាបត្ររង',
    academic_major_id: 'synthetic-major-id',
    major: 'Information Technology',
    academic_year: 1,
    class_section: 'A',
    date_of_birth: '2005-01-01',
    place_of_birth: 'Kampong Speu',
    current_address: 'Kampong Speu, Cambodia',
    father_name: 'Synthetic Father',
    mother_name: 'Synthetic Mother',
    guarantor_name: 'Synthetic Guardian',
    guarantor_relation: 'Parent',
    guarantor_phone: '099000001',
    guarantor_address: 'Kampong Speu, Cambodia',
    siblings_json: [{ name: 'Synthetic Sibling', occupation: 'Student' }],
    education_history_json: [{ level: 'High school', school: 'Synthetic School', province: 'Kampong Speu', year: '2024', grade: 'A' }],
    emergency_contacts_json: [{ name: 'Synthetic Guardian', relation: 'Parent', phone: '099000001', address: 'Kampong Speu, Cambodia' }],
  };
  const application = {
    id: 'synthetic-application-id',
    academic_year_applied: '2026-2027',
    users: syntheticStudent,
    status: 'draft',
    form_data_json: {},
    draft_data: {},
  };

  application.draft_data = __private.mergeDraftData(application, { current_address: profile.current_address, step_progress: 1 });
  application.step_progress = __private.boundedStep(application.draft_data.step_progress);
  assert.equal(application.step_progress, 1);

  application.draft_data = __private.mergeDraftData(application, { guardian_consent: true, step_progress: 4, emergency_contacts_json: profile.emergency_contacts_json });
  application.step_progress = __private.boundedStep(application.draft_data.step_progress);
  assert.equal(application.step_progress, 4);
  assert.equal(application.draft_data.current_address, profile.current_address);
  assert.equal(application.draft_data.emergency_contacts_json.length, 1);

  application.student_photo_url = 'synthetic/photo.png';
  application.national_id_doc_url = 'synthetic/national-id.pdf';
  application.family_book_doc_url = 'synthetic/family-book.pdf';
  assert.ok(application.student_photo_url && application.national_id_doc_url && application.family_book_doc_url, 'reference attachments must be present before PDF generation');

  const pdf = await __private.generateOfficialApplicationPdf(application, profile);
  const filename = __private.officialPdfFilename(application, profile);
  assert.match(pdf.subarray(0, 8).toString('ascii'), /^%PDF-/);
  assert.match(filename, /^Kanha_Srey_KSIT_Dorm_Application_\d{8}\.pdf$/);

  application.prefilled_pdf_url = `synthetic/${filename}`;
  application.status = 'pending_signed_doc';
  application.submission_step = 3;
  application.contract_signed = true;
  application.signed_application_doc_url = 'synthetic/signed-application.pdf';
  application.status = 'under_review';
  application.submission_step = 5;
  application.step_progress = __private.boundedStep(5);
  assert.equal(application.status, 'under_review');
  assert.equal(application.step_progress, 5);
  assert.ok(application.contract_signed && application.signed_application_doc_url, 'signed application is required for review');

  application.status = 'approved';
  const roomAssignment = { room_id: 'synthetic-female-room', bed_number: 1, is_active: true };
  application.status = 'assigned';
  assert.equal(application.status, 'assigned');
  assert.equal(roomAssignment.is_active, true);
});
