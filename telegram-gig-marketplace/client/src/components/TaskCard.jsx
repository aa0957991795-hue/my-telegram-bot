import { useNavigate } from "react-router-dom";

export default function TaskCard({ order }) {
  const navigate = useNavigate();

  const statusBadges = {
    OPEN: { text: "Відкрита", color: "bg-cash/10 text-cash-dark" },
    IN_PROGRESS: { text: "У роботі", color: "bg-blue-50 text-blue-600" },
    COMPLETED: { text: "Виконана", color: "bg-slate-100 text-slate-600" },
    CANCELLED: { text: "Скасована", color: "bg-red-50 text-red-600" },
  };

  const badge = statusBadges[order.status] || statusBadges.OPEN;
  const commissionAmt = Math.round(Number(order.price || 0) * 0.10);

  // Address rendering (structured pickup -> dropoff or single address)
  let displayAddress = "адреса за домовленістю";
  if (order.pickupAddress && order.dropoffAddress) {
    displayAddress = `${order.pickupAddress} → ${order.dropoffAddress}`;
  } else if (order.address) {
    displayAddress = order.address;
  } else if (order.city?.name) {
    displayAddress = order.city.name;
  }

  return (
    <button
      onClick={() => navigate(`/tasks/${order.id}`)}
      className="ticket-card w-full text-left p-4 pb-3.5 flex flex-col gap-2.5 active:scale-[0.99] transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/60 font-medium flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              <span>{order.Category?.icon}</span>
              <span>{order.Category?.name}</span>
            </span>
            {order.status !== 'OPEN' && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                {badge.text}
              </span>
            )}
          </div>
          <h3 className="font-display font-semibold text-[15px] text-ink leading-snug mt-1.5 line-clamp-2">
            {order.title}
          </h3>
        </div>
        <div className="text-right">
          <div className="amount text-cash-dark dark:text-emerald-400 text-lg whitespace-nowrap font-bold">
            {Number(order.price).toFixed(0)} ₴
          </div>
          <div className="text-[10px] text-slate-400">
            комісія: <b>{commissionAmt} ₴</b>
          </div>
        </div>
      </div>

      {order.description && (
        <p className="text-sm text-ink/60 line-clamp-2 leading-relaxed">{order.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-ink/40 pt-2 border-t border-dashed border-line mt-0.5">
        <span className="truncate max-w-[65%]">📍 {displayAddress}</span>
        <span className="font-medium text-ink/60 flex items-center gap-1">
          👤 {order.customer?.firstName || "Замовник"}
          {order._count?.applications > 0 && (
            <span className="ml-1 bg-cash-light/60 text-cash-dark px-1.5 py-0.2 rounded-full font-semibold text-[10px]">
              💬 {order._count.applications}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}