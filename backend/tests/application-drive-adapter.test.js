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
