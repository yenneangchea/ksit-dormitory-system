const TOPIC_ENVIRONMENT_KEYS = Object.freeze({
  application: 'TELEGRAM_TOPIC_APPLICATION_THREAD_ID',
  passwordRequest: 'TELEGRAM_TOPIC_PASSWORD_REQUEST_THREAD_ID',
  systemLog: 'TELEGRAM_TOPIC_SYSTEM_LOG_THREAD_ID',
  update: 'TELEGRAM_TOPIC_UPDATE_THREAD_ID',
  paymentBills: 'TELEGRAM_TOPIC_PAYMENT_BILLS_THREAD_ID',
  maintenance: 'TELEGRAM_TOPIC_MAINTENANCE_THREAD_ID',
  attendanceLeave: 'TELEGRAM_TOPIC_ATTENDANCE_LEAVE_THREAD_ID',
});

const TOPICS = Object.freeze({
  APPLICATION: 'application',
  PASSWORD_REQUEST: 'passwordRequest',
  SYSTEM_LOG: 'systemLog',
  UPDATE: 'update',
  PAYMENT_BILLS: 'paymentBills',
  MAINTENANCE: 'maintenance',
  ATTENDANCE_LEAVE: 'attendanceLeave',
});

function cleanText(value, maxLength = 600) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function configuredThreadId(topic) {
  const value = String(process.env[TOPIC_ENVIRONMENT_KEYS[topic]] || '').trim();
  if (!/^\d+$/.test(value) || Number(value) < 1) return null;
  return Number(value);
}

function configuredChatId() {
  const value = String(process.env.TELEGRAM_GROUP_CHAT_ID || '').trim();
  return /^-?\d+$/.test(value) ? value : null;
}

