import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, reloadProfile, devUsers, switchDevUser, isDevModeEnabled } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('500');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadProfile() {
    try {
      const res = await api.get('/profile');
      setProfileData(res.data);
    } catch (err) {
      console.error('Помилка завантаження профілю:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  }

  async function handleTopupSubmit(e) {
    e.preventDefault();
    if (!receiptFile) {
      setMessage({ type: 'error', text: 'Будь ласка, прикріпіть фото або скриншот квитанції/чека' });
      return;
    }

    setTopupBusy(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('amount', topupAmount);
    formData.append('receipt', receiptFile);

    try {
      await api.post('/profile/topup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({
        type: 'success',
        text: 'Чек успішно надіслано на перевірку адміністратору! Баланс буде нараховано після схвалення.',
      });
      setShowTopupModal(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      await loadProfile();
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

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-ink/40 gap-2">
        <div className="animate-spin text-3xl">⏳</div>
        <p className="text-xs">Завантаження профілю...</p>
      </div>
    );
  }

  const isFreeCommission = profileData?.commissionOverridePercent === 0;

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mt-1">
        <h1 className="font-display text-xl font-bold text-ink">Особистий кабінет</h1>
        {user?.role === 'ADMIN' && (
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
              {profileData?.firstName?.[0] || 'U'}
            </div>
            <div>
              <div className="font-display font-bold text-base text-ink">
                {profileData?.firstName} {profileData?.lastName || ''}
              </div>
              <div className="text-xs text-ink/50">
                {profileData?.username ? `@${profileData.username}` : `TG ID: ${profileData?.telegramId}`}
              </div>
              <div className="text-[11px] text-cash-dark font-medium mt-0.5">
                📍 {profileData?.city?.name || 'Місто не обрано'}
              </div>
            </div>
          </div>

          {/* Commission Status Pill */}
          <div className="text-right">
            {isFreeCommission ? (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full inline-block shadow-sm">
                ✨ 0% Комісії (Перші 100)
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block">
                Комісія 10%
              </span>
            )}
          </div>
        </div>

        {/* Balance Box */}
        <div className="bg-slate-50 p-4 rounded-xl border border-line flex items-center justify-between mt-1">
          <div>
            <div className="text-xs text-ink/50 font-medium">Поточний баланс</div>
            <div className="amount text-2xl text-cash-dark font-extrabold mt-0.5">
              {Number(profileData?.balance || 0).toFixed(0)} ₴
            </div>
          </div>

          <button
            onClick={() => setShowTopupModal(true)}
            className="bg-cash hover:bg-cash-dark text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all"
          >
            + Поповнити
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-center">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-line">
            <div className="text-sm font-bold text-ink">
              {profileData?._count?.createdOrders || 0}
            </div>
            <div className="text-[10px] text-ink/50">Створено завдань</div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-line">
            <div className="text-sm font-bold text-ink">
              {profileData?._count?.performedOrders || 0}
            </div>
            <div className="text-[10px] text-ink/50">Виконано завдань</div>
          </div>
        </div>
      </div>

      {/* Dev Switcher Section (only shown when DEV mode is enabled) */}
      {isDevModeEnabled && (
        <div className="ticket-card p-3.5 flex flex-col gap-2 bg-slate-50/50">
          <div className="text-xs font-semibold text-ink/60 flex items-center justify-between">
            <span>🛠️ Перемикання тестового акаунта:</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">DEV MODE</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {devUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => switchDevUser(u.id)}
                className={`py-2 px-1.5 rounded-lg text-xs font-medium truncate transition-all ${
                  user?.id === u.id
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-white border border-line text-ink/70 hover:bg-slate-100'
                }`}
              >
                {u.firstName} ({u.role === 'ADMIN' ? 'Адмін' : u.id === 5 ? 'Замовник' : 'Майстер'})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="flex flex-col gap-2 mt-1">
        <h3 className="font-display font-bold text-sm text-ink">
          Історія операцій ({profileData?.transactions?.length || 0})
        </h3>

        {profileData?.transactions?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {profileData.transactions.map((tx) => (
              <div key={tx.id} className="ticket-card p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-ink">{tx.description}</div>
                  <div className="text-[10px] text-ink/40">
                    {new Date(tx.createdAt).toLocaleString('uk-UA', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className={`amount text-sm font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-cash-dark'}`}>
                  {tx.amount > 0 ? `+${Number(tx.amount).toFixed(0)}` : Number(tx.amount).toFixed(0)} ₴
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-ink/40 p-4 text-center bg-white rounded-xl border border-dashed border-line">
            Історія операцій поки що порожня
          </div>
        )}
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleTopupSubmit}
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Поповнення рахунку</h3>
                <p className="text-xs text-ink/50">Завантажте чек про здійснену оплату</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="text-ink/40 hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Amount Selection */}
            <div>
              <label className="text-xs font-semibold text-ink/60 mb-1.5 block">
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
                        ? 'bg-cash text-white shadow-sm'
                        : 'bg-slate-100 text-ink/70 hover:bg-slate-200'
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

            {/* Receipt Upload */}
            <div>
              <label className="text-xs font-semibold text-ink/60 mb-1.5 block">
                Фото / Скриншот квитанції
              </label>
              <div className="border-2 border-dashed border-line hover:border-cash rounded-2xl p-4 text-center transition-colors bg-slate-50 relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {receiptPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={receiptPreview}
                      alt="Прев'ю чека"
                      className="max-h-32 object-contain rounded-lg border border-line"
                    />
                    <span className="text-[11px] text-cash-dark font-medium">Чек обрано (натисніть для зміни)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-ink/60">
                    <span className="text-2xl">📸</span>
                    <span className="text-xs font-medium">Натисніть для завантаження чека</span>
                    <span className="text-[10px] text-ink/40">PNG, JPG, SVG до 10MB</span>
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={topupBusy}
              className="bg-cash hover:bg-cash-dark text-white font-semibold py-3.5 rounded-full text-sm transition-all shadow-md active:scale-95"
            >
              {topupBusy ? 'Надсилання...' : `Надіслати чек на ${topupAmount} ₴`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}