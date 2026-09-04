import api from './axiosConfig';

const posterService = {
  getPublicPosters: async () => {
    const response = await api.get('/api/posters/public');
    return response.data;
  },

  getAllPosters: async () => {
    const response = await api.get('/api/posters/');
    return response.data;
  },

  createPoster: async (formData) => {
    const response = await api.post('/api/posters/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updatePoster: async (posterId, formData) => {
    const response = await api.put(`/api/posters/${posterId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deletePoster: async (posterId) => {
    const response = await api.delete(`/api/posters/${posterId}`);
    return response.data;
  },

  uploadBatchPosters: async (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    const response = await api.post('/api/posters/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  reorderPosters: async (posterIds) => {
    const response = await api.put('/api/posters/reorder', { poster_ids: posterIds });
    return response.data;
  },

  bulkDeletePosters: async (posterIds) => {
    const response = await api.post('/api/posters/bulk-delete', { poster_ids: posterIds });
    return response.data;
  },

  bulkUpdateStatus: async (posterIds, isActive) => {
    const response = await api.post('/api/posters/bulk-status', { poster_ids: posterIds, is_active: isActive });
    return response.data;
  },
};

export default posterService;