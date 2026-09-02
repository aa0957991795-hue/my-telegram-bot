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
    <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 z-30 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCityModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors"
        >
          <span>📍</span>
          <span>{currentCityName}</span>
          <span className="text-[10px] text-slate-400">▼</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/60 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-all"
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
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1"
          >
            <span>👤</span>
            <span className="truncate max-w-[70px]">{user?.firstName || 'Користувач'}</span>
          </button>
        )}
      </div>

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Оберіть ваше місто</h3>
              <button
                onClick={() => setShowCityModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Режим тестування (Dev)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Швидке перемикання ролей</p>
              </div>
              <button
                onClick={() => setShowDevModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
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
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
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
