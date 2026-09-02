# 💼 Telegram Gig Marketplace (Биржа поручений и подработки)

Full-stack сервис для поиска исполнителей и подработки с оплатой наличными (₴) и интеграцией в Telegram Mini Apps / Web.

---

## 🛠 Стек технологий

* **Backend**: Node.js, Express, Prisma ORM, SQLite (`server/prisma/dev.db`), Multer (загрузка чеков/квитанций), HMAC-SHA256 валидация Telegram `initData`.
* **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Axios.
* **Database**: SQLite (не требует установки отдельных СУБД).

---

## 🚀 Быстрый запуск

### 1. Установка и запуск (одной командой)
В корневой папке проекта (`telegram-gig-marketplace`):

```bash
# Установка и запуск одновременно бэкенда (:5000) и фронтенда (:5173)
npm run dev
```

Или по отдельности:
```bash
# В терминале 1 (бэкенд):
cd server
npm run dev

# В терминале 2 (фронтенд):
cd client
npm run dev
```

### 2. Ссылки
* **Фронтенд**: [http://localhost:5173](http://localhost:5173)
* **Бэкенд API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
* **Статические файлы/чеки**: `http://localhost:5000/uploads/`

---

## 👥 Тестовые аккаунты (Dev Mode)

Для удобной разработки и проверки в обычном браузере без открытия Telegram реализован селектор пользователей (в правом верхнем углу интерфейса или в Личном Кабинете):

1. **Иван (Администратор)** (`role: ADMIN`, баланс: 1500 ₴) — доступна вкладка Админ-панели для проверки чеков и статистики.
2. **Алексей (Заказчик)** (`role: USER`, баланс: 600 ₴) — создает задачи, просматривает отклики и выбирает исполнителя.
3. **Дмитрий (Мастер / Исполнитель)** (`role: USER`, баланс: 250 ₴) — откликается на задачи в ленте, выполняет работу, пополняет баланс чеками.

---

## 📂 Структура проекта

* `server/`
  * `prisma/schema.prisma` — Схема БД (User, City, Category, Order, OrderApplication, TopupRequest, Transaction)
  * `prisma/seed.js` — Начальные данные и тестовые поручения
  * `src/middleware/auth.js` — Валидация Telegram WebApp `initData` + Dev-режим
  * `src/middleware/upload.js` — Загрузка чеков с валидацией
  * `src/routes/` — Роуты `/orders`, `/catalog`, `/profile`, `/admin`, `/auth`
* `client/`
  * `src/components/` — `TaskCard`, `BottomNav`, `Header`
  * `src/pages/` — `TaskList` (лента), `TaskDetails` (отклики), `CreateOrder` (создание), `MyOrders` (мои заказы), `Profile` (кабинет), `Admin` (админка)
  * `src/context/AuthContext.jsx` — Провайдер состояния пользователя и SDK Telegram
  * `src/api/client.js` — Axios клиент с автоматической передачей `initData`