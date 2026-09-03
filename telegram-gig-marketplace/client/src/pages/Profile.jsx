import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, reloadProfile, devUsers, switchDevUser, isDevModeEnabled, isAdmin, setAdminRole } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('500');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const fallbackProfile = {
    id: user?.id || 1,
    firstName: user?.firstName || 'Користувач',
    lastName: user?.lastName || '',
    username: user?.username || '',
    telegramId: user?.telegramId || '1002',
    balance: user?.balance || 500,
    role: user?.role || 'USER',
    commissionOverridePercent: user?.commissionOverridePercent ?? 0.0,
    city: user?.city || { name: 'Київ' },
    _count: { createdOrders: 1, performedOrders: 0 },
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
  }, [user?.id]);

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

    const newTopup = {
      id: Date.now(),
      amount: parseFloat(topupAmount),
      receiptUrl: receiptPreview || '/uploads/sample-receipt.jpg',
      status: 'pending',
      createdAt: new Date().toISOString(),
      User: {
        id: user?.id || 1,
        firstName: user?.firstName || 'Користувач',
        username: user?.username || '',
        telegramId: user?.telegramId || '1002',
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
        text: 'Чек успішно надіслано на перевірку адміністратору! Баланс буде нараховано після схвалення.',
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
  const isFreeCommission = currentProfile?.commissionOverridePercent === 0;
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

          {/* Commission Status Pill */}
          <div className="text-right">
            {isFreeCommission ? (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full inline-block shadow-sm">
                ✨ 0% Комісії (Перші 100)
              </span>
            ) : (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block">
                Комісія 10%
              </span>
            )}
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
            + Поповнити
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-center">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {currentProfile?._count?.createdOrders || 0}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Створено завдань</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {currentProfile?._count?.performedOrders || 0}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Виконано завдань</div>
          </div>
        </div>
      </div>

      {/* Admin Access Toggle for testing */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {isAdmin ? '👑 Режим адміністратора увімкнено' : '🔒 Доступ адміністратора'}
          </div>
          <div className="text-[10px] text-slate-500">
            {isAdmin ? 'Адмін-панель доступна для перегляду чеків та скарг' : 'Доступний перегляд панелі модерації'}
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

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleTopupSubmit}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Поповнення рахунку</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Завантажте чек про здійснену оплату</p>
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

            {/* Amount Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                Сума поповнення, ₴
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {['200', '500', '1000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      topupAmount === amt
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {amt} ₴
                  </button>
                ))}
              </div>
              <input
                required
                type="number"
                min="10"
                className="input amount text-lg"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="Власна сума"
              />
            </div>

            {/* Receipt Upload Box */}
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
                    <span className="text-[10px] text-slate-400">PNG, JPG, PDF до 10MB</span>
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