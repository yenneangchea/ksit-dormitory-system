const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;

    let query = supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    // Filter by role if provided
    if (role) {
      query = query.eq('role', role);
    }

    // Search by name or email
    if (search) {
      query = query.or(`full_name_latin.ilike.%${search}%,full_name_khmer.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Database error:', error);
      const err = new Error('Failed to fetch users');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin, Manager, or own profile)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user is requesting their own profile or is admin/manager
    if (req.user.id !== id && !['admin', 'manager'].includes(req.user.role)) {
      const error = new Error('Not authorized to view this user');
      error.statusCode = 403;
      return next(error);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    next(error);
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const {
      telegram_id,
      role,
      full_name_khmer,
      full_name_latin,
      gender,
      phone,
      email,
      password
    } = req.body;

    // Validation
    if (!role || !full_name_khmer || !full_name_latin || !gender || !phone || !email || !password) {
      const error = new Error('Please provide all required fields');
      error.statusCode = 400;
      return next(error);
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const error = new Error('Email already exists');
      error.statusCode = 400;
      return next(error);
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        telegram_id,
        role,
        full_name_khmer,
        full_name_latin,
        gender,
        phone,
        email,
        password_hash
      }])
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at')
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      const error = new Error('Failed to create user');
      error.statusCode = 500;
      return next(error);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin, or own profile for non-sensitive fields)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      telegram_id,
      role,
      full_name_khmer,
      full_name_latin,
      gender,
      phone,
      email,
      password
    } = req.body;

    // Check permissions
    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      const error = new Error('Not authorized to update this user');
      error.statusCode = 403;
      return next(error);
    }

    // Only admin can change role
    if (role && !isAdmin) {
      const error = new Error('Only admin can change user role');
      error.statusCode = 403;
      return next(error);
    }

    // Build update object
    const updateData = {};
    if (telegram_id !== undefined) updateData.telegram_id = telegram_id;
    if (role !== undefined && isAdmin) updateData.role = role;
    if (full_name_khmer) updateData.full_name_khmer = full_name_khmer;
    if (full_name_latin) updateData.full_name_latin = full_name_latin;
    if (gender) updateData.gender = gender;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (password) {
      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(password, saltRounds);
    }

    updateData.updated_at = new Date().toISOString();

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, avatar_url, created_at, updated_at')
      .single();

    if (error) {
      console.error('Database error:', error);
      const err = new Error('Failed to update user');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      const error = new Error('Cannot delete your own account');
      error.statusCode = 400;
      return next(error);
    }

    // Delete user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      const error = new Error('Failed to delete user');
      error.statusCode = 500;
      return next(error);
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    next(error);
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Private (Admin, Manager)
 */
const getUserStats = async (req, res, next) => {
  try {
    // Get total users count by role
    const { data: users, error } = await supabase
      .from('users')
      .select('role');

    if (error) {
      console.error('Database error:', error);
      const err = new Error('Failed to fetch user statistics');
      err.statusCode = 500;
      return next(err);
    }

    const stats = {
      total: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      manager: users.filter(u => u.role === 'manager').length,
      teacher: users.filter(u => u.role === 'teacher').length,
      student: users.filter(u => u.role === 'student').length,
      students: users.filter(u => u.role === 'student').length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    next(error);
  }
};

/**
 * @desc    Get current user's academic profile
 * @route   GET /api/users/me/academic-profile
 * @access  Private (Student, or anyone logged in)
 */
const getMyAcademicProfile = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('academic_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching academic profile:', error);
      const err = new Error('Failed to fetch academic profile');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      data: data || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update current user's academic profile
 * @route   PUT /api/users/me/academic-profile
 * @access  Private (Student, or anyone logged in)
 */
const updateMyAcademicProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      student_id_card,
      major,
      academic_year,
      class_section,
      father_name,
      father_phone,
      mother_name,
      mother_phone,
      emergency_contact_name,
      emergency_contact_phone,
      address_details
    } = req.body;

    // Check if existing profile exists
    const { data: existing, error: fetchError } = await supabase
      .from('academic_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('academic_profiles')
        .update({
          student_id_card,
          major,
          academic_year: Number(academic_year),
          class_section,
          father_name,
          father_phone,
          mother_name,
          mother_phone,
          emergency_contact_name,
          emergency_contact_phone,
          address_details,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating academic profile:', error);
        const err = new Error(error.message || 'Failed to update academic profile');
        err.statusCode = 500;
        return next(err);
      }
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('academic_profiles')
        .insert({
          user_id: userId,
          student_id_card,
          major,
          academic_year: Number(academic_year),
          class_section,
          father_name,
          father_phone,
          mother_name,
          mother_phone,
          emergency_contact_name,
          emergency_contact_phone,
          address_details
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting academic profile:', error);
        const err = new Error(error.message || 'Failed to create academic profile');
        err.statusCode = 505;
        return next(err);
      }
      result = data;
    }

    res.json({
      success: true,
      message: 'Academic profile saved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  getMyAcademicProfile,
  updateMyAcademicProfile,
};
