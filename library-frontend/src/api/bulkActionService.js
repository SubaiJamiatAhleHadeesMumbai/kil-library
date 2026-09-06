import apiClient from './apiClient';

const bulkActionService = {
  async bulkBookAction(action, bookIds) {
    const response = await apiClient.post('/api/bulk/books', { action, book_ids: bookIds });
    return response.data;
  },
  async bulkUserAction(action, userIds) {
    const response = await apiClient.post('/api/bulk/users', { action, user_ids: userIds });
    return response.data;
  },
  async bulkRequestAction(action, requestIds, rejectionReason = null) {
    const response = await apiClient.post('/api/bulk/requests', {
      action,
      request_ids: requestIds,
      rejection_reason: rejectionReason
    });
    return response.data;
  },
};

export default bulkActionService;
