import api from './axios';

export const getEnquiriesApi = (params) => api.get('/enquiry', { params });
export const getEnquiryByIdApi = (enquiryId) => api.get(`/enquiry/${enquiryId}`);
export const createEnquiryApi = (data) => api.post('/enquiry', data);
export const updateEnquiryApi = (enquiryId, data) => api.patch(`/enquiry/${enquiryId}`, data);
