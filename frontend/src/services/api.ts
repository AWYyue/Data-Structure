import axios from 'axios';
import { clearStoredAuth } from '../utils/authStorage';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

// 统一的 axios 实例，自动附带登录态并处理未授权跳转
const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const requestUrl = String(error.config?.url || '');
    const shouldHandleUnauthorized =
      error.response?.status === 401 &&
      !requestUrl.includes('/users/login') &&
      !requestUrl.includes('/users/register');
    const shouldHandleMissingCurrentUser = error.response?.status === 404 && requestUrl.includes('/users/me');

    if (shouldHandleUnauthorized || shouldHandleMissingCurrentUser) {
      clearStoredAuth();
    }
    return Promise.reject(error);
  },
);

export default api;
