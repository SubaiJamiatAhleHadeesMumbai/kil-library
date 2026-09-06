/**
 * Comment Service — API client for Comments & Feedback system
 * Covers: user-facing + admin moderation + feature settings
 */

import api from "./axiosConfig";

const BASE = "/api/comments";
const ADMIN_BASE = "/api/admin/comments";

// ==========================================
// USER-FACING APIs
// ==========================================

/**
 * Get approved comments for an entity.
 * @param {string} entityType - "book" | "fatawa" | "post"
 * @param {number} entityId
 * @param {object} params - { page, per_page, sort }
 */
export const getComments = async (entityType, entityId, params = {}) => {
  const res = await api.get(`${BASE}/${entityType}/${entityId}`, { params });
  return res.data;
};

/**
 * Submit a new comment/rating.
 */
export const submitComment = async ({ entity_type, entity_id, rating, body }) => {
  const res = await api.post(`${BASE}/`, { entity_type, entity_id, rating, body });
  return res.data;
};

/**
 * Reply to an existing top-level comment.
 */
export const replyToComment = async (commentId, body) => {
  const res = await api.post(`${BASE}/${commentId}/reply`, { body });
  return res.data;
};

/**
 * Vote helpful / not_helpful.
 * @param {number} commentId
 * @param {"helpful"|"not_helpful"} voteType
 */
export const voteComment = async (commentId, voteType) => {
  const res = await api.post(`${BASE}/${commentId}/vote`, { vote_type: voteType });
  return res.data;
};

/**
 * Report a comment as inappropriate.
 */
export const reportComment = async (commentId, reason = "") => {
  const res = await api.post(`${BASE}/${commentId}/report`, { reason });
  return res.data;
};


// ==========================================
// ADMIN APIs
// ==========================================

/**
 * Get all comments for admin moderation.
 * @param {object} filters - { status, entity_type, entity_id, search, date_from, date_to, page, per_page }
 */
export const adminGetComments = async (filters = {}) => {
  const res = await api.get(`${ADMIN_BASE}/`, { params: filters });
  return res.data;
};

/**
 * Get admin KPI dashboard stats.
 */
export const adminGetStats = async () => {
  const res = await api.get(`${ADMIN_BASE}/stats`);
  return res.data;
};

/**
 * Moderate a comment (approve / reject / flag / pending).
 */
export const adminModerateComment = async (commentId, status, reason = "") => {
  const res = await api.patch(`${ADMIN_BASE}/${commentId}/moderate`, { status, reason });
  return res.data;
};

/**
 * Toggle pin on a comment.
 */
export const adminPinComment = async (commentId) => {
  const res = await api.post(`${ADMIN_BASE}/${commentId}/pin`);
  return res.data;
};

/**
 * Admin public reply to a comment.
 */
export const adminReplyToComment = async (commentId, adminReply) => {
  const res = await api.patch(`${ADMIN_BASE}/${commentId}/admin-reply`, { admin_reply: adminReply });
  return res.data;
};

/**
 * Soft-delete or hard-delete a comment.
 */
export const adminDeleteComment = async (commentId, hard = false) => {
  const res = await api.delete(`${ADMIN_BASE}/${commentId}`, { params: { hard } });
  return res.data;
};

/**
 * Bulk action on multiple comments.
 * @param {number[]} ids
 * @param {"approve"|"reject"|"delete"} action
 */
export const adminBulkAction = async (ids, action) => {
  const res = await api.post(`${ADMIN_BASE}/bulk`, { ids, action });
  return res.data;
};

/**
 * Export comments as CSV download.
 */
export const adminExportCSV = async (filters = {}) => {
  const res = await api.get(`${ADMIN_BASE}/export`, {
    params: filters,
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "comments_export.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Get all feature settings for all entity types.
 */
export const adminGetSettings = async () => {
  const res = await api.get(`${ADMIN_BASE}/settings`);
  return res.data;
};

/**
 * Update feature settings for a specific entity type.
 * @param {string} entityType - "book" | "fatawa" | "post"
 * @param {object} settings - partial FeatureSettingsSchema
 */
export const adminUpdateSettings = async (entityType, settings) => {
  const res = await api.patch(`${ADMIN_BASE}/settings/${entityType}`, settings);
  return res.data;
};

const commentService = {
  getComments,
  submitComment,
  replyToComment,
  voteComment,
  reportComment,
  adminGetComments,
  adminGetStats,
  adminModerateComment,
  adminPinComment,
  adminReplyToComment,
  adminDeleteComment,
  adminBulkAction,
  adminExportCSV,
  adminGetSettings,
  adminUpdateSettings,
};

export default commentService;
