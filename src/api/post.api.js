import api from './axios';

// Owner/Manager — post management
export const getPostsApi = (params) => api.get('/post', { params });
export const getPostByIdApi = (postId) => api.get(`/post/${postId}`);
export const createPostApi = (data) => api.post('/post', data);
export const updatePostApi = (postId, data) => api.patch(`/post/${postId}`, data);
export const deletePostApi = (postId) => api.delete(`/post/${postId}`);

// User — search/browse posts based on preferences
export const searchPostsApi = (params) => api.get('/post/search', { params });
