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
};

export default aboutService;