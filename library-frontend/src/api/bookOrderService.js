import apiClient, { API_BASE_URL } from "./apiClient";

export const bookOrderService = {
  // Public: Get book payment info & UPI details
  getPaymentInfo: async (bookId) => {
    const res = await apiClient.get(`/api/book-orders/book/${bookId}/payment-info`);
    return res.data;
  },

  // Public: Submit order after paying UPI
  createOrder: async (data) => {
    const res = await apiClient.post("/api/book-orders/create", data);
    return res.data;
  },

  // Public: Check order status & get token
  verifyOrder: async (orderCode) => {
    const res = await apiClient.get(`/api/book-orders/verify/${orderCode}`);
    return res.data;
  },

  // Admin: List all purchase requests
  listOrders: async (params = {}) => {
    const res = await apiClient.get("/api/book-orders/admin/list", { params });
    return res.data;
  },

  // Admin: Approve or reject order
  updateOrderStatus: async (orderId, approvalData) => {
    const res = await apiClient.put(`/api/book-orders/admin/${orderId}/status`, approvalData);
    return res.data;
  },

  // Admin: Resend or re-extend download link
  resendOrderLink: async (orderId, additionalHours = 48) => {
    const res = await apiClient.post(`/api/book-orders/admin/${orderId}/resend-link`, null, {
      params: { additional_hours: additionalHours }
    });
    return res.data;
  },

  // Admin: Bulk update paid download across multiple or all books
  bulkUpdatePaidDownload: async (payload) => {
    const res = await apiClient.post("/api/books/bulk-paid-download-update", payload);
    return res.data;
  },

  // Admin: Get global master toggle status
  getMasterToggle: async () => {
    const res = await apiClient.get("/api/book-orders/admin/master-toggle");
    return res.data;
  },

  // Admin: 1-Click set global master toggle (ON / OFF)
  setMasterToggle: async (master_enabled) => {
    const res = await apiClient.post("/api/book-orders/admin/master-toggle", { master_enabled });
    return res.data;
  },

  // Admin: Get payment settings (UPI ID, default price, QR image URL)
  getPaymentSettings: async () => {
    const res = await apiClient.get("/api/book-orders/admin/payment-settings");
    return res.data;
  },

  // Admin: Update payment settings
  updatePaymentSettings: async (settings) => {
    const res = await apiClient.post("/api/book-orders/admin/payment-settings", settings);
    return res.data;
  },

  // Admin: Upload custom QR Code image
  uploadQrCode: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/api/book-orders/admin/upload-qr", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  // Helper: Build download URL
  getDownloadUrl: (token) => {
    return `${API_BASE_URL}/api/book-orders/download/${token}`;
  }
};

export default bookOrderService;
