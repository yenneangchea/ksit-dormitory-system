const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backendRoot = path.resolve(__dirname, '..');
const root = path.resolve(backendRoot, '..');

test('email login uses case-insensitive lookup, bcrypt verification, and a narrowly gated demo fallback', () => {
  const controller = fs.readFileSync(path.join(backendRoot, 'controllers', 'auth.controller.js'), 'utf8');
  assert.match(controller, /const bcrypt = require\('bcryptjs'\)/);
  assert.match(controller, /const \{ identifier, email, password \} = req\.body/);
  assert.match(controller, /query\.ilike\('email', normalizedEmail\)/);
  assert.match(controller, /bcrypt\.compare\(password, user\.password_hash\)/);
  assert.match(controller, /ALLOW_DEMO_CREDENTIAL_FALLBACK === 'true'/);
  assert.match(controller, /permissions: permissionsFor\(safeUser\.role\)/);
  assert.match(controller, /'admin@ksit\.edu\.kh': 'Admin@123'/);
  assert.match(controller, /'student@ksit\.edu\.kh': 'Student@123'/);
});

test('demo credential migration upserts documented roles with bcrypt-10 hashes', () => {
  const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260816_demo_account_credentials.sql'), 'utf8');
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS pgcrypto/);
  assert.match(migration, /crypt\(demo\.plain_password, gen_salt\('bf', 10\)\)/);
  for (const [email, password] of [
    ['admin@ksit.edu.kh', 'Admin@123'],
    ['manager@ksit.edu.kh', 'Manager@123'],
    ['teacher@ksit.edu.kh', 'Teacher@123'],
    ['student@ksit.edu.kh', 'Student@123'],
  ]) {
    assert.match(migration, new RegExp(`${email.replaceAll('.', '\\.')}`));
    assert.match(migration, new RegExp(password.replace('@', '@')));
  }
});
