const path = require('path');
const { Readable } = require('stream');
const { google } = require('googleapis');

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const FILE_NAMES = {
  student_photo: 'photo_4x6',
  national_id: 'national_id',
  family_book: 'family_book',
  prefilled_pdf: 'prefilled_application_form',
  signed_application: 'signed_thumbprinted_application',
};

let driveClient;

function safeFolderSegment(value, fallback) {
  const normalized = String(value || fallback).normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.slice(0, 120) || fallback;
}

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const rootFolderId = String(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim();
  if (!raw && !rootFolderId) return null;
  if (!raw || !rootFolderId) throw new Error('Google Drive storage requires both GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_SERVICE_ACCOUNT_KEY) and GOOGLE_DRIVE_ROOT_FOLDER_ID.');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) throw new Error('missing client_email or private_key');
    return { credentials: parsed, rootFolderId };
  } catch (error) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON must be valid service-account JSON: ${error.message}`);
  }
}

function getDrive() {
  const configuration = parseServiceAccount();
  if (!configuration) return null;
  if (!driveClient) {
    const auth = new google.auth.GoogleAuth({ credentials: configuration.credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    driveClient = google.drive({ version: 'v3', auth });
  }
  return { drive: driveClient, rootFolderId: configuration.rootFolderId };
}

function isDriveConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
}

function isDriveReference(value) {
  return typeof value === 'string' && value.startsWith('drive:');
}

function driveFileId(value) {
  if (!isDriveReference(value)) return null;
  return value.slice('drive:'.length) || null;
}

async function findOrCreateFolder(drive, name, parentId) {
  const escapedName = name.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `name = '${escapedName}' and mimeType = '${DRIVE_FOLDER_MIME}' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (data.files?.[0]?.id) return data.files[0].id;
  const created = await drive.files.create({
    requestBody: { name, mimeType: DRIVE_FOLDER_MIME, parents: [parentId] },
    fields: 'id',
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error(`Unable to create Google Drive folder: ${name}`);
  return created.data.id;
}

async function createOrGetStudentFolder({ academicYear, studentId, studentName }) {
  const configuration = getDrive();
  if (!configuration) return null;
  const yearFolder = await findOrCreateFolder(configuration.drive, safeFolderSegment(academicYear, '2025-2026'), configuration.rootFolderId);
  return findOrCreateFolder(configuration.drive, `${safeFolderSegment(studentId, 'student')}_${safeFolderSegment(studentName, 'student')}`, yearFolder);
}

function extensionFor(fileName, contentType) {
  const extension = path.extname(fileName || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (extension) return extension;
  if (contentType === 'application/pdf') return '.pdf';
  if (contentType === 'image/png') return '.png';
  return '.jpg';
}

async function uploadApplicationFile({ application, student, type, fileName, contentType, buffer }) {
  const configuration = getDrive();
  if (!configuration) return null;
  const profile = Array.isArray(student?.academic_profiles) ? student.academic_profiles[0] : student?.academic_profiles;
  const folderId = await createOrGetStudentFolder({
    academicYear: application.academic_year_applied,
    studentId: profile?.student_id_card || application.user_id,
    studentName: student?.full_name_khmer || student?.full_name_latin || 'student',
  });
  const name = `${FILE_NAMES[type] || 'document'}${extensionFor(fileName, contentType)}`;
  const response = await configuration.drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: contentType, body: Readable.from(buffer) },
    fields: 'id,name,mimeType,size,webViewLink,webContentLink',
    supportsAllDrives: true,
  });
  if (!response.data.id) throw new Error(`Unable to upload ${type} to Google Drive.`);
  return {
    provider: 'google_drive',
    reference: `drive:${response.data.id}`,
    folderId,
    fileId: response.data.id,
    webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
    name: response.data.name || name,
    contentType: response.data.mimeType || contentType,
    size: Number(response.data.size || buffer.length),
  };
}

async function getDriveFileStream(reference) {
  const configuration = getDrive();
  const fileId = driveFileId(reference);
  if (!configuration || !fileId) throw new Error('Google Drive file storage is not configured for this document.');
  const response = await configuration.drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' });
  return { stream: response.data, contentType: response.headers['content-type'] || 'application/octet-stream' };
}

module.exports = {
  createOrGetStudentFolder,
  uploadApplicationFile,
  getDriveFileStream,
  isDriveConfigured,
  isDriveReference,
  __private: { parseServiceAccount, safeFolderSegment },
};
