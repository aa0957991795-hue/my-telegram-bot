import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TaskCard from '../components/TaskCard.jsx';

export default function MyOrders() {
  const { user } = useAuth();
  const [tab, setTab] = useState('customer'); // 'customer' | 'performer'
  const [customerOrders, setCustomerOrders] = useState([]);
  const [performerOrders, setPerformerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function loadMyOrders() {
    setLoading(true);
    try {
      const [custRes, perfRes] = await Promise.all([
        api.get('/orders/my/customer'),
        api.get('/orders/my/performer'),
      ]);
      setCustomerOrders(custRes.data);
      setPerformerOrders(perfRes.data);
    } catch (err) {
      console.error('Помилка завантаження моїх замовлень:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyOrders();
  }, [user?.id]);

  const currentList = tab === 'customer' ? customerOrders : performerOrders;

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mt-1">
        <h1 className="font-display text-xl font-bold text-ink">Мої замовлення</h1>
        <button
          onClick={loadMyOrders}
          className="text-xs text-cash-dark hover:underline font-medium"
        >
          Оновити
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-slate-200/80 p-1 rounded-xl flex gap-1">
        <button
          onClick={() => setTab('customer')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === 'customer'
              ? 'bg-white text-ink shadow-sm'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          Я замовник ({customerOrders.length})
        </button>
        <button
          onClick={() => setTab('performer')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === 'performer'
              ? 'bg-white text-ink shadow-sm'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          Я виконавець ({performerOrders.length})
        </button>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-ink/40 gap-2">
            <div className="animate-spin text-2xl">⏳</div>
            <span className="text-xs">Завантаження ваших замовлень...</span>
          </div>
        ) : currentList.length > 0 ? (
          currentList.map((order) => (
            <TaskCard key={order.id} order={order} />
          ))
        ) : (
          <div className="ticket-card p-8 text-center flex flex-col items-center gap-3">
            <span className="text-3xl">{tab === 'customer' ? '📋' : '🛠️'}</span>
            <div className="font-semibold text-sm">
              {tab === 'customer' ? 'Ви ще не створювали завдань' : 'У вас поки немає активних відгуків'}
            </div>
            <p className="text-xs text-ink/50 max-w-xs">
              {tab === 'customer'
                ? 'Розмістіть перше доручення за пару кліків'
                : 'Перейдіть до стрічки та відгукніться на відповідні завдання'}
            </p>
            {tab === 'customer' ? (
              <button
                onClick={() => navigate('/create')}
                className="mt-1 bg-ink text-white text-xs font-semibold px-5 py-2.5 rounded-full"
              >
                + Розмістити завдання
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="mt-1 bg-ink text-white text-xs font-semibold px-5 py-2.5 rounded-full"
              >
                Перейти до завдань
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}