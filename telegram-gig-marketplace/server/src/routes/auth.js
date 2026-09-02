import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Не авторизовано' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { city: true },
  });

  res.json(user);
});

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      role: true,
      balance: true,
    },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

export default router;