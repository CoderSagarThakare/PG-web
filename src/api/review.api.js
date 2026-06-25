import api from './axios';

export const createOrUpdateReviewApi = (data) => api.post('/review', data);
export const getPGReviewsApi = (pgId, params) => api.get(`/review/pg/${pgId}`, { params });
export const getMyReviewApi = (pgId) => api.get(`/review/my-review/${pgId}`);
export const deleteReviewApi = (reviewId) => api.delete(`/review/${reviewId}`);
