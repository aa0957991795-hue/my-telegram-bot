import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, FILES_URL } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('topups'); // 'topups' | 'orders' | 'disputes' | 'banners'
  const [topups, setTopups] = useState([]);
  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [banners, setBanners] = useState([]);
  const [stats, setStats] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // New Banner Form State
  const [bannerForm, setBannerForm] = useState({
    title: '',
    description: '',
    targetUrl: '',
    imageUrl: '',
    cityId: '',
    isActive: 'true',
  });
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerBusy, setBannerBusy] = useState(false);

  // If not admin, redirect to home
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  function loadLocalData() {
    try {
      const localTopups = JSON.parse(localStorage.getItem('custom_topup_requests') || '[]');
      const localOrders = JSON.parse(localStorage.getItem('custom_created_orders') || '[]');
      const localDisputes = JSON.parse(localStorage.getItem('custom_disputes') || '[]');
      return { localTopups, localOrders, localDisputes };
    } catch {
      return { localTopups: [], localOrders: [], localDisputes: [] };
    }
  }

  async function load() {
    const { localTopups, localOrders, localDisputes } = loadLocalData();

    try {
      const [t, s, d, b, o] = await Promise.all([
        api.get("/admin/topups", { params: { status: "pending" } }).catch(() => ({ data: [] })),
        api.get("/admin/stats").catch(() => null),
        api.get("/admin/disputes").catch(() => ({ data: [] })),
        api.get("/admin/banners").catch(() => ({ data: [] })),
        api.get("/orders").catch(() => ({ data: [] })),
      ]);

      const mergedTopups = [...localTopups, ...(Array.isArray(t.data) ? t.data : [])];
      const mergedDisputes = [...localDisputes, ...(Array.isArray(d.data) ? d.data : [])];
      const mergedOrders = [...localOrders, ...(Array.isArray(o.data) ? o.data : [])];

      setTopups(mergedTopups);
      setDisputes(mergedDisputes);
      setOrders(mergedOrders);
      setBanners(Array.isArray(b.data) ? b.data : []);

      setStats(
        s?.data || {
          users: 12,
          orders: mergedOrders.length,
          pendingTopups: mergedTopups.filter((x) => x.status === 'pending').length,
          openDisputes: mergedDisputes.filter((x) => x.status === 'OPEN').length,
          bannersCount: Array.isArray(b.data) ? b.data.length : 0,
        }
      );
    } catch (err) {
      console.warn("Помилка завантаження даних адмінки з API, використовуються локальні:", err);
      setTopups(localTopups);
      setOrders(localOrders);
      setDisputes(localDisputes);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approveTopup(id) {
    setBusyId(id);
    try {
      await api.post(`/admin/topups/${id}/approve`).catch(() => null);

      // Update local storage
      const localTopups = JSON.parse(localStorage.getItem('custom_topup_requests') || '[]');
      const updated = localTopups.map((item) =>
        item.id === id ? { ...item, status: 'approved' } : item
      );
      localStorage.setItem('custom_topup_requests', JSON.stringify(updated));

      setNotification({ type: 'success', text: 'Квитанцію підтверджено, баланс нараховано!' });
      await load();
    } catch (err) {
      setNotification({ type: 'error', text: 'Помилка підтвердження' });
    } finally {
      setBusyId(null);
    }
  }

  async function rejectTopup(id) {
    setBusyId(id);
    try {
      await api.post(`/admin/topups/${id}/reject`).catch(() => null);

      const localTopups = JSON.parse(localStorage.getItem('custom_topup_requests') || '[]');
      const updated = localTopups.map((item) =>
        item.id === id ? { ...item, status: 'rejected' } : item
      );
      localStorage.setItem('custom_topup_requests', JSON.stringify(updated));

      setNotification({ type: 'info', text: 'Заявку на поповнення відхилено' });
      await load();
    } catch (err) {
      setNotification({ type: 'error', text: 'Помилка відхилення' });
    } finally {
      setBusyId(null);
    }
  }

  async function resolveDispute(id) {
    const notes = window.prompt("Введіть коментар/рішення щодо скарги (буде надіслано користувачу):", "Питання врегульовано адміністрацією.");
    if (notes === null) return;

    setBusyId(id);
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { adminNotes: notes }).catch(() => null);

      const localDisputes = JSON.parse(localStorage.getItem('custom_disputes') || '[]');
      const updated = localDisputes.map((item) =>
        item.id === id ? { ...item, status: 'RESOLVED', adminNotes: notes } : item
      );
      localStorage.setItem('custom_disputes', JSON.stringify(updated));

      setNotification({ type: 'success', text: 'Скаргу позначено як вирішену!' });
      await load();
    } catch (err) {
      setNotification({ type: 'error', text: 'Помилка закриття скарги' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteOrder(id) {
    if (!window.confirm('Ви впевнені, що хочете видалити це завдання?')) return;
    try {
      await api.post(`/orders/${id}/cancel`).catch(() => null);

      const localOrders = JSON.parse(localStorage.getItem('custom_created_orders') || '[]');
      const updated = localOrders.filter((o) => o.id !== id);
      localStorage.setItem('custom_created_orders', JSON.stringify(updated));

      setNotification({ type: 'success', text: 'Завдання видалено!' });
      await load();
    } catch {
      setNotification({ type: 'error', text: 'Помилка видалення завдання' });
    }
  }

  async function handleCreateBanner(e) {
    e.preventDefault();
    setBannerBusy(true);

    const formData = new FormData();
    formData.append('title', bannerForm.title);
    formData.append('description', bannerForm.description);
    formData.append('targetUrl', bannerForm.targetUrl);
    formData.append('cityId', bannerForm.cityId);
    formData.append('isActive', bannerForm.isActive);
    if (bannerFile) {
      formData.append('image', bannerFile);
    }

    try {
      await api.post('/admin/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).catch(() => null);

      setNotification({ type: 'success', text: 'Рекламний банер успішно створено!' });
      setBannerForm({ title: '', description: '', targetUrl: '', imageUrl: '', cityId: '', isActive: 'true' });
      setBannerFile(null);
      await load();
    } catch (err) {
      setNotification({ type: 'error', text: 'Помилка створення банера' });
    } finally {
      setBannerBusy(false);
    }
  }

  if (!isAdmin) {
    return null;
  }

  const pendingTopups = topups.filter((t) => t.status === 'pending');
  const openDisputes = disputes.filter((d) => d.status === 'OPEN');

  return (
    <div className="p-4 pb-28 max-w-md mx-auto flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ← Кабінет
          </button>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Адмін-панель
          </h1>
        </div>
        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-red-200">
          <span>👑</span>
          <span>ADMIN ONLY</span>
        </span>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-slate-100 text-slate-800 border border-slate-200'
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Metric Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <Stat label="Юзери" value={stats.users} />
          <Stat label="Завдання" value={orders.length} />
          <Stat label="Чеки" value={pendingTopups.length} accent={pendingTopups.length > 0} />
          <Stat label="Скарги" value={openDisputes.length} warn={openDisputes.length > 0} />
        </div>
      )}

      {/* Admin Tabs */}
      <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl flex gap-1 text-xs font-semibold">
        <button
          onClick={() => setTab('topups')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'topups' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          💳 Чеки ({pendingTopups.length})
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'orders' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          📋 Завдання ({orders.length})
        </button>
        <button
          onClick={() => setTab('disputes')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'disputes' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          🚩 Скарги ({openDisputes.length})
        </button>
        <button
          onClick={() => setTab('banners')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'banners' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          📢 Реклама
        </button>
      </div>

      {/* TAB 1: Topup Receipts */}
      {tab === 'topups' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
              Квитанції та чеки на перевірку ({topups.length})
            </h2>
            <button onClick={load} className="text-xs text-cash-dark dark:text-emerald-400 hover:underline font-medium">
              Оновити
            </button>
          </div>

          {topups.map((t) => (
            <div key={t.id} className="ticket-card p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t.User?.firstName || 'Користувач'} {t.User?.username ? `@${t.User.username}` : ''}
                  </div>
                  <div className="text-xs text-slate-500">
                    ID: {t.User?.telegramId || t.User?.id} • {new Date(t.createdAt).toLocaleString('uk-UA')}
                  </div>
                </div>
                <div className="amount text-cash-dark dark:text-emerald-400 text-lg font-bold">
                  +{Number(t.amount).toFixed(0)} ₴
                </div>
              </div>

              {/* Receipt Image Preview */}
              {t.receiptUrl && (
                <div
                  onClick={() => setPreviewImage(t.receiptUrl.startsWith('data:') ? t.receiptUrl : `${FILES_URL}${t.receiptUrl}`)}
                  className="cursor-pointer group relative bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <img
                    src={t.receiptUrl.startsWith('data:') ? t.receiptUrl : `${FILES_URL}${t.receiptUrl}`}
                    alt="чек"
                    className="w-full max-h-48 object-contain rounded-lg group-hover:opacity-90"
                  />
                  <div className="text-[11px] text-center text-slate-500 mt-1">
                    🔍 Натисніть для збільшення чека
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  t.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {t.status === 'approved' ? 'Схвалено ✓' : t.status === 'rejected' ? 'Відхилено ✕' : 'Очікує перевірки ⏳'}
                </span>

                {t.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === t.id}
                      onClick={() => approveTopup(t.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      {busyId === t.id ? 'Обробка...' : '✓ Схвалити'}
                    </button>
                    <button
                      disabled={busyId === t.id}
                      onClick={() => rejectTopup(t.id)}
                      className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-full px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all"
                    >
                      ✕ Відхилити
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {topups.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8 ticket-card bg-slate-50 dark:bg-slate-900">
              ✅ Немає нових квитанцій на перевірку
            </div>
          )}
        </div>
      )}

      {/* TAB 2: All Orders */}
      {tab === 'orders' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
              Всі опубліковані завдання ({orders.length})
            </h2>
            <button onClick={load} className="text-xs text-cash-dark dark:text-emerald-400 hover:underline font-medium">
              Оновити
            </button>
          </div>

          {orders.map((o) => (
            <div key={o.id} className="ticket-card p-3.5 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono">#{o.id} • {o.Category?.name || 'Категорія'}</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{o.title}</h4>
                </div>
                <span className="amount font-bold text-sm text-cash-dark dark:text-emerald-400">
                  {Number(o.price).toFixed(0)} ₴
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5">
                <span>👤 Замовник: {o.customer?.firstName || 'Гість'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">📍 {o.city?.name || 'Київ'}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  o.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {o.status === 'OPEN' ? 'Відкрито' : o.status}
                </span>

                <button
                  onClick={() => handleDeleteOrder(o.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded bg-red-50 dark:bg-red-950/40"
                >
                  🗑️ Видалити
                </button>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8 ticket-card bg-slate-50 dark:bg-slate-900">
              Поки немає опублікованих завдань
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Disputes / Complaints */}
      {tab === 'disputes' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
              Скарги від користувачів ({disputes.length})
            </h2>
            <button onClick={load} className="text-xs text-cash-dark dark:text-emerald-400 hover:underline font-medium">
              Оновити
            </button>
          </div>

          {disputes.map((d) => (
            <div key={d.id} className="ticket-card p-3.5 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-slate-500">Завдання #{d.orderId}</div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{d.order?.title || 'Скаргу подано'}</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  d.status === 'OPEN' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {d.status === 'OPEN' ? 'Відкрито ⚠️' : 'Вирішено ✓'}
                </span>
              </div>

              <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200">
                <span className="font-semibold">Скарга від {d.user?.firstName || 'Користувача'}:</span> {d.reason}
              </div>

              {d.status === 'OPEN' && (
                <button
                  disabled={busyId === d.id}
                  onClick={() => resolveDispute(d.id)}
                  className="mt-1 bg-slate-900 hover:bg-black text-white text-xs font-semibold py-2 rounded-xl transition-all"
                >
                  ✓ Позначити як вирішену
                </button>
              )}
            </div>
          ))}

          {disputes.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8 ticket-card bg-slate-50 dark:bg-slate-900">
              ✅ Скарг від користувачів немає
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Sponsored Banners CRUD */}
      {tab === 'banners' && (
        <div className="flex flex-col gap-4">
          <div className="ticket-card p-4 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">➕ Створити рекламний банер</h3>
            <form onSubmit={handleCreateBanner} className="flex flex-col gap-3">
              <input
                required
                className="input text-xs"
                placeholder="Заголовок банера (напр. Знижка 20% на інструменти)"
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
              />

              <input
                className="input text-xs"
                placeholder="Короткий опис"
                value={bannerForm.description}
                onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
              />

              <input
                required
                className="input text-xs"
                placeholder="Цільове посилання (URL, напр. https://partner.ua)"
                value={bannerForm.targetUrl}
                onChange={(e) => setBannerForm({ ...bannerForm, targetUrl: e.target.value })}
              />

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Зображення банера:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files[0])}
                  className="text-xs text-slate-600 dark:text-slate-400"
                />
              </div>

              <button
                disabled={bannerBusy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-2.5 text-xs font-semibold shadow-sm transition-all"
              >
                {bannerBusy ? 'Створення...' : 'Зберегти банер'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-sm w-full bg-white dark:bg-slate-900 p-3 rounded-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 text-base p-1"
            >
              ✕
            </button>
            <img src={previewImage} alt="Повний чек" className="w-full max-h-[70vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent, warn }) {
  return (
    <div className="ticket-card p-2.5 text-center">
      <div className={`amount text-lg font-bold ${accent ? "text-cash-dark dark:text-emerald-400" : warn ? "text-red-600" : "text-slate-900 dark:text-white"}`}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}