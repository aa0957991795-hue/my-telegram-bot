import axios from 'axios';

export const FILES_URL = '';

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Interceptor to inject Telegram WebApp initData or Dev User ID header
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // 1. Check if Telegram WebApp initData exists
    const tgInitData = window?.Telegram?.WebApp?.initData;
    if (tgInitData) {
      config.headers['x-telegram-init-data'] = tgInitData;
    }

    // 2. Dev mode test user selector override
    const devUserId = localStorage.getItem('tg_dev_user_id');
    if (devUserId) {
      config.headers['x-dev-user-id'] = devUserId;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.error || error.message || 'Ошибка сети';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);
