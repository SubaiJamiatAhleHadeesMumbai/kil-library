import api from './axiosConfig';

const aboutService = {
  getAboutSettings: async () => {
    const response = await api.get('/api/settings/about-settings');
    return response.data;
  },
  updateAboutSettings: async (payload) => {
    const response = await api.put('/api/settings/about-settings', payload);
    return response.data;
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default aboutService;