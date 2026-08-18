const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const portalShell = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'portal-shell.tsx'), 'utf8');

test('portal shell exposes an explicit Mini App-only authenticated Telegram linking action', () => {
  assert.match(portalShell, /const \[telegramInitData, setTelegramInitData\] = useState\(''\)/);
  assert.match(portalShell, /window\.Telegram\?\.WebApp\?\.initData/);
  assert.match(portalShell, /telegramInitData && user && !user\.telegram_id/);
  assert.match(portalShell, /Link Telegram \(ភ្ជាប់ Telegram\)/);
});

test('portal shell invokes the protected client API and persists the refreshed user after a successful link', () => {
  assert.match(portalShell, /const response = await authAPI\.linkTelegram\(initData\)/);
  assert.match(portalShell, /const refreshedUser = response\.user \|\| \(await authAPI\.getCurrentUser\(\)\)\.user/);
  assert.match(portalShell, /window\.localStorage\.setItem\('user', JSON\.stringify\(refreshedUser\)\)/);
  assert.match(portalShell, /Telegram linked successfully!/);
});
