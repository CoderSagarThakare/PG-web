import api from './axios';

// PG CRUD — routes live under /owner/pg for owners
export const getMyPGsApi = (params) => api.get('/pg', { params });
export const getPGByIdApi = (pgId) => api.get(`/pg/${pgId}`);
export const getPgPriceRangeApi = (pgId) => api.get(`/pg/${pgId}/price-range`);
export const createPGApi = (data) => api.post('/pg', data);
export const updatePGApi = (pgId, data) => api.patch(`/pg/${pgId}`, data);
export const deletePGApi = (pgId) => api.delete(`/pg/${pgId}`);
export const getPGImageUploadUrlApi = (fileName, fileType) =>
  api.get('/pg/upload-url', { params: { fileName, fileType } });
export const deletePGImageFileApi = (key) =>
  api.delete('/pg/file', { data: { key } });

// Manager PG access
export const getManagerPGsApi = (params) => api.get('/post', { params });

// Facilities
export const getFacilitiesApi = () => api.get('/pg/facilities');

// Discover PGs (User/Public)
export const discoverPGsApi = (params) => api.get('/pg/discover', { params });

// Staff — managers list
export const getManagersApi = (params) => api.get('/staff/managers', { params });
