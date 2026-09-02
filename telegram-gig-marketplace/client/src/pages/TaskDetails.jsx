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
  const [disputeReason, setDisputeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function loadOrder() {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      console.error('Помилка завантаження завдання:', err);
      setFeedback({ type: 'error', text: 'Не вдалося завантажити завдання' });
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
  const myDispute = order?.disputes?.length > 0;

  async function handleApply(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/orders/${id}/apply`, { comment: applyComment });
      setFeedback({ type: 'success', text: 'Ваш відгук успішно надіслано замовнику!' });
      setShowApplyModal(false);
      setApplyComment('');
      await loadOrder();
    } catch (err) {
      setFeedback({ type: 'error', text: err?.response?.data?.error || 'Помилка надсилання відгуку' });
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptApplication(appId) {
    if (!window.confirm('Призначити цього виконавця на завдання?')) return;
    setBusy(true);
    try {
      await api.post(`/orders/${id}/accept/${appId}`);
      setFeedback({ type: 'success', text: 'Виконавця призначено! Контакти відкрито.' });
      await loadOrder();
    } catch (err) {
      setFeedback({ type: 'error', text: err?.response?.data?.error || 'Помилка призначення' });
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!window.confirm('Підтверджуєте виконання завдання? З балансу виконавця буде списано встановлену комісію.')) return;
    setBusy(true);
    try {
      await api.post(`/orders/${id}/complete`);
      setFeedback({ type: 'success', text: 'Завдання успішно виконано та комісію списано!' });
      await loadOrder();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Помилка завершення' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisputeSubmit(e) {
    e.preventDefault();
    if (!disputeReason.trim()) return;

    setBusy(true);
    try {
      await api.post(`/orders/${id}/dispute`, { reason: disputeReason });
      setFeedback({ type: 'success', text: 'Скаргу надіслано адміністратору. Ми зв’яжемося з вами найближчим часом.' });
      setShowDisputeModal(false);
      setDisputeReason('');
      await loadOrder();
    } catch (err) {
      setFeedback({ type: 'error', text: err?.response?.data?.error || 'Помилка надсилання скарги' });
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Ви впевнені, що хочете скасувати завдання?')) return;
    setBusy(true);
    try {
      await api.post(`/orders/${id}/cancel`);
      setFeedback({ type: 'success', text: 'Завдання скасовано' });
      await loadOrder();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Помилка скасування' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-ink/40 gap-2">
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
          className="mt-4 bg-ink text-white px-5 py-2.5 rounded-full text-sm font-medium"
        >
          Повернутися до стрічки
        </button>
      </div>
    );
  }

  const statusLabels = {
    OPEN: { text: 'Відкрита для відгуків', bg: 'bg-emerald-100 text-emerald-800' },
    IN_PROGRESS: { text: 'У роботі у виконавця', bg: 'bg-blue-100 text-blue-800' },
    COMPLETED: { text: 'Успішно виконана', bg: 'bg-slate-100 text-slate-700' },
    CANCELLED: { text: 'Скасована', bg: 'bg-red-100 text-red-800' },
  };

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-ink"
        >
          ← Назад
        </button>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusLabels[order.status]?.bg}`}>
          {statusLabels[order.status]?.text}
        </span>
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
        <div className="flex items-center gap-1.5 text-xs text-ink/50">
          <span>{order.Category?.icon}</span>
          <span>{order.Category?.name}</span>
          <span>•</span>
          <span>📍 {order.city?.name || 'Київ'}</span>
        </div>

        <h1 className="font-display text-xl font-bold text-ink leading-snug">
          {order.title}
        </h1>

        <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-line">
          <div className="text-xs text-ink/60">
            <div>Оплата готівкою на місці:</div>
            <div className="text-[11px] text-ink/40">Розрахунок безпосередньо з замовником</div>
          </div>
          <div className="amount text-2xl text-cash-dark font-extrabold">
            {Number(order.price).toFixed(0)} ₴
          </div>
        </div>

        {order.description && (
          <div className="mt-1">
            <h3 className="text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">
              Опис та деталі:
            </h3>
            <p className="text-sm text-ink/80 whitespace-pre-line leading-relaxed">
              {order.description}
            </p>
          </div>
        )}

        {/* Address info */}
        <div className="mt-2 pt-3 border-t border-line text-xs text-ink/60 flex flex-col gap-2">
          {order.pickupAddress && order.dropoffAddress ? (
            <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">📍 Звідки:</span>
                <span className="font-medium text-ink flex-1">{order.pickupAddress}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">🏁 Куди:</span>
                <span className="font-medium text-ink flex-1">{order.dropoffAddress}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-ink/40">Адреса виконання:</span>
              <span className="font-medium text-ink text-right">{order.address || 'За домовленістю із замовником'}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-ink/40">Замовник:</span>
            <span className="font-medium text-ink">
              {order.customer?.firstName} {order.customer?.lastName || ''} {order.customer?.username && `(@${order.customer.username})`}
            </span>
          </div>
        </div>
      </div>

      {/* Direct Contact Box (Unlocked when assigned or for customer/performer) */}
      {(isCustomer || isPerformer) && order.status === 'IN_PROGRESS' && (
        <div className="ticket-card p-4 bg-emerald-50/70 border-emerald-200">
          <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
            <span>📞</span> Контакти для зв'язку:
          </h3>
          <div className="text-xs text-emerald-800 mt-2 flex flex-col gap-1.5">
            {isCustomer && order.performer && (
              <div>
                <strong>Виконавець:</strong> {order.performer.firstName}
                {order.performer.phone && (
                  <div className="mt-0.5 font-semibold text-sm">
                    Телефон: <a href={`tel:${order.performer.phone}`} className="underline">{order.performer.phone}</a>
                  </div>
                )}
                {order.performer.username && (
                  <div>
                    Telegram: <a href={`https://t.me/${order.performer.username}`} target="_blank" rel="noreferrer" className="underline text-emerald-700 font-semibold">@{order.performer.username}</a>
                  </div>
                )}
              </div>
            )}
            {isPerformer && order.customer && (
              <div>
                <strong>Замовник:</strong> {order.customer.firstName}
                {order.customer.phone && (
                  <div className="mt-0.5 font-semibold text-sm">
                    Телефон: <a href={`tel:${order.customer.phone}`} className="underline">{order.customer.phone}</a>
                  </div>
                )}
                {order.customer.username && (
                  <div>
                    Telegram: <a href={`https://t.me/${order.customer.username}`} target="_blank" rel="noreferrer" className="underline text-emerald-700 font-semibold">@{order.customer.username}</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performer Dispute Notification or Action */}
      {isPerformer && order.status === 'IN_PROGRESS' && (
        <div className="flex flex-col gap-2">
          {myDispute ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <span>⚠️</span>
              <span>Вашу скаргу надіслано адміністратору. Очікуйте відповіді.</span>
            </div>
          ) : (
            <button
              onClick={() => setShowDisputeModal(true)}
              className="text-xs text-ink/50 hover:text-red-600 underline text-center py-1 transition-colors"
            >
              Замовник не підтверджує або не платить? Повідомити про проблему
            </button>
          )}
        </div>
      )}

      {/* Actions / Responses for Customer */}
      {isCustomer ? (
        <div className="flex flex-col gap-3">
          <h3 className="font-display font-bold text-sm mt-2 text-ink">
            Відгуки кандидатів ({order.applications?.length || 0})
          </h3>

          {order.applications?.map((app) => (
            <div key={app.id} className="ticket-card p-3.5 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm text-ink">
                    {app.user?.firstName} {app.user?.lastName || ''}
                  </div>
                  {app.user?.username && (
                    <div className="text-xs text-ink/40">@{app.user.username}</div>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  app.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                  app.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {app.status === 'ACCEPTED' ? 'Призначено' : app.status === 'REJECTED' ? 'Відхилено' : 'Очікує'}
                </span>
              </div>

              {app.comment && (
                <p className="text-xs text-ink/70 bg-slate-50 p-2 rounded-lg">
                  "{app.comment}"
                </p>
              )}

              {order.status === 'OPEN' && app.status === 'PENDING' && (
                <button
                  disabled={busy}
                  onClick={() => handleAcceptApplication(app.id)}
                  className="mt-1 bg-cash hover:bg-cash-dark text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                >
                  Призначити виконавцем
                </button>
              )}
            </div>
          ))}

          {(!order.applications || order.applications.length === 0) && (
            <div className="text-xs text-ink/40 p-4 text-center bg-slate-50 rounded-xl border border-dashed border-line">
              Поки що ніхто не відгукнувся на це завдання
            </div>
          )}

          {/* Customer Control Buttons */}
          <div className="flex gap-2 mt-2">
            {order.status === 'IN_PROGRESS' && (
              <button
                disabled={busy}
                onClick={handleComplete}
                className="flex-1 bg-cash hover:bg-cash-dark text-white rounded-full py-3 text-sm font-semibold transition-colors"
              >
                ✅ Робота виконана (Завершити)
              </button>
            )}
            {order.status === 'OPEN' && (
              <button
                disabled={busy}
                onClick={handleCancel}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full py-3 text-sm font-semibold transition-colors"
              >
                Скасувати завдання
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Performer Actions */
        <div className="flex flex-col gap-3 mt-2">
          {order.status === 'OPEN' && (
            myApplication ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-center">
                <div className="font-bold text-sm">Ви вже відгукнулися на це завдання 👍</div>
                <div className="text-xs text-amber-700 mt-1">Очікуйте рішення від замовника</div>
              </div>
            ) : (
              <button
                onClick={() => setShowApplyModal(true)}
                className="bg-ink hover:bg-black text-white rounded-full py-3.5 font-medium text-sm shadow-md active:scale-95 transition-all"
              >
                Відгукнутися на завдання ({Number(order.price).toFixed(0)} ₴)
              </button>
            )
          )}

          {isPerformer && order.status === 'IN_PROGRESS' && (
            <button
              disabled={busy}
              onClick={handleComplete}
              className="bg-cash hover:bg-cash-dark text-white rounded-full py-3.5 font-semibold text-sm shadow-md transition-colors"
            >
              ✅ Підтвердити виконання завдання
            </button>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleApply}
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Відгук на завдання</h3>
                <p className="text-xs text-ink/50">Напишіть кілька слів про ваш досвід</p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-ink/40 hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={3}
              required
              className="input"
              placeholder="Наприклад: Готовий розпочати за 30 хвилин, маю власний транспорт/інструмент..."
              value={applyComment}
              onChange={(e) => setApplyComment(e.target.value)}
            />

            <button
              disabled={busy}
              className="bg-cash hover:bg-cash-dark text-white font-semibold py-3.5 rounded-full text-sm transition-all"
            >
              {busy ? 'Надсилання...' : 'Надіслати відгук'}
            </button>
          </form>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleDisputeSubmit}
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-red-600 flex items-center gap-1">
                  <span>⚠️</span> Повідомити про проблему
                </h3>
                <p className="text-xs text-ink/50">Адміністрація втрутиться для вирішення ситуації</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="text-ink/40 hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={4}
              required
              className="input"
              placeholder="Опишіть проблему: наприклад, замовник не відповідає, відмовляється розрахуватися тощо..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
            />

            <button
              disabled={busy}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-full text-sm transition-all shadow-md"
            >
              {busy ? 'Надсилання...' : 'Надіслати скаргу адміністратору'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}