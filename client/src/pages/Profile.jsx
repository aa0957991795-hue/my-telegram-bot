import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth, PAYMENT_CARD_DETAILS } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, reloadProfile, devUsers, switchDevUser, isDevModeEnabled, isAdmin, setAdminRole, updateCommissionState } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(String(user?.pendingCommissionAmount || 100));
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const fallbackProfile = {
    id: user?.id || 1,
    firstName: user?.firstName || 'Користувач',
    lastName: user?.lastName || '',
    username: user?.username || '',
    telegramId: user?.telegramId || '7622124912',
    balance: user?.balance || 500,
    role: user?.role || 'USER',
    commissionOverridePercent: user?.commissionOverridePercent ?? 0.0,
    freeTasksCompleted: user?.freeTasksCompleted || 0,
    isBlockedForCommission: user?.isBlockedForCommission || false,
    pendingCommissionAmount: user?.pendingCommissionAmount || 0,
    city: user?.city || { name: 'Київ' },
    _count: { createdOrders: 1, performedOrders: user?.freeTasksCompleted || 0 },
    transactions: [
      {
        id: 1,
        amount: 500,
        type: 'TOPUP',
        description: 'Початковий баланс рахунку',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await api.get('/profile').catch(() => null);
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        setProfileData(res.data);
      } else {
        setProfileData(fallbackProfile);
      }
    } catch (err) {
      console.warn('Профіль завантажено з локальними даними:', err);
      setProfileData(fallbackProfile);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    if (user?.pendingCommissionAmount) {
      setTopupAmount(String(user.pendingCommissionAmount));
    }
  }, [user?.id, user?.pendingCommissionAmount]);

  function handleFileChange(e) {
    try {
      const file = e.target.files?.[0];
      if (file) {
        setReceiptFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          setReceiptPreview(event.target.result);
        };
        reader.onerror = () => {
          setReceiptPreview(null);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Помилка вибору файлу:', err);
    }
  }

  async function handleTopupSubmit(e) {
    e.preventDefault();
    if (!receiptFile && !receiptPreview) {
      setMessage({ type: 'error', text: 'Будь ласка, прикріпіть фото або скриншот квитанції/чека' });
      return;
    }

    setTopupBusy(true);
    setMessage(null);

    const commissionNum = parseFloat(topupAmount) || 100;
    const isPayingPendingCommission = Boolean(user?.isBlockedForCommission);

    const newTopup = {
      id: Date.now(),
      orderId: user?.pendingCommissionOrderId || null,
      orderTitle: isPayingPendingCommission ? `Комісія за завдання #${user?.pendingCommissionOrderId}` : 'Поповнення балансу',
      actualPrice: isPayingPendingCommission ? (commissionNum * 10) : null,
      amount: commissionNum,
      receiptUrl: receiptPreview || '/uploads/sample-receipt.jpg',
      status: 'pending',
      createdAt: new Date().toISOString(),
      User: {
        id: user?.id || 1,
        firstName: user?.firstName || 'Користувач',
        username: user?.username || '',
        telegramId: user?.telegramId || '7622124912',
        balance: user?.balance || 500,
      },
    };

    // Save locally to custom_topup_requests in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('custom_topup_requests') || '[]');
      const updated = [newTopup, ...existing];
      localStorage.setItem('custom_topup_requests', JSON.stringify(updated));
    } catch (err) {
      console.warn('Помилка запису в localStorage:', err);
    }

    // Also send to backend
    const formData = new FormData();
    formData.append('amount', topupAmount);
    formData.append('orderId', user?.pendingCommissionOrderId || '');
    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }

    try {
      await api.post('/profile/topup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).catch((err) => {
        console.warn('API /profile/topup не відповів, чек збережено локально:', err);
      });

      setMessage({
        type: 'success',
        text: 'Чек успішно надіслано на перевірку адміністратору! Після підтвердження блокування буде автоматично знято.',
      });
      setShowTopupModal(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      await reloadProfile();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Помилка надсилання чека',
      });
    } finally {
      setTopupBusy(false);
    }
  }

  const currentProfile = profileData || fallbackProfile;
  const freeTasksDone = user?.freeTasksCompleted ?? currentProfile?.freeTasksCompleted ?? 0;
  const isBlocked = Boolean(user?.isBlockedForCommission);
  const safeTransactions = Array.isArray(currentProfile?.transactions) ? currentProfile.transactions : [];

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mt-1">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Особистий кабінет
        </h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 transition-all"
          >
            ⚙️ Адмін-панель
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Blocked Performer Card */}
      {isBlocked && (
        <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>🔒</span>
              <span>Доступ до нових завдань заблоковано</span>
            </div>
            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">
              {user.pendingCommissionAmount} ₴
            </span>
          </div>

          <p className="text-xs opacity-95 leading-relaxed">
            Ви успішно завершили 4-е (або наступне) завдання #{user.pendingCommissionOrderId}. Сплатіть комісію 10% (<b>{user.pendingCommissionAmount} ₴</b>) на карту та прикріпіть чек.
          </p>

          <div className="bg-white/10 p-2.5 rounded-xl text-xs font-mono select-all">
            💳 {PAYMENT_CARD_DETAILS.cardNumber} ({PAYMENT_CARD_DETAILS.recipient})
          </div>

          <button
            onClick={() => {
              setTopupAmount(String(user.pendingCommissionAmount || 100));
              setShowTopupModal(true);
            }}
            className="bg-white text-amber-900 font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm text-center active:scale-95 transition-all"
          >
            📤 Завантажити чек про оплату комісії →
          </button>
        </div>
      )}

      {/* User Info Card */}
      <div className="ticket-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-lg">
              {currentProfile?.firstName?.[0] || 'U'}
            </div>
            <div>
              <div className="font-display font-bold text-base text-slate-900 dark:text-white">
                {currentProfile?.firstName} {currentProfile?.lastName || ''}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {currentProfile?.username ? `@${currentProfile.username}` : `TG ID: ${currentProfile?.telegramId}`}
              </div>
              <div className="text-[11px] text-cash-dark dark:text-emerald-400 font-medium mt-0.5">
                📍 {currentProfile?.city?.name || 'Київ'}
              </div>
            </div>
          </div>

          {/* Free Tasks Counter Badge */}
          <div className="text-right flex flex-col items-end gap-1">
            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full inline-block shadow-sm">
              🎁 Безкоштовних: {Math.max(0, 3 - freeTasksDone)}/3
            </span>
            <span className="text-[10px] text-slate-400">
              {freeTasksDone >= 3 ? 'Комісія 10% активна' : '0% комісії'}
            </span>
          </div>
        </div>

        {/* Free Task Progress Tracker */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Статус безкоштовних завдань:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {freeTasksDone}/3 виконано
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (freeTasksDone / 3) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400">
            {freeTasksDone < 3
              ? `У вас залишилось ${3 - freeTasksDone} безкоштовних завдань без комісії платформі.`
              : 'Ви використали 3 безкоштовних завдання. Наступні завдання — комісія 10%.'}
          </div>
        </div>

        {/* Balance Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between mt-1">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Поточний баланс</div>
            <div className="amount text-2xl text-cash-dark dark:text-emerald-400 font-extrabold mt-0.5">
              {Number(currentProfile?.balance || 0).toFixed(0)} ₴
            </div>
          </div>

          <button
            onClick={() => setShowTopupModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all"
          >
            + Поповнити / Чек
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-center">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {currentProfile?._count?.createdOrders || 0}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Створено замовлень</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {freeTasksDone}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Виконано завдань</div>
          </div>
        </div>
      </div>

      {/* Admin Access Toggle */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {isAdmin ? '👑 Режим адміністратора увімкнено' : '🔒 Доступ адміністратора'}
          </div>
          <div className="text-[10px] text-slate-500">
            {isAdmin ? 'Адмін-панель доступна для підтвердження чеків' : 'Доступний перегляд модерації'}
          </div>
        </div>
        <button
          onClick={() => {
            setAdminRole(!isAdmin);
            setMessage({ type: 'success', text: !isAdmin ? 'Адмін-доступ надано!' : 'Адмін-доступ вимкнено' });
          }}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
            isAdmin
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
          }`}
        >
          {isAdmin ? 'Вимкнути' : 'Увімкнути адмін'}
        </button>
      </div>

      {/* Transaction History */}
      <div className="flex flex-col gap-2 mt-1">
        <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
          Історія операцій ({safeTransactions.length})
        </h3>

        {safeTransactions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {safeTransactions.map((tx) => (
              <div key={tx.id} className="ticket-card p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{tx.description}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(tx.createdAt).toLocaleString('uk-UA', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className={`amount text-sm font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-cash-dark dark:text-emerald-400'}`}>
                  {tx.amount > 0 ? `+${Number(tx.amount).toFixed(0)}` : Number(tx.amount).toFixed(0)} ₴
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 p-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            Історія операцій поки що порожня
          </div>
        )}
      </div>

      {/* Topup / Commission Receipt Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleTopupSubmit}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isBlocked ? 'Сплата комісії платформи' : 'Завантаження чека / Поповнення'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBlocked ? `Комісія за завдання #${user.pendingCommissionOrderId}` : 'Завантажте чек про оплату'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTopupModal(false);
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Requisites */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs flex flex-col gap-1 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Реквізити для оплати:</span>
              <div className="font-mono font-bold text-sm text-emerald-600 select-all">
                {PAYMENT_CARD_DETAILS.cardNumber}
              </div>
              <span className="text-[11px] text-slate-500">{PAYMENT_CARD_DETAILS.recipient} ({PAYMENT_CARD_DETAILS.bank})</span>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                Сума за чеком, ₴
              </label>
              <input
                required
                type="number"
                min="10"
                className="input amount text-lg"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="100"
              />
            </div>

            {/* Receipt File */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                Фото / Скриншот квитанції
              </label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center transition-colors bg-slate-50 dark:bg-slate-800/50 relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                {receiptPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={receiptPreview}
                      alt="Прев'ю чека"
                      className="max-h-32 object-contain rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Чек обрано (натисніть для зміни)
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
                    <span className="text-2xl">📸</span>
                    <span className="text-xs font-medium">Натисніть для вибору файлу чека</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, PDF</span>
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={topupBusy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-full text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {topupBusy ? 'Надсилання...' : `Надіслати чек на ${topupAmount} ₴`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}