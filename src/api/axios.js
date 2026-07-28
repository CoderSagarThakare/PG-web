import axios from 'axios';

// ── Per-request-type timeout constants (ms) ───────────────────────────────────
export const AUTH_TIMEOUT   =  8_000;  //  8s — login / register (fast ops)
export const READ_TIMEOUT   = 10_000;  // 10s — data reads (lists, details)  ← default
export const WRITE_TIMEOUT  = 15_000;  // 15s — create / update / delete
export const UPLOAD_TIMEOUT = 120_000; //  2m — file / image uploads

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8022',
  headers: { 'Content-Type': 'application/json' },
  timeout: READ_TIMEOUT,
});

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Friendly error message normalizer ─────────────────────────────────────────
function normalizeFriendlyError(err) {
  if (!err.response) {
    const code = err.code || '';
    if (code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      err.friendlyMessage = 'The request timed out. Please check your connection and try again.';
    } else if (!navigator.onLine) {
      err.friendlyMessage = 'You are offline. Please check your internet connection.';
    } else {
      err.friendlyMessage = 'Unable to reach the server. Please try again in a moment.';
    }
    return err;
  }

  const status = err.response.status;
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    const serverMsg = err.response?.data?.message;
    err.friendlyMessage = serverMsg || 'The server is temporarily unavailable. Please try again later.';
  } else if (status === 429) {
    // Prefer the backend's rate-limit message (e.g. "Too many attempts, please try again after 15 minutes")
    const serverMsg = err.response?.data?.message;
    err.friendlyMessage = serverMsg || 'Too many requests. Please slow down and try again.';
  }
  return err;
}

// ── Silent token refresh queue ────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ── Response interceptor with silent refresh ──────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    normalizeFriendlyError(err);

    const originalRequest = err.config;

    // If 401 and not already retried, and not the refresh endpoint itself
    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRetry
    ) {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token — force logout
        handleSessionExpiry();
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Another refresh is in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(e => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh-tokens`,
          { refreshToken },
          { timeout: AUTH_TIMEOUT }
        );

        const newToken = data?.data?.token;
        const newRefreshToken = data?.data?.refreshToken;

        if (!newToken) throw new Error('No token in refresh response');

        localStorage.setItem('token', newToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleSessionExpiry();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Non-401 or already retried — handle as before
    if (err.response?.status === 401) {
      handleSessionExpiry();
    }
    return Promise.reject(err);
  }
);

function handleSessionExpiry() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (!window.location.pathname.includes('/login')) {
    // Store the current URL so we can redirect back after re-login
    const returnUrl = window.location.pathname + window.location.search;
    if (returnUrl !== '/' && returnUrl !== '/login') {
      sessionStorage.setItem('returnUrl', returnUrl);
    }
    window.location.href = '/login?session=expired';
  }
}

export default api;
