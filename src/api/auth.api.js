import api from './axios';

export const loginApi = (data) => api.post('/auth/login', data);
export const registerApi = (data) => api.post('/auth/register', data);
export const forgotPasswordApi = (data) => api.post('/auth/forgot-password', data);
export const resetPasswordApi = (data, token) =>
  api.post(`/auth/reset-password?token=${token}`, data);
export const sendVerificationOtpApi = () => api.get('/auth/send-verification-otp');
export const verifyOtpApi = (data) => api.post('/auth/verify-otp', data);
