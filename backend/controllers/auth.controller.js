const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabase } = require('../config/supabase');

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

/**
 * @desc Sign in with a registered email address or Telegram ID.
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      const error = new Error('Please provide an email or Telegram ID and a password.');
      error.statusCode = 400;
      throw error;
    }

    const supabase = getSupabase();
    let query = supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, password_hash, avatar_url, created_at, updated_at')
      .limit(1);

    query = identifier.includes('@')
      ? query.eq('email', identifier.trim().toLowerCase())
      : query.eq('telegram_id', identifier.trim());

    if (role) {
      query = query.eq('role', role);
    }

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

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
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
      token: createSessionToken(user),
    });
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

module.exports = {
  login,
  logout,
  getCurrentUser,
  decodeSession,
};
