import { BOT_TOKEN, ADMIN_TELEGRAM_ID } from '../config.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sends a notification message to a Telegram user via Telegram Bot API
 * @param {string|number} telegramId - Telegram user ID
 * @param {string} text - Message text (supports HTML)
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

/**
 * Sends a notification to all configured Admins
 */
export async function notifyAdmin(text, options = {}) {
  try {
    const adminSetting = await prisma.appSetting.findUnique({
      where: { key: 'ADMIN_TELEGRAM_ID' }
    }).catch(() => null);

    const targetAdminIds = new Set();
    if (ADMIN_TELEGRAM_ID) targetAdminIds.add(String(ADMIN_TELEGRAM_ID));
    if (adminSetting?.value) targetAdminIds.add(String(adminSetting.value));

    // Also notify users marked as ADMIN in DB
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { telegramId: true }
    }).catch(() => []);

    for (const u of adminUsers) {
      if (u.telegramId) targetAdminIds.add(String(u.telegramId));
    }

    if (targetAdminIds.size === 0) {
      console.log(`[TelegramBot Admin Alert - No Admin ID configured yet]:\n${text}\n`);
      return { ok: true, mock: true };
    }

    const results = [];
    for (const adminId of targetAdminIds) {
      const res = await sendTelegramNotification(adminId, text, options);
      results.push(res);
    }
    return results;
  } catch (err) {
    console.error('Error sending admin notification:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Handle incoming Telegram webhook updates (from bot users or admin replies)
 */
export async function processTelegramUpdate(update) {
  if (!update || !update.message) return { ok: true };

  const msg = update.message;
  const fromChatId = String(msg.chat.id);
  const text = msg.text || '';
  const fromUser = msg.from;

  // Check if sender is Admin
  const adminSetting = await prisma.appSetting.findUnique({
    where: { key: 'ADMIN_TELEGRAM_ID' }
  }).catch(() => null);
  const isAdmin =
    fromChatId === String(ADMIN_TELEGRAM_ID) ||
    fromChatId === String(adminSetting?.value) ||
    Boolean(await prisma.user.findFirst({ where: { telegramId: fromChatId, role: 'ADMIN' } }));

  // 1. IF ADMIN IS SENDING A MESSAGE / REPLY
  if (isAdmin) {
    // Check if replying to a forwarded user message with [ID: ...] tag
    let targetTgId = null;

    if (msg.reply_to_message?.text) {
      const match = msg.reply_to_message.text.match(/\[TG_ID:\s*(\d+)\]/);
      if (match) {
        targetTgId = match[1];
      }
    }

    // Check command: /reply <tgId> <text>
    if (text.startsWith('/reply ') || text.startsWith('/msg ')) {
      const parts = text.split(' ');
      if (parts.length >= 3) {
        targetTgId = parts[1];
        const replyContent = parts.slice(2).join(' ');
        return await deliverAdminReplyToUser(targetTgId, replyContent, fromUser);
      }
    }

    // If target was found via reply-to
    if (targetTgId && text.trim()) {
      return await deliverAdminReplyToUser(targetTgId, text.trim(), fromUser);
    }

    // Set Admin ID command: /setadmin
    if (text.startsWith('/start') || text === '/setadmin') {
      await prisma.appSetting.upsert({
        where: { key: 'ADMIN_TELEGRAM_ID' },
        create: { key: 'ADMIN_TELEGRAM_ID', value: fromChatId },
        update: { value: fromChatId },
      });
      await sendTelegramNotification(
        fromChatId,
        `👑 <b>Ви успішно авторизовані як Головний Адміністратор!</b>\n\nВаш Telegram ID: <code>${fromChatId}</code>\nВсі скарги, чеки та повідомлення від користувачів будуть надходити сюди.\n\n<b>Як відповідати користувачам:</b>\n1. Просто натисніть "Відповісти" (Reply) на будь-яке повідомлення користувача від бота.\n2. Або введіть <code>/reply &lt;ID&gt; &lt;текст&gt;</code>`
      );
      return { ok: true };
    }
  }

  // 2. IF REGULAR USER IS SENDING A MESSAGE TO BOT
  let dbUser = await prisma.user.findUnique({
    where: { telegramId: fromChatId },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        telegramId: fromChatId,
        firstName: fromUser.first_name || 'Користувач',
        lastName: fromUser.last_name || null,
        username: fromUser.username || null,
        balance: 500,
        role: 'USER',
      },
    });
  }

  if (text === '/start') {
    await sendTelegramNotification(
      fromChatId,
      `👋 <b>Вітаємо у Біржі Завдань!</b>\n\nШвидкий пошук майстрів, вантажників та кур'єрів з прямою оплатою готівкою на місці.\n\nНатисніть кнопку меню або відкрийте додаток, щоб почати роботу!\n\nЯкщо у вас є питання до підтримки — просто напишіть повідомлення сюди, і адміністратор відповість вам.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Відкрити біржу завдань", web_app: { url: "https://my-telegram-bot-git-main-alex-32bf.vercel.app" } }]
          ]
        }
      }
    );
    return { ok: true };
  }

  // Save message to SupportMessage table
  if (text.trim()) {
    await prisma.supportMessage.create({
      data: {
        userId: dbUser.id,
        senderRole: 'USER',
        text: text.trim(),
      },
    });

    // Forward to Admin
    const adminAlert = `📩 <b>Нове повідомлення в підтримку!</b>\n\n👤 Від: <b>${dbUser.firstName}</b> ${dbUser.lastName || ''} (@${dbUser.username || 'немає'})\n🆔 [TG_ID: ${fromChatId}]\n\n💬 «${text.trim()}»\n\n<i>👉 Натисніть "Відповісти" на це повідомлення, щоб написати клієнту.</i>`;
    await notifyAdmin(adminAlert);

    await sendTelegramNotification(
      fromChatId,
      `✅ <b>Ваше повідомлення передано адміністрації!</b>\nМи відповімо вам найближчим часом тут у чаті.`
    );
  }

  return { ok: true };
}

async function deliverAdminReplyToUser(targetTgId, text, adminUser) {
  const targetUser = await prisma.user.findUnique({
    where: { telegramId: String(targetTgId) },
  });

  if (targetUser) {
    await prisma.supportMessage.create({
      data: {
        userId: targetUser.id,
        senderRole: 'ADMIN',
        text: text,
      },
    });
  }

  const userMsg = `💬 <b>Відповідь від адміністрації:</b>\n\n${text}\n\n<i>Ви можете відповісти на це повідомлення прямо тут у чаті.</i>`;
  const res = await sendTelegramNotification(targetTgId, userMsg);

  if (res.ok) {
    await notifyAdmin(`✅ <i>Відповідь успішно надіслано користувачу (TG ID: ${targetTgId})</i>`);
  }
  return res;
}