const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('academic majors migration is additive and seeds the approved KSIT catalog', () => {
  const sql = read('supabase/migrations/20260817_academic_majors_management.sql');
  const rls = read('supabase/migrations/20260817_academic_majors_rls.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.academic_majors/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS academic_level/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS academic_major_id/);
  assert.match(sql, /ON CONFLICT \(academic_level, name_khmer\)/);
  assert.match(sql, /បច្ចេកវិទ្យាមេកាត្រូនិក/);
  assert.match(sql, /វិទ្យាសាស្ត្រដំណាំ/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE TABLE/i);
  assert.match(rls, /ALTER TABLE public\.academic_majors ENABLE ROW LEVEL SECURITY/);
});

test('major API routes are public for active catalog reads and Admin-only for catalog changes', () => {
  const routes = read('backend/routes/domain.routes.js');
  assert.match(routes, /router\.get\('\/public\/majors', domain\.getPublicMajors\)/);
  assert.match(routes, /router\.get\('\/admin\/majors', requireRole\('admin'\), domain\.listAdminMajors\)/);
  assert.match(routes, /router\.post\('\/admin\/majors', requireRole\('admin'\), domain\.createMajor\)/);
  assert.match(routes, /router\.put\('\/admin\/majors\/:majorId', requireRole\('admin'\), domain\.updateMajor\)/);
  assert.match(routes, /router\.delete\('\/admin\/majors\/:majorId', requireRole\('admin'\), domain\.deleteOrToggleMajor\)/);
});

test('dynamic major selections are validated before profile persistence and waterfall placement', () => {
  const domain = read('backend/controllers/domain.controller.js');
  const lifecycle = read('backend/controllers/application-lifecycle.controller.js');
  assert.match(domain, /resolveConfiguredMajor/);
  assert.match(domain, /available_year_levels/);
  assert.match(domain, /assigned_academic_level/);
  assert.match(domain, /assigned_academic_major_id/);
  assert.match(domain, /\.eq\('is_locked', false\)/);
  assert.match(domain, /Room is locked and cannot receive additional assignments/);
  assert.match(lifecycle, /validateConfiguredAcademicSelection/);
  assert.match(lifecycle, /academic_major_id/);
});

test('Admin, Student, and Telegram registration share the catalog-driven cascading selector', () => {
  const admin = read('frontend/src/app/dashboard/admin/page.tsx');
  const adminMajors = read('frontend/src/components/academic-majors-manager.tsx');
  const student = read('frontend/src/components/student-application-wizard.tsx');
  const login = read('frontend/src/app/login/page.tsx');
  const selector = read('frontend/src/components/academic-program-fields.tsx');
  assert.match(admin, /AcademicMajorsManager/);
  assert.match(admin, /majorsAPI\.listAdmin/);
  assert.match(adminMajors, /Academic Programs & Majors/);
  assert.match(student, /AcademicProgramFields/);
  assert.match(login, /academic_major_id/);
  assert.match(selector, /majorsAPI\.public/);
});

test('bulk import and audit history are additive, validated, and Admin-only', () => {
  const migration = read('supabase/migrations/20260817_academic_major_audit_log.sql');
  const routes = read('backend/routes/domain.routes.js');
  const domain = read('backend/controllers/domain.controller.js');
  const deployedDomain = read('frontend/server/controllers/domain.controller.js');
  const deployedRoutes = read('frontend/server/routes/domain.routes.js');
  const admin = read('frontend/src/components/academic-majors-manager.tsx');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.academic_major_audit_logs/);
  assert.match(migration, /ALTER TABLE public\.academic_major_audit_logs ENABLE ROW LEVEL SECURITY/);
  assert.match(routes, /router\.post\('\/admin\/majors\/import', requireRole\('admin'\), majorImportUpload\.single\('file'\), domain\.bulkImportMajors\)/);
  assert.match(routes, /router\.get\('\/admin\/majors\/audit', requireRole\('admin'\), domain\.listMajorAuditLogs\)/);
  assert.match(domain, /parseMajorImportFile/);
  assert.match(domain, /recordMajorAudit/);
  assert.match(domain, /academic_major_audit_logs/);
  assert.match(domain, /req\.query\.search/);
  assert.match(deployedDomain, /parseMajorImportFile/);
  assert.match(deployedRoutes, /router\.post\('\/admin\/majors\/import'/);
  assert.match(admin, /Search majors/);
  assert.match(admin, /Choose CSV \/ Excel/);
  assert.match(admin, /Academic-major change history/);
});

test('Academic & Majors analytics are visible to authorized staff with protected Excel and PDF exports', () => {
  const routes = read('backend/routes/domain.routes.js');
  const domain = read('backend/controllers/domain.controller.js');
  const deployedDomain = read('frontend/server/controllers/domain.controller.js');
  const deployedRoutes = read('frontend/server/routes/domain.routes.js');
  const api = read('frontend/src/lib/api.ts');
  const panel = read('frontend/src/components/academic-analytics-panel.tsx');
  const shell = read('frontend/src/components/portal-shell.tsx');
  const admin = read('frontend/src/app/dashboard/admin/page.tsx');
  const manager = read('frontend/src/app/dashboard/manager/page.tsx');
  const teacher = read('frontend/src/app/dashboard/teacher/page.tsx');
  assert.match(routes, /router\.get\('\/academic-analytics', requireRole\('admin', 'manager', 'teacher'\), domain\.getAcademicAnalytics\)/);
  assert.match(routes, /router\.get\('\/academic-analytics\/export', requireRole\('admin', 'manager', 'teacher'\), domain\.exportAcademicAnalytics\)/);
  assert.match(domain, /loadAcademicAnalytics/);
  assert.match(domain, /academicExportWorkbook/);
  assert.match(domain, /sendAcademicPdf/);
  assert.match(deployedDomain, /exportAcademicAnalytics/);
  assert.match(deployedRoutes, /\/academic-analytics\/export/);
  assert.match(api, /academicAnalyticsAPI/);
  assert.match(api, /downloadExcel/);
  assert.match(api, /downloadPdf/);
  assert.match(panel, /Export Excel/);
  assert.match(panel, /Export PDF/);
  assert.match(panel, /Major enrollment statistics/);
  assert.match(shell, /dashboard\/admin\?tab=academics/);
  assert.match(shell, /dashboard\/manager\?tab=academics/);
  assert.match(shell, /dashboard\/teacher\?tab=academics/);
  assert.match(admin, /AcademicAnalyticsPanel role="admin"/);
  assert.match(manager, /AcademicAnalyticsPanel role="manager"/);
  assert.match(teacher, /AcademicAnalyticsPanel role="teacher"/);
});
