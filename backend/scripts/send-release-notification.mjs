import telegramService from '../services/telegram.service.js';

const sha = String(process.env.GITHUB_SHA || '').slice(0, 7) || 'local';
const repository = String(process.env.GITHUB_REPOSITORY || 'yenneangchea/ksit-dormitory-system');
const serverUrl = String(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/+$/, '');
const commitUrl = `${serverUrl}/${repository}/commit/${process.env.GITHUB_SHA || 'main'}`;
const title = process.env.KSIT_RELEASE_TITLE || `Production release ${sha}`;
const description = process.env.KSIT_RELEASE_DESCRIPTION || `The KSIT Dormitory Management System main branch was updated (${sha}).`;

const result = await telegramService.updateNotification({ title, description, releaseUrl: commitUrl });
if (result.delivered) {
  console.info(`Telegram release notification delivered to topic thread ${result.threadId}.`);
} else {
  console.warn(`Telegram release notification skipped: ${result.reason || 'notification_not_configured'}.`);
}
