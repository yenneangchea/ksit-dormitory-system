const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const frontendRoot = path.resolve(__dirname, '..', '..', 'frontend', 'src', 'app');

test('root layout loads the official Telegram WebApp SDK safely for the login gateway', () => {
  const layout = fs.readFileSync(path.join(frontendRoot, 'layout.tsx'), 'utf8');
  assert.match(layout, /telegram\.org\/js\/telegram-web-app\.js/);
  assert.match(layout, /defer/);
});

test('homepage keeps the registration deadline announcement and Apply Now action', () => {
  const page = fs.readFileSync(path.join(frontendRoot, 'page.tsx'), 'utf8');
  assert.match(page, /ការទទួលពាក្យសុំស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត ឆ្នាំសិក្សា ២០២៦-២០២៧/);
  assert.match(page, /ដាក់ពាក្យឥឡូវនេះ/);
  assert.match(page, /href="\/login"/);
});

test('login page exposes email and Telegram choices plus a password-reset request flow without demo credentials', () => {
  const login = fs.readFileSync(path.join(frontendRoot, 'login', 'page.tsx'), 'utf8');
  assert.match(login, /Login with Email/);
  assert.match(login, /Login with Telegram/);
  assert.match(login, /loginWithTelegram/);
  assert.match(login, /registerWithTelegram/);
  assert.match(login, /Sign up with Telegram/);
  assert.match(login, /searchParams\?\.get\("mode"\) === "telegram"/);
  assert.match(login, /searchParams\?\.get\("registered"\)/);
  assert.match(login, /Registration completed\. Enter the password you just created/);
  assert.match(login, /Forgot Password\? \/ ភ្លេចពាក្យសម្ងាត់\? ស្នើសុំប្តូរ/);
  assert.match(login, /requestPasswordReset/);
  assert.doesNotMatch(login, /Demo account quick fill/);
  assert.doesNotMatch(login, /admin@ksit\.edu\.kh/);
});

test('role-aware login maps every authorized role to its own dashboard route', () => {
  const login = fs.readFileSync(path.join(frontendRoot, 'login', 'page.tsx'), 'utf8');
  for (const [role, route] of Object.entries({
    admin: '/dashboard/admin',
    manager: '/dashboard/manager',
    teacher: '/dashboard/teacher',
    student: '/dashboard/student',
  })) {
    assert.match(login, new RegExp(`${role}: ["']${route}["']`));
  }
});

test('Telegram role handoff stores the issued session locally and never puts a token in a dashboard URL', () => {
  const login = fs.readFileSync(path.join(frontendRoot, 'login', 'page.tsx'), 'utf8');
  assert.match(login, /localStorage\.setItem\("ksit_session_token", response\.token\)/);
  assert.match(login, /router\.replace\(destination\)/);
  assert.doesNotMatch(login, /router\.replace\([^)]*token=/);
  assert.doesNotMatch(login, /dashboard\/[a-z]+\?[^"'`]*token=/);
});
