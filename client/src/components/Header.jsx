import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, cities, updateCity, devUsers, switchDevUser, isDevModeEnabled } = useAuth();
  const [showCityModal, setShowCityModal] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const navigate = useNavigate();

  const currentCityName = user?.city?.name || 'Всі міста';

  return (
    <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-line px-4 py-3 z-30 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCityModal(true)}
          className="flex items-center gap-1 text-xs font-semibold text-ink bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-full transition-colors"
        >
          <span>📍</span>
          <span>{currentCityName}</span>
          <span className="text-[10px] text-ink/40">▼</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 bg-cash/10 hover:bg-cash/20 px-3 py-1 rounded-full text-xs font-bold text-cash-dark transition-all"
          >
            <span>💰</span>
            <span>{Number(user.balance || 0).toFixed(0)} ₴</span>
          </button>
        )}

        {/* Dev switcher pill (only shown when DEV mode is enabled) */}
        {isDevModeEnabled && (
          <button
            onClick={() => setShowDevModal(true)}
            title="Змінити тестового користувача"
            className="bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-ink/70 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1"
          >
            <span>👤</span>
            <span className="truncate max-w-[70px]">{user?.firstName || 'Користувач'}</span>
          </button>
        )}
      </div>

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Оберіть ваше місто</h3>
              <button
                onClick={() => setShowCityModal(false)}
                className="text-ink/40 hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => {
                    updateCity(city.id);
                    setShowCityModal(false);
                  }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    user?.cityId === city.id
                      ? 'bg-cash/10 text-cash-dark font-bold border border-cash/30'
                      : 'bg-slate-50 hover:bg-slate-100 text-ink'
                  }`}
                >
                  📍 {city.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dev User Switcher Modal */}
      {isDevModeEnabled && showDevModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-base">Режим тестування (Dev)</h3>
                <p className="text-xs text-ink/50">Швидке перемикання ролей</p>
              </div>
              <button
                onClick={() => setShowDevModal(false)}
                className="text-ink/40 hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mt-2">
              {devUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchDevUser(u.id);
                    setShowDevModal(false);
                  }}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                    user?.id === u.id
                      ? 'bg-ink text-white font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 text-ink'
                  }`}
                >
                  <div>
                    <div>{u.firstName} {u.lastName}</div>
                    <div className="text-xs opacity-60">@{u.username} • {u.role === 'ADMIN' ? 'Адміністратор' : 'Користувач'}</div>
                  </div>
                  <div className="font-bold text-xs">
                    {Number(u.balance).toFixed(0)} ₴
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}