function appUrl(pathname) {
  const origin = String(process.env.KSIT_PUBLIC_APP_URL || 'https://ksit-dorm.vercel.app').replace(/\/+$/, '');
  return `${origin}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function displayName(user) {
  const khmer = cleanText(user?.full_name_khmer, 120);
  const latin = cleanText(user?.full_name_latin, 120);
  return [khmer, latin].filter(Boolean).join(' / ') || 'មិនស្គាល់គណនី';
}

function timestamp() {
  return new Date().toISOString();
}

async function sendTopicMessage(topic, text, options = {}) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = configuredChatId();
  const threadId = configuredThreadId(topic);
  const envKey = TOPIC_ENVIRONMENT_KEYS[topic];

  if (!TOPIC_ENVIRONMENT_KEYS[topic]) {
    return { delivered: false, skipped: true, reason: 'unknown_topic' };
  }
  if (!token || !chatId || !threadId) {
    return { delivered: false, skipped: true, reason: 'notification_not_configured', missing: { token: !token, chatId: !chatId, threadId: !threadId ? envKey : null } };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_thread_id: threadId,
      text: cleanText(text, 4000),
      disable_web_page_preview: true,
      ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    const error = new Error('Telegram topic notification delivery failed.');
    error.statusCode = 502;
    error.code = 'TELEGRAM_TOPIC_DELIVERY_FAILED';
    throw error;
  }
  return { delivered: true, topic, chatId, threadId, messageId: body.result?.message_id || null };
}

async function notify(topic, text, context = {}) {
  try {
    return await sendTopicMessage(topic, text, context);
  } catch (error) {
    console.error('Telegram topic notification failed.', { topic, code: error.code || 'TELEGRAM_NOTIFICATION_FAILED', message: error.message });
    return { delivered: false, skipped: false, reason: error.code || 'TELEGRAM_NOTIFICATION_FAILED' };
  }
}

function applicationNotification({ student, profile, documentSummary, event }) {
  const major = cleanText(profile?.major, 160) || 'មិនបានបញ្ជាក់ជំនាញ';
  const year = Number(profile?.academic_year) || 'មិនបានបញ្ជាក់';
  return notify(TOPICS.APPLICATION, [
    event === 'signed_upload' ? '📝 ឯកសារចុះហត្ថលេខាត្រូវបានដាក់ស្នើ!' : '📝 ពាក្យសុំស្នាក់នៅថ្មី!',
    `👤 និស្សិត: ${displayName(student)}`,
    `🎓 ជំនាញ: ${major} - ឆ្នាំទី ${year}`,
    `📄 ឯកសារភ្ជាប់: ${cleanText(documentSummary, 400) || 'កំពុងរៀបចំឯកសារ'}`,
    `🔗 ពិនិត្យពាក្យសុំ: ${appUrl('/dashboard/manager?tab=applications')}`,
  ].join('\n'));
}

function passwordRequestNotification({ event, user, phone }) {
  return notify(TOPICS.PASSWORD_REQUEST, [
    '⚡ សំណើសុំលេខសម្ងាត់ថ្មី',
    `📌 សកម្មភាព: ${cleanText(event, 180)}`,
    `📱 លេខទូរស័ព្ទ: ${cleanText(phone || user?.phone, 40) || 'មិនបានបញ្ជាក់'}`,
    `👤 គណនី: ${displayName(user)}${user?.role ? ` / ${cleanText(user.role, 32)}` : ''}`,
    `⏰ ពេលវេលា: ${timestamp()}`,
  ].join('\n'));
}

function systemLogNotification({ level = 'INFO', description }) {
  return notify(TOPICS.SYSTEM_LOG, [
    '🖥️ [SYSTEM LOG]',
    `⚠️ កម្រិត: ${cleanText(level, 16).toUpperCase()}`,
    `📝 ព័ត៌មាន: ${cleanText(description, 1200)}`,
    `⏰ ពេលវេលា: ${timestamp()}`,
  ].join('\n'));
}

function updateNotification({ title, description, releaseUrl }) {
  return notify(TOPICS.UPDATE, [
    '🚀 [KSIT DORM UPDATE]',
    `📌 ${cleanText(title, 240)}`,
    `📝 ${cleanText(description, 1400)}`,
    `🔗 ${cleanText(releaseUrl, 500) || appUrl('/changelog')}`,
    `⏰ ពេលវេលា: ${timestamp()}`,
  ].join('\n'));
}

function paymentNotification({ bill, student, room }) {
  return notify(TOPICS.PAYMENT_BILLS, [
    '💳 ការទូទាត់វិក្កយបត្រត្រូវបានកត់ត្រា',
    `👤 និស្សិត: ${displayName(student)}`,
    `🏠 បន្ទប់: ${cleanText(room, 100) || 'មិនបានបញ្ជាក់'}`,
    `💰 ចំនួនទឹកប្រាក់: ${Number(bill?.amount_khr || 0).toLocaleString('en-US')} ៛`,
    `📅 ខែវិក្កយបត្រ: ${cleanText(bill?.billing_month, 40) || 'មិនបានបញ្ជាក់'}`,
    `🔖 លេខប្រតិបត្តិការ: ${cleanText(bill?.transaction_ref, 120) || 'មិនបានបញ្ជាក់'}`,
  ].join('\n'));
}

function maintenanceNotification({ ticket, room, student }) {
  return notify(TOPICS.MAINTENANCE, [
    '🛠️ សំណើជួសជុលថ្មី',
    `🏠 បន្ទប់: ${cleanText(room, 100) || 'មិនបានបញ្ជាក់'}`,
    `👤 អ្នករាយការណ៍: ${displayName(student)}`,
    `📌 ប្រភេទ: ${cleanText(ticket?.category, 80)}`,
    `⚠️ កម្រិតបន្ទាន់: ${cleanText(ticket?.urgency, 32).toUpperCase()}`,
    `📝 ${cleanText(ticket?.title, 180)} — ${cleanText(ticket?.description, 700)}`,
    `📷 រូបភាព: ${ticket?.photo_url ? 'មានភ្ជាប់' : 'មិនមាន'}`,
  ].join('\n'));
}

function attendanceNotification({ attendance, room, student }) {
  return notify(TOPICS.ATTENDANCE_LEAVE, [
    '📋 កំណត់ត្រាវត្តមាន / សុំច្បាប់',
    `🏠 បន្ទប់: ${cleanText(room, 100) || 'មិនបានបញ្ជាក់'}`,
    `👤 និស្សិត: ${displayName(student)}`,
    `📌 ស្ថានភាព: ${cleanText(attendance?.status, 32).toUpperCase()}`,
    `📅 កាលបរិច្ឆេទ: ${cleanText(attendance?.attendance_date, 32)}`,
    ...(attendance?.leave_reason ? [`📝 មូលហេតុ: ${cleanText(attendance.leave_reason, 600)}`] : []),
  ].join('\n'));
}

module.exports = {
  TOPICS,
  TOPIC_ENVIRONMENT_KEYS,
  sendTopicMessage,
  notify,
  applicationNotification,
  passwordRequestNotification,
  systemLogNotification,
  updateNotification,
  paymentNotification,
  maintenanceNotification,
  attendanceNotification,
};
