import api from './axios';

// ── Employee / Staff Registry ──────────────────────────────────────────────────
export const getEmployeesApi        = (params)        => api.get('/employees', { params });
export const addEmployeeApi         = (data)          => api.post('/employees', data);
export const updateEmployeeApi      = (id, data)      => api.patch(`/employees/${id}`, data);
export const removeEmployeeApi      = (id)            => api.delete(`/employees/${id}`);
export const searchStaffUsersApi    = (params)        => api.get('/employees/search-users', { params });

// ── Expense Claims ─────────────────────────────────────────────────────────────
export const getExpensesApi         = (params)        => api.get('/expenses', { params });
export const createExpenseApi       = (data)          => api.post('/expenses', data);
export const processExpenseApi      = (id, data)      => api.patch(`/expenses/${id}/process`, data);
export const markExpensePaidApi     = (id)            => api.patch(`/expenses/${id}/pay`);
export const deleteExpenseApi       = (id)            => api.delete(`/expenses/${id}`);

// ── Payroll / Staff Payments ───────────────────────────────────────────────────
export const getPayrollsApi         = (params)        => api.get('/staff-payments', { params });
export const generatePayrollApi     = (data)          => api.post('/staff-payments/generate', data);
export const markPayrollPaidApi     = (id, data)      => api.patch(`/staff-payments/${id}/pay`, data);
