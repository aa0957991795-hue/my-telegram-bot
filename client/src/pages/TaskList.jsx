import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TaskCard from '../components/TaskCard.jsx';
import SponsoredBannerCard from '../components/SponsoredBannerCard.jsx';

export default function TaskList() {
  const { user } = useAuth();
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

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      {/* Promotional Free Spots Banner for Performers */}
      {freeSpots && (
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold flex items-center gap-1">
                <span>🎁 АКЦІЯ ДЛЯ МАЙСТРІВ</span>
              </div>
              <h2 className="font-display text-base font-extrabold mt-1 leading-snug">
                Безкоштовних місць для виконавців: залишилось{' '}
                <span className="text-amber-300 underline underline-offset-2">
                  {freeSpots.remainingSpots}
                </span>{' '}
                зі {freeSpots.totalFreeSpots}
              </h2>
              <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                Перші 100 зареєстрованих майстрів працюють з 0% комісії платформи назавжди!
              </p>
            </div>
            <div className="text-3xl opacity-90 select-none">⚡</div>
          </div>
        </div>
      )}

      {/* Greeting Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm">
        <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
          Швидкий заробіток та підробіток
        </div>
        <h1 className="font-display text-lg font-bold mt-1">
          Завдання поруч із вами 💵
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Прямий розрахунок готівкою після виконання роботи
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <input
          type="text"
          className="input pl-10 pr-10"
          placeholder="Пошук завдань (напр. вантажник, прибирання)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute left-3.5 text-ink/40 text-sm">🔍</span>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTimeout(loadData, 50);
            }}
            className="absolute right-3.5 text-xs text-ink/40 hover:text-ink"
          >
            ✕
          </button>
        )}
      </form>

      {/* Horizontal Category Scroll */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === null
                ? 'bg-ink text-white shadow-sm'
                : 'bg-white border border-line text-ink/70 hover:bg-slate-50'
            }`}
          >
            🔥 Всі завдання
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedCategory === c.id
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-white border border-line text-ink/70 hover:bg-slate-50'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
              {c._count?.orders > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === c.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink/60'
                }`}>
                  {c._count.orders}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sponsored Ad Banner Slot (checked via VITE_ADS_ENABLED) */}
      <SponsoredBannerCard />

      {/* Task List Feed */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-ink">
            Доступні доручення ({orders.length})
          </h2>
          <button
            onClick={loadData}
            className="text-xs text-cash-dark hover:underline font-medium"
          >
            Оновити
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 py-6 items-center justify-center text-ink/40 text-sm">
            <div className="animate-spin text-2xl">⏳</div>
            <span>Завантажуємо завдання...</span>
          </div>
        ) : orders.length > 0 ? (
          orders.map((order) => <TaskCard key={order.id} order={order} />)
        ) : (
          <div className="ticket-card p-8 text-center flex flex-col items-center gap-2">
            <span className="text-4xl">📦</span>
            <div className="font-semibold text-sm text-ink">Поки немає активних завдань</div>
            <p className="text-xs text-ink/50 max-w-xs">
              У вибраній категорії або місті поки немає заявок. Ви можете створити завдання першим!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}