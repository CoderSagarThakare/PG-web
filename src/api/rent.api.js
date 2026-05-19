import api from './axios';

export const getRentPaymentsApi      = (params) => api.get('/rent', { params });
export const getRentSummaryApi       = (params) => api.get('/rent/summary', { params });
export const recordPaymentApi        = (data)   => api.post('/rent', data);
export const generateMonthRentApi    = (data)   => api.post('/rent/generate', data);
export const updatePaymentApi        = (id, data, pgId) => api.patch(`/rent/${id}`, data, { params: { pgId } });
export const deletePaymentApi        = (id, pgId)       => api.delete(`/rent/${id}`, { params: { pgId } });

// Collaborative Rent Workflow APIs
export const getMyRentPaymentsApi   = (params) => api.get('/rent/my-rent', { params });
export const submitPaymentProofApi   = (id, data) => api.post(`/rent/${id}/submit-proof`, data);
export const approvePaymentApi      = (id, pgId) => api.post(`/rent/${id}/approve`, null, { params: { pgId } });
export const rejectPaymentApi       = (id, data, pgId) => api.post(`/rent/${id}/reject`, data, { params: { pgId } });
export const bulkApprovePaymentsApi  = (data, pgId) => api.post('/rent/bulk-approve', data, { params: { pgId } });
