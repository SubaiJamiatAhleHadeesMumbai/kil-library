import apiClient from "./apiClient";

export const translationService = {
  // Public: Get dictionary for fast frontend translation
  getDictionary: async () => {
    const res = await apiClient.get("/api/translations");
    return res.data;
  },

  // Admin: List translations with optional category, search and missing_in filter
  listAdminTranslations: async (params = {}) => {
    const res = await apiClient.get("/api/translations/admin/list", { params });
    return res.data;
  },

  // Admin: Auto-Translate text using Google
  autoTranslate: async (text, targetLang = "ur", sourceLang = "auto") => {
    const res = await apiClient.post("/api/translations/admin/auto-translate", {
      text,
      target_lang: targetLang,
      source_lang: sourceLang,
    });
    return res.data;
  },

  // Admin: Create new translation key
  createTranslation: async (data) => {
    const res = await apiClient.post("/api/translations/admin/create", data);
    return res.data;
  },

  // Admin: Bulk update translations
  bulkUpdateTranslations: async (items) => {
    const res = await apiClient.put("/api/translations/admin/bulk-update", items);
    return res.data;
  },

  // Admin: Delete translation
  deleteTranslation: async (id) => {
    const res = await apiClient.delete(`/api/translations/admin/${id}`);
    return res.data;
  },
};

export default translationService;
