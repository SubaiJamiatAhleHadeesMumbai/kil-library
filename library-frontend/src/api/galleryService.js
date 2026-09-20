import api from './axiosConfig';

const galleryService = {
  getPublicGallery: async (params = {}) => {
    const response = await api.get('/api/gallery/public', { params });
    return response.data;
  },

  getAdminGallery: async (params = {}) => {
    const response = await api.get('/api/gallery/admin/all', { params });
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

  addVideo: async (formData) => {
    const response = await api.post('/api/gallery/add-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadDatedItem: async (formData) => {
    const response = await api.post('/api/gallery/upload-dated', formData, {
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

  // Public: Get featured photos for homepage showcase
  getHomeFeaturedGallery: async (limit = 8) => {
    const response = await api.get('/api/gallery/public/home', { params: { limit } });
    return response.data;
  },

  // Public: Get latest active Jumah item and Moon item for homepage widgets
  getIslamicUpdates: async () => {
    const response = await api.get('/api/gallery/public/islamic-updates');
    return response.data;
  },

  // Public: Get all Moon Sighting announcements organized by Hijri Year
  getMoonArchive: async () => {
    const response = await api.get('/api/gallery/public/moon-archive');
    return response.data;
  },

  // Public: Get all Friday Sermons (Khutbaat-e-Jumu'ah) organized by Year and Month
  getJumahArchive: async () => {
    const response = await api.get('/api/gallery/public/jumah-archive');
    return response.data;
  },

  // Public: Get 12-month Islamic Calendar posters and current active month
  getCalendarArchive: async (year) => {
    const response = await api.get('/api/gallery/public/calendar-archive', {
      params: year ? { year } : {},
    });
    return response.data;
  },

  // Admin: 1-Click set a calendar as the currently live month on public site
  setCurrentCalendar: async (itemId) => {
    const response = await api.put(`/api/gallery/item/${itemId}/set-current-calendar`);
    return response.data;
  },

  // Admin: 1-Click toggle show on home page
  toggleShowOnHome: async (itemId) => {
    const response = await api.put(`/api/gallery/item/${itemId}/toggle-home`);
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
