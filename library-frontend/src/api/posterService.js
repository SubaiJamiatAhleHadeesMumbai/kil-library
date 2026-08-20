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
};

export default posterService;