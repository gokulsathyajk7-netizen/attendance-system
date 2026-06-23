import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// IMPORTANT: Replace with your machine's LAN IP when testing on a physical device.
// Find it via `ipconfig` (Windows) or `ifconfig`/`ip addr` (Mac/Linux).
// Do NOT use 'localhost' on a physical device — it won't reach your dev machine.
const API_BASE_URL = 'https://your-app.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;
        await SecureStore.setItemAsync('accessToken', newToken);
        queue.forEach(p => p.resolve(newToken));
        queue = [];
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        queue.forEach(p => p.reject(err));
        queue = [];
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
