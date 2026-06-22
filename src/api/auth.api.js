import api, { AUTH_TIMEOUT } from './axios';

export const loginApi             = (data)         => api.post('/auth/login',                 data, { timeout: AUTH_TIMEOUT });
export const registerApi          = (data)         => api.post('/auth/register',               data, { timeout: AUTH_TIMEOUT });
export const forgotPasswordApi    = (data)         => api.post('/auth/forgot-password',        data, { timeout: AUTH_TIMEOUT });
export const resetPasswordApi     = (data, token)  => api.post(`/auth/reset-password?token=${token}`, data, { timeout: AUTH_TIMEOUT });
export const sendVerificationOtpApi = ()           => api.get('/auth/send-verification-otp',       { timeout: AUTH_TIMEOUT });
export const verifyOtpApi         = (data)         => api.post('/auth/verify-otp',            data, { timeout: AUTH_TIMEOUT });
