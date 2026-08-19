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

test('uses only the approved Application-topic fallback when Vercel group variables are absent', async () => {
  const originalEnvironment = saveEnvironment();
  const originalFetch = global.fetch;
  let request;
  process.env.TELEGRAM_BOT_TOKEN = 'unit-test-token';
  delete process.env.TELEGRAM_GROUP_CHAT_ID;
  delete process.env.TELEGRAM_TOPIC_APPLICATION_THREAD_ID;
  global.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 101 } }) };
  };

  try {
    const result = await telegram.applicationNotification({
      event: 'form_submission',
      student: { full_name_latin: 'Fallback E2E Student' },
      profile: { major: 'Computer Technology', academic_year: 1 },
      documentSummary: 'Synthetic documents',
    });
    assert.equal(result.delivered, true);
    assert.equal(request.chat_id, '-1004316855963');
    assert.equal(request.message_thread_id, 3);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(originalEnvironment);
  }
});

test('attaches the generated official application PDF to the Application topic', async () => {
  const originalEnvironment = saveEnvironment();
  const originalFetch = global.fetch;
  let endpoint;
  let form;
  process.env.TELEGRAM_BOT_TOKEN = 'unit-test-token';
  process.env.TELEGRAM_GROUP_CHAT_ID = '-1004316855963';
  process.env.TELEGRAM_TOPIC_APPLICATION_THREAD_ID = '3';
  global.fetch = async (url, options) => {
    endpoint = url;
    form = options.body;
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 102 } }) };
  };

  try {
    const result = await telegram.applicationPdfAttachment({
      student: { full_name_khmer: 'និស្សិត សាកល្បង', full_name_latin: 'PDF E2E Student' },
      profile: { major: 'Computer Technology', academic_year: 1 },
      pdfBuffer: Buffer.from('%PDF-1.4 synthetic official application'),
      fileName: 'PDF_E2E_Student_KSIT_Dorm_Application.pdf',
    });
    assert.equal(result.delivered, true);
    assert.equal(result.document, true);
    assert.match(endpoint, /sendDocument$/);
    assert.equal(form.get('chat_id'), '-1004316855963');
    assert.equal(form.get('message_thread_id'), '3');
    assert.match(form.get('caption'), /PDF ពាក្យសុំស្នាក់នៅ/);
    assert.equal(form.get('document').name, 'PDF_E2E_Student_KSIT_Dorm_Application.pdf');
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(originalEnvironment);
  }
});
