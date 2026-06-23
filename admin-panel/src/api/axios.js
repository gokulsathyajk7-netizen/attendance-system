import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
baseURL: API_BASE,
withCredentials: true,
timeout: 15000,
headers: {
'Content-Type': 'application/json',
},
});

// Attach Access Token
api.interceptors.request.use(
(config) => {
const token = localStorage.getItem('accessToken');

if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}

return config;

},
(error) => Promise.reject(error)
);

// Auto Refresh Token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
failedQueue.forEach((promise) => {
if (error) {
promise.reject(error);
} else {
promise.resolve(token);
}
});

failedQueue = [];
};

api.interceptors.response.use(
(response) => response,
async (error) => {
const originalRequest = error.config;

if (
  error.response?.status === 401 &&
  !originalRequest._retry
) {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then((token) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    });
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const { data } = await api.post('/auth/refresh');

    const newToken = data.data.accessToken;

    localStorage.setItem('accessToken', newToken);

    processQueue(null, newToken);

    originalRequest.headers.Authorization = `Bearer ${newToken}`;

    return api(originalRequest);

  } catch (refreshError) {
    processQueue(refreshError, null);

    localStorage.removeItem('accessToken');

    window.location.href = '/login';

    return Promise.reject(refreshError);

  } finally {
    isRefreshing = false;
  }
}

return Promise.reject(error);

}
);

export default api;
