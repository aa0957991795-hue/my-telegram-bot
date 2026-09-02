import express from 'express';
import { PrismaClient } from '@prisma/client';
import { ADS_ENABLED } from '../config.js';

const router = express.Router();
const prisma = new PrismaClient();

// Public banner endpoint
router.get('/', async (req, res) => {
  // If advertising is disabled globally via ADS_ENABLED=false, return empty array immediately
  if (!ADS_ENABLED) {
    return res.json([]);
  }

  try {
    const { cityId } = req.query;
    const now = new Date();

    const where = {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    };

    if (cityId) {
      where.OR.push({ cityId: parseInt(cityId, 10) }, { cityId: null });
    }

    const banners = await prisma.sponsoredBanner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    res.json(banners);
  } catch (error) {
    console.error('Error fetching public banners:', error);
    res.status(500).json({ error: 'Помилка отримання банерів' });
  }
});

export default router;