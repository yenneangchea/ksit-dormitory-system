const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend', 'src');

test('the lifecycle migration is additive, extends official-form fields, and keeps document buckets private', () => {
  const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260815_student_application_lifecycle.sql'), 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS prefilled_pdf_url/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS signed_application_doc_url/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS form_data_json JSONB/);
  assert.match(migration, /siblings_json JSONB/);
  assert.match(migration, /education_history_json JSONB/);
  assert.match(migration, /emergency_contacts_json JSONB/);
  assert.match(migration, /'student-references', 'student-references', false/);
  assert.match(migration, /'signed-applications', 'signed-applications', false/);
  assert.match(migration, /'generated-applications', 'generated-applications', false/);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|TYPE|SCHEMA)/i);
});

test('student lifecycle routes are authenticated and manager decisions cannot be called by a student', () => {
  const routes = fs.readFileSync(path.join(backend, 'routes', 'domain.routes.js'), 'utf8');
  assert.match(routes, /router\.post\('\/applications\/save-draft', requireRole\('student'\), applicationLifecycle\.saveDraft\)/);
  assert.match(routes, /router\.post\('\/applications\/:applicationId\/references\/:documentType', requireRole\('student'\), applicationUpload\.single\('file'\), applicationLifecycle\.uploadReference\)/);
  assert.match(routes, /router\.post\('\/applications\/upload-signed', requireRole\('student'\), applicationUpload\.single\('file'\), applicationLifecycle\.uploadSignedApplication\)/);
  assert.match(routes, /router\.get\('\/applications\/:applicationId\/documents\/:documentType', requireRole\('student', 'admin', 'manager'\), applicationLifecycle\.streamApplicationDocument\)/);
  assert.match(routes, /router\.get\('\/manager\/applications', requireRole\('admin', 'manager'\), applicationLifecycle\.listManagerApplications\)/);
  assert.match(routes, /router\.patch\('\/manager\/applications\/:applicationId\/review', requireRole\('admin', 'manager'\), applicationLifecycle\.reviewManagerApplication\)/);
});

test('private upload and PDF handlers enforce owner access, file constraints, and signed retrieval', () => {
  const controller = fs.readFileSync(path.join(backend, 'controllers', 'application-lifecycle.controller.js'), 'utf8');
  assert.match(controller, /const DOCUMENTS =/);
  assert.match(controller, /maxBytes: 5 \* 1024 \* 1024/);
  assert.match(controller, /maxBytes: 12 \* 1024 \* 1024/);
  assert.match(controller, /createSignedUrl\(supabase, bucket, objectPath\)/);
  assert.match(controller, /streamApplicationDocument/);
  assert.match(controller, /driveStorage\.isDriveReference/);
  assert.match(controller, /findApplication\(supabase, req\.params\.applicationId, req\.user\.role === 'student' \? req\.user\.sub : null\)/);
  assert.match(controller, /status: 'under_review', submission_step: 5/);
  assert.match(controller, /generateOfficialApplicationPdf/);
  assert.match(controller, /signed_application_doc_url/);
});

test('manager decision contract supports approval, correction notes, rejection, and waterfall handoff', () => {
  const controller = fs.readFileSync(path.join(backend, 'controllers', 'application-lifecycle.controller.js'), 'utf8');
  const manager = fs.readFileSync(path.join(frontend, 'components', 'manager-application-review.tsx'), 'utf8');
  assert.match(controller, /approve: 'approved', request_correction: 'correction_needed', reject: 'rejected'/);
  assert.match(controller, /A clear manager note is required for a correction request or rejection/);
  assert.match(controller, /A signed application document is required before approval/);
  assert.match(manager, /ManagerApplicationReview/);
  assert.match(manager, /request_correction/);
  assert.match(manager, /applicationsAPI\.autoAssign/);
  assert.match(manager, /signed_application/);
});

test('student wizard exposes all official form sections and five protected lifecycle stages', () => {
  const wizard = fs.readFileSync(path.join(frontend, 'components', 'student-application-wizard.tsx'), 'utf8');
  assert.match(wizard, /ពាក្យសុំចូលស្នាក់នៅ/);
  assert.match(wizard, /ជីវប្រវត្តិសង្ខេប/);
  assert.match(wizard, /កិច្ចសន្យាសាមីជន/);
  assert.match(wizard, /លិខិតធានាពីឪពុកម្តាយ ឬអាណាព្យាបាល/);
  assert.match(wizard, /student_photo/);
  assert.match(wizard, /national_id/);
  assert.match(wizard, /family_book/);
  assert.match(wizard, /applicationsAPI\.submitForm/);
  assert.match(wizard, /applicationsAPI\.uploadSigned/);
  assert.match(wizard, /applicationsAPI\.openDocument\(application\.id, 'prefilled_pdf'\)/);
});

test('student draft save preserves the reference-document stage across its parent data refresh', () => {
  const wizard = fs.readFileSync(path.join(frontend, 'components', 'student-application-wizard.tsx'), 'utf8');
  assert.match(wizard, /useRef/);
  assert.match(wizard, /const preservedDraftStage = useRef<number \| null>\(null\)/);
  assert.match(wizard, /const savedStage = preservedDraftStage\.current/);
  assert.match(wizard, /setStage\(savedStage && derivedStage < savedStage \? savedStage : derivedStage\)/);
  assert.match(wizard, /preservedDraftStage\.current = nextStage/);
});

test('student document uploads preserve the completed form values needed for PDF generation', () => {
  const wizard = fs.readFileSync(path.join(frontend, 'components', 'student-application-wizard.tsx'), 'utf8');
  assert.match(wizard, /type FormSnapshot =/);
  assert.match(wizard, /const pendingFormSnapshot = useRef<FormSnapshot \| null>\(null\)/);
  assert.match(wizard, /function preserveCurrentForm\(\)/);
  assert.match(wizard, /const snapshot = pendingFormSnapshot\.current/);
  assert.match(wizard, /setForm\(snapshot\?\.form \|\| initialForm\(latest\)\)/);
  assert.match(wizard, /preserveCurrentForm\(\);\n    setApplication\(response\.data\);/);
});

test('Google Drive storage remains server-only, persists Drive metadata, and falls back to Supabase Storage', () => {
  const adapter = fs.readFileSync(path.join(backend, 'lib', 'application-storage.js'), 'utf8');
  const controller = fs.readFileSync(path.join(backend, 'controllers', 'application-lifecycle.controller.js'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260815_google_drive_application_storage.sql'), 'utf8');
  const env = fs.readFileSync(path.join(backend, '.env.example'), 'utf8');
  assert.match(adapter, /GOOGLE_SERVICE_ACCOUNT_JSON/);
  assert.match(adapter, /GOOGLE_DRIVE_ROOT_FOLDER_ID/);
  assert.match(adapter, /createOrGetStudentFolder/);
  assert.match(adapter, /uploadApplicationFile/);
  assert.match(controller, /driveStorage\.isDriveConfigured\(\)/);
  assert.match(controller, /provider: 'supabase_storage'/);
  assert.match(controller, /google_drive_folder_id/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS google_drive_folder_id/);
  assert.match(migration, /signed_application_drive_url/);
  assert.match(env, /GOOGLE_SERVICE_ACCOUNT_JSON=/);
});
