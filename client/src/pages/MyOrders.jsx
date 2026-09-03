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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function getMergedCustomerOrders(serverOrders = []) {
    try {
      const customCreated = JSON.parse(localStorage.getItem('custom_created_orders') || '[]');
      const combined = [...customCreated, ...serverOrders];
      const seen = new Set();
      return combined.filter((item) => {
        if (!item || !item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    } catch {
      return serverOrders;
    }
  }

  async function loadMyOrders() {
    setLoading(true);
    try {
      const [custRes, perfRes] = await Promise.all([
        api.get('/orders/my/customer').catch(() => null),
        api.get('/orders/my/performer').catch(() => null),
      ]);
      const apiCust = Array.isArray(custRes?.data) ? custRes.data : [];
      setCustomerOrders(getMergedCustomerOrders(apiCust));

      if (Array.isArray(perfRes?.data)) {
        setPerformerOrders(perfRes.data);
      }
    } catch (err) {
      console.warn('Помилка завантаження моїх замовлень:', err);
      setCustomerOrders(getMergedCustomerOrders([]));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyOrders();
  }, [user?.id]);

  const safeCustomerOrders = Array.isArray(customerOrders) ? customerOrders : [];
  const safePerformerOrders = Array.isArray(performerOrders) ? performerOrders : [];
  const currentList = tab === 'customer' ? safeCustomerOrders : safePerformerOrders;

  return (
    <div className="p-4 pb-28 flex flex-col gap-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mt-1">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Мої замовлення
        </h1>
        <button
          onClick={loadMyOrders}
          className="text-xs text-cash-dark dark:text-emerald-400 hover:underline font-medium"
        >
          Оновити
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
        <button
          onClick={() => setTab('customer')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === 'customer'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Я замовник ({safeCustomerOrders.length})
        </button>
        <button
          onClick={() => setTab('performer')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === 'performer'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Я виконавець ({safePerformerOrders.length})
        </button>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="animate-spin text-2xl">⏳</div>
            <span className="text-xs">Завантаження замовлень...</span>
          </div>
        ) : currentList.length > 0 ? (
          currentList.map((order) => (
            <TaskCard key={order.id} order={order} />
          ))
        ) : (
          <div className="ticket-card p-8 text-center flex flex-col items-center gap-3">
            <span className="text-3xl">{tab === 'customer' ? '📋' : '🛠️'}</span>
            <div className="font-semibold text-sm text-slate-900 dark:text-white">
              {tab === 'customer' ? 'Ви ще не публікували завдань' : 'У вас поки немає активних відгуків'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {tab === 'customer'
                ? 'Розмістіть перше доручення за пару кліків і отримайте відгуки майстрів'
                : 'Перейдіть до стрічки та відгукніться на підходящі завдання'}
            </p>
            {tab === 'customer' ? (
              <button
                onClick={() => navigate('/create')}
                className="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm transition-all"
              >
                + Розмістити завдання
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="mt-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-black transition-all"
              >
                Перейти до стрічки
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}