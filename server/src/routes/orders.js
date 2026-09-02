import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { sendTelegramNotification } from '../utils/telegramBot.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get feed orders
router.get('/', async (req, res) => {
  try {
    const { categoryId, cityId, search, status = 'OPEN' } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }
    if (cityId) {
      where.cityId = parseInt(cityId, 10);
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { address: { contains: search } },
        { pickupAddress: { contains: search } },
        { dropoffAddress: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        Category: true,
        city: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Помилка отримання списку завдань' });
  }
});

// My customer orders
router.get('/my/customer', requireAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      include: {
        Category: true,
        city: true,
        performer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: 'Помилка завантаження замовлень' });
  }
});

// My performer orders
router.get('/my/performer', requireAuth, async (req, res) => {
  try {
    const applications = await prisma.orderApplication.findMany({
      where: { userId: req.user.id },
      select: { orderId: true, status: true },
    });
    const appliedOrderIds = applications.map((a) => a.orderId);

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { performerId: req.user.id },
          { id: { in: appliedOrderIds } },
        ],
      },
      include: {
        Category: true,
        city: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
          },
        },
        applications: {
          where: { userId: req.user.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching performer orders:', error);
    res.status(500).json({ error: 'Помилка завантаження замовлень' });
  }
});

// Single order details
router.get('/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        Category: true,
        city: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
          },
        },
        performer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
          },
        },
        disputes: {
          where: { userId: req.user?.id || 0 },
        },
        applications: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    const currentUserId = req.user?.id;
    const isCustomer = currentUserId === order.customerId;
    const isPerformer = currentUserId === order.performerId;

    if (!isCustomer && !isPerformer) {
      if (order.customer) {
        order.customer = { ...order.customer, phone: null };
      }
      if (order.performer) {
        order.performer = { ...order.performer, phone: null };
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Помилка завантаження завдання' });
  }
});

// Create new order
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, categoryId, address, pickupAddress, dropoffAddress, price, cityId } = req.body;

    if (!title || !categoryId || !price) {
      return res.status(400).json({ error: "Будь ласка, заповніть обов'язкові поля" });
    }

    let finalAddress = address?.trim() || null;
    if (pickupAddress && dropoffAddress) {
      finalAddress = `${pickupAddress.trim()} → ${dropoffAddress.trim()}`;
    }

    const order = await prisma.order.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        address: finalAddress,
        pickupAddress: pickupAddress?.trim() || null,
        dropoffAddress: dropoffAddress?.trim() || null,
        categoryId: parseInt(categoryId, 10),
        cityId: cityId ? parseInt(cityId, 10) : req.user.cityId,
        customerId: req.user.id,
        status: 'OPEN',
      },
      include: {
        Category: true,
        city: true,
        customer: true,
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Не вдалося опублікувати завдання' });
  }
});

// Apply to order
router.post('/:id/apply', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { comment } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    if (order.customerId === req.user.id) {
      return res.status(400).json({ error: 'Ви не можете відгукнутися на власне завдання' });
    }

    if (order.status !== 'OPEN') {
      return res.status(400).json({ error: 'Завдання вже закрите або у роботі' });
    }

    const existing = await prisma.orderApplication.findFirst({
      where: {
        orderId,
        userId: req.user.id,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Ви вже відгукнулися на це завдання' });
    }

    const application = await prisma.orderApplication.create({
      data: {
        orderId,
        userId: req.user.id,
        comment: comment?.trim() || null,
        status: 'PENDING',
      },
      include: {
        user: true,
      },
    });

    // Notify customer via Telegram
    if (order.customer?.telegramId) {
      const msg = `📩 <b>Новий відгук на ваше завдання!</b>\n\n📌 <b>${order.title}</b>\n👤 Кандидат: <b>${req.user.firstName}</b> ${req.user.lastName || ''}\n💬 «${comment?.trim() || 'Без коментаря'}»`;
      sendTelegramNotification(order.customer.telegramId, msg).catch(console.error);
    }

    res.status(201).json(application);
  } catch (error) {
    console.error('Error applying to order:', error);
    res.status(500).json({ error: 'Помилка надсилання відгуку' });
  }
});

