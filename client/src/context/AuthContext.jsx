import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

const DEFAULT_CITIES = [
  { id: 1, name: 'Київ' },
  { id: 2, name: 'Харків' },
  { id: 3, name: 'Одеса' },
  { id: 4, name: 'Дніпро' },
  { id: 5, name: 'Львів' },
  { id: 6, name: 'Запоріжжя' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devUsers, setDevUsers] = useState([]);
  const [cities, setCities] = useState(DEFAULT_CITIES);
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
    try {
      // 1. Fetch cities
      const citiesRes = await api.get('/catalog/cities').catch(() => null);
      if (Array.isArray(citiesRes?.data)) {
        setCities(citiesRes.data);
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
        setUser(profileRes.data);
      } else {
        // Fallback user profile (from Telegram initData if available or guest)
        const tgData = window?.Telegram?.WebApp?.initDataUnsafe?.user;
        setUser({
          id: tgData?.id || 1,
          firstName: tgData?.first_name || 'Користувач',
          lastName: tgData?.last_name || '',
          username: tgData?.username || '',
          balance: 0,
          role: 'USER',
          commissionOverridePercent: 0.0,
          city: { name: 'Київ', id: 1 },
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
      const res = await api.get('/auth/me');
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        setUser(res.data);
        return res.data;
      }
    } catch (e) {
      console.error('Помилка оновлення профілю:', e);
    }
  }

  async function switchDevUser(userId) {
    if (userId) {
      localStorage.setItem('tg_dev_user_id', String(userId));
    } else {
      localStorage.removeItem('tg_dev_user_id');
    }
    await reloadProfile();
  }

  async function updateCity(cityId) {
    try {
      const res = await api.put('/profile', { cityId }).catch(() => null);
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        setUser(res.data);
      } else {
        const found = cities.find((c) => c.id === cityId);
        setUser((prev) => (prev ? { ...prev, cityId, city: found || prev.city } : prev));
      }
    } catch (e) {
      console.error('Помилка оновлення міста:', e);
    }
  }

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