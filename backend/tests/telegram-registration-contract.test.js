const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backendRoot = path.resolve(__dirname, '..');

test('Telegram registration always creates a student and never accepts a client-selected role', () => {
  const source = fs.readFileSync(path.join(backendRoot, 'controllers', 'auth.controller.js'), 'utf8');
  const registrationBlock = source.slice(source.indexOf('const registerWithTelegram'), source.indexOf('const loginWithTelegram'));
  assert.match(registrationBlock, /role:\s*'student'/);
  assert.match(registrationBlock, /password_hash:\s*await bcrypt\.hash\(password, 12\)/);
  assert.doesNotMatch(registrationBlock, /const\s*\{[^}]*\brole\b[^}]*\}\s*=\s*req\.body/);
});

test('protected routes refresh the role from the user record rather than relying solely on an old JWT role claim', () => {
  const source = fs.readFileSync(path.join(backendRoot, 'middleware', 'auth.js'), 'utf8');
  assert.match(source, /from\('users'\)/);
  assert.match(source, /select\('id, role'\)/);
  assert.match(source, /req\.user\s*=\s*\{\s*sub:\s*user\.id,\s*role:\s*user\.role\s*\}/);
});
