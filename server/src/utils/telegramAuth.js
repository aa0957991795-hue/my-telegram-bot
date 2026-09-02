import crypto from 'crypto';
import { BOT_TOKEN, NODE_ENV } from '../config.js';

export function verifyTelegramInitData(initDataRaw) {
  if (!initDataRaw) return null;

  try {
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    urlParams.delete('hash');

    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys
      .map((key) => `${key}=${urlParams.get(key)}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const isValid = computedHash === hash;

    if (!isValid && NODE_ENV === 'production') {
      return null;
    }

    const userRaw = urlParams.get('user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      return {
        telegramId: String(user.id),
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        username: user.username || '',
        languageCode: user.language_code || 'ru',
      };
    }

    return null;
  } catch (err) {
    console.error('Error verifying initData:', err);
    return null;
  }
}