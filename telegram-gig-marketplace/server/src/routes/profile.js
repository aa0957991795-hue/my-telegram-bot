import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        city: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            createdOrders: true,
            performedOrders: true,
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Помилка завантаження профілю' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const { cityId, phone } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        cityId: cityId ? parseInt(cityId, 10) : undefined,
        phone: phone ? phone.trim() : undefined,
      },
      include: { city: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Помилка оновлення профілю' });
  }
});

router.post('/topup', requireAuth, upload.single('receipt'), async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Вкажіть коректну суму поповнення' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Будь ласка, прикріпіть фото або скан квитанції/чека' });
    }

    const receiptUrl = `/uploads/${req.file.filename}`;

    const topup = await prisma.topupRequest.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amount),
        receiptUrl,
        status: 'pending',
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            username: true,
            balance: true,
          },
        },
      },
    });

    res.status(201).json(topup);
  } catch (error) {
    console.error('Error submitting topup:', error);
    res.status(500).json({ error: 'Помилка надсилання заявки на поповнення' });
  }
});

router.get('/topups', requireAuth, async (req, res) => {
  try {
    const topups = await prisma.topupRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(topups);
  } catch (error) {
    console.error('Error fetching topup history:', error);
    res.status(500).json({ error: 'Помилка завантаження історії поповнень' });
  }
});

export default router;