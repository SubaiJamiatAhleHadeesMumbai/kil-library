import apiClient from './apiClient';

const buildParams = (params = {}) => {
  const finalParams = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      finalParams[key] = value;
    }
  });

  return finalParams;
};

export const fatawaService = {
  async getCategories() {
    const response = await apiClient.get('/api/fatawa/categories');
    return response.data;
  },

  async createCategory(payload) {
    const response = await apiClient.post('/api/fatawa/categories', payload);
    return response.data;
  },

  async updateCategory(categoryId, payload) {
    const response = await apiClient.put(`/api/fatawa/categories/${categoryId}`, payload);
    return response.data;
  },

  async deleteCategory(categoryId) {
    const response = await apiClient.delete(`/api/fatawa/categories/${categoryId}`);
    return response.data;
  },

  async getQuestions(params = {}) {
    const response = await apiClient.get('/api/fatawa/questions', { params: buildParams(params) });
    return response.data;
  },

  async getMyQuestions() {
    const response = await apiClient.get('/api/fatawa/questions/my-questions');
    return response.data;
  },

  async createQuestion(payload) {
    const response = await apiClient.post('/api/fatawa/questions', payload);
    return response.data;
  },

  async getAdminQuestions(params = {}) {
    const response = await apiClient.get('/api/fatawa/admin/questions', { params: buildParams(params) });
    return response.data;
  },

  async updateQuestion(questionId, payload) {
    const response = await apiClient.patch(`/api/fatawa/admin/questions/${questionId}`, payload);
    return response.data;
  },

  async answerQuestion(questionId, payload) {
    const response = await apiClient.put(`/api/fatawa/admin/questions/${questionId}/answer`, payload);
    return response.data;
  },

  async deleteQuestion(questionId) {
    const response = await apiClient.delete(`/api/fatawa/admin/questions/${questionId}`);
    return response.data;
  },

  async getRelatedBooks(categoryId) {
    const response = await apiClient.get(`/api/fatawa/categories/${categoryId}/books`);
    return response.data;
  },
};