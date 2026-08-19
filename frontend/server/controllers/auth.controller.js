const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabase } = require('../config/supabase');
const { verifyTelegramWebAppInitData } = require('../lib/telegram-webapp-auth');
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

const APPROVED_DEMO_CREDENTIALS = Object.freeze({
  'yenneangchea@gmail.com': 'Neang12',
  'admin@ksit.edu.kh': 'Admin@123',
  'manager@ksit.edu.kh': 'Manager@123',
  'teacher@ksit.edu.kh': 'Teacher@123',
  'student@ksit.edu.kh': 'Student@123',
});

const ROLE_PERMISSIONS = Object.freeze({
  admin: ['manage_users', 'manage_settings', 'manage_operations', 'view_reports'],
  manager: ['manage_operations', 'review_applications', 'manage_assignments', 'view_reports'],
  teacher: ['record_attendance', 'view_assigned_students'],
  student: ['manage_own_application', 'view_own_bills', 'submit_maintenance'],
});

function approvedDemoFallbackMatches(email, password) {
  return process.env.ALLOW_DEMO_CREDENTIAL_FALLBACK === 'true'
    && typeof password === 'string'
    && APPROVED_DEMO_CREDENTIALS[email] === password;
}

function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function publicUser(user) {
  return {
    id: user.id,
    telegram_id: user.telegram_id,
    role: user.role,
    full_name_khmer: user.full_name_khmer,
    full_name_latin: user.full_name_latin,
    gender: user.gender,
    phone: user.phone,
    email: user.email,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function createSessionToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    const error = new Error('JWT_SECRET must be set to a random value with at least 32 characters.');
    error.statusCode = 503;
    throw error;
  }

  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '12h' });
}

function phoneOtpAcceptedResponse() {
  return {
    success: true,
    message: 'If this registered phone number is linked to Telegram, a six-digit verification code has been sent.',
    resend_after_seconds: OTP_RESEND_SECONDS,
  };
}

async function sendTelegramOtp(telegramId, code) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    const error = new Error('Telegram OTP delivery is not configured. Please use email or Telegram Mini App login.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: telegramId, text: buildTelegramOtpMessage(code) }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    const error = new Error('The verification code could not be delivered to the linked Telegram account. Please use email login or try again later.');
    error.statusCode = 503;
    throw error;
  }
}

function decodeSession(req) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    const error = new Error('A valid bearer token is required.');
    error.statusCode = 401;
    throw error;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const error = new Error('Your session is invalid or has expired. Please sign in again.');
    error.statusCode = 401;
    throw error;
  }
}

