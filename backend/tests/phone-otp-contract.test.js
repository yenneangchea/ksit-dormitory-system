const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  assertSixDigitOtp,
  buildTelegramOtpMessage,
  generateSixDigitOtp,
  getOtpExpiry,
  normalizePhoneNumber,
  phoneLookupCandidates,
} = require('../lib/phone-otp');

const root = path.resolve(__dirname, '..', '..');

test('phone OTP helpers normalize Khmer mobile formats and generate six numeric digits', () => {
  assert.equal(normalizePhoneNumber('089511383'), '089511383');
  assert.equal(normalizePhoneNumber('+855 89 511 383'), '089511383');
  assert.deepEqual(phoneLookupCandidates('089511383'), ['089511383', '85589511383', '+85589511383']);
  assert.throws(() => normalizePhoneNumber('123'), /valid registered phone number/);

  const code = generateSixDigitOtp();
  assert.match(code, /^\d{6}$/);
  assert.equal(assertSixDigitOtp(code), code);
  assert.throws(() => assertSixDigitOtp('12345'), /six-digit/);
  assert.match(buildTelegramOtpMessage('123456'), /123456/);
});

test('OTP expiry is five minutes and resend/attempt limits are fixed server-side', () => {
  const now = Date.UTC(2026, 7, 18, 0, 0, 0);
  assert.equal(new Date(getOtpExpiry(now)).getTime() - now, 5 * 60 * 1000);
  assert.equal(OTP_RESEND_SECONDS, 60);
  assert.equal(OTP_MAX_ATTEMPTS, 5);
});

test('phone verification migration stores hashes, enforces expiry-ready single-use records, and restricts browser roles', () => {
  const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260818_phone_verification_codes.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.phone_verification_codes/);
  assert.match(migration, /code_hash text NOT NULL/);
  assert.match(migration, /expires_at timestamptz NOT NULL/);
  assert.match(migration, /consumed_at timestamptz/);
  assert.match(migration, /attempt_count integer NOT NULL DEFAULT 0/);
  assert.match(migration, /WHERE consumed_at IS NULL/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.phone_verification_codes FROM anon, authenticated/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.phone_verification_codes TO service_role/);
});

test('phone OTP API uses hashed single-use records, non-enumerating responses, and linked Telegram delivery', () => {
  const controller = fs.readFileSync(path.join(root, 'backend', 'controllers', 'auth.controller.js'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'backend', 'routes', 'auth.routes.js'), 'utf8');

  assert.match(route, /router\.post\('\/phone\/send-otp', authController\.sendPhoneOtp\)/);
  assert.match(route, /router\.post\('\/phone\/verify-otp', authController\.verifyPhoneOtp\)/);
  assert.match(controller, /from\('phone_verification_codes'\)/);
  assert.match(controller, /bcrypt\.hash\(code, 12\)/);
  assert.match(controller, /bcrypt\.compare\(code, otpRecord\.code_hash\)/);
  assert.match(controller, /is\('consumed_at', null\)/);
  assert.match(controller, /attempt_count: nextAttempts/);
  assert.match(controller, /sendTelegramOtp\(user\.telegram_id, code\)/);
  assert.match(controller, /const linkedUsers = \(users \|\| \[\]\)\.filter/);
  assert.match(controller, /if \(linkedUsers\.length !== 1\) return res\.status\(202\)\.json\(phoneOtpAcceptedResponse\(\)\)/);
  assert.doesNotMatch(controller, /\.in\('phone', phoneLookupCandidates\(phone\)\)\s*\.limit\(1\)/);
  assert.match(controller, /phoneOtpAcceptedResponse\(\)/);
  assert.match(controller, /https:\/\/api\.telegram\.org\/bot\$\{token\}\/sendMessage/);
});

test('login UI restores a valid session, offers a phone OTP tab, and makes public navigation role-aware', () => {
  const login = fs.readFileSync(path.join(root, 'frontend', 'src', 'app', 'login', 'page.tsx'), 'utf8');
  const navigation = fs.readFileSync(path.join(root, 'frontend', 'src', 'app', 'page.tsx'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'frontend', 'src', 'lib', 'api.ts'), 'utf8');

  assert.match(login, /Restoring your KSIT Dormitory session/);
  assert.match(login, /authAPI\.getCurrentUser\(\)/);
  assert.match(login, /router\.replace\(destination\)/);
  assert.match(login, /Login with Phone/);
  assert.match(login, /authAPI\.sendPhoneOtp/);
  assert.match(login, /authAPI\.verifyPhoneOtp/);
  assert.match(login, /requestedMode/);
  assert.ok(login.indexOf('Phone OTP') < login.indexOf('Login with Email'), 'Phone OTP must be listed before Email');
  assert.match(login, /id="phone-otp-code"/);
  assert.match(login, /autoComplete="one-time-code"/);
  assert.match(login, /maxLength=\{6\}/);
  assert.match(login, /Type or paste the full six-digit code once\./);
  assert.doesNotMatch(login, /phone-otp-\$\{index \+ 1\}/);
  assert.match(login, /completeLogin/);
  assert.match(navigation, /ចូលប្រើប្រាស់|Login/);
  assert.match(api, /sendPhoneOtp/);
  assert.match(api, /verifyPhoneOtp/);
});

test('the Vercel-served auth controller, routes, and OTP helper are synchronized with backend sources', () => {
  for (const relativePath of [
    'controllers/auth.controller.js',
    'routes/auth.routes.js',
    'lib/phone-otp.js',
  ]) {
    const backend = fs.readFileSync(path.join(root, 'backend', relativePath), 'utf8');
    const deployed = fs.readFileSync(path.join(root, 'frontend', 'server', relativePath), 'utf8');
    assert.equal(deployed, backend, `${relativePath} must match the Vercel-served backend copy`);
  }
});
