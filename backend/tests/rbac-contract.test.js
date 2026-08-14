const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const frontend = path.join(root, 'frontend', 'src');
const backend = path.join(root, 'backend');

test('a Student is redirected to the Student dashboard rather than rendering an Admin, Manager, or Teacher dashboard', () => {
  const guard = fs.readFileSync(path.join(frontend, 'components', 'role-guard.tsx'), 'utf8');
  assert.match(guard, /router\.replace\(dashboardByRole\[actualRole\]\)/);
  assert.match(guard, /actualRole !== requiredRole/);
  assert.match(guard, /student: '\/dashboard\/student'/);

  for (const role of ['admin', 'manager', 'teacher', 'student']) {
    const page = fs.readFileSync(path.join(frontend, 'app', 'dashboard', role, 'page.tsx'), 'utf8');
    assert.match(page, new RegExp(`useRoleGuard\\('${role}'\\)`));
    assert.match(page, /if \(!isAuthorized\) return null;/);
  }
});

test('the shared portal shell cannot navigate a Student into another role portal', () => {
  const shell = fs.readFileSync(path.join(frontend, 'components', 'portal-shell.tsx'), 'utf8');
  assert.doesNotMatch(shell, /Role switcher/);
  assert.doesNotMatch(shell, /router\.push\(/);
  assert.match(shell, /Dashboard & Analytics/);
  assert.match(shell, /System Settings/);
});

test('dashboard sidebar URL parameters select strict isolated views in every role portal', () => {
  const admin = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'admin', 'page.tsx'), 'utf8');
  assert.match(admin, /const activeTab: AdminTab/);
  assert.match(admin, /activeTab === 'dashboard' &&/);
  assert.match(admin, /activeTab === 'users' && <UserManagementPanel/);
  assert.match(admin, /activeTab === 'residence' && <ResidenceConfigurationPanel/);
  assert.match(admin, /activeTab === 'cms' && <AnnouncementManagementPanel/);
  assert.match(admin, /activeTab === 'settings' && <SystemSettingsPanel/);
  assert.match(admin, /aria-label="Search users"/);

  const manager = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'manager', 'page.tsx'), 'utf8');
  assert.match(manager, /type ManagerTab = 'dashboard'/);
  assert.match(manager, /requested === 'rooms'\) return 'buildings'/);
  assert.match(manager, /requested === 'utilities'\) return 'billing'/);
  assert.match(manager, /activeTab === 'dashboard' &&/);
  assert.match(manager, /activeTab === 'applications' && <ApplicationsPanel/);
  assert.match(manager, /activeTab === 'buildings' && <BuildingsPanel/);
  assert.match(manager, /activeTab === 'billing' && <BillingPanel/);
  assert.match(manager, /activeTab === 'maintenance' && <MaintenancePanel/);

  const teacher = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'teacher', 'page.tsx'), 'utf8');
  assert.match(teacher, /type TeacherTab = 'dashboard' \| 'attendance' \| 'leave'/);
  assert.match(teacher, /activeTab === 'dashboard' &&/);
  assert.match(teacher, /activeTab === 'attendance' &&/);
  assert.match(teacher, /activeTab === 'leave'/);

  const student = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'student', 'page.tsx'), 'utf8');
  assert.match(student, /requestedTab === 'apply' \? 'application'/);
  assert.match(student, /requestedTab === 'bills' \? 'bills'/);
  assert.match(student, /requestedTab === 'maintenance' \? 'maintenance'/);
  assert.match(student, /activeTab === 'overview' && <Overview/);
  assert.match(student, /activeTab === 'application' && <Application/);
  assert.match(student, /activeTab === 'bills' && <Bills/);
  assert.match(student, /activeTab === 'maintenance' && <Maintenance/);
});

test('mobile portal controls preserve accessible touch targets without introducing fixed-width overflow', () => {
  const shell = fs.readFileSync(path.join(frontend, 'components', 'portal-shell.tsx'), 'utf8');
  assert.match(shell, /size-11 items-center justify-center rounded-lg text-\[#31513d\]/);
  assert.match(shell, /h-11 w-full rounded-lg border border-\[#dce3dc\]/);
  assert.match(shell, /inline-flex h-11 w-full items-center justify-center/);

  const admin = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'admin', 'page.tsx'), 'utf8');
  assert.match(admin, /min-h-11 items-center gap-2 rounded-lg border/);
  assert.match(admin, /min-h-11 rounded-lg border border-\[#dce3dc\] px-2\.5/);

  const manager = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'manager', 'page.tsx'), 'utf8');
  assert.match(manager, /h-11 items-center gap-1 border-l/);
  assert.match(manager, /min-h-11 rounded-lg px-2\.5/);

  const teacher = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'teacher', 'page.tsx'), 'utf8');
  assert.match(teacher, /flex-1 rounded-xl border[^>]+style=\{\{ height: 44 \}\}/);
  assert.match(teacher, /min-h-11 rounded-lg px-3/);

  const student = fs.readFileSync(path.join(frontend, 'app', 'dashboard', 'student', 'page.tsx'), 'utf8');
  assert.match(student, /flex min-h-11 items-center gap-3/);
  assert.match(student, /size-5 shrink-0 accent-\[\#0b5c2c\]/);
});

test('role middleware rejects a Student from privileged Admin and Manager API routes', () => {
  const routes = fs.readFileSync(path.join(backend, 'routes', 'domain.routes.js'), 'utf8');
  assert.match(routes, /router\.get\('\/dashboard\/summary', requireRole\('admin', 'manager'\)/);
  assert.match(routes, /router\.get\('\/users', requireRole\('admin'\)/);
  assert.match(routes, /router\.post\('\/magic-qr\/resolve', requireRole\('admin', 'manager', 'teacher'\)/);
  assert.match(routes, /router\.route\('\/utility-bills'\)\s*\.get\(requireRole\('admin', 'manager'\)/);
});

test('requireRole returns 403 when a Student token is used for an Admin-only action', () => {
  const { requireRole } = require('../middleware/auth');
  const middleware = requireRole('admin');
  let receivedError;
  middleware({ user: { sub: 'student-user', role: 'student' } }, {}, (error) => { receivedError = error; });
  assert.equal(receivedError?.statusCode, 403);
  assert.match(receivedError?.message || '', /permission/i);
});

test('a Student is forced to their own bills and cannot mark another student bill paid', () => {
  const controller = fs.readFileSync(path.join(backend, 'controllers', 'domain.controller.js'), 'utf8');
  assert.match(controller, /const userId = req\.user\.role === 'student' \? req\.user\.sub : req\.query\.studentId \|\| null/);
  assert.match(controller, /Students can only record payments for their own bills/);
  assert.match(controller, /updateQuery = updateQuery\.eq\('student_id', req\.user\.sub\)/);
});
