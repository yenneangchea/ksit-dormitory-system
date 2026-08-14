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
  assert.match(shell, /Current portal:/);
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
