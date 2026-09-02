# 🚀 Повний посібник із запуску та публікації в реальному Telegram

Цей посібник допоможе вам опублікувати Telegram Gig Marketplace у реальному Telegram за 4 простих кроки.

---

## 🤖 Крок 1. Створення Telegram-бота через @BotFather

1. Відкрийте Telegram і перейдіть до бота [@BotFather](https://t.me/BotFather).
2. Надішліть команду:
   ```text
   /newbot
   ```
3. Вкажіть ім'я бота (наприклад: `Біржа Завдань UA` або `Gig Marketplace`).
4. Вкажіть унікальний username бота (повинен закінчуватися на `bot`, наприклад: `gig_tasks_ua_bot`).
5. **Збережіть отриманий токен (BOT_TOKEN)**, наприклад: `7823489123:AAFOk9...`.

---

## ⚙️ Крок 2. Деплой бекенду (Railway або Render)

### Варіант А: Railway.app (Рекомендовано — найшвидший варіант)
1. Зареєструйтесь на [Railway.app](https://railway.app) через GitHub.
2. Натисніть **«New Project»** → **«Deploy from GitHub repo»** (оберіть репозиторій).
3. У налаштуваннях сервісу (Settings):
   * **Root Directory**: `server`
   * Додайте змінні оточення (**Variables**):
     * `NODE_ENV` = `production`
     * `PORT` = `5000`
     * `BOT_TOKEN` = `ваш_токен_від_BotFather`
     * `ADS_ENABLED` = `false`
4. У вкладці **Settings** → **Networking** згенеруйте публічний домен (наприклад: `https://telegram-gig-backend-production.up.railway.app`).

### Варіант Б: Render.com
1. Зареєструйтесь на [Render.com](https://render.com).
2. Натисніть **«New»** → **«Web Service»** → оберіть репозиторій.
3. Вкажіть:
   * **Root Directory**: `server`
   * **Build Command**: `npm install && npx prisma generate && npx prisma db push && node prisma/seed.js`
   * **Start Command**: `node src/server.js`
   * Додайте змінні `BOT_TOKEN` та `ADS_ENABLED=false`.

---

## 🌐 Крок 3. Деплой фронтенду (Vercel або Netlify)

### Варіант А: Vercel (Рекомендовано)
1. Зареєструйтесь на [Vercel.com](https://vercel.com).
2. Натисніть **«Add New...»** → **«Project»** → імпортуйте репозиторій.
3. Вкажіть:
   * **Root Directory**: `client`
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. У файлі `client/vercel.json` замініть `https://YOUR-BACKEND-URL.railway.app` на фактичну URL-адресу вашого бекенду з Кроку 2.
5. Натисніть **«Deploy»**. Ви отримаєте посилання на фронтенд (наприклад: `https://telegram-gig-marketplace.vercel.app`).

---

## 📲 Крок 4. Підключення кнопки меню в @BotFather

1. Поверніться до [@BotFather](https://t.me/BotFather).
2. Надішліть команду:
   ```text
   /setmenubutton
   ```
3. Оберіть вашого бота зі списку.
4. Надішліть URL-адресу вашого задеплоєного фронтенду:
   ```text
   https://telegram-gig-marketplace.vercel.app
   ```
5. Вкажіть назву кнопки (наприклад: `Відкрити завдання 💼` або `Головна`).
6. (Опціонально) Налаштуйте опис бота:
   * `/setdescription` — «Швидкий пошук майстрів, вантажників та кур'єрів з оплатою готівкою на місці!»
   * `/setabouttext` — «Біржа локальних завдань та підробітку в Україні.»

---

## 🎯 Перевірка роботи у справжньому Telegram

1. Відкрийте вашого бота в Telegram: `https://t.me/<username_вашого_бота>`.
2. Натисніть кнопку **Start** або кнопку меню **«Відкрити завдання 💼»** унизу ліворуч біля поля вводу.
3. Додаток автоматично авторизує ваш справжній Telegram-акаунт (через `initData`), підтягне ім'я та аватар і нарахує 0% комісії (якщо ви серед перших 100).
4. Всі сповіщення про відгуки, призначення та завершення замовлень будуть надходити в особистий чат з ботом у реальному часі!