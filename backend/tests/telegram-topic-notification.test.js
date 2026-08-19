const test = require('node:test');
const assert = require('node:assert/strict');
const telegram = require('../services/telegram.service');

const notificationKeys = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_GROUP_CHAT_ID',
  'TELEGRAM_TOPIC_APPLICATION_THREAD_ID',
  'TELEGRAM_TOPIC_PASSWORD_REQUEST_THREAD_ID',
  'TELEGRAM_TOPIC_SYSTEM_LOG_THREAD_ID',
  'TELEGRAM_TOPIC_UPDATE_THREAD_ID',
  'TELEGRAM_TOPIC_PAYMENT_BILLS_THREAD_ID',
  'TELEGRAM_TOPIC_MAINTENANCE_THREAD_ID',
  'TELEGRAM_TOPIC_ATTENDANCE_LEAVE_THREAD_ID',
];

function saveEnvironment() {
  return Object.fromEntries(notificationKeys.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(values) {
  for (const key of notificationKeys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

test('dispatches application alerts to the configured Supergroup topic thread', async () => {
  const originalEnvironment = saveEnvironment();
  const originalFetch = global.fetch;
  let request;
  process.env.TELEGRAM_BOT_TOKEN = 'unit-test-token';
  process.env.TELEGRAM_GROUP_CHAT_ID = '-1004316855963';
  process.env.TELEGRAM_TOPIC_APPLICATION_THREAD_ID = '3';
  global.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 99 } }) };
  };

  try {
    const result = await telegram.applicationNotification({
      event: 'signed_upload',
      student: { full_name_khmer: 'ជា យិននាង', full_name_latin: 'Chea Yenneang' },
      profile: { major: 'Information Technology', academic_year: 2 },
      documentSummary: 'ឯកសារចុះហត្ថលេខា និង PDF',
    });
    assert.equal(result.delivered, true);
    assert.equal(result.threadId, 3);
    assert.equal(request.chat_id, '-1004316855963');
    assert.equal(request.message_thread_id, 3);
    assert.match(request.text, /Chea Yenneang/);
    assert.match(request.text, /dashboard\/manager\?tab=applications/);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(originalEnvironment);
  }
});

test('does not send alerts to the General topic when a topic thread is missing', async () => {
  const originalEnvironment = saveEnvironment();
  const originalFetch = global.fetch;
  let fetchCalled = false;
  process.env.TELEGRAM_BOT_TOKEN = 'unit-test-token';
  process.env.TELEGRAM_GROUP_CHAT_ID = '-1004316855963';
  delete process.env.TELEGRAM_TOPIC_MAINTENANCE_THREAD_ID;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('Unexpected network call');
  };

  try {
    const result = await telegram.maintenanceNotification({ ticket: { title: 'Broken fan' } });
    assert.equal(result.delivered, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'notification_not_configured');
    assert.equal(fetchCalled, false);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(originalEnvironment);
  }
});

test('labels Manager approval events as Application-topic decisions', async () => {
  const originalEnvironment = saveEnvironment();
  const originalFetch = global.fetch;
  let request;
  process.env.TELEGRAM_BOT_TOKEN = 'unit-test-token';
  process.env.TELEGRAM_GROUP_CHAT_ID = '-1004316855963';
  process.env.TELEGRAM_TOPIC_APPLICATION_THREAD_ID = '3';
  global.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 100 } }) };
  };

  try {
    const result = await telegram.applicationNotification({
      event: 'manager_approve',
      student: { full_name_latin: 'E2E Student' },
      profile: { major: 'Computer Technology', academic_year: 1 },
      documentSummary: 'E2E documents',
    });
    assert.equal(result.delivered, true);
    assert.equal(request.message_thread_id, 3);
    assert.match(request.text, /អនុម័ត/);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(originalEnvironment);
  }
});
