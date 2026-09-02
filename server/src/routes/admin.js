import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.js';
import { sendTelegramNotification } from '../utils/telegramBot.js';
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
      const msg = `💳 <b>Баланс успішно поповнено!</b>\n\nНараховано: <b>+${topup.amount} ₴</b>\nПоточний баланс: <b>${result.updatedUser.balance} ₴</b>`;
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
      const msg = `❌ <b>Заявку на поповнення #${topup.id} відхилено</b>\n\nПричина: ${comment || 'Квитанція не пройшла перевірку'}\nЯкщо це помилка, зверніться до адміністратора.`;
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
      const msg = `ℹ️ <b>Вашу скаргу на завдання #${updated.orderId} розглянуто!</b>\n\nРішення/Коментар: ${adminNotes || 'Вирішено адміністратором'}`;
      sendTelegramNotification(updated.user.telegramId, msg).catch(console.error);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: 'Помилка закриття скарги' });
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