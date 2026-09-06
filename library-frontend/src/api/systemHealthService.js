import apiClient from './apiClient';

const systemHealthService = {
  async getSystemHealth() {
    const response = await apiClient.get('/api/system/health');
    return response.data;
  },
};

export default systemHealthService;
