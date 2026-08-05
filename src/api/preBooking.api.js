import api from './axios';

export const createPreBookingApi = (data) => api.post('/pre-booking', data);
export const cancelPreBookingApi = (id, data) => api.post(`/pre-booking/${id}/cancel`, data);
export const getPreBookingsByPgApi = (pgId, params) => api.get(`/pre-booking/pg/${pgId}`, { params });
export const getPreBookingByBedApi = (bedId) => api.get(`/pre-booking/bed/${bedId}`);
export const setVacatingNoticeApi = (data) => api.post('/pre-booking/vacating-notice', data);
export const clearVacatingNoticeApi = (bedId) => api.delete(`/pre-booking/vacating-notice/${bedId}`);
export const getVacatingBedsApi = (pgId) => api.get(`/pre-booking/vacating/${pgId}`);
