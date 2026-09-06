import apiClient from './apiClient';

export const newspaperService = {
  // Public - Get Published / Active Clippings
  async getPublicClippings(params = {}) {
    const response = await apiClient.get('/api/newspaper-clippings', { params });
    return response.data;
  },

  // Public - Get Single Clipping Details
  async getClippingById(id) {
    const response = await apiClient.get(`/api/newspaper-clippings/${id}`);
    return response.data;
  },

  // Public - Get Categories Filter List
  async getCategories() {
    const response = await apiClient.get('/api/newspaper-clippings/filters/categories');
    return response.data;
  },

  // Public - Get Newspapers Filter List
  async getNewspapers() {
    const response = await apiClient.get('/api/newspaper-clippings/filters/newspapers');
    return response.data;
  },

  // Admin - Get All Clippings (with Status Filter)
  async getAdminClippings(params = {}) {
    const response = await apiClient.get('/api/newspaper-clippings/admin/all', { params });
    return response.data;
  },

  // Admin - Create Clipping
  async createClipping(formData, onUploadProgress = null) {
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
    };
    if (onUploadProgress) {
      config.onUploadProgress = onUploadProgress;
    }
    const response = await apiClient.post('/api/newspaper-clippings', formData, config);
    return response.data;
  },

  // Admin - Update Clipping
  async updateClipping(id, formData) {
    const response = await apiClient.put(`/api/newspaper-clippings/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Admin - 1-Click Instant Active / Deactive Toggle
  async toggleActiveStatus(id) {
    const response = await apiClient.patch(`/api/newspaper-clippings/${id}/toggle-active`);
    return response.data;
  },

  // Admin - Delete Clipping
  async deleteClipping(id) {
    const response = await apiClient.delete(`/api/newspaper-clippings/${id}`);
    return response.data;
  },
};

export default newspaperService;
