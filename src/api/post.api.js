import api from './axios';

// Owner/Manager — post management
export const getPostsApi = (params) => api.get('/owner/post', { params });
export const getPostByIdApi = (postId) => api.get(`/owner/post/${postId}`);
export const createPostApi = (data) => api.post('/owner/post', data);
export const updatePostApi = (postId, data) => api.patch(`/owner/post/${postId}`, data);
export const deletePostApi = (postId) => api.delete(`/owner/post/${postId}`);

// User — search/browse posts based on preferences
export const searchPostsApi = (params) => api.get('/post/search', { params });
