const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(backendRoot, '..', 'frontend', 'src');

function read(relativePath) {
  return fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');
}

test('password management uses bcrypt cost 12 and authenticated self-service verification', () => {
  const controller = read('controllers/auth.controller.js');
  assert.match(controller, /const changePassword/);
  assert.match(controller, /bcrypt\.compare\(current_password, user\.password_hash\)/);
  assert.match(controller, /bcrypt\.hash\(new_password, 12\)/);
  assert.match(controller, /const requestPasswordReset/);
  assert.match(controller, /If the account is registered/);
});

test('password routes distinguish authenticated self-service from administrator-only operations', () => {
  const authRoutes = read('routes/auth.routes.js');
  const domainRoutes = read('routes/domain.routes.js');
  assert.match(authRoutes, /router\.post\('\/change-password', authenticate, authController\.changePassword\)/);
  assert.match(authRoutes, /router\.post\('\/request-password-reset', authController\.requestPasswordReset\)/);
  assert.match(domainRoutes, /router\.post\('\/admin\/users\/:userId\/reset-password', requireRole\('admin'\), domain\.resetUserPassword\)/);
  assert.match(domainRoutes, /router\.get\('\/admin\/password-reset-requests', requireRole\('admin'\), domain\.listPasswordResetRequests\)/);
});

test('the additive reset-request migration and admin UI expose the approved request lifecycle', () => {
  const migration = fs.readFileSync(path.resolve(backendRoot, '..', 'supabase', 'migrations', '20260817_password_management.sql'), 'utf8');
  const admin = fs.readFileSync(path.join(frontendRoot, 'app', 'dashboard', 'admin', 'page.tsx'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS password_reset_requests/);
  assert.match(migration, /CHECK \(status IN \('pending', 'resolved', 'rejected'\)\)/);
  assert.match(admin, /Pending Password Requests/);
  assert.match(admin, /Reset password/);
});

test('same-project Vercel API keeps authentication on the official KSIT domain and restricts credentialed previews', () => {
  const api = fs.readFileSync(path.join(frontendRoot, 'lib', 'api.ts'), 'utf8');
  const app = fs.readFileSync(path.resolve(backendRoot, '..', 'frontend', 'server', 'app.js'), 'utf8');
  const vercelFunction = fs.readFileSync(path.resolve(backendRoot, '..', 'frontend', 'api', '[...path].js'), 'utf8');
  assert.match(api, /export const API_BASE_URL = ''/);
  assert.doesNotMatch(api, /ksit-dorm-api\.vercel\.app/);
  assert.match(vercelFunction, /require\('\.\.\/server\/app'\)/);
  assert.match(app, /ksit-dorm\.vercel\.app/);
  assert.match(app, /ksit-dormitory-system-\[a-z0-9-\]\+\\\.vercel\\\.app/);
  assert.match(app, /app\.options\(\/\.\*\/\, cors\(corsOptions\)\)/);
  assert.doesNotMatch(app, /return \/\^https:\\\/\\\/\[a-z0-9-\]\+\\\.vercel\\\.app/);
});
