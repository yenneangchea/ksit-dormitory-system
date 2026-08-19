# Telegram Topic Notification References

The Telegram topic notification dispatcher uses the Bot API `sendMessage` request with a `message_thread_id` to target a forum topic in a Supergroup. The implementation uses HTTPS JSON requests and checks the Bot API `ok` response field before treating a notification as delivered.

Telegram also documents that a webhook may include a secret token in the `X-Telegram-Bot-Api-Secret-Token` header. The KSIT webhook validates this value when `TELEGRAM_WEBHOOK_SECRET` is configured.

Sources:

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Forum Topics](https://core.telegram.org/api/forum)
