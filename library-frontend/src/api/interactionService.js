import apiClient from "./apiClient";

/**
 * Service for Researcher's Toolkit
 * Handles: Last Read Position, Bookmarks, and Notes
 */
export const interactionService = {
  
  /**
   * 🟢 GET STATUS
   * Jab user book khole, to check karein wo kahan tha.
   * API: GET /api/interaction/{bookId}
   */
  async getBookStatus(bookId) {
    try {
      const response = await apiClient.get(`/api/interaction/${bookId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching book status:", error);
      // Agar error aaye to default values return karein taaki UI crash na ho
      return {
        book_id: bookId,
        last_page_read: 1,
        total_pages: 0,
        is_bookmarked: false,
      };
    }
  },

  /**
   * 🟢 UPDATE PROGRESS
   * Jab user page change kare, to last page save karein.
   * API: POST /api/interaction/progress
   */
  async updateProgress(bookId, pageNo, totalPages = 0) {
    try {
      const response = await apiClient.post("/api/interaction/progress", {
        book_id: bookId,
        page_no: pageNo,
        total_pages: totalPages,
      });
      return response.data;
    } catch (error) {
      // Background sync fail ho to user ko disturb na karein
      console.warn("Failed to sync reading progress:", error);
      return null;
    }
  },

  /**
   * 🟢 TOGGLE BOOKMARK
   * Bookmark lagana ya hatana.
   * API: POST /api/interaction/bookmark
   */
  async toggleBookmark(bookId, isBookmarked) {
    try {
      const response = await apiClient.post("/api/interaction/bookmark", {
        book_id: bookId,
        is_bookmarked: isBookmarked,
      });
      return response.data;
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      throw error;
    }
  },
};

export default interactionService;