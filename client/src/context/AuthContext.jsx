import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devUsers, setDevUsers] = useState([]);
  const [cities, setCities] = useState([]);

  // Check if DEV switcher should be displayed:
  // Visible in development mode unless explicitly disabled via VITE_ENABLE_DEV_SWITCHER=false
  const isDevModeEnabled =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_SWITCHER !== 'false';

  // Initialize Telegram WebApp SDK if available
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch (e) {
        console.warn('Telegram WebApp ініціалізацію пропущено:', e);
      }
    }
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      // 1. Fetch cities
      const citiesRes = await api.get('/catalog/cities').catch(() => ({ data: [] }));
      setCities(citiesRes.data || []);

      // 2. Fetch test users for dev mode if enabled
      if (isDevModeEnabled) {
        const devUsersRes = await api.get('/auth/users').catch(() => ({ data: [] }));
        setDevUsers(devUsersRes.data || []);
      }

      // 3. Fetch current authenticated profile
      const profileRes = await api.get('/auth/me');
      setUser(profileRes.data);
    } catch (err) {
      console.warn('Не вдалося завантажити профіль користувача:', err);
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
      setUser(res.data);
      return res.data;
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
      const res = await api.put('/profile', { cityId });
      setUser(res.data);
    } catch (e) {
      console.error('Помилка оновлення міста:', e);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
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