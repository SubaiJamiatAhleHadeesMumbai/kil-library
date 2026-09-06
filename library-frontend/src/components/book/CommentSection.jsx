/**
 * CommentSection — Full user-facing comments UI
 * Features: comment form, star rating, list with pagination, RTL support
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StarRating from "./StarRating";
import CommentCard from "./CommentCard";
import { getComments, submitComment } from "../../api/commentService";
import useAuth from "../../hooks/useAuth";
import { Link } from "react-router-dom";

const CommentSection = ({ entityType = "book", entityId, isRTL = false }) => {
  const { user } = useAuth();

  const [data, setData] = useState({ comments: [], total: 0, avg_rating: 0, settings: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");

  // Form state
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getComments(entityType, entityId, { page, per_page: 10, sort });
      setData(res);
    } catch (err) {
      const msg = err?.response?.data?.detail;
      if (msg === "This feature has been disabled by admin.") {
        setData({ comments: [], total: 0, avg_rating: 0, settings: { feature_comments_enabled: false } });
      }
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, page, sort]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!body.trim()) {
      setFormError("Please write a comment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitComment({
        entity_type: entityType,
        entity_id: entityId,
        rating: rating > 0 ? rating : undefined,
        body: body.trim(),
      });
      setFormSuccess(res.message || "Comment submitted!");
      setRating(0);
      setBody("");
      if (res.status === "approved") fetchComments();
    } catch (err) {
      setFormError(err?.response?.data?.detail || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const settings = data.settings || {};

  // Feature disabled
  if (!loading && !settings.feature_comments_enabled) {
    return (
      <div className="mt-8 p-6 bg-slate-50 rounded-2xl text-center text-slate-500 border border-slate-200">
        <span className="text-2xl">🔒</span>
        <p className="mt-2 text-sm">Comments are disabled for this content.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / 10);

  return (
    <section className="mt-10" dir={isRTL ? "rtl" : "ltr"}>
      {/* Section Header */}
      <div className={`flex items-center justify-between mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          💬 Reviews & Comments
          {data.total > 0 && (
            <span className="text-sm font-normal text-slate-500">
              ({data.total})
            </span>
          )}
        </h2>

        {/* Average Rating */}
        {settings.feature_ratings_enabled && data.avg_rating > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(data.avg_rating)} size="sm" />
            <span className="text-amber-600 font-bold text-sm">{data.avg_rating.toFixed(1)}</span>
            <span className="text-slate-400 text-xs">({data.total} reviews)</span>
          </div>
        )}
      </div>

      {/* Comment Form */}
      {settings.feature_comments_enabled && (
        <>
          {user ? (
            <form
              onSubmit={handleSubmit}
              className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
              dir={isRTL ? "rtl" : "ltr"}
            >
              <h3 className="font-semibold text-slate-700 mb-3">Write a Review</h3>

              {/* Star Rating Input */}
              {settings.feature_ratings_enabled && (
                <div className="mb-3">
                  <label className="text-sm text-slate-600 block mb-1">Your Rating</label>
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>
              )}

              {/* Comment Textarea */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your thoughts about this book..."
                rows={4}
                maxLength={settings.max_comment_length || 1000}
                dir={isRTL ? "rtl" : "ltr"}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                required
              />
              <div className="flex justify-between items-center mt-1 mb-3">
                <span className="text-xs text-slate-400">
                  {body.length}/{settings.max_comment_length || 1000}
                </span>
                {settings.feature_admin_approval && (
                  <span className="text-xs text-amber-600">
                    ⏳ Comments are reviewed before publishing
                  </span>
                )}
              </div>

              {/* Messages */}
              <AnimatePresence>
                {formError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm mb-2">
                    {formError}
                  </motion.p>
                )}
                {formSuccess && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-600 text-sm mb-2">
                    ✅ {formSuccess}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          ) : (
            !settings.feature_login_required ? null : (
              <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-sm text-slate-600">
                <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                  Login
                </Link>{" "}
                to write a review.
              </div>
            )
          )}
        </>
      )}

      {/* Sort Bar */}
      {data.total > 0 && (
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="text-sm text-slate-500">Sort by:</span>
          {["newest", "helpful", "top_rated"].map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1); }}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${
                sort === s
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold"
                  : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300"
              }`}
            >
              {s === "newest" ? "Newest" : s === "helpful" ? "Most Helpful" : "Top Rated"}
            </button>
          ))}
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data.comments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <span className="text-4xl">💭</span>
          <p className="mt-3 text-sm">No reviews yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              settings={settings}
              onRefresh={fetchComments}
              isRTL={isRTL}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-center gap-2 mt-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:border-emerald-400 transition"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:border-emerald-400 transition"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
};

export default CommentSection;
