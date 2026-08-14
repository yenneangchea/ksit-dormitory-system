const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const frontendRoot = path.resolve(__dirname, '..', '..', 'frontend', 'src', 'app');

test('homepage keeps the registration deadline announcement and Apply Now action', () => {
  const page = fs.readFileSync(path.join(frontendRoot, 'page.tsx'), 'utf8');
  assert.match(page, /ការទទួលពាក្យសុំស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត ឆ្នាំសិក្សា ២០២៦-២០២៧/);
  assert.match(page, /ដាក់ពាក្យឥឡូវនេះ/);
  assert.match(page, /href="\/login"/);
});

test('login page exposes email and Telegram choices plus all four demo-account quick fills', () => {
  const login = fs.readFileSync(path.join(frontendRoot, 'login', 'page.tsx'), 'utf8');
  assert.match(login, /Login with Email/);
  assert.match(login, /Login with Telegram/);
  assert.match(login, /loginWithTelegram/);
  assert.match(login, /registerWithTelegram/);
  assert.match(login, /Sign up with Telegram/);
  assert.match(login, /searchParams\.get\("registered"\)/);
  assert.match(login, /Registration completed\. Enter the password you just created/);
  for (const email of ['admin@ksit.edu.kh', 'manager@ksit.edu.kh', 'teacher@ksit.edu.kh', 'student@ksit.edu.kh']) {
    assert.match(login, new RegExp(email.replace('@', '@')));
  }
});
