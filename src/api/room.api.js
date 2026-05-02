import api from './axios';

export const getRoomsApi = (pgId) => api.get(`/room/pg/${pgId}`);
export const createRoomApi = (data) => api.post('/room', data);
export const updateRoomApi = (roomId, data) => api.patch(`/room/${roomId}`, data);
export const deleteRoomApi = (roomId) => api.delete(`/room/${roomId}`);
export const getEligibleTenantsApi = (pgId) => api.get(`/room/eligible-tenants/${pgId}`);
export const assignTenantApi = (bedId, userId) => api.post(`/room/assign/${bedId}`, { userId });
export const unassignTenantApi = (bedId) => api.post(`/room/unassign/${bedId}`);
export const updateBedApi = (bedId, data) => api.patch(`/room/bed/${bedId}`, data);
