import apiClient from "./apiClient";

const ANALYTICS_URL = "/api/analytics";

export const getVisitorId = () => {
  if (typeof window === "undefined") return "server";

  const storageKey = "kil_visitor_id";
  let existing = localStorage.getItem(storageKey);
  if (!existing) {
    existing = localStorage.getItem("booknest_visitor_id");
  }
  if (existing) return existing;

  const generated =
    window.crypto?.randomUUID?.() ||
    `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(storageKey, generated);
  return generated;
};

const analyticsService = {
  getVisitorId,

  /**
   * 🟢 Send Heartbeat Ping from SmartReader (Every 25-30s)
   */
  async pingReadingSession({
    sessionId,
    visitorId,
    bookId,
    pageNo = 1,
    totalPages = 0,
    durationIncrementSeconds = 30,
    deviceType = "desktop",
  }) {
    if (!sessionId || !bookId) return null;
    try {
      const response = await apiClient.post(`${ANALYTICS_URL}/reading/ping`, {
        session_id: sessionId,
        visitor_id: visitorId || getVisitorId(),
        book_id: Number(bookId),
        page_no: Number(pageNo) || 1,
        total_pages: Number(totalPages) || 0,
        duration_increment_seconds: Number(durationIncrementSeconds) || 30,
        device_type: deviceType,
      });
      return response.data;
    } catch (error) {
      // Background analytics fail should never disturb the reader UI
      console.warn("Analytics reading ping error:", error?.message);
      return null;
    }
  },

  /**
   * 🟢 Beacon ping on reader close or tab unload (Reliable background beacon)
   */
  sendBeaconReadingExit({
    sessionId,
    visitorId,
    bookId,
    pageNo = 1,
    totalPages = 0,
    durationIncrementSeconds = 10,
    deviceType = "desktop",
  }) {
    if (typeof navigator === "undefined" || !navigator.sendBeacon || !sessionId || !bookId) {
      return false;
    }

    const payload = JSON.stringify({
      session_id: sessionId,
      visitor_id: visitorId || getVisitorId(),
      book_id: Number(bookId),
      page_no: Number(pageNo) || 1,
      total_pages: Number(totalPages) || 0,
      duration_increment_seconds: Number(durationIncrementSeconds) || 10,
      device_type: deviceType,
    });

    const blob = new Blob([payload], { type: "application/json" });
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    return navigator.sendBeacon(`${baseUrl}${ANALYTICS_URL}/reading/ping`, blob);
  },

  /**
   * 📊 Get Master Dashboard Analytics for Admin
   */
  async getAnalyticsDashboard(params = {}) {
    const { timeframe = "7days", bookId = null, city = null } = params;
    const query = new URLSearchParams();
    if (timeframe) query.append("timeframe", timeframe);
    if (bookId) query.append("book_id", bookId);
    if (city && city !== "all") query.append("city", city);

    try {
      const response = await apiClient.get(`${ANALYTICS_URL}/dashboard?${query.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Failed to load analytics dashboard:", error);
      throw error;
    }
  },

  /**
   * 📰 Log Post / News View
   */
  async logPostView(postId, postTitle) {
    if (!postId) return null;
    try {
      const response = await apiClient.post(`${ANALYTICS_URL}/post/view`, {
        post_id: String(postId),
        post_title: postTitle || "Announcement",
        visitor_id: getVisitorId(),
      });
      return response.data;
    } catch (err) {
      return null;
    }
  },

  // Backward compatibility stubs
  async trackVisit(payload) {
    try {
      const response = await apiClient.post(`${ANALYTICS_URL}/track`, payload);
      return response.data;
    } catch {
      return null;
    }
  },

  async getSummary() {
    try {
      const response = await apiClient.get(`${ANALYTICS_URL}/summary`);
      return response.data || null;
    } catch {
      return null;
    }
  },
};

export default analyticsService;
