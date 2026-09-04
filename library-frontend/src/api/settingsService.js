import api from './axiosConfig';

const settingsService = {
  getHomepageSettings: async () => {
    const response = await api.get('/api/settings/homepage-settings');
    return response.data;
  },
  updateHomepageSettings: async (payload) => {
    const response = await api.put('/api/settings/homepage-settings', payload);
    return response.data;
  },
  getUiSettings: async () => {
    const response = await api.get('/api/settings/ui-config');
    return response.data;
  },
  updateUiSettings: async (payload) => {
    const response = await api.put('/api/settings/ui-config', payload);
    return response.data;
  },
};

export default settingsService;
