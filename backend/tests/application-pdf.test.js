const assert = require('node:assert/strict');
const test = require('node:test');
const { __private } = require('../controllers/application-lifecycle.controller');

test('the official Khmer dormitory application generator emits a printable four-page PDF payload', async () => {
  const pdf = await __private.generateOfficialApplicationPdf(
    {
      academic_year_applied: '2026-2027',
      users: { full_name_khmer: 'សាកល្បង និស្សិត', full_name_latin: 'Test Student', gender: 'female', phone: '012345678', email: 'student@example.test' },
    },
    {
      student_id_card: 'KSIT-TEST-001', major: 'Information Technology', academic_year: 1, class_section: 'A', scholarship_type: 'Full Scholarship', date_of_birth: '2005-01-01', place_of_birth: 'Kampong Speu', national_id_number: '123456789', current_address: 'Kampong Speu, Cambodia',
      father_name: 'Father Test', father_age: 50, father_occupation: 'Farmer', father_phone: '010000001', father_address: 'Kampong Speu',
      mother_name: 'Mother Test', mother_age: 48, mother_occupation: 'Farmer', mother_phone: '010000002', mother_address: 'Kampong Speu',
      guarantor_name: 'Guardian Test', guarantor_relation: 'Parent', guarantor_phone: '010000003', guarantor_address: 'Kampong Speu', ethnicity: 'ខ្មែរ', nationality: 'កម្ពុជា', marital_status: 'នៅលីវ',
      siblings_json: [{ name: 'Sibling Test', gender: 'female', occupation: 'Student', address: 'Kampong Speu' }],
      education_history_json: [{ level: 'High school', school: 'Test School', province: 'Kampong Speu', year: '2024', grade: 'A' }],
      emergency_contacts_json: [{ name: 'Guardian Test', relation: 'Parent', phone: '010000003', address: 'Kampong Speu' }],
    },
  );
  assert.ok(Buffer.isBuffer(pdf));
  assert.match(pdf.subarray(0, 8).toString('ascii'), /^%PDF-/);
  assert.ok(pdf.length > 8_000, 'expected a non-trivial printable PDF payload');
  assert.ok((pdf.toString('latin1').match(/\/Type \/Page/g) || []).length >= 4, 'expected four official application pages');
});

test('official PDF naming uses the student Latin name and a compact date stamp', () => {
  const application = { users: { full_name_latin: 'Kanha Srey' } };
  const filename = __private.officialPdfFilename(application, {});
  assert.match(filename, /^Kanha_Srey_KSIT_Dorm_Application_\d{8}\.pdf$/);
});
