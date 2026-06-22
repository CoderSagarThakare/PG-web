import axios from 'axios';

// ── Per-request-type timeout constants (ms) ───────────────────────────────────
// Import and pass as { timeout: WRITE_TIMEOUT } in individual API calls to override.
export const AUTH_TIMEOUT   =  8_000;  //  8s — login / register (fast ops)
export const READ_TIMEOUT   = 10_000;  // 10s — data reads (lists, details)  ← default
export const WRITE_TIMEOUT  = 15_000;  // 15s — create / update / delete
export const UPLOAD_TIMEOUT = 120_000; //  2m — file / image uploads

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8022',
  headers: { 'Content-Type': 'application/json' },
  timeout: READ_TIMEOUT, // 10s default — covers most data-read endpoints
});

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Friendly error message normalizer ─────────────────────────────────────────
// Attaches a user-readable `friendlyMessage` to the error before it propagates.
// getErrorMessage() in helpers.js reads this first, so raw technical strings
// (ENOTFOUND, ECONNREFUSED, etc.) never reach the UI.
function normalizeFriendlyError(err) {
  // Network-level errors — request never reached the server
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

  // Server responded with an error status
  const status = err.response.status;
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    err.friendlyMessage = 'The server is temporarily unavailable. Please try again later.';
  } else if (status === 429) {
    err.friendlyMessage = 'Too many requests. Please slow down and try again.';
  }
  // 400, 401, 403, 404 etc. — keep the server's message as-is (already user-friendly)
  return err;
}

// Handle 401 globally — clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    normalizeFriendlyError(err);

    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
