const test = require('node:test');
const assert = require('node:assert/strict');
const authController = require('../controllers/auth.controller');

test('telegram /start sends welcome buttons to the production login route', async () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalMiniAppUrl = process.env.TELEGRAM_MINI_APP_URL;
  let requestUrl = '';
  let requestOptions;
  let responsePayload;

  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.TELEGRAM_MINI_APP_URL = 'https://ksit-dorm.vercel.app/login?mode=telegram';
  global.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return { ok: true, json: async () => ({ ok: true }) };
  };

  try {
    await authController.telegramWebhook(
      { body: { message: { chat: { id: 42 }, text: '/start' } } },
      {
        status() { return this; },
        json(payload) { responsePayload = payload; return this; },
      },
      (error) => { throw error; },
    );
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    if (originalMiniAppUrl === undefined) delete process.env.TELEGRAM_MINI_APP_URL;
    else process.env.TELEGRAM_MINI_APP_URL = originalMiniAppUrl;
  }

  assert.equal(requestUrl, 'https://api.telegram.org/bottest-token/sendMessage');
  assert.equal(responsePayload.ok, true);
  const requestBody = JSON.parse(requestOptions.body);
  const buttons = requestBody.reply_markup.inline_keyboard[0];
  assert.equal(buttons[0].web_app.url, 'https://ksit-dorm.vercel.app/login?mode=register');
  assert.equal(buttons[1].web_app.url, 'https://ksit-dorm.vercel.app/login?mode=telegram');
  assert.equal(requestBody.chat_id, 42);
});
