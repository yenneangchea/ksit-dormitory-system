const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('application lifecycle query remains compatible when optional Drive URL columns are not migrated', () => {
  const controller = readFileSync(path.resolve(__dirname, '../controllers/application-lifecycle.controller.js'), 'utf8');
  const fieldBlock = controller.match(/const APPLICATION_FIELDS = `([\s\S]*?)`;/)?.[1] || '';

  for (const optionalColumn of [
    'google_drive_folder_id',
    'prefilled_pdf_drive_url',
    'student_photo_drive_url',
    'national_id_drive_url',
    'family_book_drive_url',
    'signed_application_drive_url',
    'drive_archive_url',
  ]) {
    assert.doesNotMatch(fieldBlock, new RegExp(`\\b${optionalColumn}\\b`));
  }
});
