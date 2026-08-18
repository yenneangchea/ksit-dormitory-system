const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const authController = fs.readFileSync(path.join(root, 'backend', 'controllers', 'auth.controller.js'), 'utf8');
const authRoutes = fs.readFileSync(path.join(root, 'backend', 'routes', 'auth.routes.js'), 'utf8');
const clientApi = fs.readFileSync(path.join(root, 'frontend', 'src', 'lib', 'api.ts'), 'utf8');
const loginPage = fs.readFileSync(path.join(root, 'frontend', 'src', 'app', 'login', 'page.tsx'), 'utf8');

test('authenticated Telegram linking verifies Mini App data instead of trusting a browser-provided ID', () => {
  assert.match(authController, /const linkTelegramToCurrentUser = async/);
  assert.match(authController, /verifyTelegramWebAppInitData\(\s*initData,/);
  assert.match(authController, /const accountId = req\.user\?\.sub/);
  assert.doesNotMatch(authController, /req\.body\?\.telegram_id/);
});

test('authenticated Telegram linking blocks reassignment and cross-account collisions', () => {
  assert.match(authController, /already linked to a different Telegram account/);
  assert.match(authController, /already linked to a different KSIT dormitory profile/);
  assert.match(authController, /\.eq\('telegram_id', telegramId\)/);
});

test('link route remains protected and Mini App session restoration requests it only with an existing bearer session', () => {
  assert.match(authRoutes, /router\.post\('\/telegram\/link', authenticate, authController\.linkTelegramToCurrentUser\)/);
  assert.match(clientApi, /linkTelegram: \(initData: string\)\s*=>\s*fetchAPI<never>\('\/api\/auth\/telegram\/link'/);
  assert.match(loginPage, /const linkResponse = await authAPI\.linkTelegram\(telegramInitData\)/);
  assert.match(loginPage, /const response = await authAPI\.getCurrentUser\(\)/);
});
