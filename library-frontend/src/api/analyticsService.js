import apiClient from "./apiClient";

const ANALYTICS_URL = "/api/analytics";

const getVisitorId = () => {
  if (typeof window === "undefined") return "server";

  const storageKey = "booknest_visitor_id";
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;

  const generated =
    window.crypto?.randomUUID?.() ||
    `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(storageKey, generated);
  return generated;
};

const analyticsService = {
  async trackVisit(payload) {
    try {
      const response = await apiClient.post(`${ANALYTICS_URL}/track`, payload);
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return null;
      }
      console.warn("Analytics track failed:", error?.response?.data || error?.message);
      return null;
    }
  },

  async getSummary() {
    try {
      const response = await apiClient.get(`${ANALYTICS_URL}/summary`);
      return response.data || null;
    } catch (error) {
      if (error?.response?.status === 401) return null;
      console.warn("Analytics summary failed:", error?.response?.data || error?.message);
      return null;
    }
  },

  getVisitorId,
};

export default analyticsService;
