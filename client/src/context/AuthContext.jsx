import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export const ADMIN_TELEGRAM_IDS = ['7622124912'];

export const PAYMENT_CARD_DETAILS = {
  cardNumber: '4149 4390 1234 5678',
  recipient: 'Біржа Завдань / Комісія',
  bank: 'ПриватБанк / Monobank',
};

export const UKRAINIAN_CITIES = [
  { id: 1, name: 'Київ' },
  { id: 2, name: 'Харків' },
  { id: 3, name: 'Одеса' },
  { id: 4, name: 'Дніпро' },
  { id: 5, name: 'Львів' },
  { id: 6, name: 'Запоріжжя' },
  { id: 7, name: 'Кривий Ріг' },
  { id: 8, name: 'Миколаїв' },
  { id: 9, name: 'Вінниця' },
  { id: 10, name: 'Полтава' },
  { id: 11, name: 'Чернігів' },
  { id: 12, name: 'Черкаси' },
  { id: 13, name: 'Житомир' },
  { id: 14, name: 'Суми' },
  { id: 15, name: 'Хмельницький' },
  { id: 16, name: 'Чернівці' },
  { id: 17, name: 'Рівне' },
  { id: 18, name: 'Івано-Франківськ' },
  { id: 19, name: 'Тернопіль' },
  { id: 20, name: 'Луцьк' },
  { id: 21, name: 'Ужгород' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devUsers, setDevUsers] = useState([]);
  const [cities, setCities] = useState(UKRAINIAN_CITIES);
  const [tgUser, setTgUser] = useState(null);
  const [colorScheme, setColorScheme] = useState('light');

  const isDevModeEnabled =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_SWITCHER !== 'false';

  // Initialize Telegram WebApp SDK and Theme
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      try {
        if (typeof tg.ready === 'function') tg.ready();
        if (typeof tg.expand === 'function') tg.expand();

        if (tg.initDataUnsafe?.user) {
          setTgUser(tg.initDataUnsafe.user);
        }

        if (tg.colorScheme) {
          setColorScheme(tg.colorScheme);
          if (tg.colorScheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }

        const handleThemeChange = () => {
          setColorScheme(tg.colorScheme || 'light');
          if (tg.colorScheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        };

        if (typeof tg.onEvent === 'function') {
          tg.onEvent('themeChanged', handleThemeChange);
        }
        return () => {
          if (typeof tg.offEvent === 'function') {
            tg.offEvent('themeChanged', handleThemeChange);
          }
        };
      } catch (e) {
        console.warn('Telegram WebApp SDK init error:', e);
      }
    }
  }, []);

  async function loadInitialData() {
    setLoading(true);

    const savedCityId = localStorage.getItem('selected_city_id');
    const savedCityName = localStorage.getItem('selected_city_name');
    const initialCity = savedCityId
      ? { id: parseInt(savedCityId, 10), name: savedCityName || 'Київ' }
      : { id: 1, name: 'Київ' };

    // Load local commission tracking status
    const localFreeTasks = parseInt(localStorage.getItem('user_free_tasks_completed') || '0', 10);
    const localBlocked = localStorage.getItem('user_is_blocked_commission') === 'true';
    const localPendingAmt = parseFloat(localStorage.getItem('user_pending_commission_amount') || '0');
    const localPendingOrderId = localStorage.getItem('user_pending_commission_order_id');

    try {
      // 1. Fetch cities from API if available
      const citiesRes = await api.get('/catalog/cities').catch(() => null);
      if (Array.isArray(citiesRes?.data) && citiesRes.data.length > 0) {
        setCities(citiesRes.data);
      } else {
        setCities(UKRAINIAN_CITIES);
      }

      // 2. Fetch test users for dev mode if enabled
      if (isDevModeEnabled) {
        const devUsersRes = await api.get('/auth/users').catch(() => null);
        if (Array.isArray(devUsersRes?.data)) {
          setDevUsers(devUsersRes.data);
        }
      }

      // 3. Fetch current authenticated profile
      const profileRes = await api.get('/auth/me').catch(() => null);
      if (profileRes?.data && typeof profileRes.data === 'object' && profileRes.data.id) {
        const userData = profileRes.data;
        if (!userData.city && initialCity) {
          userData.city = initialCity;
          userData.cityId = initialCity.id;
        }
        if (ADMIN_TELEGRAM_IDS.includes(String(userData.telegramId))) {
          userData.role = 'ADMIN';
        }
        userData.freeTasksCompleted = userData.freeTasksCompleted ?? localFreeTasks;
        userData.isBlockedForCommission = userData.isBlockedForCommission ?? localBlocked;
        userData.pendingCommissionAmount = userData.pendingCommissionAmount ?? localPendingAmt;
        userData.pendingCommissionOrderId = userData.pendingCommissionOrderId ?? localPendingOrderId;
        setUser(userData);
      } else {
        // Fallback user profile (from Telegram initData if available or guest)
        const tgData = window?.Telegram?.WebApp?.initDataUnsafe?.user;
        const currentTgId = String(tgData?.id || '7622124912');
        const isMatchedAdmin = ADMIN_TELEGRAM_IDS.includes(currentTgId) || localStorage.getItem('user_role') === 'ADMIN';

        setUser({
          id: tgData?.id || 7622124912,
          telegramId: currentTgId,
          firstName: tgData?.first_name || 'Адміністратор',
          lastName: tgData?.last_name || '',
          username: tgData?.username || '',
          balance: 1000,
          role: isMatchedAdmin ? 'ADMIN' : 'USER',
          commissionOverridePercent: 0.0,
          cityId: initialCity.id,
          city: initialCity,
          freeTasksCompleted: localFreeTasks,
          isBlockedForCommission: localBlocked,
          pendingCommissionAmount: localPendingAmt,
          pendingCommissionOrderId: localPendingOrderId ? parseInt(localPendingOrderId, 10) : null,
        });
      }
    } catch (err) {
      console.warn('Профіль ініціалізовано з локальними даними:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function reloadProfile() {
    try {
      const res = await api.get('/auth/me').catch(() => null);
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        if (ADMIN_TELEGRAM_IDS.includes(String(res.data.telegramId))) {
          res.data.role = 'ADMIN';
        }
        setUser(res.data);
        return res.data;
      }
    } catch (e) {
      console.error('Помилка оновлення профілю:', e);
    }
  }

  function updateCommissionState({ freeTasksCompleted, isBlockedForCommission, pendingCommissionAmount, pendingCommissionOrderId }) {
    if (freeTasksCompleted !== undefined) {
      localStorage.setItem('user_free_tasks_completed', String(freeTasksCompleted));
    }
    if (isBlockedForCommission !== undefined) {
      localStorage.setItem('user_is_blocked_commission', String(isBlockedForCommission));
    }
    if (pendingCommissionAmount !== undefined) {
      localStorage.setItem('user_pending_commission_amount', String(pendingCommissionAmount));
    }
    if (pendingCommissionOrderId !== undefined) {
      if (pendingCommissionOrderId) {
        localStorage.setItem('user_pending_commission_order_id', String(pendingCommissionOrderId));
      } else {
        localStorage.removeItem('user_pending_commission_order_id');
      }
    }

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        freeTasksCompleted: freeTasksCompleted !== undefined ? freeTasksCompleted : prev.freeTasksCompleted,
        isBlockedForCommission: isBlockedForCommission !== undefined ? isBlockedForCommission : prev.isBlockedForCommission,
        pendingCommissionAmount: pendingCommissionAmount !== undefined ? pendingCommissionAmount : prev.pendingCommissionAmount,
        pendingCommissionOrderId: pendingCommissionOrderId !== undefined ? pendingCommissionOrderId : prev.pendingCommissionOrderId,
      };
    });
  }

  async function switchDevUser(userId) {
    if (userId) {
      localStorage.setItem('tg_dev_user_id', String(userId));
    } else {
      localStorage.removeItem('tg_dev_user_id');
    }
    await reloadProfile();
  }

  function updateCity(cityId, cityName) {
    const selectedCityObj = cities.find((c) => String(c.id) === String(cityId)) || {
      id: parseInt(cityId, 10),
      name: cityName || 'Київ',
    };

    localStorage.setItem('selected_city_id', String(selectedCityObj.id));
    localStorage.setItem('selected_city_name', selectedCityObj.name);

    setUser((prev) => (prev ? { ...prev, cityId: selectedCityObj.id, city: selectedCityObj } : { cityId: selectedCityObj.id, city: selectedCityObj }));

    api.put('/profile', { cityId: selectedCityObj.id }).catch(() => null);
  }

  function setAdminRole(enabled) {
    const role = enabled ? 'ADMIN' : 'USER';
    localStorage.setItem('user_role', role);
    setUser((prev) => (prev ? { ...prev, role } : { role }));
  }

  const currentTelegramId = String(user?.telegramId || tgUser?.id || '7622124912');
  const isAdmin = Boolean(
    user?.role === 'ADMIN' ||
    ADMIN_TELEGRAM_IDS.includes(currentTelegramId) ||
    localStorage.getItem('user_role') === 'ADMIN' ||
    localStorage.getItem('is_admin_override') === 'true'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        tgUser,
        colorScheme,
        loading,
        devUsers,
        cities,
        reloadProfile,
        switchDevUser,
        updateCity,
        setAdminRole,
        updateCommissionState,
        isAdmin,
        isDevModeEnabled,
        isTelegram: Boolean(window?.Telegram?.WebApp?.initData),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth повинен використовуватися всередині AuthProvider');
  }
  return context;
}