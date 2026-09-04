/**
 * CommentsModeration — Full Admin Panel for Comments & Feedback
 * Features:
 *   - 5 KPI cards (total, pending, approved, rejected, flagged)
 *   - Filters: status, entity type, search, date range
 *   - Table: avatar, user, rating, comment, status badge, actions
 *   - Actions: approve, reject, flag, pin, admin reply, delete
 *   - Bulk actions: approve all, reject all, delete selected
 *   - CSV export
 *   - Feature Settings panel: 10 toggles per entity type
 *   - Pagination
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import commentService from "../api/commentService";
import StarRating from "../components/book/StarRating";

// ==========================================
// HELPERS
// ==========================================
const STATUS_STYLES = {
  pending:  { badge: "bg-amber-100 text-amber-700 border-amber-300",  label: "Pending" },
  approved: { badge: "bg-emerald-100 text-emerald-700 border-emerald-300", label: "Approved" },
  rejected: { badge: "bg-red-100 text-red-700 border-red-300",        label: "Rejected" },
  flagged:  { badge: "bg-orange-100 text-orange-700 border-orange-300", label: "Flagged" },
};

const KPI = ({ label, value, icon, color }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm`}>
    <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-2xl`}>{icon}</div>
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value ?? "-"}</p>
    </div>
  </div>
);

const Avatar = ({ name }) => {
  const initials = (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-emerald-500","bg-teal-500","bg-sky-500","bg-violet-500","bg-rose-500","bg-amber-500"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`${color} w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
};

// ==========================================
// FEATURE SETTINGS PANEL
// ==========================================
const FEATURE_LABELS = {
  feature_comments_enabled: { label: "Comments Enabled", desc: "Allow comments on this content type" },
  feature_login_required:   { label: "Login Required",   desc: "Users must be logged in to comment" },
  feature_admin_approval:   { label: "Admin Approval",   desc: "Comments need approval before going public" },
  feature_ratings_enabled:  { label: "Star Ratings",     desc: "Show and allow star ratings (1-5)" },
  feature_helpful_votes:    { label: "Helpful Votes",    desc: "👍/👎 helpful votes on comments" },
  feature_verified_badge:   { label: "Verified Reader",  desc: "Auto-badge users who read the book" },
  feature_replies_enabled:  { label: "User Replies",     desc: "Allow users to reply to comments" },
  feature_report_enabled:   { label: "Report Button",    desc: "Allow users to flag/report comments" },
  feature_pin_enabled:      { label: "Admin Pin",        desc: "Admin can pin important comments" },
  feature_admin_reply:      { label: "Admin Reply",      desc: "Admin can publicly reply to comments" },
};

const FeatureSettingsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState([]);
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    commentService.adminGetSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (entityType, feature, currentValue) => {
    setSaving((s) => ({ ...s, [`${entityType}_${feature}`]: true }));
    try {
      const updated = await commentService.adminUpdateSettings(entityType, { [feature]: !currentValue });
      setSettings((prev) =>
        prev.map((s) => (s.entity_type === entityType ? { ...s, ...updated } : s))
      );
    } catch {
      alert("Failed to save setting.");
    } finally {
      setSaving((s) => ({ ...s, [`${entityType}_${feature}`]: false }));
    }
  };

  const handleNumberChange = async (entityType, field, value) => {
    try {
      const updated = await commentService.adminUpdateSettings(entityType, { [field]: parseInt(value) });
      setSettings((prev) =>
        prev.map((s) => (s.entity_type === entityType ? { ...s, ...updated } : s))
      );
    } catch {
      // silent
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">⚙️ Feature Settings</h2>
            <p className="text-sm text-slate-500 mt-0.5">Turn each feature on/off per content type</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading settings...</div>
          ) : (
            <div className="space-y-8">
              {settings.map((s) => (
                <div key={s.entity_type} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <h3 className="font-bold text-slate-700 capitalize text-base mb-4 flex items-center gap-2">
                    {s.entity_type === "book" ? "📚" : s.entity_type === "fatawa" ? "📜" : "📝"}
                    {s.entity_type.charAt(0).toUpperCase() + s.entity_type.slice(1)} Comments
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {Object.entries(FEATURE_LABELS).map(([feature, { label, desc }]) => {
                      const isOn = s[feature];
                      const key = `${s.entity_type}_${feature}`;
                      return (
                        <div
                          key={feature}
                          className="flex items-start justify-between p-3 bg-white rounded-xl border border-slate-200"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                          </div>
                          <button
                            onClick={() => handleToggle(s.entity_type, feature, isOn)}
                            disabled={saving[key]}
                            className={`ml-3 flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                              isOn ? "bg-emerald-500" : "bg-slate-300"
                            } disabled:opacity-60`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                                isOn ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Number settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Auto-Flag Threshold (reports)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={s.auto_flag_threshold}
                        onBlur={(e) => handleNumberChange(s.entity_type, "auto_flag_threshold", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Max Comment Length (chars)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={10000}
                        defaultValue={s.max_comment_length}
                        onBlur={(e) => handleNumberChange(s.entity_type, "max_comment_length", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==========================================
// ADMIN REPLY MODAL
// ==========================================
const AdminReplyModal = ({ comment, onClose, onSave }) => {
  const [text, setText] = useState(comment.admin_reply || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await commentService.adminReplyToComment(comment.id, text.trim());
      onSave();
      onClose();
    } catch {
      alert("Failed to save reply.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
      >
        <h3 className="text-lg font-bold text-slate-800 mb-1">🏛️ Admin Reply</h3>
        <p className="text-sm text-slate-500 mb-3">
          Replying to <strong>{comment.user?.username || "User"}</strong>: "{comment.body?.slice(0, 80)}..."
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Write your public admin response..."
          className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Publish Reply"}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==========================================
// MAIN PAGE
// ==========================================
const CommentsModeration = () => {
  // Stats
  const [stats, setStats] = useState(null);
  // List
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Selection
  const [selected, setSelected] = useState([]);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);

  // Action loading
  const [actionLoading, setActionLoading] = useState({});

  const fetchStats = async () => {
    try {
      const s = await commentService.adminGetStats();
      setStats(s);
    } catch {
      // silent
    }
  };

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commentService.adminGetComments({
        status: filterStatus || undefined,
        entity_type: filterEntityType || undefined,
        search: filterSearch || undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        page,
        per_page: PER_PAGE,
      });
      setComments(res.comments || []);
      setTotal(res.total || 0);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterEntityType, filterSearch, filterDateFrom, filterDateTo, page]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchComments(); }, [fetchComments]);

  const refresh = () => { fetchStats(); fetchComments(); setSelected([]); };

  const setLoading1 = (id, val) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  const handleModerate = async (id, status) => {
    setLoading1(id, true);
    try {
      await commentService.adminModerateComment(id, status);
      refresh();
    } catch { alert("Failed."); }
    finally { setLoading1(id, false); }
  };

  const handlePin = async (id) => {
    setLoading1(`pin_${id}`, true);
    try {
      await commentService.adminPinComment(id);
      refresh();
    } catch { alert("Failed."); }
    finally { setLoading1(`pin_${id}`, false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    setLoading1(`del_${id}`, true);
    try {
      await commentService.adminDeleteComment(id);
      refresh();
    } catch { alert("Failed."); }
    finally { setLoading1(`del_${id}`, false); }
  };

  const handleBulk = async (action) => {
    if (!selected.length) return;
    if (!window.confirm(`${action.toUpperCase()} ${selected.length} comments?`)) return;
    try {
      await commentService.adminBulkAction(selected, action);
      refresh();
    } catch { alert("Bulk action failed."); }
  };

  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(selected.length === comments.length ? [] : comments.map((c) => c.id));

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && <FeatureSettingsPanel onClose={() => setShowSettings(false)} />}
        {replyTarget && (
          <AdminReplyModal
            comment={replyTarget}
            onClose={() => setReplyTarget(null)}
            onSave={refresh}
          />
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">💬 Comments Moderation</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, approve, and moderate all user reviews</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 text-sm font-semibold border border-slate-200 bg-white rounded-xl shadow-sm hover:border-emerald-400 transition flex items-center gap-2"
          >
            ⚙️ Feature Settings
          </button>
          <button
            onClick={() => commentService.adminExportCSV({ status: filterStatus || undefined, entity_type: filterEntityType || undefined })}
            className="px-4 py-2 text-sm font-semibold border border-slate-200 bg-white rounded-xl shadow-sm hover:border-emerald-400 transition flex items-center gap-2"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <KPI label="Total Comments" value={stats?.total}   icon="💬" color="bg-slate-100" />
        <KPI label="Pending"        value={stats?.pending}  icon="⏳" color="bg-amber-100" />
        <KPI label="Approved"       value={stats?.approved} icon="✅" color="bg-emerald-100" />
        <KPI label="Rejected"       value={stats?.rejected} icon="❌" color="bg-red-100" />
        <KPI label="Flagged"        value={stats?.flagged}  icon="🚩" color="bg-orange-100" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="flagged">Flagged</option>
          </select>

          <select
            value={filterEntityType}
            onChange={(e) => { setFilterEntityType(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">All Types</option>
            <option value="book">Books</option>
            <option value="fatawa">Fatawa</option>
            <option value="post">Posts</option>
          </select>

          <input
            type="text"
            placeholder="Search comments..."
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-emerald-700">
            {selected.length} comment{selected.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulk("approve")}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              ✅ Approve All
            </button>
            <button
              onClick={() => handleBulk("reject")}
              className="px-4 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              ❌ Reject All
            </button>
            <button
              onClick={() => handleBulk("delete")}
              className="px-4 py-2 text-xs font-semibold bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
            >
              🗑️ Delete
            </button>
            <button onClick={() => setSelected([])} className="px-3 py-2 text-xs text-slate-500">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-pulse text-4xl mb-3">⏳</div>
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl">💭</span>
            <p className="mt-3 text-sm">No comments found for the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="py-3 px-4 text-left">
                    <input
                      type="checkbox"
                      checked={selected.length === comments.length && comments.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Content</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rating</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comments.map((c) => {
                  const st = STATUS_STYLES[c.status] || STATUS_STYLES.pending;
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(c.id) ? "bg-emerald-50" : ""}`}>
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded"
                        />
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={c.user?.full_name || c.user?.username} />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{c.user?.full_name || c.user?.username || "Deleted"}</p>
                            <p className="text-xs text-slate-400">{c.user?.email || ""}</p>
                          </div>
                        </div>
                      </td>

                      {/* Comment Preview */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">
                            {c.entity_type} #{c.entity_id}
                          </span>
                          {c.is_pinned && <span className="text-xs text-amber-600">📌</span>}
                          {c.is_verified_read && <span className="text-xs text-emerald-600">✅</span>}
                          {c.report_count > 0 && (
                            <span className="text-xs text-red-500">🚩 {c.report_count}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate max-w-xs">{c.body}</p>
                        {c.admin_reply && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">↳ Admin: {c.admin_reply}</p>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4">
                        {c.rating ? <StarRating value={c.rating} size="sm" /> : <span className="text-xs text-slate-300">—</span>}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${st.badge}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-400">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {c.status !== "approved" && (
                            <button
                              onClick={() => handleModerate(c.id, "approved")}
                              disabled={actionLoading[c.id]}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition disabled:opacity-50"
                              title="Approve"
                            >
                              ✅
                            </button>
                          )}
                          {c.status !== "rejected" && (
                            <button
                              onClick={() => handleModerate(c.id, "rejected")}
                              disabled={actionLoading[c.id]}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition disabled:opacity-50"
                              title="Reject"
                            >
                              ❌
                            </button>
                          )}
                          <button
                            onClick={() => handlePin(c.id)}
                            disabled={actionLoading[`pin_${c.id}`]}
                            className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                              c.is_pinned
                                ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                : "bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500"
                            }`}
                            title={c.is_pinned ? "Unpin" : "Pin"}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => setReplyTarget(c)}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 transition"
                            title="Admin Reply"
                          >
                            💬
                          </button>
                          <button
                            onClick={() => handleModerate(c.id, "flagged")}
                            disabled={actionLoading[c.id]}
                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-500 transition disabled:opacity-50"
                            title="Flag"
                          >
                            🚩
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={actionLoading[`del_${c.id}`]}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition disabled:opacity-50"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-xl disabled:opacity-40 hover:border-emerald-400 bg-white transition"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-xl disabled:opacity-40 hover:border-emerald-400 bg-white transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentsModeration;