function requirePassword(value, label = 'Password') {
  if (typeof value !== 'string' || value.length < 8) {
    const error = new Error(`${label} must be at least 8 characters.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

/**
 * @desc Sign in with a registered email address or Telegram ID.
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { identifier, email, password } = req.body;
    const loginIdentifier = String(email || identifier || '').trim();
    const normalizedEmail = loginIdentifier.toLowerCase();

    if (!loginIdentifier || !password) {
      const error = new Error('Please provide an email or Telegram ID and a password.');
      error.statusCode = 400;
      throw error;
    }

    const supabase = getSupabase();
    let query = supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, password_hash, avatar_url, created_at, updated_at')
      .limit(1);

    query = loginIdentifier.includes('@')
      ? query.ilike('email', normalizedEmail)
      : query.eq('telegram_id', loginIdentifier);


    const { data: users, error: queryError } = await query;
    if (queryError) {
      throw queryError;
    }

    const user = users?.[0];
    if (!user || !user.password_hash) {
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }

    const bcryptMatches = await bcrypt.compare(password, user.password_hash);
    const passwordMatches = bcryptMatches || approvedDemoFallbackMatches(String(user.email || '').toLowerCase(), password);
    if (!passwordMatches) {
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }

    const safeUser = publicUser(user);
    res.json({
      success: true,
      message: 'Login successful.',
      user: safeUser,
      role: safeUser.role,
      permissions: permissionsFor(safeUser.role),
      token: createSessionToken(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Register a Telegram-verified person as a student or return their existing linked profile.
 *       The role is deliberately fixed server-side to `student`; callers cannot self-promote.
 * @route POST /api/auth/telegram/register
 * @access Public, with verified Telegram Mini App init data
 */
const registerWithTelegram = async (req, res, next) => {
  try {
    const { initData, full_name_khmer, full_name_latin, email, phone, gender, academic_level, academic_major_id, academic_year, password } = req.body;
    const { telegramId, user: telegramUser } = verifyTelegramWebAppInitData(
      initData,
      process.env.TELEGRAM_BOT_TOKEN,
      Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS || 600),
    );

    const khmerName = String(full_name_khmer || '').trim();
    const latinName = String(full_name_latin || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();
    const normalizedAcademicLevel = String(academic_level || '').trim();
    const normalizedMajorId = String(academic_major_id || '').trim();
    const normalizedAcademicYear = Number(academic_year);
    if (!khmerName || !latinName || !normalizedEmail || !normalizedPhone || !['male', 'female'].includes(gender) || !normalizedAcademicLevel || !normalizedMajorId || !Number.isInteger(normalizedAcademicYear) || normalizedAcademicYear < 1 || normalizedAcademicYear > 4 || typeof password !== 'string' || password.length < 8) {
      const validationError = new Error('Khmer name, Latin name, email, phone number, gender, academic level, major, year level, and a password of at least 8 characters are required to register.');
      validationError.statusCode = 400;
      throw validationError;
    }

    const supabase = getSupabase();
    const selectFields = 'id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at';
    const { data: linkedUser, error: linkedError } = await supabase
      .from('users')
      .select(selectFields)
      .eq('telegram_id', telegramId)
      .maybeSingle();
    if (linkedError) throw linkedError;
    if (linkedUser) {
      return res.json({
        success: true,
        message: 'Your Telegram account is already registered.',
        user: publicUser(linkedUser),
        token: createSessionToken(linkedUser),
      });
    }

    const { data: emailOwner, error: emailLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (emailLookupError) throw emailLookupError;
    if (emailOwner) {
      const conflict = new Error('This email address is already registered. Sign in with the existing account or ask an administrator to link Telegram.');
      conflict.statusCode = 409;
      throw conflict;
    }

    const { data: selectedMajor, error: majorError } = await supabase
      .from('academic_majors')
      .select('id, academic_level, name_khmer, available_year_levels')
      .eq('id', normalizedMajorId)
      .eq('academic_level', normalizedAcademicLevel)
      .eq('is_active', true)
      .maybeSingle();
    if (majorError) throw majorError;
    if (!selectedMajor || !(selectedMajor.available_year_levels || []).includes(normalizedAcademicYear)) {
      const academicError = new Error('The selected academic level, major, or year level is not currently available.');
      academicError.statusCode = 400;
      throw academicError;
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        role: 'student',
        full_name_khmer: khmerName,
        full_name_latin: latinName,
        gender,
        phone: normalizedPhone,
        email: normalizedEmail,
        password_hash: await bcrypt.hash(password, 12),
        avatar_url: telegramUser.photo_url || null,
      })
      .select(selectFields)
      .single();
    if (insertError) throw insertError;

    const { error: profileError } = await supabase.from('academic_profiles').insert({
      user_id: newUser.id,
      academic_level: selectedMajor.academic_level,
      academic_major_id: selectedMajor.id,
      major: selectedMajor.name_khmer,
      academic_year: normalizedAcademicYear,
    });
    if (profileError) throw profileError;

    res.status(201).json({
      success: true,
      message: 'Registration completed. Your default role is Student.',
      user: publicUser(newUser),
      token: createSessionToken(newUser),
    });
  } catch (error) {
    if (!error.statusCode && /not configured/.test(error.message || '')) {
      error.statusCode = 503;
    } else if (!error.statusCode && /Telegram login|Telegram user|could not be verified|incomplete|expired/.test(error.message || '')) {
      error.statusCode = 401;
    }
    next(error);
  }
};

/**
 * @desc Verify Telegram Mini App init data and sign in a previously linked dormitory user.
 * @route POST /api/auth/telegram
 * @access Public
 */
const loginWithTelegram = async (req, res, next) => {
  try {
    const { initData } = req.body;
    const { telegramId } = verifyTelegramWebAppInitData(
      initData,
      process.env.TELEGRAM_BOT_TOKEN,
      Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS || 600),
    );
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      const linkError = new Error('Your Telegram account is not linked to a KSIT dormitory profile. Use email login or ask an administrator to link your Telegram ID.');
      linkError.statusCode = 401;
      throw linkError;
    }

    res.json({
      success: true,
      message: 'Telegram login successful.',
      user: publicUser(user),
      token: createSessionToken(user),
    });
  } catch (error) {
    if (!error.statusCode && /not configured/.test(error.message || '')) {
      error.statusCode = 503;
    } else if (!error.statusCode && /Telegram login|Telegram user|could not be verified|incomplete|expired/.test(error.message || '')) {
      error.statusCode = 401;
    }
    next(error);
  }
};

/**
 * @desc Bind the current signed-in KSIT account to verified Telegram Mini App identity data.
 * @route POST /api/auth/telegram/link
 * @access Private
 */
const linkTelegramToCurrentUser = async (req, res, next) => {
  try {
    const accountId = req.user?.sub;
    if (!accountId) {
      const error = new Error('A valid signed-in session is required to link Telegram.');
      error.statusCode = 401;
      throw error;
    }

    const { initData } = req.body || {};
    const { telegramId } = verifyTelegramWebAppInitData(
      initData,
      process.env.TELEGRAM_BOT_TOKEN,
      Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS || 600),
    );
    const supabase = getSupabase();
    const selectFields = 'id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at';

    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select(selectFields)
      .eq('id', accountId)
      .maybeSingle();
    if (currentUserError) throw currentUserError;
    if (!currentUser) {
      const error = new Error('The signed-in account could not be found.');
      error.statusCode = 401;
      throw error;
    }
    if (currentUser.telegram_id && String(currentUser.telegram_id) !== String(telegramId)) {
      const error = new Error('This KSIT account is already linked to a different Telegram account. Contact an administrator to change the linked account.');
      error.statusCode = 409;
      throw error;
    }

    const { data: linkedOwner, error: linkedOwnerError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .maybeSingle();
    if (linkedOwnerError) throw linkedOwnerError;
    if (linkedOwner && linkedOwner.id !== accountId) {
      const error = new Error('This Telegram account is already linked to a different KSIT dormitory profile.');
      error.statusCode = 409;
      throw error;
    }

    if (String(currentUser.telegram_id || '') === String(telegramId)) {
      return res.json({ success: true, message: 'This Telegram account is already linked.', user: publicUser(currentUser) });
    }

    const { data: linkedUser, error: updateError } = await supabase
      .from('users')
      .update({ telegram_id: telegramId, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select(selectFields)
      .single();
    if (updateError) throw updateError;

    return res.json({ success: true, message: 'Telegram account linked successfully.', user: publicUser(linkedUser) });
  } catch (error) {
    if (!error.statusCode && /not configured/.test(error.message || '')) {
      error.statusCode = 503;
    } else if (!error.statusCode && /Telegram login|Telegram user|could not be verified|incomplete|expired/.test(error.message || '')) {
      error.statusCode = 401;
    }
    next(error);
  }
};

/**
 * @desc Send a one-time phone-login code to the account's linked Telegram chat.
 * @route POST /api/auth/phone/send-otp
 * @access Public, non-enumerating
 */
const sendPhoneOtp = async (req, res, next) => {
  try {
    const phone = normalizePhoneNumber(req.body?.phone);
    const supabase = getSupabase();
    const { data: users, error: lookupError } = await supabase
      .from('users')
      .select('id, telegram_id')
      .in('phone', phoneLookupCandidates(phone));
    if (lookupError) throw lookupError;

    // A phone number can exist on older duplicate records. Never select an
    // arbitrary row: deliver only when exactly one matching profile has a
    // verified Telegram link, otherwise keep the response non-enumerating.
    const linkedUsers = (users || []).filter((candidate) => String(candidate.telegram_id || '').trim());
    if (linkedUsers.length !== 1) return res.status(202).json(phoneOtpAcceptedResponse());
    const user = linkedUsers[0];

    const resendWindowStart = new Date(Date.now() - OTP_RESEND_SECONDS * 1000).toISOString();
    const { data: recentCodes, error: recentCodeError } = await supabase
      .from('phone_verification_codes')
      .select('id')
      .eq('phone', phone)
      .is('consumed_at', null)
      .gte('created_at', resendWindowStart)
      .limit(1);
    if (recentCodeError) throw recentCodeError;
    if (recentCodes?.length) return res.status(202).json(phoneOtpAcceptedResponse());

    const now = new Date().toISOString();
    const { error: invalidateError } = await supabase
      .from('phone_verification_codes')
      .update({ consumed_at: now })
      .eq('phone', phone)
      .is('consumed_at', null);
    if (invalidateError) throw invalidateError;

    const code = generateSixDigitOtp();
    const { data: otpRecord, error: insertError } = await supabase
      .from('phone_verification_codes')
      .insert({ user_id: user.id, phone, code_hash: await bcrypt.hash(code, 12), expires_at: getOtpExpiry() })
      .select('id')
      .single();
    if (insertError) throw insertError;

    try {
      await sendTelegramOtp(user.telegram_id, code);
    } catch (deliveryError) {
      await supabase.from('phone_verification_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otpRecord.id).is('consumed_at', null);
      throw deliveryError;
    }

    return res.status(202).json(phoneOtpAcceptedResponse());
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Verify a Telegram-delivered phone OTP and issue a role-aware JWT session.
 * @route POST /api/auth/phone/verify-otp
 * @access Public
 */
const verifyPhoneOtp = async (req, res, next) => {
  try {
    const phone = normalizePhoneNumber(req.body?.phone);
    const code = assertSixDigitOtp(req.body?.code);
    const supabase = getSupabase();
    const { data: otpRecord, error: codeLookupError } = await supabase
      .from('phone_verification_codes')
      .select('id, user_id, code_hash, expires_at, attempt_count')
      .eq('phone', phone)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (codeLookupError) throw codeLookupError;

    const invalidOtp = new Error('The verification code is invalid, expired, or has already been used.');
    invalidOtp.statusCode = 401;
    if (!otpRecord || new Date(otpRecord.expires_at).getTime() <= Date.now() || otpRecord.attempt_count >= OTP_MAX_ATTEMPTS) {
      if (otpRecord?.id) await supabase.from('phone_verification_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otpRecord.id).is('consumed_at', null);
      throw invalidOtp;
    }

    if (!(await bcrypt.compare(code, otpRecord.code_hash))) {
      const nextAttempts = otpRecord.attempt_count + 1;
      await supabase
        .from('phone_verification_codes')
        .update({ attempt_count: nextAttempts, ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { consumed_at: new Date().toISOString() } : {}) })
        .eq('id', otpRecord.id)
        .is('consumed_at', null);
      throw invalidOtp;
    }

    const { data: consumedRecord, error: consumeError } = await supabase
      .from('phone_verification_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otpRecord.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();
    if (consumeError) throw consumeError;
    if (!consumedRecord) throw invalidOtp;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .eq('id', otpRecord.user_id)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) throw invalidOtp;

    const safeUser = publicUser(user);
    return res.json({ success: true, message: 'Phone verification successful.', user: safeUser, role: safeUser.role, permissions: permissionsFor(safeUser.role), token: createSessionToken(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Log out of the local signed session.
 * @route POST /api/auth/logout
 * @access Private client cleanup; tokens are stateless.
 */
const logout = async (_req, res, next) => {
  try {
    res.json({ success: true, message: 'Logout successful. Remove the saved session token on the client.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Return the currently authenticated profile.
 * @route GET /api/auth/me
 * @access Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const session = decodeSession(req);
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .eq('id', session.sub)
      .single();

    if (error || !user) {
      const notFound = new Error('The account associated with this session could not be found.');
      notFound.statusCode = 401;
      throw notFound;
    }

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Change the authenticated user's password after confirming their current password.
 * @route POST /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
  try {
    const session = decodeSession(req);
    const { current_password, new_password, confirm_password } = req.body || {};
    requirePassword(current_password, 'Current password');
    requirePassword(new_password, 'New password');
    if (new_password !== confirm_password) {
      const error = new Error('The new password and confirmation do not match.');
      error.statusCode = 400;
      throw error;
    }
    if (current_password === new_password) {
      const error = new Error('Choose a new password that is different from the current password.');
      error.statusCode = 400;
      throw error;
    }

    const supabase = getSupabase();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', session.sub)
      .maybeSingle();
    if (userError) throw userError;
    if (!user?.password_hash || !(await bcrypt.compare(current_password, user.password_hash))) {
      const error = new Error('The current password is incorrect.');
      error.statusCode = 401;
      throw error;
    }
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: await bcrypt.hash(new_password, 12), updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updateError) throw updateError;
    res.json({ success: true, message: 'Password changed successfully. Keep it private and sign in again on other devices.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a non-enumerating password-reset request for administrator review.
 * @route POST /api/auth/request-password-reset
 * @access Public
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const identifier = String(req.body?.identifier || '').trim();
    const reason = String(req.body?.reason || '').trim().slice(0, 1000) || null;
    if (!identifier) {
      const error = new Error('Enter your registered email address or phone number.');
      error.statusCode = 400;
      throw error;
    }
    const supabase = getSupabase();
    const normalizedEmail = identifier.toLowerCase();
    const { data: matches, error: lookupError } = await supabase
      .from('users')
      .select('id, email')
      .or(`email.eq.${normalizedEmail},phone.eq.${identifier}`)
      .limit(1);
    if (lookupError) throw lookupError;
    const user = matches?.[0];
    if (user) {
      const { data: pending, error: pendingError } = await supabase
        .from('password_reset_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .limit(1);
      if (pendingError) throw pendingError;
      if (!pending?.length) {
        const { error: createError } = await supabase.from('password_reset_requests').insert({ user_id: user.id, email: user.email, reason });
        if (createError) throw createError;
      }
    }
    // Keep this response identical when the identity does not exist to prevent account enumeration.
    res.status(202).json({ success: true, message: 'If the account is registered, a password reset request has been sent to the dormitory administrator.' });
  } catch (error) {
    next(error);
  }
};



/**
 * @desc Register or sign in a student via verified Telegram contact / phone OTP flow.
 * @route POST /api/auth/phone/register
 * @access Public
 */
const registerWithPhone = async (req, res, next) => {
  try {
    const { phone, code, full_name_khmer, full_name_latin, gender, email, initData } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);
    const otpCode = assertSixDigitOtp(code);

    const khmerName = String(full_name_khmer || '').trim();
    const latinName = String(full_name_latin || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!khmerName || !latinName || !['male', 'female'].includes(gender)) {
      const error = new Error('Khmer name, Latin name, and gender are required.');
      error.statusCode = 400;
      throw error;
    }

    const supabase = getSupabase();

    // Verify phone OTP
    const { data: otpRecord, error: codeLookupError } = await supabase
      .from('phone_verification_codes')
      .select('id, user_id, code_hash, expires_at, attempt_count')
      .eq('phone', normalizedPhone)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (codeLookupError) throw codeLookupError;

    const invalidOtp = new Error('The verification code is invalid, expired, or has already been used.');
    invalidOtp.statusCode = 401;
    if (!otpRecord || new Date(otpRecord.expires_at).getTime() <= Date.now() || otpRecord.attempt_count >= OTP_MAX_ATTEMPTS) {
      if (otpRecord?.id) await supabase.from('phone_verification_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otpRecord.id).is('consumed_at', null);
      throw invalidOtp;
    }

    if (!(await bcrypt.compare(otpCode, otpRecord.code_hash))) {
      const nextAttempts = otpRecord.attempt_count + 1;
      await supabase
        .from('phone_verification_codes')
        .update({ attempt_count: nextAttempts, ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { consumed_at: new Date().toISOString() } : {}) })
        .eq('id', otpRecord.id)
        .is('consumed_at', null);
      throw invalidOtp;
    }

    // Check unique phone enforcement across users (using candidates to catch +855 / 0855 variations)
    const { data: existingPhoneUsers, error: phoneCheckError } = await supabase
      .from('users')
      .select('id')
      .in('phone', phoneLookupCandidates(normalizedPhone));
    if (phoneCheckError) throw phoneCheckError;

    if (existingPhoneUsers && existingPhoneUsers.length > 0) {
      const conflict = new Error('លេខទូរស័ព្ទនេះត្រូវបានចុះឈ្មោះរួចហើយ សូមធ្វើការ Login ឬប្រើលេខទូរស័ព្ទផ្សេង (This phone number is already in use).');
      conflict.statusCode = 409;
      throw conflict;
    }

    let telegramId = null;
    let avatarUrl = null;
    if (initData) {
      try {
        const verified = verifyTelegramWebAppInitData(
          initData,
          process.env.TELEGRAM_BOT_TOKEN,
          Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS || 600),
        );
        telegramId = verified.telegramId;
        avatarUrl = verified.user?.photo_url || null;
      } catch {
        // optional initData verification failure shouldn't block phone registration if OTP is valid
      }
    }

    // Mark OTP consumed
    await supabase.from('phone_verification_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otpRecord.id);

    const selectFields = 'id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at';
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        role: 'student',
        full_name_khmer: khmerName,
        full_name_latin: latinName,
        gender,
        phone: normalizedPhone,
        email: normalizedEmail || null,
        password_hash: null, // phone OTP users authenticate via Telegram OTP / phone login
        avatar_url: avatarUrl,
      })
      .select(selectFields)
      .single();
    if (insertError) throw insertError;

    const safeUser = publicUser(newUser);
    return res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      user: safeUser,
      role: safeUser.role,
      permissions: permissionsFor(safeUser.role),
      token: createSessionToken(newUser),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Build a stable login URL for Telegram web_app buttons. TELEGRAM_MINI_APP_URL
 * may already contain a path or query string, so never concatenate another
 * `/login` path onto it.
 */
function telegramMiniAppUrl(mode) {
  const fallback = 'https://ksit-dorm.vercel.app/login';
  const configured = process.env.TELEGRAM_MINI_APP_URL || fallback;

  try {
    const url = new URL(configured, fallback);
    if (url.pathname === '/' || !url.pathname) url.pathname = '/login';
    url.search = '';
    url.hash = '';
    url.searchParams.set('mode', mode);
    return url.toString();
  } catch {
    const url = new URL(fallback);
    url.searchParams.set('mode', mode);
    return url.toString();
  }
}

/**
 * @desc Handle Telegram Bot webhook updates (e.g. /start command with inline buttons)
 * @route POST /api/auth/telegram/webhook
 * @access Public
 */
const telegramWebhook = async (req, res, next) => {
  try {
    const update = req.body || {};
    const message = update.message || update.callback_query?.message;
    const chatId = message?.chat?.id;
    const text = String(message?.text || '').trim();

    if (!chatId) {
      return res.json({ ok: true });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      const error = new Error('Telegram bot integration is not configured.');
      error.statusCode = 503;
      throw error;
    }

    if (text.startsWith('/start') || text.startsWith('/help')) {
      const welcomeText = '👋 សូមស្វាគមន៍មកកាន់ **ប្រព័ន្ធគ្រប់គ្រងការស្នាក់នៅអន្តេវាសិកដ្ឋាននិស្សិត KSIT**!\n\nសូមជ្រើសរើសជម្រើសខាងក្រោមដើម្បីចុះឈ្មោះ ឬចូលប្រើប្រាស់ប្រព័ន្ធ៖';
      const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '📝 ចុះឈ្មោះស្នាក់នៅ (Register)', web_app: { url: telegramMiniAppUrl('register') } },
              { text: '🔐 ចូលប្រើប្រាស់ (Login)', web_app: { url: telegramMiniAppUrl('telegram') } },
            ]],
          },
        }),
      });
      const telegramBody = await telegramResponse.json().catch(() => null);
      if (!telegramResponse.ok || !telegramBody?.ok) {
        const error = new Error('Telegram could not deliver the welcome message.');
        error.statusCode = 502;
        throw error;
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  registerWithTelegram,
  loginWithTelegram,
  linkTelegramToCurrentUser,
  sendPhoneOtp,
  verifyPhoneOtp,
  registerWithPhone,
  telegramWebhook,
  logout,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  decodeSession,
};


