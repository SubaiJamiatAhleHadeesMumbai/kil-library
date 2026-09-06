import apiClient from './apiClient';

const socialWorkService = {
  // Public list
  getPublicItems: async (category = '', search = '', limit = 50, skip = 0) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    params.append('limit', limit);
    params.append('skip', skip);

    const response = await apiClient.get(`/api/social-work-items/public?${params.toString()}`);
    return response.data;
  },

  // Public detail
  getItemDetail: async (id) => {
    const response = await apiClient.get(`/api/social-work-items/public/${id}`);
    return response.data;
  },

  // Admin list
  getAdminItems: async (category = '', search = '', limit = 100, skip = 0) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    params.append('limit', limit);
    params.append('skip', skip);

    const response = await apiClient.get(`/api/social-work-items/?${params.toString()}`);
    return response.data;
  },

  // Admin create
  createItem: async (payload) => {
    const response = await apiClient.post('/api/social-work-items/', payload);
    return response.data;
  },

  // Admin update
  updateItem: async (id, payload) => {
    const response = await apiClient.put(`/api/social-work-items/${id}`, payload);
    return response.data;
  },

  // Admin delete
  deleteItem: async (id) => {
    const response = await apiClient.delete(`/api/social-work-items/${id}`);
    return response.data;
  },

  // Admin upload multiple images
  uploadImages: async (files, folder = 'markaz_social_work') => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('folder', folder);

    const response = await apiClient.post('/api/social-work-items/upload-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default socialWorkService;
