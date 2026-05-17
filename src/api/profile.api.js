import api from './axios';

// User profile (role: user)
export const getUserProfileApi = () => api.get('/user/profile');
export const updateUserProfileApi = (data) => api.patch('/user/profile', data);
export const deleteUserApi = () => api.delete('/user/profile');

// Staff profile (role: owner/manager/employee)
export const getStaffProfileApi = () => api.get('/staff/profile');
export const updateStaffProfileApi = (data) => api.patch('/staff/profile', data);

// Avatar CRUD (S3-backed)
export const getAvatarUrlApi = () => api.get('/user/profile/avatar');
export const getAvatarUploadUrlApi = (fileName, fileType) =>
  api.get('/user/profile/avatar/upload-url', { params: { fileName, fileType } });
export const saveAvatarApi = (key) => api.patch('/user/profile/avatar', { key });
export const deleteAvatarApi = () => api.delete('/user/profile/avatar');
