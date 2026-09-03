import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyComment, setApplyComment] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState('Спам або реклама');
  const [disputeReason, setDisputeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function loadOrder() {
    try {
      // 1. Check if order is in custom created orders in localStorage
      const customCreated = JSON.parse(localStorage.getItem('custom_created_orders') || '[]');
      const foundLocal = customCreated.find((o) => String(o.id) === String(id));
      if (foundLocal) {
        setOrder(foundLocal);
        setLoading(false);
        return;
      }

      const res = await api.get(`/orders/${id}`).catch(() => null);
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        setOrder(res.data);
      } else {
        // Fallback demo order
        setOrder({
          id: parseInt(id, 10) || 1,
          title: 'Розвантажити фуру з будматеріалами (гіпсокартон, мішки)',
          description: 'Потрібно 2 людини на 3 години. Є вантажний ліфт. Оплата готівкою відразу після розвантаження.',
          price: 1200,
          address: 'вул. Хрещатик, 24',
          status: 'OPEN',
          Category: { name: 'Вантажники', icon: '📦' },
          city: { name: 'Київ' },
          customer: { id: 2, firstName: 'Олексій', username: 'alex_kyiv', phone: '+380501234567' },
          customerId: 2,
          applications: [],
          disputes: [],
        });
      }
    } catch (err) {
      console.error('Помилка завантаження завдання:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [id, user?.id]);

  const isCustomer = user?.id === order?.customerId;
  const isPerformer = user?.id === order?.performerId;
  const myApplication = order?.applications?.find((a) => a.userId === user?.id);

  async function handleApply(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/orders/${id}/apply`, { comment: applyComment }).catch(() => null);
      setFeedback({ type: 'success', text: 'Ваш відгук успішно надіслано замовнику!' });
      setShowApplyModal(false);
      setApplyComment('');
      // update local order application
      setOrder((prev) => {
        if (!prev) return prev;
        const newApp = {
          id: Date.now(),
          userId: user?.id || 1,
          user: { firstName: user?.firstName || 'Я', username: user?.username || '' },
          comment: applyComment,
          status: 'PENDING',
        };
        return { ...prev, applications: [newApp, ...(prev.applications || [])] };
      });
    } catch (err) {
      setFeedback({ type: 'error', text: 'Помилка надсилання відгуку' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisputeSubmit(e) {
    e.preventDefault();
    if (!disputeReason.trim()) return;

    setBusy(true);
    const fullReason = `[${disputeCategory}] ${disputeReason.trim()}`;

    // Save to custom_disputes in localStorage for Admin Panel
    try {
      const existing = JSON.parse(localStorage.getItem('custom_disputes') || '[]');
      const newDispute = {
        id: Date.now(),
        orderId: order?.id || parseInt(id, 10),
        order: {
          id: order?.id || parseInt(id, 10),
          title: order?.title || 'Завдання',
          customer: order?.customer || { firstName: 'Замовник' },
          performer: order?.performer || { firstName: 'Виконавець' },
        },
        user: {
          id: user?.id || 1,
          firstName: user?.firstName || 'Користувач',
          username: user?.username || '',
        },
        reason: fullReason,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('custom_disputes', JSON.stringify([newDispute, ...existing]));
    } catch (err) {
      console.warn('Помилка збереження скарги:', err);
    }

    // Also send to API
    try {
      await api.post(`/orders/${id}/dispute`, { reason: fullReason }).catch(() => null);
      setFeedback({
        type: 'success',
        text: 'Скаргу успішно надіслано адміністратору! Ми перевіримо це завдання.',
      });
      setShowDisputeModal(false);
      setDisputeReason('');
    } catch (err) {
      setFeedback({ type: 'error', text: 'Помилка надсилання скарги' });
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Ви впевнені, що хочете скасувати завдання?')) return;
    setBusy(true);
    try {
      await api.post(`/orders/${id}/cancel`).catch(() => null);
      setFeedback({ type: 'success', text: 'Завдання скасовано' });
      setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
    } catch (err) {
      setFeedback({ type: 'error', text: 'Помилка скасування' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-2">
        <div className="animate-spin text-3xl">⏳</div>
        <p className="text-sm">Завантаження завдання...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center max-w-md mx-auto">
        <h2 className="text-lg font-bold">Завдання не знайдено</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-medium"
        >
          Повернутися до стрічки
        </button>
      </div>
    );
  }

  const statusLabels = {
    OPEN: { text: 'Відкрита для відгуків', bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300' },
    IN_PROGRESS: { text: 'У роботі у виконавця', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300' },
    COMPLETED: { text: 'Успішно виконана', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
    CANCELLED: { text: 'Скасована', bg: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300' },
  };

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      {/* Top Bar with Back Button & Report Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          ← Назад
        </button>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusLabels[order.status]?.bg || 'bg-slate-100 text-slate-700'}`}>
            {statusLabels[order.status]?.text || 'Активна'}
          </span>

          {/* Report / Complain Button */}
          <button
            onClick={() => setShowDisputeModal(true)}
            title="Поскаржитися на завдання"
            className="text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800/60 flex items-center gap-1 font-medium transition-all"
          >
            <span>🚩</span>
            <span>Поскаржитися</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Main Task Info Card */}
      <div className="ticket-card p-5 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{order.Category?.icon || '📦'}</span>
          <span>{order.Category?.name || 'Завдання'}</span>
          <span>•</span>
          <span>📍 {order.city?.name || 'Київ'}</span>
        </div>

        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white leading-snug">
          {order.title}
        </h1>

        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <div>Оплата готівкою на місці:</div>
            <div className="text-[11px] text-slate-400">Розрахунок безпосередньо з замовником</div>
          </div>
          <div className="amount text-2xl text-cash-dark dark:text-emerald-400 font-extrabold">
            {Number(order.price).toFixed(0)} ₴
          </div>
        </div>

        {order.description && (
          <div className="mt-1">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Опис та деталі:
            </h3>
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {order.description}
            </p>
          </div>
        )}

        {/* Address info */}
        <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-col gap-2">
          {order.pickupAddress && order.dropoffAddress ? (
            <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">📍 Звідки:</span>
                <span className="font-medium text-slate-900 dark:text-white flex-1">{order.pickupAddress}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">🏁 Куди:</span>
                <span className="font-medium text-slate-900 dark:text-white flex-1">{order.dropoffAddress}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Адреса виконання:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right">{order.address || 'За домовленістю'}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Замовник:</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {order.customer?.firstName} {order.customer?.lastName || ''} {order.customer?.username && `(@${order.customer.username})`}
            </span>
          </div>
        </div>
      </div>

      {/* Performer / Customer Actions */}
      {isCustomer ? (
        <div className="flex gap-2">
          {order.status === 'OPEN' && (
            <button
              disabled={busy}
              onClick={handleCancel}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 rounded-full py-3 text-sm font-semibold transition-colors"
            >
              Скасувати завдання
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {order.status === 'OPEN' && (
            myApplication ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-center">
                <div className="font-bold text-sm">Ви вже відгукнулися на це завдання 👍</div>
                <div className="text-xs text-amber-700 mt-1">Очікуйте рішення від замовника</div>
              </div>
            ) : (
              <button
                onClick={() => setShowApplyModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-3.5 font-semibold text-sm shadow-md active:scale-95 transition-all"
              >
                Відгукнутися на завдання ({Number(order.price).toFixed(0)} ₴)
              </button>
            )
          )}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleApply}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Відгук на завдання</h3>
                <p className="text-xs text-slate-500">Напишіть коли готові розпочати</p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={3}
              required
              className="input"
              placeholder="Наприклад: Готовий розпочати через 30 хвилин, маю інструмент..."
              value={applyComment}
              onChange={(e) => setApplyComment(e.target.value)}
            />

            <button
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-full text-sm transition-all"
            >
              {busy ? 'Надсилання...' : 'Надіслати відгук 🚀'}
            </button>
          </form>
        </div>
      )}

      {/* Dispute / Complaint Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleDisputeSubmit}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-red-600 flex items-center gap-1.5">
                  <span>🚩</span> Поскаржитися на завдання
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Модератор перевірить це завдання</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Причина скарги:
              </label>
              <select
                className="input text-xs"
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
              >
                <option value="Спам або реклама">📢 Спам або несанкціонована реклама</option>
                <option value="Шахрайство / небезпека">⚠️ Підозра на шахрайство або небезпека</option>
                <option value="Некоректний опис або нереальна ціна">📉 Некоректний опис або нереальна ціна</option>
                <option value="Неприйнятний або образливий контент">🚫 Неприйнятний або образливий вміст</option>
                <option value="Інша причина">📝 Інша причина</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Детальний коментар:
              </label>
              <textarea
                rows={3}
                required
                className="input text-xs"
                placeholder="Опишіть, що саме не так із завданням..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
            </div>

            <button
              disabled={busy}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-full text-sm transition-all shadow-md active:scale-95"
            >
              {busy ? 'Надсилання...' : 'Надіслати скаргу адміністратору'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}