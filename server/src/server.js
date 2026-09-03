import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { processTelegramUpdate } from './utils/telegramBot.js';

import authRouter from './routes/auth.js';
import catalogRouter from './routes/catalog.js';
import ordersRouter from './routes/orders.js';
import profileRouter from './routes/profile.js';
import adminRouter from './routes/admin.js';
import bannersRouter from './routes/banners.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Telegram Bot Webhook (handles incoming bot updates)
app.post('/api/bot/webhook', async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Global Auth middleware (reads Telegram initData or Dev headers)
app.use(authMiddleware);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);
app.use('/api/banners', bannersRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    user: req.user ? { id: req.user.id, name: req.user.firstName, role: req.user.role } : null,
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Uploads available at http://localhost:${PORT}/uploads/`);
});

export default app;