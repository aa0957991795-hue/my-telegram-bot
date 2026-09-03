import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.js';
import { sendTelegramNotification, notifyAdmin } from '../utils/telegramBot.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAdmin);

// Admin dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [usersCount, ordersCount, pendingTopupsCount, openDisputesCount, bannersCount, totalVolume] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.topupRequest.count({ where: { status: 'pending' } }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.sponsoredBanner.count(),
      prisma.order.aggregate({
        _sum: { price: true },
        where: { status: 'COMPLETED' },
      }),
    ]);

    res.json({
      users: usersCount,
      orders: ordersCount,
      pendingTopups: pendingTopupsCount,
      openDisputes: openDisputesCount,
      bannersCount,
      totalVolume: totalVolume._sum.price || 0,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Помилка отримання статистики' });
  }
});

// Topup requests list
router.get('/topups', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      where.status = status;
    }

    const topups = await prisma.topupRequest.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            telegramId: true,
            balance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(topups);
  } catch (error) {
    console.error('Error fetching topups for admin:', error);
    res.status(500).json({ error: 'Помилка отримання списку заявок' });
  }
});

// Approve topup
router.post('/topups/:id/approve', async (req, res) => {
  try {
    const topupId = parseInt(req.params.id, 10);

    const topup = await prisma.topupRequest.findUnique({
      where: { id: topupId },
      include: { User: true },
    });

    if (!topup) {
      return res.status(404).json({ error: 'Заявку не знайдено' });
    }

    if (topup.status === 'approved') {
      return res.status(400).json({ error: 'Заявку вже підтверджено' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTopup = await tx.topupRequest.update({
        where: { id: topupId },
        data: { status: 'approved' },
      });

      const updatedUser = await tx.user.update({
        where: { id: topup.userId },
        data: {
          balance: {
            increment: topup.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: topup.userId,
          amount: topup.amount,
          type: 'TOPUP',
          description: `Поповнення балансу за чеком #${topup.id}`,
        },
      });

      return { updatedTopup, updatedUser };
    });

    // Notify user via Telegram
    if (topup.User?.telegramId) {
      const msg = `💳 <b>Баланс успішно поповнено!</b>\n\nНараховано: <b>+${topup.amount} ₴</b>\nПоточний баланс: <b>${result.updatedUser.balance} ₴</b>\n\nДякуємо!`;
      sendTelegramNotification(topup.User.telegramId, msg).catch(console.error);
    }

    res.json(result);
  } catch (error) {
    console.error('Error approving topup:', error);
    res.status(500).json({ error: 'Помилка підтвердження чека' });
  }
});

// Reject topup
router.post('/topups/:id/reject', async (req, res) => {
  try {
    const topupId = parseInt(req.params.id, 10);
    const { comment } = req.body;

    const topup = await prisma.topupRequest.findUnique({
      where: { id: topupId },
      include: { User: true },
    });

    if (!topup) {
      return res.status(404).json({ error: 'Заявку не знайдено' });
    }

    const updated = await prisma.topupRequest.update({
      where: { id: topupId },
      data: {
        status: 'rejected',
        adminComment: comment || 'Квитанція не пройшла перевірку',
      },
    });

    // Notify user via Telegram
    if (topup.User?.telegramId) {
      const msg = `❌ <b>Заявку на поповнення #${topup.id} відхилено</b>\n\nПричина: ${comment || 'Квитанція не пройшла перевірку'}\nЯкщо це помилка, зверніться до адміністратора в чаті.`;
      sendTelegramNotification(topup.User.telegramId, msg).catch(console.error);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error rejecting topup:', error);
    res.status(500).json({ error: 'Помилка відхилення заявки' });
  }
});

// Disputes list
router.get('/disputes', async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        order: {
          include: {
            customer: true,
            performer: true,
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(disputes);
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ error: 'Помилка завантаження скарг' });
  }
});

// Resolve dispute
router.post('/disputes/:id/resolve', async (req, res) => {
  try {
    const disputeId = parseInt(req.params.id, 10);
    const { adminNotes } = req.body;

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        adminNotes: adminNotes || 'Вирішено адміністратором',
      },
      include: { user: true, order: true },
    });

    // Notify complainant
    if (updated.user?.telegramId) {
      const msg = `ℹ️ <b>Вашу скаргу на завдання #${updated.orderId} розглянуто!</b>\n\nРішення адміністратора: «${adminNotes || 'Питання врегульовано'}»\nДякуємо за звернення!`;
      sendTelegramNotification(updated.user.telegramId, msg).catch(console.error);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: 'Помилка закриття скарги' });
  }
});

