const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabase } = require('../config/supabase');
const { verifyTelegramWebAppInitData } = require('../lib/telegram-webapp-auth');

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

module.exports = {
  login,
  registerWithTelegram,
  loginWithTelegram,
  logout,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  decodeSession,
};
