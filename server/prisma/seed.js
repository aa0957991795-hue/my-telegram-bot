import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Ukrainian localized data...');

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const dummyReceiptPath = path.join(uploadsDir, 'sample-receipt.svg');
  if (!fs.existsSync(dummyReceiptPath)) {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="100%" height="100%" fill="#ffffff"/><rect x="20" y="20" width="560" height="760" rx="15" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/><text x="300" y="100" font-family="sans-serif" font-size="28" font-weight="bold" fill="#0f172a" text-anchor="middle">КВИТАНЦІЯ ПРО ОПЛАТУ</text><text x="300" y="140" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle">АТ «Банк Оплат» • Успішно</text><line x1="60" y1="170" x2="540" y2="170" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6,6"/><text x="60" y="220" font-family="sans-serif" font-size="16" fill="#64748b">Сума платежу:</text><text x="540" y="220" font-family="sans-serif" font-size="22" font-weight="bold" fill="#10b981" text-anchor="end">500.00 ₴</text><text x="60" y="270" font-family="sans-serif" font-size="16" fill="#64748b">Отримувач:</text><text x="540" y="270" font-family="sans-serif" font-size="16" font-weight="600" fill="#0f172a" text-anchor="end">Сервіс Завдань</text><text x="60" y="320" font-family="sans-serif" font-size="16" fill="#64748b">Платник:</text><text x="540" y="320" font-family="sans-serif" font-size="16" fill="#0f172a" text-anchor="end">Дмитро М.</text><text x="60" y="370" font-family="sans-serif" font-size="16" fill="#64748b">Код транзакції:</text><text x="540" y="370" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="end">TX-9847291048</text><line x1="60" y1="410" x2="540" y2="410" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6,6"/><rect x="180" y="470" width="240" height="240" rx="10" fill="#e2e8f0"/><text x="300" y="600" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="middle">QR-код перевірки</text></svg>';
    fs.writeFileSync(dummyReceiptPath, svgContent, 'utf-8');
  }

  // Clear all existing data
  await prisma.sponsoredBanner.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.topupRequest.deleteMany();
  await prisma.orderApplication.deleteMany();
  await prisma.order.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();

  // Ukrainian Cities
  const citiesData = [
    { name: 'Київ' },
    { name: 'Харків' },
    { name: 'Одеса' },
    { name: 'Дніпро' },
    { name: 'Львів' },
    { name: 'Запоріжжя' },
  ];
  for (const c of citiesData) {
    await prisma.city.create({ data: c });
  }
  const kyiv = await prisma.city.findUnique({ where: { name: 'Київ' } });

  // Ukrainian Categories
  const categoriesData = [
    { name: 'Вантажники', icon: '📦', isDelivery: false },
    { name: 'Прибирання', icon: '🧹', isDelivery: false },
    { name: "Доставка та кур'єри", icon: '🚗', isDelivery: true },
    { name: 'Дрібний ремонт', icon: '🛠️', isDelivery: false },
    { name: 'Електрика та сантехніка', icon: '⚡', isDelivery: false },
    { name: 'Різноробочі', icon: '👷', isDelivery: false },
    { name: 'IT та цифрова допомога', icon: '💻', isDelivery: false },
  ];
  for (const cat of categoriesData) {
    await prisma.category.create({ data: cat });
  }
  const allCats = await prisma.category.findMany();
  const moversCat = allCats.find((c) => c.name === 'Вантажники');
  const cleaningCat = allCats.find((c) => c.name === 'Прибирання');
  const deliveryCat = allCats.find((c) => c.name === "Доставка та кур'єри");

  // Users (First registered users get commissionOverridePercent = 0.0)
  const admin = await prisma.user.create({
    data: {
      telegramId: '1001',
      firstName: 'Іван',
      lastName: 'Адміністратор',
      username: 'admin_ivan',
      phone: '+380501112233',
      balance: 1500,
      role: 'ADMIN',
      commissionOverridePercent: 0.0,
      cityId: kyiv.id,
    },
  });

  const customer = await prisma.user.create({
    data: {
      telegramId: '1002',
      firstName: 'Олексій',
      lastName: 'Замовник',
      username: 'alex_customer',
      phone: '+380671234567',
      balance: 600,
      role: 'USER',
      commissionOverridePercent: 0.0,
      cityId: kyiv.id,
    },
  });

  const performer = await prisma.user.create({
    data: {
      telegramId: '1003',
      firstName: 'Дмитро',
      lastName: 'Майстер',
      username: 'dmitry_pro',
      phone: '+380939876543',
      balance: 250,
      role: 'USER',
      commissionOverridePercent: 0.0, // Free 0% commission for first 100 performers
      cityId: kyiv.id,
    },
  });

  // Realistic Orders
  const order1 = await prisma.order.create({
    data: {
      title: 'Розвантажити фуру з будматеріалами, 3 години',
      description: 'Потрібно 2 людини для вивантаження гіпсокартону та профілів на 2-й поверх (є вантажний ліфт). Початок о 10:00.',
      price: 1200,
      address: 'вул. Хрещатик, 24',
      status: 'OPEN',
      customerId: customer.id,
      categoryId: moversCat.id,
      cityId: kyiv.id,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      title: 'Генеральне прибирання квартири після ремонту (55 кв.м)',
      description: 'Знепилити стіни, помити вікна та підлогу. Миючі засоби та інвентар надаємо.',
      price: 1500,
      address: 'просп. Перемоги, 67',
      status: 'OPEN',
      customerId: customer.id,
      categoryId: cleaningCat.id,
      cityId: kyiv.id,
    },
  });

  const order3 = await prisma.order.create({
    data: {
      title: 'Терміново доставити документи в офіс',
      description: 'Забрати запечатаний конверт та відвезти на Поділ до 16:00. Оплата готівкою при передачі.',
      price: 350,
      pickupAddress: 'вул. Велика Васильківська, 15',
      dropoffAddress: 'Контрактова площа, 4',
      address: 'вул. Велика Васильківська, 15 → Контрактова площа, 4',
      status: 'OPEN',
      customerId: customer.id,
      categoryId: deliveryCat.id,
      cityId: kyiv.id,
    },
  });

  // Application from Dmitry to order1
  await prisma.orderApplication.create({
    data: {
      orderId: order1.id,
      userId: performer.id,
      comment: 'Готовий під’їхати на 10:00, досвід у вантажних роботах понад 3 роки.',
      status: 'PENDING',
    },
  });

  // Pending Topup Request
  await prisma.topupRequest.create({
    data: {
      userId: performer.id,
      amount: 500,
      receiptUrl: '/uploads/sample-receipt.svg',
      status: 'pending',
    },
  });

  // Initial Transaction
  await prisma.transaction.create({
    data: {
      userId: customer.id,
      amount: 600,
      type: 'TOPUP',
      description: 'Поповнення балансу за квитанцією',
    },
  });

  console.log('Database re-seeded successfully with 0% free commission setup!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });