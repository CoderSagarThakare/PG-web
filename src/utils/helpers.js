// Format date to readable string
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

// Extract API error message
export const getErrorMessage = (err) => {
  return err?.response?.data?.message || err?.message || 'Something went wrong';
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
