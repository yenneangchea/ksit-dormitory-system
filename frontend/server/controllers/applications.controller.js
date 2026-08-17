const supabase = require('../config/supabase');
const { archiveApprovedApplication } = require('../services/syncManager.service');

/**
 * @desc    Get all applications (Admin/Manager)
 * @route   GET /api/applications
 * @access  Private (Admin, Manager)
 */
const getAllApplications = async (req, res, next) => {
  try {
    const { status, academic_year } = req.query;

    let query = supabase
      .from('room_applications')
      .select(`
        *,
        user:users!room_applications_user_id_fkey(
          id,
          full_name_khmer,
          full_name_latin,
          email,
          phone,
          gender
        ),
        academic_profile:academic_profiles!academic_profiles_user_id_fkey(
          student_id_card,
          major,
          academic_year,
          class_section
        )
      `)
      .order('applied_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (academic_year) {
      query = query.eq('academic_year_applied', academic_year);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      const err = new Error('Failed to fetch applications');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single application by ID
 * @route   GET /api/applications/:id
 * @access  Private
 */
const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('room_applications')
      .select(`
        *,
        user:users!room_applications_user_id_fkey(*),
        academic_profile:academic_profiles!academic_profiles_user_id_fkey(*),
        reviewer:users!room_applications_reviewed_by_fkey(
          id,
          full_name_latin,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      return next(err);
    }

    // Check authorization: students can only view their own
    if (req.user.role === 'student' && data.user_id !== req.user.id) {
      const err = new Error('Not authorized to view this application');
      err.statusCode = 403;
      return next(err);
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's own applications
 * @route   GET /api/applications/my/list
 * @access  Private (Student)
 */
const getMyApplications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('room_applications')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      const err = new Error('Failed to fetch applications');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new application (Student)
 * @route   POST /api/applications
 * @access  Private (Student)
 */
const createApplication = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      academic_year_applied,
      photo_4x6_attached,
      contract_signed,
      parent_guarantee_attached,
      family_book_attached,
      id_card_attached,
      document_metadata_json,
      student_photo_url,
      national_id_doc_url,
      family_book_doc_url,
      signed_application_doc_url
    } = req.body;

    // Validation
    if (!academic_year_applied) {
      const err = new Error('Academic year is required');
      err.statusCode = 400;
      return next(err);
    }

    // Check if student already has an application for this academic year
    const { data: existing } = await supabase
      .from('room_applications')
      .select('id')
      .eq('user_id', userId)
      .eq('academic_year_applied', academic_year_applied)
      .single();

    if (existing) {
      const err = new Error('You already have an application for this academic year');
      err.statusCode = 400;
      return next(err);
    }

    // Create application
    const { data, error } = await supabase
      .from('room_applications')
      .insert({
        user_id: userId,
        academic_year_applied,
        status: 'submitted',
        photo_4x6_attached: photo_4x6_attached || false,
        contract_signed: contract_signed || false,
        parent_guarantee_attached: parent_guarantee_attached || false,
        family_book_attached: family_book_attached || false,
        id_card_attached: id_card_attached || false,
        document_metadata_json: document_metadata_json || {},
        student_photo_url: student_photo_url || null,
        national_id_doc_url: national_id_doc_url || null,
        family_book_doc_url: family_book_doc_url || null,
        signed_application_doc_url: signed_application_doc_url || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating application:', error);
      const err = new Error('Failed to create application');
      err.statusCode = 500;
      return next(err);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Update application (Student can update before submission, Admin/Manager can review)
 * @route   PUT /api/applications/:id
 * @access  Private
 */
const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get existing application
    const { data: existing, error: fetchError } = await supabase
      .from('room_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      return next(err);
    }

    // Authorization check
    if (userRole === 'student' && existing.user_id !== userId) {
      const err = new Error('Not authorized to update this application');
      err.statusCode = 403;
      return next(err);
    }

    // Students can only update their own draft/submitted applications
    if (userRole === 'student' && !['draft', 'submitted'].includes(existing.status)) {
      const err = new Error('Cannot update application after review has started');
      err.statusCode = 400;
      return next(err);
    }

    // Prepare update data
    const updateData = {};

    // Student updates (document attachments)
    if (userRole === 'student') {
      if (req.body.photo_4x6_attached !== undefined) updateData.photo_4x6_attached = req.body.photo_4x6_attached;
      if (req.body.contract_signed !== undefined) updateData.contract_signed = req.body.contract_signed;
      if (req.body.parent_guarantee_attached !== undefined) updateData.parent_guarantee_attached = req.body.parent_guarantee_attached;
      if (req.body.family_book_attached !== undefined) updateData.family_book_attached = req.body.family_book_attached;
      if (req.body.id_card_attached !== undefined) updateData.id_card_attached = req.body.id_card_attached;
      if (req.body.document_metadata_json !== undefined) updateData.document_metadata_json = req.body.document_metadata_json;
      if (req.body.student_photo_url !== undefined) updateData.student_photo_url = req.body.student_photo_url;
      if (req.body.national_id_doc_url !== undefined) updateData.national_id_doc_url = req.body.national_id_doc_url;
      if (req.body.family_book_doc_url !== undefined) updateData.family_book_doc_url = req.body.family_book_doc_url;
      if (req.body.signed_application_doc_url !== undefined) updateData.signed_application_doc_url = req.body.signed_application_doc_url;
    }

    // Admin/Manager updates (status changes)
    if (userRole === 'admin' || userRole === 'manager') {
      if (req.body.status) {
        updateData.status = req.body.status;
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = userId;
      }
      if (req.body.rejection_reason !== undefined) updateData.rejection_reason = req.body.rejection_reason;
    }

    // Update application
    const { data, error } = await supabase
      .from('room_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating application:', error);
      const err = new Error('Failed to update application');
      err.statusCode = 500;
      return next(err);
    }

    let sync = null;
    let message = 'Application updated successfully';

    if (userRole === 'admin' || userRole === 'manager') {
      const transitionedToApproved = req.body.status === 'approved' && existing.status !== 'approved';
      if (transitionedToApproved) {
        try {
          sync = await archiveApprovedApplication(data.id);
          data.drive_archive_url = sync.application.drive_archive_url;
          message = 'Application approved and its Google Drive archive was created.';
        } catch (syncError) {
          // Approval is retained when an external archive is temporarily unavailable.
          // The manager receives an actionable warning rather than losing the review decision.
          console.error('Application archive synchronization failed:', syncError);
          sync = {
            success: false,
            message: syncError.message,
            code: syncError.code || 'ARCHIVE_SYNC_FAILED',
          };
          message = 'Application approved, but its Google Drive archive could not be created yet.';
        }
      }
    }

    res.json({
      success: true,
      message,
      data,
      ...(sync ? { sync } : {})
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete application (Student only, before review)
 * @route   DELETE /api/applications/:id
 * @access  Private (Student)
 */
const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get existing application
    const { data: existing, error: fetchError } = await supabase
      .from('room_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      return next(err);
    }

    // Authorization check
    if (existing.user_id !== userId) {
      const err = new Error('Not authorized to delete this application');
      err.statusCode = 403;
      return next(err);
    }

    // Can only delete draft or submitted applications
    if (!['draft', 'submitted'].includes(existing.status)) {
      const err = new Error('Cannot delete application after review has started');
      err.statusCode = 400;
      return next(err);
    }

    // Delete application
    const { error } = await supabase
      .from('room_applications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting application:', error);
      const err = new Error('Failed to delete application');
      err.statusCode = 500;
      return next(err);
    }

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get application statistics
 * @route   GET /api/applications/stats/summary
 * @access  Private (Admin, Manager)
 */
const getApplicationStats = async (req, res, next) => {
  try {
    const { academic_year } = req.query;

    let query = supabase
      .from('room_applications')
      .select('status');

    if (academic_year) {
      query = query.eq('academic_year_applied', academic_year);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stats:', error);
      const err = new Error('Failed to fetch statistics');
      err.statusCode = 500;
      return next(err);
    }

    // Calculate stats
    const stats = {
      total: data.length,
      submitted: data.filter(app => app.status === 'submitted').length,
      under_review: data.filter(app => app.status === 'under_review').length,
      approved: data.filter(app => app.status === 'approved').length,
      rejected: data.filter(app => app.status === 'rejected').length,
      assigned: data.filter(app => app.status === 'assigned').length,
      draft: data.filter(app => app.status === 'draft').length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllApplications,
  getApplicationById,
  getMyApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  getApplicationStats
};
