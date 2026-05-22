import api from './axios';

// Unified Profile API
export const getProfileApi = () => api.get('/profile');
export const updateProfileApi = (data) => api.patch('/profile', data);
export const deleteProfileApi = () => api.delete('/profile');

// Avatar CRUD (S3-backed)
export const getAvatarUrlApi = () => api.get('/profile/avatar');
export const getAvatarUploadUrlApi = (fileName, fileType) =>
  api.get('/profile/avatar/upload-url', { params: { fileName, fileType } });
export const saveAvatarApi = (key) => api.patch('/profile/avatar', { key });
export const deleteAvatarApi = () => api.delete('/profile/avatar');

// Aadhaar CRUD (S3-backed + instant OCR verification)
export const getAadharUploadUrlApi = (fileName, fileType) =>
  api.get('/profile/aadhar/upload-url', { params: { fileName, fileType } });
export const verifyAadharApi = (key) => api.post('/profile/aadhar/verify', { key });
export const deleteAadharFileApi = (key) => api.delete('/profile/aadhar', { data: { key } });

// Aliases for backward compatibility
export const getUserProfileApi = getProfileApi;
export const getStaffProfileApi = getProfileApi;
export const updateUserProfileApi = updateProfileApi;
export const updateStaffProfileApi = updateProfileApi;
export const deleteUserApi = deleteProfileApi;
