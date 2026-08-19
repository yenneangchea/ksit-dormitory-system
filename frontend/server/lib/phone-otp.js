const crypto = require('node:crypto');

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

function normalizePhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const normalized = digits.startsWith('855') ? `0${digits.slice(3)}` : digits;

  if (!/^0\d{7,14}$/.test(normalized)) {
    const error = new Error('Enter a valid registered phone number.');
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function phoneLookupCandidates(value) {
  try {
    const normalized = normalizePhoneNumber(value);
    const withoutLeadingZero = normalized.startsWith('0') ? normalized.slice(1) : normalized;
    return Array.from(new Set([
      normalized,
      `855${withoutLeadingZero}`,
      `+855${withoutLeadingZero}`,
    ]));
  } catch {
    const raw = String(value || '').trim();
    return raw ? [raw] : [];
  }
}

function generateSixDigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function getOtpExpiry(now = Date.now()) {
  return new Date(now + OTP_TTL_MS).toISOString();
}

function assertSixDigitOtp(value) {
  const code = String(value || '').trim();
  if (!/^\d{6}$/.test(code)) {
    const error = new Error('Enter the six-digit verification code sent to Telegram.');
    error.statusCode = 400;
    throw error;
  }
  return code;
}

function buildTelegramOtpMessage(code) {
  return `🔐 លេខកូដសម្ងាត់ផ្ទៀងផ្ទាត់ KSIT Dorm របស់អ្នកគឺ: ${code} (មានសុពលភាព ៥ នាទី)។`;
}

module.exports = {
  OTP_TTL_MS,
  OTP_RESEND_SECONDS,
  OTP_MAX_ATTEMPTS,
  normalizePhoneNumber,
  phoneLookupCandidates,
  generateSixDigitOtp,
  getOtpExpiry,
  assertSixDigitOtp,
  buildTelegramOtpMessage,
};
