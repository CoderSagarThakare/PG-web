import api from './axios';

// User profile (role: user)
export const getUserProfileApi = () => api.get('/user/profile');
export const updateUserProfileApi = (data) => api.patch('/user/profile', data);
export const deleteUserApi = () => api.delete('/user/profile');

// Staff profile (role: owner/manager/employee)
export const getStaffProfileApi = () => api.get('/staff/profile');
export const updateStaffProfileApi = (data) => api.patch('/staff/profile', data);
