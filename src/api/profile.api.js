import api, { WRITE_TIMEOUT, UPLOAD_TIMEOUT } from './axios';

// Unified Profile API
export const getProfileApi    = ()     => api.get('/profile');
export const updateProfileApi = (data) => api.patch('/profile',  data, { timeout: WRITE_TIMEOUT });
export const deleteProfileApi = ()     => api.delete('/profile',       { timeout: WRITE_TIMEOUT });

// Avatar CRUD (S3-backed — upload-url fetch is fast; actual S3 PUT goes direct)
export const getAvatarUrlApi        = ()                   => api.get('/profile/avatar');
export const getAvatarUploadUrlApi  = (fileName, fileType) => api.get('/profile/avatar/upload-url', { params: { fileName, fileType } });
export const saveAvatarApi          = (key)                => api.patch('/profile/avatar', { key }, { timeout: WRITE_TIMEOUT });
export const deleteAvatarApi        = ()                   => api.delete('/profile/avatar',          { timeout: WRITE_TIMEOUT });

// Aadhaar CRUD (S3-backed + server-side OCR verification — can take extra time)
export const getAadharUploadUrlApi  = (fileName, fileType) => api.get('/profile/aadhar/upload-url', { params: { fileName, fileType } });
export const verifyAadharApi        = (key)                => api.post('/profile/aadhar/verify', { key }, { timeout: UPLOAD_TIMEOUT });
export const deleteAadharFileApi    = (key)                => api.delete('/profile/aadhar', { data: { key }, timeout: WRITE_TIMEOUT });

// Aliases for backward compatibility
export const getUserProfileApi      = getProfileApi;
export const getStaffProfileApi     = getProfileApi;
export const updateUserProfileApi   = updateProfileApi;
export const updateStaffProfileApi  = updateProfileApi;
export const deleteUserApi          = deleteProfileApi;
