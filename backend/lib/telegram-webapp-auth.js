const crypto = require('crypto');

function createCheckString(parameters) {
  return [...parameters.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

function verifyTelegramWebAppInitData(initData, botToken, maxAgeSeconds = 600) {
  if (!initData || typeof initData !== 'string') {
    throw new Error('Telegram login data is required. Open the dormitory app from Telegram and try again.');
  }
  if (!botToken) {
    throw new Error('Telegram login is not configured on this server.');
  }

  const parameters = new URLSearchParams(initData);
  const suppliedHash = parameters.get('hash');
  const authDate = Number(parameters.get('auth_date'));
  const userJson = parameters.get('user');

  if (!suppliedHash || !authDate || !userJson) {
    throw new Error('Telegram login data is incomplete.');
  }
  if (Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) {
    throw new Error('Telegram login data has expired. Please reopen the Mini App and try again.');
  }

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(createCheckString(parameters)).digest('hex');
  const expected = Buffer.from(expectedHash, 'utf8');
  const supplied = Buffer.from(suppliedHash, 'utf8');

  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    throw new Error('Telegram login data could not be verified.');
  }

  let user;
  try {
    user = JSON.parse(userJson);
  } catch {
    throw new Error('Telegram user data could not be read.');
  }
  if (!user?.id) {
    throw new Error('Telegram login data does not include a user identifier.');
  }

  return { telegramId: String(user.id), user };
}

module.exports = { createCheckString, verifyTelegramWebAppInitData };
