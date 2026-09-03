import { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Show splash for 1.2s then fade out
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 300);
    }, 1200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-between p-6 transition-opacity duration-300 ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full flex justify-end">
        <button
          onClick={() => {
            setFade(true);
            setTimeout(() => onFinish && onFinish(), 150);
          }}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
        >
          Пропустити →
        </button>
      </div>

      <div className="flex flex-col items-center text-center gap-4 max-w-xs animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-white flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/40 relative">
          <span className="animate-bounce">⚡</span>
          <div className="absolute inset-0 rounded-3xl bg-white/20 animate-ping opacity-20 pointer-events-none" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            TELEGRAM MINI APP
          </span>
          <h1 className="font-display text-2xl font-extrabold mt-1 text-white">
            Біржа завдань
          </h1>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Швидкий пошук перевірених майстрів, вантажників та кур'єрів в Україні.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="bg-white/10 text-emerald-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10">
            💵 Розрахунок готівкою
          </span>
          <span className="bg-white/10 text-slate-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10">
            🇺🇦 20+ міст
          </span>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center gap-2">
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full animate-[pulse_1s_infinite] w-full" />
        </div>
        <span className="text-[10px] text-slate-400">Завантаження сервісу...</span>
      </div>
    </div>
  );
}