const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const allowedDocumentTypes = new Set(['photo_4x6', 'contract', 'parent_guarantee', 'family_book', 'id_card', 'receipt']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error('Only PDF, JPG, and PNG files are supported.');
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

const sanitizeFileName = (name) => String(name || 'document')
  .normalize('NFKC')
  .replace(/[^\p{L}\p{N}._-]/gu, '_')
  .replace(/_+/g, '_');

router.post('/application-document', protect, authorize('student'), upload.single('file'), async (req, res, next) => {
  try {
    const documentType = req.body.documentType;
    if (!allowedDocumentTypes.has(documentType) || documentType === 'receipt') {
      const error = new Error('A valid application document type is required.');
      error.statusCode = 400;
      return next(error);
    }
    if (!req.file) {
      const error = new Error('A document file is required.');
      error.statusCode = 400;
      return next(error);
    }

    const bucket = documentType === 'photo_4x6' ? 'student-avatars' : 'student-documents';
    const safeName = sanitizeFileName(req.file.originalname);
    const objectPath = `${req.user.id}/applications/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      const error = new Error(`Could not upload the document: ${uploadError.message}`);
      error.statusCode = 502;
      return next(error);
    }

    const document = {
      bucket,
      path: objectPath,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    if (bucket === 'student-avatars') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      document.publicUrl = data.publicUrl;
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded to Supabase Storage.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/document', protect, async (req, res, next) => {
  try {
    const { bucket, path } = req.query;
    if (!['student-documents', 'student-avatars', 'receipts'].includes(bucket) || typeof path !== 'string' || !path) {
      const error = new Error('A valid bucket and document path are required.');
      error.statusCode = 400;
      return next(error);
    }

    const ownerId = path.split('/')[0];
    const canReadAll = ['admin', 'manager'].includes(req.user.role);
    if (!canReadAll && ownerId !== req.user.id) {
      const error = new Error('You are not authorized to view this document.');
      error.statusCode = 403;
      return next(error);
    }

    if (bucket === 'student-avatars') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return res.json({ success: true, data: { url: data.publicUrl, expiresIn: null } });
    }

    const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (signError) {
      const error = new Error(`Could not create a document preview link: ${signError.message}`);
      error.statusCode = 502;
      return next(error);
    }

    res.json({ success: true, data: { url: data.signedUrl, expiresIn: 300 } });
  } catch (error) {
    next(error);
  }
});

// Multer errors bypass the generic Express JSON error behavior unless normalized here.
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: { message: 'Files must be 5 MB or smaller.' } });
  }
  next(error);
});

module.exports = router;
