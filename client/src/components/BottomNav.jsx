import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Завдання", icon: "🗂️" },
  { to: "/create", label: "Створити", icon: "➕" },
  { to: "/my-orders", label: "Мої замовлення", icon: "📋" },
  { to: "/profile", label: "Кабінет", icon: "👤" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-line flex justify-around py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium transition-colors ${
              isActive ? "text-cash-dark font-bold scale-105" : "text-ink/50 hover:text-ink/80"
            }`
          }
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}