import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get free spots counter for promotional 0% commission
router.get('/free-spots', async (req, res) => {
  try {
    const claimed = await prisma.user.count({
      where: { commissionOverridePercent: 0.0 },
    });
    const total = 100;
    const remaining = Math.max(0, total - claimed);

    res.json({
      totalFreeSpots: total,
      claimedSpots: claimed,
      remainingSpots: remaining,
    });
  } catch (error) {
    console.error('Error fetching free spots:', error);
    res.status(500).json({ error: 'Помилка отримання даних про вільні місця' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { orders: { where: { status: 'OPEN' } } },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Помилка завантаження категорій' });
  }
});

router.get('/cities', async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Помилка завантаження міст' });
  }
});

export default router;