// Accept application (assign performer)
router.post('/:id/accept/:applicationId', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const applicationId = parseInt(req.params.applicationId, 10);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    if (order.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Тільки автор завдання може обирати виконавця' });
    }

    const application = await prisma.orderApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application || application.orderId !== orderId) {
      return res.status(404).json({ error: 'Відгук не знайдено' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'IN_PROGRESS',
        performerId: application.userId,
      },
      include: {
        Category: true,
        customer: true,
        performer: true,
      },
    });

    await prisma.orderApplication.update({
      where: { id: applicationId },
      data: { status: 'ACCEPTED' },
    });

    await prisma.orderApplication.updateMany({
      where: {
        orderId,
        id: { not: applicationId },
      },
      data: { status: 'REJECTED' },
    });

    // Notify performer via Telegram
    if (application.user?.telegramId) {
      const msg = `🎉 <b>Вас обрано виконавцем завдання!</b>\n\n📌 <b>${order.title}</b>\n💵 Сума до оплати: <b>${order.price} ₴</b> (готівкою на місці)\n👤 Замовник: <b>${order.customer.firstName}</b>\n📞 Телефон: ${order.customer.phone || 'дивіться в додатку'}`;
      sendTelegramNotification(application.user.telegramId, msg).catch(console.error);
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error accepting application:', error);
    res.status(500).json({ error: 'Помилка призначення виконавця' });
  }
});

// Complete order & deduct performer commission automatically
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, performer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    if (order.customerId !== req.user.id && order.performerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Немає прав для завершення завдання' });
    }

    if (order.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Завдання вже було завершено' });
    }

    const performerId = order.performerId;
    let commissionPercent = 10.0;
    let commissionAmount = 0;

    if (performerId) {
      const performer = await prisma.user.findUnique({ where: { id: performerId } });
      // If performer has commission override (0.0 for first 100 users), use it
      commissionPercent = performer?.commissionOverridePercent ?? 10.0;
      commissionAmount = Math.round((order.price * commissionPercent) / 100);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' },
        include: { customer: true, performer: true },
      });

      if (performerId && commissionAmount > 0) {
        await tx.user.update({
          where: { id: performerId },
          data: {
            balance: {
              decrement: commissionAmount,
            },
          },
        });

        await tx.transaction.create({
          data: {
            userId: performerId,
            amount: -commissionAmount,
            type: 'COMMISSION',
            description: `Списання комісії ${commissionPercent}% за завдання #${orderId}`,
          },
        });
      } else if (performerId && commissionPercent === 0) {
        await tx.transaction.create({
          data: {
            userId: performerId,
            amount: 0,
            type: 'COMMISSION',
            description: `Пільгова комісія 0% (Перші 100 виконавців) за завдання #${orderId}`,
          },
        });
      }

      return updated;
    });

    // Send Telegram notifications
    if (order.performer?.telegramId) {
      const performerMsg = `✅ <b>Завдання #${order.id} успішно завершено!</b>\n\n📌 <b>${order.title}</b>\n💵 Оплата готівкою від замовника: <b>${order.price} ₴</b>\n📉 Комісія платформи (${commissionPercent}%): <b>${commissionAmount} ₴</b>\n\nДякуємо за роботу!`;
      sendTelegramNotification(order.performer.telegramId, performerMsg).catch(console.error);
    }
    if (order.customer?.telegramId) {
      const customerMsg = `✅ <b>Ви підтвердили виконання завдання #${order.id}!</b>\n\n📌 <b>${order.title}</b>\nДякуємо, що користуєтесь нашим сервісом!`;
      sendTelegramNotification(order.customer.telegramId, customerMsg).catch(console.error);
    }

    res.json(result);
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: 'Помилка завершення завдання' });
  }
});

// Report dispute/problem (Performer Protection)
router.post('/:id/dispute', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Будь ласка, опишіть суть проблеми' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, performer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        userId: req.user.id,
        reason: reason.trim(),
        status: 'OPEN',
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      if (admin.telegramId) {
        const msg = `⚠️ <b>Нова скарга на завдання #${orderId}!</b>\n\n📌 Завдання: <b>${order.title}</b>\n👤 Заявник: <b>${req.user.firstName}</b> (ID: ${req.user.id})\n📝 Причина: ${reason.trim()}`;
        sendTelegramNotification(admin.telegramId, msg).catch(console.error);
      }
    }

    res.status(201).json(dispute);
  } catch (error) {
    console.error('Error submitting dispute:', error);
    res.status(500).json({ error: 'Помилка надсилання скарги' });
  }
});

// Cancel order
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    if (order.customerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Тільки замовник може скасувати завдання' });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Помилка скасування завдання' });
  }
});

export default router;