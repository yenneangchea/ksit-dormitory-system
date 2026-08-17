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
  const student = read('frontend/src/components/student-application-wizard.tsx');
  const login = read('frontend/src/app/login/page.tsx');
  const selector = read('frontend/src/components/academic-program-fields.tsx');
  assert.match(admin, /Academic Programs & Majors/);
  assert.match(admin, /majorsAPI\.listAdmin/);
  assert.match(student, /AcademicProgramFields/);
  assert.match(login, /academic_major_id/);
  assert.match(selector, /majorsAPI\.public/);
});
