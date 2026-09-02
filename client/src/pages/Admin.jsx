import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, FILES_URL } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('topups'); // 'topups' | 'disputes' | 'banners'
  const [topups, setTopups] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [banners, setBanners] = useState([]);
  const [stats, setStats] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notification, setNotification] = useState(null);

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

  async function load() {
    try {
      const [t, s, d, b] = await Promise.all([
        api.get("/admin/topups", { params: { status: "pending" } }),
        api.get("/admin/stats"),
        api.get("/admin/disputes"),
        api.get("/admin/banners"),
      ]);
      setTopups(t.data);
      setStats(s.data);
      setDisputes(d.data);
      setBanners(b.data);
    } catch (err) {
      console.error("Помилка завантаження даних адмінки:", err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approveTopup(id) {
    setBusyId(id);
    try {
      await api.post(`/admin/topups/${id}/approve`);
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
      await api.post(`/admin/topups/${id}/reject`);
      setNotification({ type: 'info', text: 'Заявку відхилено' });
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
      await api.post(`/admin/disputes/${id}/resolve`, { adminNotes: notes });
      setNotification({ type: 'success', text: 'Скаргу позначено як вирішену!' });
      await load();
    } catch (err) {
      setNotification({ type: 'error', text: 'Помилка закриття скарги' });
    } finally {
      setBusyId(null);
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
      });
      setNotification({ type: 'success', text: 'Рекламний банер успішно створено!' });
      setBannerForm({ title: '', description: '', targetUrl: '', imageUrl: '', cityId: '', isActive: 'true' });
      setBannerFile(null);
      await load();
    } catch (err) {
      setNotification({ type: 'error', text: err?.response?.data?.error || 'Помилка створення банера' });
    } finally {
      setBannerBusy(false);
    }
  }

  async function handleDeleteBanner(id) {
    if (!window.confirm('Видалити цей рекламний банер?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setNotification({ type: 'success', text: 'Банер видалено!' });
      await load();
    } catch (err) {
      setNotification({ type: 'error', text: 'Помилка видалення' });
    }
  }

  return (
    <div className="p-4 pb-28 max-w-md mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="text-xs font-semibold text-ink/60 hover:text-ink"
          >
            ← Кабінет
          </button>
          <h1 className="font-display text-xl font-bold">Адмін-панель</h1>
        </div>
        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
          ADMIN
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
          <Stat label="Замовлення" value={stats.orders} />
          <Stat label="Чеки" value={stats.pendingTopups} accent={stats.pendingTopups > 0} />
          <Stat label="Скарги" value={stats.openDisputes} warn={stats.openDisputes > 0} />
        </div>
      )}

      {/* Admin Tabs */}
      <div className="bg-slate-200/80 p-1 rounded-xl flex gap-1 text-xs font-semibold">
        <button
          onClick={() => setTab('topups')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'topups' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
          }`}
        >
          💳 Чеки ({topups.length})
        </button>
        <button
          onClick={() => setTab('disputes')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'disputes' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
          }`}
        >
          ⚠️ Скарги ({disputes.filter((d) => d.status === 'OPEN').length})
        </button>
        <button
          onClick={() => setTab('banners')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            tab === 'banners' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
          }`}
        >
          📢 Реклама ({banners.length})
        </button>
      </div>

      {/* TAB 1: Topup Requests */}
      {tab === 'topups' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm">
              Чеки на перевірку ({topups.length})
            </h2>
            <button onClick={load} className="text-xs text-cash-dark hover:underline font-medium">
              Оновити
            </button>
          </div>

          {topups.map((t) => (
            <div key={t.id} className="ticket-card p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {t.User?.firstName} {t.User?.lastName || ''} {t.User?.username && `@${t.User.username}`}
                  </div>
                  <div className="text-xs text-ink/50">
                    Поточний баланс: {Number(t.User?.balance).toFixed(0)} ₴
                  </div>
                </div>
                <div className="amount text-cash-dark text-lg font-bold">
                  +{Number(t.amount).toFixed(0)} ₴
                </div>
              </div>

              <a href={`${FILES_URL}${t.receiptUrl}`} target="_blank" rel="noreferrer" className="block mt-2.5 group">
                <img
                  src={`${FILES_URL}${t.receiptUrl}`}
                  alt="чек"
                  className="w-full max-h-64 object-contain rounded-xl border border-line bg-slate-50 p-1 group-hover:opacity-90 transition-opacity"
                />
                <span className="text-[11px] text-ink/40 text-center block mt-1">
                  🔍 Натисніть для відкриття в повному розмірі
                </span>
              </a>

              <div className="flex gap-2 mt-3">
                <button
                  disabled={busyId === t.id}
                  onClick={() => approveTopup(t.id)}
                  className="flex-1 bg-cash hover:bg-cash-dark text-white rounded-full py-2.5 text-xs font-semibold shadow-sm active:scale-95 transition-all"
                >
                  {busyId === t.id ? 'Обробка...' : 'Підтвердити'}
                </button>
                <button
                  disabled={busyId === t.id}
                  onClick={() => rejectTopup(t.id)}
                  className="flex-1 bg-ink/10 hover:bg-ink/20 text-ink rounded-full py-2.5 text-xs font-semibold active:scale-95 transition-all"
                >
                  Відхилити
                </button>
              </div>
            </div>
          ))}

          {topups.length === 0 && (
            <div className="text-sm text-ink/40 text-center py-8 ticket-card bg-slate-50">
              ✅ Немає заявок, які очікують перевірки
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Disputes */}
      {tab === 'disputes' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm">
              Скарги користувачів ({disputes.length})
            </h2>
            <button onClick={load} className="text-xs text-cash-dark hover:underline font-medium">
              Оновити
            </button>
          </div>

          {disputes.map((d) => (
            <div key={d.id} className="ticket-card p-3.5 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-ink/50">Завдання #{d.orderId}</div>
                  <h4 className="font-bold text-sm text-ink">{d.order?.title}</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  d.status === 'OPEN' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {d.status === 'OPEN' ? 'Відкрито' : 'Вирішено'}
                </span>
              </div>

              <div className="bg-red-50/70 p-2.5 rounded-xl border border-red-100 text-xs text-red-900">
                <span className="font-semibold">Скарга від {d.user?.firstName}:</span> "{d.reason}"
              </div>

              <div className="text-xs text-ink/60 flex flex-col gap-1 border-t border-line pt-2">
                <div><strong>Замовник:</strong> {d.order?.customer?.firstName} ({d.order?.customer?.phone || 'без телефону'})</div>
                <div><strong>Виконавець:</strong> {d.order?.performer?.firstName} ({d.order?.performer?.phone || 'без телефону'})</div>
              </div>

              {d.status === 'OPEN' && (
                <button
                  disabled={busyId === d.id}
                  onClick={() => resolveDispute(d.id)}
                  className="mt-1 bg-ink hover:bg-black text-white text-xs font-semibold py-2 rounded-xl"
                >
                  Вирішити скаргу
                </button>
              )}
            </div>
          ))}

          {disputes.length === 0 && (
            <div className="text-sm text-ink/40 text-center py-8 ticket-card bg-slate-50">
              ✅ Скарг та відкритих спорів немає
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Sponsored Banners CRUD */}
      {tab === 'banners' && (
        <div className="flex flex-col gap-4">
          <div className="ticket-card p-4 bg-amber-50/40 border-amber-200">
            <h3 className="font-bold text-sm text-ink mb-2">➕ Створити рекламний банер</h3>
            <form onSubmit={handleCreateBanner} className="flex flex-col gap-3">
              <input
                required
                className="input bg-white text-xs"
                placeholder="Заголовок банера (напр. Знижка 20% на інструменти)"
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
              />

              <input
                className="input bg-white text-xs"
                placeholder="Короткий опис"
                value={bannerForm.description}
                onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
              />

              <input
                required
                className="input bg-white text-xs"
                placeholder="Цільове посилання (URL, напр. https://partner.ua)"
                value={bannerForm.targetUrl}
                onChange={(e) => setBannerForm({ ...bannerForm, targetUrl: e.target.value })}
              />

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-ink/60">Зображення банера:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files[0])}
                  className="text-xs text-ink/70"
                />
              </div>

              <button
                disabled={bannerBusy}
                className="bg-cash hover:bg-cash-dark text-white rounded-full py-2.5 text-xs font-semibold shadow-sm transition-all"
              >
                {bannerBusy ? 'Створення...' : 'Зберегти банер'}
              </button>
            </form>
          </div>

          <h3 className="font-bold text-sm text-ink">Існуючі банери ({banners.length})</h3>

          <div className="flex flex-col gap-2">
            {banners.map((b) => (
              <div key={b.id} className="ticket-card p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-ink">{b.title}</div>
                  <div className="text-[10px] text-ink/50 truncate max-w-[200px]">{b.targetUrl}</div>
                </div>
                <button
                  onClick={() => handleDeleteBanner(b.id)}
                  className="text-red-500 hover:text-red-700 text-xs p-1"
                  title="Видалити"
                >
                  🗑️
                </button>
              </div>
            ))}

            {banners.length === 0 && (
              <div className="text-xs text-ink/40 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-line">
                Банерів поки немає
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent, warn }) {
  return (
    <div className="ticket-card p-2.5 text-center">
      <div className={`amount text-lg font-bold ${accent ? "text-cash-dark" : warn ? "text-red-600" : "text-ink"}`}>{value}</div>
      <div className="text-[10px] text-ink/40 mt-0.5">{label}</div>
    </div>
  );
}