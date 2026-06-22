import { useState, useEffect } from 'react';

// ── Debounce utility ───────────────────────────────────────────────────────────
/**
 * Returns a debounced version of the given function.
 * The debounced function delays invoking `fn` until after `delay` ms
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} fn     - The function to debounce
 * @param {number}   delay  - Delay in milliseconds (default: 400)
 * @returns {Function}      - Debounced function
 */
export const debounce = (fn, delay = 400) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * React hook that returns a debounced version of `value`.
 * The returned value only updates after `delay` ms of no changes.
 *
 * @param {any}    value  - The value to debounce
 * @param {number} delay  - Delay in milliseconds (default: 400)
 * @returns {any}         - Debounced value
 *
 * @example
 *   const debouncedSearch = useDebounce(searchTerm, 400);
 *   useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
export const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer); // cleanup on value/delay change
  }, [value, delay]);

  return debouncedValue;
};


export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// Format date and time to readable string
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return `${datePart}, ${timePart}`;
};

// Format time
export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

// Format price
export const formatPrice = (price) => {
  if (!price && price !== 0) return '—';
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

// Truncate long text
export const truncate = (str, maxLen = 80) => {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
};

// Extract API error message — shows friendly messages for network/server errors,
// and the server's own message for validation/auth errors (400, 403, 404, etc.)
export const getErrorMessage = (err) => {
  // friendlyMessage is injected by the axios response interceptor for 5xx / no-response errors
  if (err?.friendlyMessage) return err.friendlyMessage;
  // For 4xx errors the server sends a human-readable message; use it directly
  const serverMsg = err?.response?.data?.message;
  if (serverMsg) return serverMsg;
  // Fallback — avoid leaking raw error strings like ENOTFOUND or ECONNREFUSED
  return 'Something went wrong. Please try again.';
};


// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Role to display label
export const roleLabel = (role) => {
  const map = { owner: 'Owner', manager: 'Manager', employee: 'Employee', user: 'User' };
  return map[role] || capitalize(role);
};

// Status badge color class
export const statusColor = (status) => {
  const map = {
    interested: 'badge-info',
    contacted: 'badge-warning',
    visited: 'badge-purple',
    dealDone: 'badge-success',
    rejected: 'badge-danger',
    inventoryFull: 'badge-dark',
    active: 'badge-success',
    inactive: 'badge-danger',
  };
  return map[status] || 'badge-default';
};
