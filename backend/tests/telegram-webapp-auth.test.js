const assert = require('node:assert/strict');
const crypto = require('crypto');
const test = require('node:test');
const { createCheckString, verifyTelegramWebAppInitData } = require('../lib/telegram-webapp-auth');

function signedInitData(values, token) {
  const parameters = new URLSearchParams(values);
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  parameters.set('hash', crypto.createHmac('sha256', secret).update(createCheckString(parameters)).digest('hex'));
  return parameters.toString();
}

test('verifies signed Telegram WebApp init data and returns the Telegram ID', () => {
  const token = 'test-bot-token';
  const initData = signedInitData({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'query-1', user: JSON.stringify({ id: 42, first_name: 'KSIT' }) }, token);
  const result = verifyTelegramWebAppInitData(initData, token);
  assert.equal(result.telegramId, '42');
  assert.equal(result.user.first_name, 'KSIT');
});

test('rejects a modified Telegram WebApp init-data payload', () => {
  const token = 'test-bot-token';
  const initData = signedInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 42 }) }, token).replace('id%22%3A42', 'id%22%3A43');
  assert.throws(() => verifyTelegramWebAppInitData(initData, token), /could not be verified/);
});

test('rejects expired Telegram WebApp init data', () => {
  const token = 'test-bot-token';
  const initData = signedInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 700), user: JSON.stringify({ id: 42 }) }, token);
  assert.throws(() => verifyTelegramWebAppInitData(initData, token), /has expired/);
});
