const { google } = require('googleapis');
const { Readable } = require('stream');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

const createConfigurationError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
  return error;
};

const getDriveClient = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n');
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!keyFile && (!clientEmail || !privateKey)) {
    throw createConfigurationError(
      'Google Drive is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    ...(keyFile ? { keyFile } : { credentials: { client_email: clientEmail, private_key: privateKey } }),
    scopes: [DRIVE_SCOPE],
  });

  return google.drive({ version: 'v3', auth });
};

const assertFolderId = (folderId) => {
  if (!folderId) {
    throw createConfigurationError('A destination Google Drive folder ID is required for this operation.');
  }
};

const escapeDriveQueryValue = (value) => String(value).replace(/'/g, "\\'");

/**
 * Upload an in-memory file and return the Drive metadata required by the UI.
 */
const uploadFileToDrive = async ({ fileName, mimeType, fileBuffer, folderId }) => {
  assertFolderId(folderId);
  if (!fileName || !mimeType || !fileBuffer) {
    const error = new Error('fileName, mimeType, and fileBuffer are required to upload to Google Drive.');
    error.statusCode = 400;
    throw error;
  }

  const drive = getDriveClient();
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id,name,mimeType,webViewLink,webContentLink',
    supportsAllDrives: true,
  });

  return response.data;
};

/**
 * Find a folder below parentFolderId, creating it only when it does not exist.
 */
const createFolderIfNotExist = async (folderName, parentFolderId) => {
  assertFolderId(parentFolderId);
  if (!folderName?.trim()) {
    const error = new Error('folderName is required to create or find a Google Drive folder.');
    error.statusCode = 400;
    throw error;
  }

  const drive = getDriveClient();
  const escapedName = escapeDriveQueryValue(folderName.trim());
  const escapedParent = escapeDriveQueryValue(parentFolderId);
  const { data } = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and '${escapedParent}' in parents and trashed = false`,
    fields: 'files(id,name,webViewLink)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (data.files?.length) return data.files[0];

  const created = await drive.files.create({
    requestBody: {
      name: folderName.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });

  return created.data;
};

module.exports = {
  getDriveClient,
  uploadFileToDrive,
  createFolderIfNotExist,
};
