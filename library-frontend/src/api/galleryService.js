import api from './axiosConfig';

const galleryService = {
  getPublicGallery: async (params = {}) => {
    const response = await api.get('/api/gallery/public', { params });
    return response.data;
  },

  getAdminGallery: async () => {
    const response = await api.get('/api/gallery/admin/all');
    return response.data;
  },

  saveAlbum: async (formData) => {
    const response = await api.post('/api/gallery/album', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteAlbum: async (albumId) => {
    const response = await api.delete(`/api/gallery/album/${albumId}`);
    return response.data;
  },

  batchUploadPhotos: async (formData) => {
    const response = await api.post('/api/gallery/batch-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateGalleryItem: async (itemId, formData) => {
    const response = await api.put(`/api/gallery/item/${itemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteGalleryItem: async (itemId) => {
    const response = await api.delete(`/api/gallery/item/${itemId}`);
    return response.data;
  },

  bulkUpdateStatus: async (itemIds, isActive) => {
    const response = await api.post('/api/gallery/bulk-status', {
      item_ids: itemIds,
      is_active: isActive,
    });
    return response.data;
  },

  bulkDeleteItems: async (itemIds) => {
    const response = await api.post('/api/gallery/bulk-delete', {
      item_ids: itemIds,
    });
    return response.data;
  },

  reorderItems: async (itemIds) => {
    const response = await api.put('/api/gallery/reorder', {
      item_ids: itemIds,
    });
    return response.data;
  },
};

export default galleryService;
