import { PrismaClient } from '@prisma/client';
import { verifyTelegramInitData } from '../utils/telegramAuth.js';

const prisma = new PrismaClient();

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const initDataHeader = req.headers['x-telegram-init-data'] || '';
    const devUserId = req.headers['x-dev-user-id'] || req.query.dev_user_id;

    let tgUser = null;

    const rawInitData = initDataHeader || (authHeader.startsWith('tma ') ? authHeader.slice(4) : '');
    if (rawInitData) {
      tgUser = verifyTelegramInitData(rawInitData);
    }

    if (!tgUser && devUserId) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: parseInt(devUserId, 10) || 0 },
            { telegramId: String(devUserId) }
          ]
        },
        include: { city: true }
      });
      if (user) {
        req.user = user;
        return next();
      }
    }

    if (tgUser) {
      let user = await prisma.user.findUnique({
        where: { telegramId: tgUser.telegramId },
        include: { city: true },
      });

      if (!user) {
        // Count how many users already have 0% promotional commission
        const freeSpotsClaimed = await prisma.user.count({
          where: { commissionOverridePercent: 0.0 },
        });

        const initialCommission = freeSpotsClaimed < 100 ? 0.0 : null;
        const defaultCity = await prisma.city.findFirst();

        user = await prisma.user.create({
          data: {
            telegramId: tgUser.telegramId,
            firstName: tgUser.firstName || 'Користувач',
            lastName: tgUser.lastName || null,
            username: tgUser.username || null,
            cityId: defaultCity ? defaultCity.id : null,
            balance: 100,
            role: 'USER',
            commissionOverridePercent: initialCommission,
          },
          include: { city: true },
        });
      } else {
        if (user.firstName !== tgUser.firstName || user.username !== tgUser.username) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              firstName: tgUser.firstName || user.firstName,
              username: tgUser.username || user.username,
            },
            include: { city: true },
          });
        }
      }

      req.user = user;
      return next();
    }

    const fallbackUser = await prisma.user.findFirst({
      include: { city: true },
    });
    req.user = fallbackUser || null;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Потрібна авторизація' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Доступ дозволено лише адміністраторам' });
  }
  next();
}