// Support / Direct Chat Messages with users
router.get('/messages', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        messages: { some: {} },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching message chats:', error);
    res.status(500).json({ error: 'Помилка завантаження діалогів' });
  }
});

router.get('/messages/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const messages = await prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Помилка завантаження історії повідомлень' });
  }
});

// Send message from Admin to User in Telegram
router.post('/messages/send', async (req, res) => {
  try {
    const { userId, telegramId, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Введіть текст повідомлення' });
    }

    let targetUser = null;
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId, 10) } });
    } else if (telegramId) {
      targetUser = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
    }

    const targetTgId = targetUser?.telegramId || telegramId;

    if (!targetTgId) {
      return res.status(400).json({ error: 'Користувача не знайдено' });
    }

    // Save message to database
    const savedMsg = await prisma.supportMessage.create({
      data: {
        userId: targetUser?.id || 1,
        senderRole: 'ADMIN',
        text: text.trim(),
      },
    });

    // Send via Telegram bot
    const formatted = `💬 <b>Повідомлення від адміністрації Біржі Завдань:</b>\n\n${text.trim()}\n\n<i>Ви можете відповісти на це повідомлення прямо в цьому чаті з ботом.</i>`;
    const tgRes = await sendTelegramNotification(targetTgId, formatted);

    res.json({ success: true, message: savedMsg, telegramResult: tgRes });
  } catch (error) {
    console.error('Error sending message to user:', error);
    res.status(500).json({ error: 'Помилка надсилання повідомлення' });
  }
});

// Admin App Settings (Configure Telegram ID)
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany();
    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    res.json(map);
  } catch (error) {
    res.status(500).json({ error: 'Помилка отримання налаштувань' });
  }
});

router.post('/settings/admin-id', async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) {
      return res.status(400).json({ error: 'Вкажіть Telegram ID' });
    }

    await prisma.appSetting.upsert({
      where: { key: 'ADMIN_TELEGRAM_ID' },
      create: { key: 'ADMIN_TELEGRAM_ID', value: String(telegramId) },
      update: { value: String(telegramId) },
    });

    // Also update role for this user if exists
    await prisma.user.updateMany({
      where: { telegramId: String(telegramId) },
      data: { role: 'ADMIN' },
    });

    // Send test greeting to new Admin
    sendTelegramNotification(
      telegramId,
      `👑 <b>Вас призначено Головним Адміністратором Біржі Завдань!</b>\n\nТепер усі сповіщення про чеки, скарги та запити користувачів будуть надходити сюди.`
    ).catch(console.error);

    res.json({ success: true, adminId: telegramId });
  } catch (error) {
    console.error('Error saving admin ID:', error);
    res.status(500).json({ error: 'Помилка збереження Telegram ID' });
  }
});

// Sponsored Banners CRUD
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.sponsoredBanner.findMany({
      include: { city: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners for admin:', error);
    res.status(500).json({ error: 'Помилка завантаження банерів' });
  }
});

router.post('/banners', upload.single('image'), async (req, res) => {
  try {
    const { title, description, targetUrl, cityId, isActive } = req.body;

    if (!title || !targetUrl) {
      return res.status(400).json({ error: 'Заповніть назву та цільове посилання' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || '/uploads/sample-banner.svg');

    const banner = await prisma.sponsoredBanner.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        targetUrl: targetUrl.trim(),
        imageUrl,
        cityId: cityId ? parseInt(cityId, 10) : null,
        isActive: isActive === 'false' ? false : true,
      },
    });

    res.status(201).json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Помилка створення рекламного банера' });
  }
});

router.delete('/banners/:id', async (req, res) => {
  try {
    const bannerId = parseInt(req.params.id, 10);
    await prisma.sponsoredBanner.delete({ where: { id: bannerId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Помилка видалення банера' });
  }
});

export default router;