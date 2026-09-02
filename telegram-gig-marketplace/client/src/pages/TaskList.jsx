import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TaskCard from '../components/TaskCard.jsx';
import SponsoredBannerCard from '../components/SponsoredBannerCard.jsx';

export default function TaskList() {
  const { user, tgUser } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [freeSpots, setFreeSpots] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [catsRes, ordersRes, freeSpotsRes] = await Promise.all([
        api.get('/catalog/categories'),
        api.get('/orders', {
          params: {
            categoryId: selectedCategory || undefined,
            cityId: user?.cityId || undefined,
            search: search || undefined,
            status: 'OPEN',
          },
        }),
        api.get('/catalog/free-spots').catch(() => ({ data: null })),
      ]);
      setCategories(catsRes.data);
      setOrders(ordersRes.data);
      if (freeSpotsRes?.data) {
        setFreeSpots(freeSpotsRes.data);
      }
    } catch (err) {
      console.error('Помилка завантаження стрічки завдань:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedCategory, user?.cityId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const displayName = user?.firstName || tgUser?.first_name || 'Користувач';
  const photoUrl = tgUser?.photo_url;
  const isFreeCommission = user?.commissionOverridePercent === 0;

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      
      {/* 1. App Header / User Welcome Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white p-5 rounded-3xl shadow-lg border border-slate-700/50 relative overflow-hidden">
        {/* Glow decoration */}
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
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 cursor-pointer transition-all"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="w-6 h-6 rounded-full object-cover border border-white/30"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                  {displayName[0]}
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

          {/* Quick Badges: Commission status & City */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span>📍</span> {user?.city?.name || 'Київ'}
            </span>
            {isFreeCommission ? (
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>✨</span> 0% комісії (Перші 100)
              </span>
            ) : (
              <span className="bg-white/10 text-slate-300 text-[10px] px-2.5 py-1 rounded-full">
                💵 Оплата готівкою
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Primary Action Buttons (Large & Clear) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Button A: Create Task */}
        <button
          onClick={() => navigate('/create')}
          className="group ticket-card p-4 flex flex-col justify-between items-start text-left bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/30 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-800/50 hover:shadow-md active:scale-98 transition-all"
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

        {/* Button B: Find Tasks / Work */}
        <button
          onClick={() => {
            const feedElem = document.getElementById('task-feed-section');
            if (feedElem) feedElem.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group ticket-card p-4 flex flex-col justify-between items-start text-left bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/30 dark:to-slate-900 border-blue-200/80 dark:border-blue-800/50 hover:shadow-md active:scale-98 transition-all"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
            💼
          </div>
          <div className="mt-3">
            <div className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              Знайти підробіток
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {orders.length} активних замовлень
            </div>
          </div>
        </button>
      </div>

      {/* 3. Promotional Free Spots Banner for Performers */}
      {freeSpots && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold flex items-center gap-1">
                <span>🎁 АКЦІЯ ДЛЯ МАЙСТРІВ</span>
              </div>
              <h2 className="font-display text-sm font-extrabold mt-0.5 leading-snug">
                Безкоштовних місць: залишилось{' '}
                <span className="text-amber-300 underline underline-offset-2">
                  {freeSpots.remainingSpots}
                </span>{' '}
                зі {freeSpots.totalFreeSpots}
              </h2>
              <p className="text-[11px] text-emerald-100 mt-0.5 leading-relaxed">
                Перші 100 майстрів працюють з 0% комісії платформи назавжди!
              </p>
            </div>
            <div className="text-2xl select-none">⚡</div>
          </div>
        </div>
      )}

      {/* 4. Search Bar */}
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

      {/* 5. Horizontal Category Filter Pills */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === null
                ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-sm'
                : 'ticket-card text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            🔥 Всі завдання
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)}
              className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedCategory === c.id
                  ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-sm'
                  : 'ticket-card text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
              {c._count?.orders > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === c.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {c._count.orders}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Sponsored Ad Banner Slot (checked via VITE_ADS_ENABLED) */}
      <SponsoredBannerCard />

      {/* 7. Task List Feed */}
      <div id="task-feed-section" className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>📋</span>
            <span>Доступні доручення ({orders.length})</span>
          </h2>
          <button
            onClick={loadData}
            className="text-xs text-cash-dark dark:text-emerald-400 hover:underline font-medium"
          >
            Оновити
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 py-8 items-center justify-center text-slate-400 text-sm">
            <div className="animate-spin text-2xl">⏳</div>
            <span>Завантажуємо завдання...</span>
          </div>
        ) : orders.length > 0 ? (
          orders.map((order) => <TaskCard key={order.id} order={order} />)
        ) : (
          <div className="ticket-card p-8 text-center flex flex-col items-center gap-2">
            <span className="text-4xl">📦</span>
            <div className="font-semibold text-sm text-slate-900 dark:text-white">
              Поки немає активних завдань
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              У вибраній категорії або місті поки немає заявок. Ви можете створити завдання першим!
            </p>
            <button
              onClick={() => navigate('/create')}
              className="mt-2 bg-cash hover:bg-cash-dark text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm"
            >
              + Створити перше завдання
            </button>
          </div>
        )}
      </div>

    </div>
  );
}