import { BOT_TOKEN } from '../config.js';

/**
 * Sends a notification message to a Telegram user via Telegram Bot API
 * @param {string|number} telegramId - Telegram user ID
 * @param {string} text - Message text (supports Markdown/HTML if needed)
 * @param {object} [options] - Additional options (inline keyboard, parse_mode, etc.)
 */
export async function sendTelegramNotification(telegramId, text, options = {}) {
  if (!BOT_TOKEN || BOT_TOKEN === 'SAMPLE_BOT_TOKEN_FOR_DEV' || !telegramId) {
    console.log(`[TelegramBot MOCK Notification to ${telegramId}]:\n${text}\n`);
    return { ok: true, mock: true };
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: telegramId,
      text,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup || undefined,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn(`Telegram notification error to ${telegramId}:`, data.description);
    }
    return data;
  } catch (err) {
    console.error(`Failed to send Telegram notification to ${telegramId}:`, err.message);
    return { ok: false, error: err.message };
  }
}