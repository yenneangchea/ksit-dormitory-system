const assert = require('node:assert/strict');
const test = require('node:test');

const storage = require('../lib/application-storage');

function restoreEnvironment(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test('Google Drive adapter requires both server-side credentials and a root folder, while accepting a complete service account configuration', () => {
  const keys = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_DRIVE_ROOT_FOLDER_ID'];
  const snapshot = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    assert.equal(storage.__private.parseServiceAccount(), null);

    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = 'root-folder-id';
    assert.throws(() => storage.__private.parseServiceAccount(), /requires both/);

    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'storage@ksit.example', private_key: 'not-a-real-key' });
    assert.deepEqual(storage.__private.parseServiceAccount(), {
      credentials: { client_email: 'storage@ksit.example', private_key: 'not-a-real-key' },
      rootFolderId: 'root-folder-id',
    });
  } finally {
    restoreEnvironment(snapshot);
  }
});

test('Google Drive folder segments preserve Khmer names while removing unsafe path characters', () => {
  assert.equal(storage.__private.safeFolderSegment('សិស្ស/Student: 01', 'student'), 'សិស្ស Student 01');
  assert.equal(storage.__private.safeFolderSegment('', 'student'), 'student');
});

test('mocked Google Drive submission stores every lifecycle artifact in one deterministic student folder', async () => {
  const keys = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_DRIVE_ROOT_FOLDER_ID'];
  const snapshot = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const folders = new Map();
  const uploads = [];
  let sequence = 0;
  const fakeDrive = {
    files: {
      async list({ q }) {
        const name = q.match(/name = '([^']+)'/)?.[1];
        const parent = q.match(/'([^']+)' in parents/)?.[1];
        const id = folders.get(`${parent}:${name}`);
        return { data: { files: id ? [{ id, name }] : [] } };
      },
      async create({ requestBody, media }) {
        if (requestBody.mimeType === 'application/vnd.google-apps.folder') {
          const parent = requestBody.parents[0];
          const id = `folder-${++sequence}`;
          folders.set(`${parent}:${requestBody.name}`, id);
          return { data: { id } };
        }
        const chunks = [];
        for await (const chunk of media.body) chunks.push(Buffer.from(chunk));
        const id = `file-${++sequence}`;
        uploads.push({ id, name: requestBody.name, parent: requestBody.parents[0], contentType: media.mimeType, content: Buffer.concat(chunks).toString('utf8') });
        return { data: { id, name: requestBody.name, mimeType: media.mimeType, size: String(Buffer.byteLength(uploads.at(-1).content)), webViewLink: `https://drive.example.test/file/${id}` } };
      },
    },
  };

  try {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'storage@ksit.example', private_key: 'not-a-real-key' });
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = 'root-folder';
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    storage.__private.setDriveClientForTest(fakeDrive);
    const application = { id: 'application-1', user_id: 'user-1', academic_year_applied: '2026-2027' };
    const student = { full_name_khmer: 'សិស្ស សាកល្បង', academic_profiles: { student_id_card: 'KSIT-TEST-001' } };
    const cases = [
      ['student_photo', 'image.jpg', 'image/jpeg', 'photo-bytes', 'photo_4x6.jpg'],
      ['national_id', 'identity.pdf', 'application/pdf', 'id-bytes', 'national_id.pdf'],
      ['family_book', 'family.png', 'image/png', 'family-bytes', 'family_book.png'],
      ['prefilled_pdf', 'official.pdf', 'application/pdf', 'pdf-bytes', 'prefilled_application_form.pdf'],
      ['signed_application', 'signed.pdf', 'application/pdf', 'signed-bytes', 'signed_thumbprinted_application.pdf'],
    ];
    const results = [];
    for (const [type, fileName, contentType, content] of cases) {
      results.push(await storage.uploadApplicationFile({ application, student, type, fileName, contentType, buffer: Buffer.from(content) }));
    }
    assert.equal(folders.get('root-folder:2026-2027'), 'folder-1');
    assert.equal(folders.get('folder-1:KSIT-TEST-001_សិស្ស សាកល្បង'), 'folder-2');
    assert.equal(uploads.length, 5);
    assert.deepEqual(uploads.map((upload) => upload.name), cases.map((item) => item[4]));
    assert.deepEqual(uploads.map((upload) => upload.content), cases.map((item) => item[3]));
    assert.ok(results.every((result) => result.provider === 'google_drive' && result.folderId === 'folder-2' && result.reference.startsWith('drive:file-')));
  } finally {
    storage.__private.setDriveClientForTest(undefined);
    restoreEnvironment(snapshot);
  }
});
