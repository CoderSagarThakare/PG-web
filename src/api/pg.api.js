import api from './axios';

// PG CRUD — routes live under /owner/pg for owners
export const getMyPGsApi = (params) => api.get('/owner/pg', { params });
export const getPGByIdApi = (pgId) => api.get(`/owner/pg/${pgId}`);
export const createPGApi = (data) => api.post('/owner/pg', data);
export const updatePGApi = (pgId, data) => api.patch(`/owner/pg/${pgId}`, data);
export const deletePGApi = (pgId) => api.delete(`/owner/pg/${pgId}`);

// Manager PG access
export const getManagerPGsApi = (params) => api.get('/post', { params });

// Facilities
export const getFacilitiesApi = () => api.get('/owner/pg/facilities');

// Staff — managers list
export const getManagersApi = (params) => api.get('/staff/managers', { params });
