import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, FILES_URL } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('topups'); // 'topups' | 'orders' | 'disputes' | 'messages' | 'settings' | 'banners'
  const [topups, setTopups] = useState([]);
  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUserChat, setSelectedUserChat] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [adminTelegramId, setAdminTelegramId] = useState('');
  const [stats, setStats] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Quick message modal state
  const [quickMsgUser, setQuickMsgUser] = useState(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [quickMsgBusy, setQuickMsgBusy] = useState(false);

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
      const localMessages = JSON.parse(localStorage.getItem('custom_admin_messages') || '[]');
      const storedAdminId = localStorage.getItem('admin_telegram_id') || '';
      return { localTopups, localOrders, localDisputes, localMessages, storedAdminId };
    } catch {
      return { localTopups: [], localOrders: [], localDisputes: [], localMessages: [], storedAdminId: '' };
    }
  }

  async function load() {
    const { localTopups, localOrders, localDisputes, localMessages, storedAdminId } = loadLocalData();
    setAdminTelegramId(storedAdminId);

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
      setMessages(localMessages);

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
      console.warn("Помилка завантаження API адмінки, використовуються локальні:", err);
      setTopups(localTopups);
      setOrders(localOrders);
      setDisputes(localDisputes);
      setMessages(localMessages);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approveTopup(id) {
    setBusyId(id);
    try {
      await api.post(`/admin/topups/${id}/approve`).catch(() => null);

      const localTopups = JSON.parse(localStorage.getItem('custom_topup_requests') || '[]');
      const updated = localTopups.map((item) =>
        item.id === id ? { ...item, status: 'approved' } : item
      );
      localStorage.setItem('custom_topup_requests', JSON.stringify(updated));

      setNotification({ type: 'success', text: 'Квитанцію підтверджено, баланс нараховано користувачу!' });
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
    const notes = window.prompt("Введіть коментар/рішення щодо скарги (буде надіслано користувачу в Telegram):", "Питання врегульовано адміністрацією.");
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

  async function handleSendQuickMessage(e) {
    e.preventDefault();
    if (!quickMsgText.trim() || !quickMsgUser) return;

    setQuickMsgBusy(true);

    const newMsg = {
      id: Date.now(),
      targetTelegramId: quickMsgUser.telegramId || quickMsgUser.id,
      targetUserName: quickMsgUser.firstName || quickMsgUser.name || 'Користувач',
      text: quickMsgText.trim(),
      senderRole: 'ADMIN',
      createdAt: new Date().toISOString(),
    };

    // Save locally
    try {
      const existing = JSON.parse(localStorage.getItem('custom_admin_messages') || '[]');
      localStorage.setItem('custom_admin_messages', JSON.stringify([newMsg, ...existing]));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    // Send via API
    try {
      await api.post('/admin/messages/send', {
        userId: quickMsgUser.id,
        telegramId: quickMsgUser.telegramId,
        text: quickMsgText.trim(),
      }).catch(() => null);

      setNotification({
        type: 'success',
        text: `Повідомлення успішно надіслано в Telegram користувачу ${quickMsgUser.firstName || 'Користувач'}!`,
      });
      setQuickMsgText('');
      setQuickMsgUser(null);
      await load();
    } catch {
      setNotification({ type: 'error', text: 'Помилка надсилання повідомлення' });
    } finally {
      setQuickMsgBusy(false);
    }
  }

  async function handleSaveAdminId(e) {
    e.preventDefault();
    if (!adminTelegramId.trim()) return;

    localStorage.setItem('admin_telegram_id', adminTelegramId.trim());

    try {
      await api.post('/admin/settings/admin-id', { telegramId: adminTelegramId.trim() }).catch(() => null);
      setNotification({
        type: 'success',
        text: `Ваш Telegram ID (${adminTelegramId}) збережено! Тепер сповіщення про чеки та скарги надходитимуть вам у Telegram.`,
      });
    } catch {
      setNotification({
        type: 'info',
        text: `Telegram ID (${adminTelegramId}) збережено локально.`,
      });
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
        <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-red-200 dark:border-red-800/50">
          <span>👑</span>
          <span>ADMIN ONLY</span>
        </span>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200'
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Admin Telegram ID Connection Box */}
      <form onSubmit={handleSaveAdminId} className="ticket-card p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
            <span>🤖</span>
            <span>Підключення сповіщень Telegram:</span>
          </div>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
            {adminTelegramId ? '✓ Підключено' : 'Потрібен ID'}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-tight">
          Введіть ваш Telegram ID (дізнайтеся через <b>@userinfobot</b>), щоб бот пересилав вам усі чеки, скарги та запити.
        </p>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            className="input bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-xs flex-1 py-1.5"
            placeholder="Ваш Telegram ID (напр. 123456789)"
            value={adminTelegramId}
            onChange={(e) => setAdminTelegramId(e.target.value)}
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95"
          >
            Зберегти
          </button>
        </div>
      </form>

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
      <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl flex gap-1 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTab('topups')}
          className={`whitespace-nowrap px-3 py-2 rounded-lg transition-all ${
            tab === 'topups' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          💳 Чеки ({pendingTopups.length})
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`whitespace-nowrap px-3 py-2 rounded-lg transition-all ${
            tab === 'orders' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          📋 Завдання ({orders.length})
        </button>
        <button
          onClick={() => setTab('disputes')}
          className={`whitespace-nowrap px-3 py-2 rounded-lg transition-all ${
            tab === 'disputes' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          🚩 Скарги ({openDisputes.length})
        </button>
        <button
          onClick={() => setTab('messages')}
          className={`whitespace-nowrap px-3 py-2 rounded-lg transition-all ${
            tab === 'messages' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          💬 Чат ({messages.length})
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
                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{t.User?.firstName || 'Користувач'}</span>
                    {t.User?.username && <span className="text-xs text-slate-400">@{t.User.username}</span>}
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

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    t.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status === 'approved' ? 'Схвалено ✓' : t.status === 'rejected' ? 'Відхилено ✕' : 'Очікує перевірки ⏳'}
                  </span>

                  <button
                    onClick={() => setQuickMsgUser({ id: t.User?.id, telegramId: t.User?.telegramId, firstName: t.User?.firstName })}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>Написати користувачу</span>
                  </button>
                </div>

                {t.status === 'pending' && (
                  <div className="flex gap-2 mt-1">
                    <button
                      disabled={busyId === t.id}
                      onClick={() => approveTopup(t.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-2.5 text-xs font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      {busyId === t.id ? 'Обробка...' : '✓ Схвалити та нарахувати'}
                    </button>
                    <button
                      disabled={busyId === t.id}
                      onClick={() => rejectTopup(t.id)}
                      className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-full py-2.5 text-xs font-semibold active:scale-95 transition-all"
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
                <button
                  onClick={() => setQuickMsgUser({ id: o.customer?.id, telegramId: o.customer?.telegramId, firstName: o.customer?.firstName })}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>💬</span>
                  <span>Написати автору</span>
                </button>

                <button
                  onClick={() => handleDeleteOrder(o.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/40"
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

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setQuickMsgUser({ id: d.user?.id, telegramId: d.user?.telegramId, firstName: d.user?.firstName })}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>💬</span>
                  <span>Написати заявнику в Telegram</span>
                </button>

                {d.status === 'OPEN' && (
                  <button
                    disabled={busyId === d.id}
                    onClick={() => resolveDispute(d.id)}
                    className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                  >
                    ✓ Вирішити
                  </button>
                )}
              </div>
            </div>
          ))}

          {disputes.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8 ticket-card bg-slate-50 dark:bg-slate-900">
              ✅ Скарг від користувачів немає
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Messages / Client Chat History */}
      {tab === 'messages' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
              Історія надісланих повідомлень ({messages.length})
            </h2>
            <button onClick={load} className="text-xs text-cash-dark dark:text-emerald-400 hover:underline font-medium">
              Оновити
            </button>
          </div>

          <div className="ticket-card p-3 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 text-xs text-blue-950 dark:text-blue-200">
            💡 <b>Як спілкуватися з користувачами:</b>
            <p className="mt-0.5 text-[11px] text-blue-800 dark:text-blue-300">
              1. Натисніть кнопку <b>«Написати користувачу»</b> на будь-якій картці чека чи скарги.<br />
              2. Або відповідайте прямо в Telegram, натиснувши <b>Reply</b> на сповіщення від бота.
            </p>
          </div>

          {messages.map((m) => (
            <div key={m.id} className="ticket-card p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Одержувач: {m.targetUserName} (TG ID: {m.targetTelegramId})
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(m.createdAt).toLocaleString('uk-UA')}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                "{m.text}"
              </p>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8 ticket-card bg-slate-50 dark:bg-slate-900">
              Повідомлень поки що не надсилалось
            </div>
          )}
        </div>
      )}

      {/* Quick Message to User Modal */}
      {quickMsgUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleSendQuickMessage}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>💬</span>
                  <span>Написати {quickMsgUser.firstName || 'користувачу'}</span>
                </h3>
                <p className="text-xs text-slate-500">Повідомлення надійде йому в чат Telegram від бота</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickMsgUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Текст повідомлення:
              </label>
              <textarea
                rows={4}
                required
                className="input text-xs"
                placeholder="Введіть текст відповіді або уточнення для клієнта..."
                value={quickMsgText}
                onChange={(e) => setQuickMsgText(e.target.value)}
              />
            </div>

            <button
              disabled={quickMsgBusy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-full text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {quickMsgBusy ? 'Надсилання...' : 'Надіслати через Telegram-бота 🚀'}
            </button>
          </form>
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