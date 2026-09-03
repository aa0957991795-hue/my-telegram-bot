import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TaskCard from '../components/TaskCard.jsx';
import SponsoredBannerCard from '../components/SponsoredBannerCard.jsx';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Вантажники', icon: '📦', _count: { orders: 3 } },
  { id: 2, name: 'Прибирання', icon: '🧹', _count: { orders: 2 } },
  { id: 3, name: "Доставка та кур'єри", icon: '🚗', isDelivery: true, _count: { orders: 2 } },
  { id: 4, name: 'Дрібний ремонт', icon: '🛠️', _count: { orders: 1 } },
  { id: 5, name: 'Електрика та сантехніка', icon: '⚡', _count: { orders: 2 } },
  { id: 6, name: 'Різноробочі', icon: '👷', _count: { orders: 4 } },
  { id: 7, name: 'IT та цифрова допомога', icon: '💻', _count: { orders: 1 } },
];

const DEFAULT_ORDERS = [
  {
    id: 1,
    title: 'Розвантажити фуру з будматеріалами (гіпсокартон, мішки)',
    description: 'Потрібно 2 людини на 3 години. Є вантажний ліфт. Оплата готівкою відразу після розвантаження.',
    price: 1200,
    address: 'вул. Хрещатик, 24',
    status: 'OPEN',
    categoryId: 1,
    Category: { id: 1, name: 'Вантажники', icon: '📦' },
    city: { id: 1, name: 'Київ' },
    customer: { firstName: 'Олексій' },
    _count: { applications: 2 },
  },
  {
    id: 2,
    title: 'Генеральне прибирання квартири після ремонту (55 кв.м)',
    description: 'Помити вікна, знепилити стіни та підлогу. Миючі засоби надаємо.',
    price: 1500,
    address: 'просп. Перемоги, 67',
    status: 'OPEN',
    categoryId: 2,
    Category: { id: 2, name: 'Прибирання', icon: '🧹' },
    city: { id: 1, name: 'Київ' },
    customer: { firstName: 'Олена' },
    _count: { applications: 1 },
  },
  {
    id: 3,
    title: 'Терміново доставити документи на Поділ до 16:00',
    description: 'Забрати запечатаний пакет та передати особисто в руки. Оплата готівкою при отриманні.',
    price: 350,
    pickupAddress: 'вул. Велика Васильківська, 15',
    dropoffAddress: 'Контрактова площа, 4',
    address: 'вул. Велика Васильківська, 15 → Контрактова площа, 4',
    status: 'OPEN',
    categoryId: 3,
    Category: { id: 3, name: "Доставка та кур'єри", icon: '🚗' },
    city: { id: 1, name: 'Київ' },
    customer: { firstName: 'Михайло' },
    _count: { applications: 3 },
  },
  {
    id: 4,
    title: 'Заміна змішувача та підключення пральної машини',
    description: 'Потрібен майстер зі своїм інструментом. Робота на 1-1.5 години.',
    price: 800,
    address: 'вул. Саксаганського, 12',
    status: 'OPEN',
    categoryId: 5,
    Category: { id: 5, name: 'Електрика та сантехніка', icon: '⚡' },
    city: { id: 1, name: 'Київ' },
    customer: { firstName: 'Андрій' },
    _count: { applications: 1 },
  },
  {
    id: 5,
    title: 'Допомога на складі з переміщенням коробок (4 години)',
    description: 'Потрібні різноробочі на зміну. Розрахунок готівкою в кінці дня.',
    price: 900,
    address: 'вул. Куренівська, 18',
    status: 'OPEN',
    categoryId: 6,
    Category: { id: 6, name: 'Різноробочі', icon: '👷' },
    city: { id: 1, name: 'Київ' },
    customer: { firstName: 'Віталій' },
    _count: { applications: 4 },
  },
];

