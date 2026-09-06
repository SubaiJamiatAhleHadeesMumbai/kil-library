import apiClient from './apiClient';

const adminDashboardService = {
  async getDashboardStats() {
    const response = await apiClient.get('/api/admin/dashboard');
    return response.data;
  },
};

export default adminDashboardService;
