const supabase = require('../config/supabase');

/**
 * @desc    Login user with email/telegram_id and password
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    // Validation
    if (!identifier || !password) {
      const error = new Error('Please provide identifier (email/telegram_id) and password');
      error.statusCode = 400;
      return next(error);
    }

    // Query user by email or telegram_id
    let query = supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at');

    // Check if identifier is email or telegram_id
    if (identifier.includes('@')) {
      query = query.eq('email', identifier);
    } else {
      query = query.eq('telegram_id', identifier);
    }

    // Filter by role if provided
    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error: queryError } = await query;

    if (queryError) {
      console.error('Database query error:', queryError);
      const error = new Error('Database error occurred');
      error.statusCode = 500;
      return next(error);
    }

    // Check if user exists
    if (!users || users.length === 0) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      return next(error);
    }

    const user = users[0];

    // TODO: In production, verify password_hash with bcrypt
    // For now, this is a mock authentication
    // const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    // Mock password validation (accept any password for development)
    // In production, you would check against password_hash from database
    console.log(`Login attempt for user: ${user.email} (Role: ${user.role})`);

    // Return user data (excluding sensitive information)
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        role: user.role,
        full_name_khmer: user.full_name_khmer,
        full_name_latin: user.full_name_latin,
        gender: user.gender,
        phone: user.phone,
        email: user.email,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    // TODO: Implement session/JWT invalidation
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // TODO: Implement JWT verification and return current user
    res.json({
      success: true,
      message: 'Get current user endpoint (not yet implemented)',
      user: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser
};