export default function TaskList() {
  const { user, tgUser } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [freeSpots, setFreeSpots] = useState({ totalFreeSpots: 100, claimedSpots: 3, remainingSpots: 97 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  function getMergedOrders(serverOrders = []) {
    try {
      const customCreated = JSON.parse(localStorage.getItem('custom_created_orders') || '[]');
      const combined = [...customCreated, ...(serverOrders.length > 0 ? serverOrders : DEFAULT_ORDERS)];
      const seen = new Set();
      return combined.filter((item) => {
        if (!item || !item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    } catch {
      return serverOrders.length > 0 ? serverOrders : DEFAULT_ORDERS;
    }
  }

  async function loadData() {
    try {
      const [catsRes, ordersRes, freeSpotsRes] = await Promise.all([
        api.get('/catalog/categories').catch(() => null),
        api.get('/orders', {
          params: {
            categoryId: selectedCategory || undefined,
            cityId: user?.cityId || undefined,
            search: search || undefined,
            status: 'OPEN',
          },
        }).catch(() => null),
        api.get('/catalog/free-spots').catch(() => null),
      ]);

      if (Array.isArray(catsRes?.data) && catsRes.data.length > 0) {
        setCategories(catsRes.data);
      }
      const apiOrders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
      setOrders(getMergedOrders(apiOrders));

      if (freeSpotsRes?.data && typeof freeSpotsRes.data === 'object' && freeSpotsRes.data.totalFreeSpots) {
        setFreeSpots(freeSpotsRes.data);
      }
    } catch (err) {
      console.warn('Використовуються локальні демонстраційні дані:', err);
      setOrders(getMergedOrders([]));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedCategory, user?.cityId]);

  const handleCategoryClick = (catId) => {
    if (selectedCategory === catId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catId);
      setTimeout(() => {
        const feedElem = document.getElementById('task-feed-section');
        if (feedElem) feedElem.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const displayName = user?.firstName || tgUser?.first_name || 'Користувач';
  const photoUrl = tgUser?.photo_url;
  const isFreeCommission = user?.commissionOverridePercent === 0;
  const isBlocked = Boolean(user?.isBlockedForCommission);

  const safeCategories = Array.isArray(categories) ? categories : DEFAULT_CATEGORIES;
  const safeOrders = Array.isArray(orders) ? orders : DEFAULT_ORDERS;

  // Filter orders in memory by category & search query
  const filteredOrders = useMemo(() => {
    return safeOrders.filter((order) => {
      // 1. Category match
      if (selectedCategory !== null) {
        const matchCatId = order.categoryId === selectedCategory || order.Category?.id === selectedCategory;
        const matchCatName = safeCategories.find((c) => c.id === selectedCategory)?.name === order.Category?.name;
        if (!matchCatId && !matchCatName) return false;
      }
      // 2. Search query match
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = order.title?.toLowerCase().includes(q);
        const matchDesc = order.description?.toLowerCase().includes(q);
        const matchAddr = order.address?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAddr) return false;
      }
      return true;
    });
  }, [safeOrders, selectedCategory, search, safeCategories]);

  const activeCategoryObj = safeCategories.find((c) => c.id === selectedCategory);

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      
      {/* 1. App Header / User Welcome Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white p-5 rounded-3xl shadow-lg border border-slate-700/50 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3.5">
          {/* Top Row: App Brand & Telegram User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/20">
                ⚡
              </div>
              <div>
                <div className="text-xs font-bold tracking-wide uppercase text-emerald-400">
                  GIG MARKETPLACE
                </div>
                <div className="text-[10px] text-slate-400">
                  Біржа локальних завдань
                </div>
              </div>
            </div>

            {/* Telegram User Auto Badge */}
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 cursor-pointer transition-all active:scale-95"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="w-6 h-6 rounded-full object-cover border border-white/30"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                  {(displayName && displayName[0]) ? displayName[0] : 'U'}
                </div>
              )}
              <span className="text-xs font-medium text-white max-w-[80px] truncate">
                {displayName}
              </span>
            </div>
          </div>

          {/* Greeting & Clear App Description */}
          <div>
            <h1 className="font-display text-lg font-bold text-white leading-snug">
              Привіт, {displayName}! 👋
            </h1>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Швидкий пошук перевірених майстрів, вантажників та кур'єрів. Прямий розрахунок готівкою після виконання!
            </p>
          </div>

          {/* Free Tasks Progress Pill for Performers */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span>📍</span> {user?.city?.name || 'Київ'}
            </span>
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span>🎁</span> Безкоштовних завдань: {Math.max(0, 3 - (user?.freeTasksCompleted || 0))}/3
            </span>
          </div>
        </div>
      </div>

      {/* Blocked Performer Global Alert */}
      {isBlocked && (
        <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔒</span>
            <div>
              <div className="text-xs font-bold">Взяття нових завдань заблоковано</div>
              <div className="text-[11px] opacity-90">
                Сплатіть комісію <b>{user.pendingCommissionAmount} ₴</b> та завантажте чек
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="bg-white text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap active:scale-95"
          >
            Сплатити →
          </button>
        </div>
      )}

      {/* 2. Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/create')}
          className="group ticket-card p-4 flex flex-col justify-between items-start text-left bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/30 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-800/50 hover:shadow-md active:scale-98 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            ➕
          </div>
          <div className="mt-3">
            <div className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Створити завдання
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Шукаю майстра чи кур'єра
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            const feedElem = document.getElementById('task-feed-section');
            if (feedElem) feedElem.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group ticket-card p-4 flex flex-col justify-between items-start text-left bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/30 dark:to-slate-900 border-blue-200/80 dark:border-blue-800/50 hover:shadow-md active:scale-98 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
            💼
          </div>
          <div className="mt-3">
            <div className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              Знайти підробіток
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {filteredOrders.length} доступних завдань
            </div>
          </div>
        </button>
      </div>

      {/* 3. Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <input
          type="text"
          className="input pl-10 pr-10"
          placeholder="Пошук завдань (вантажник, прибирання, доставка)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute left-3.5 text-slate-400 text-sm">🔍</span>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTimeout(loadData, 50);
            }}
            className="absolute right-3.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        )}
      </form>

      {/* 4. Interactive Categories */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Категорії робіт:
          </span>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              ✕ Скинути фільтр
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              selectedCategory === null
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>🔥</span>
            <span>Всі завдання</span>
            <span className="text-[10px] opacity-75">({safeOrders.length})</span>
          </button>

          {safeCategories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryClick(c.id)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-emerald-500/30 ring-2 ring-emerald-500/50'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-base">{c.icon}</span>
                <span>{c.name}</span>
                {c._count?.orders > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {c._count.orders}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Sponsored Ad Banner Slot */}
      <SponsoredBannerCard />

      {/* 6. Task List Feed */}
      <div id="task-feed-section" className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>📋</span>
            <span>
              {activeCategoryObj
                ? `${activeCategoryObj.icon} ${activeCategoryObj.name} (${filteredOrders.length})`
                : `Доступні доручення (${filteredOrders.length})`}
            </span>
          </h2>
          {selectedCategory ? (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Показати всі
            </button>
          ) : (
            <button
              onClick={loadData}
              className="text-xs text-cash-dark dark:text-emerald-400 hover:underline font-medium"
            >
              Оновити
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 py-8 items-center justify-center text-slate-400 text-sm">
            <div className="animate-spin text-2xl">⏳</div>
            <span>Завантажуємо завдання...</span>
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => <TaskCard key={order.id} order={order} />)
        ) : (
          <div className="ticket-card p-8 text-center flex flex-col items-center gap-2">
            <span className="text-4xl">📦</span>
            <div className="font-semibold text-sm text-slate-900 dark:text-white">
              Поки немає завдань у цій категорії
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Створіть завдання або оберіть іншу категорію робіт.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}