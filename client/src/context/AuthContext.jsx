import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

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
        setUser(userData);
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
          cityId: initialCity.id,
          city: initialCity,
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