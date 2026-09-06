/**
 * CommentCard — Displays a single comment with all features:
 *   - Star rating, verified badge, helpful votes, admin reply,
 *     pinned indicator, reply button, report button, RTL support
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StarRating from "./StarRating";
import { voteComment, replyToComment, reportComment } from "../../api/commentService";
import useAuth from "../../hooks/useAuth";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const Avatar = ({ name }) => {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    "bg-emerald-500", "bg-teal-500", "bg-sky-500",
    "bg-violet-500", "bg-rose-500", "bg-amber-500"
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`${color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
};

const CommentCard = ({ comment, settings = {}, onRefresh, isRTL = false }) => {
  const { user } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [userVote, setUserVote] = useState(comment.user_vote);
  const [helpfulCount, setHelpfulCount] = useState(comment.helpful_count || 0);
  const [notHelpfulCount, setNotHelpfulCount] = useState(comment.not_helpful_count || 0);
  const [reported, setReported] = useState(false);

  const handleVote = async (voteType) => {
    if (!user) return;
    if (voteLoading) return;
    setVoteLoading(true);
    try {
      const res = await voteComment(comment.id, voteType);
      if (res.action === "removed") {
        if (voteType === "helpful") setHelpfulCount((c) => Math.max(0, c - 1));
        else setNotHelpfulCount((c) => Math.max(0, c - 1));
        setUserVote(null);
      } else if (res.action === "switched") {
        if (voteType === "helpful") {
          setHelpfulCount((c) => c + 1);
          setNotHelpfulCount((c) => Math.max(0, c - 1));
        } else {
          setNotHelpfulCount((c) => c + 1);
          setHelpfulCount((c) => Math.max(0, c - 1));
        }
        setUserVote(voteType);
      } else {
        if (voteType === "helpful") setHelpfulCount((c) => c + 1);
        else setNotHelpfulCount((c) => c + 1);
        setUserVote(voteType);
      }
    } catch {
      // silent
    } finally {
      setVoteLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      await replyToComment(comment.id, replyText.trim());
      setReplyText("");
      setShowReply(false);
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to submit reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleReport = async () => {
    if (!user || reported) return;
    if (!window.confirm("Report this comment as inappropriate?")) return;
    try {
      await reportComment(comment.id, "Reported by user");
      setReported(true);
    } catch {
      // silent
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white rounded-2xl border ${
        comment.is_pinned
          ? "border-amber-300 bg-amber-50/40"
          : "border-slate-200"
      } shadow-sm p-5 ${isRTL ? "text-right" : "text-left"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Pinned Badge */}
      {comment.is_pinned && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-300">
          📌 Pinned
        </div>
      )}

      {/* Header */}
      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <Avatar name={comment.user?.full_name || comment.user?.username} />
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="font-semibold text-slate-800 text-sm">
              {comment.user?.full_name || comment.user?.username || "Anonymous"}
            </span>

            {/* Verified Reader Badge */}
            {settings.feature_verified_badge && comment.is_verified_read && (
              <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200">
                ✅ Verified Reader
              </span>
            )}

            <span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span>
          </div>

          {/* Rating */}
          {settings.feature_ratings_enabled && comment.rating && (
            <div className="mt-1">
              <StarRating value={comment.rating} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="mt-3 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
        {comment.body}
      </p>

      {/* Admin Reply */}
      {settings.feature_admin_reply && comment.admin_reply && (
        <div className={`mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl ${isRTL ? "text-right" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
              🏛️ Admin Response
            </span>
            {comment.admin_reply_at && (
              <span className="text-xs text-slate-400">{timeAgo(comment.admin_reply_at)}</span>
            )}
          </div>
          <p className="text-slate-600 text-sm">{comment.admin_reply}</p>
        </div>
      )}

      {/* Actions Row */}
      <div className={`mt-4 flex items-center gap-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Helpful Votes */}
        {settings.feature_helpful_votes && (
          <>
            <button
              onClick={() => handleVote("helpful")}
              disabled={!user || voteLoading}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                userVote === "helpful"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
              } disabled:opacity-50`}
            >
              👍 Helpful {helpfulCount > 0 && <span className="font-bold">{helpfulCount}</span>}
            </button>
            <button
              onClick={() => handleVote("not_helpful")}
              disabled={!user || voteLoading}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                userVote === "not_helpful"
                  ? "bg-red-100 text-red-700 border-red-300 font-semibold"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-500"
              } disabled:opacity-50`}
            >
              👎 {notHelpfulCount > 0 && <span className="font-bold">{notHelpfulCount}</span>}
            </button>
          </>
        )}

        {/* Reply Button */}
        {settings.feature_replies_enabled && user && (
          <button
            onClick={() => setShowReply((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors"
          >
            💬 Reply
          </button>
        )}

        {/* Report Button */}
        {settings.feature_report_enabled && user && !reported && (
          <button
            onClick={handleReport}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors ml-auto"
          >
            🚩 Report
          </button>
        )}
        {reported && <span className="text-xs text-slate-400 ml-auto">Reported</span>}
      </div>

      {/* Reply Form */}
      <AnimatePresence>
        {showReply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              dir={isRTL ? "rtl" : "ltr"}
              rows={2}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleReply}
                disabled={replyLoading || !replyText.trim()}
                className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {replyLoading ? "Sending..." : "Send Reply"}
              </button>
              <button
                onClick={() => { setShowReply(false); setReplyText(""); }}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={`mt-4 ${isRTL ? "mr-6 border-r-2" : "ml-6 border-l-2"} border-slate-100 pl-4 space-y-3`}>
          {comment.replies.map((reply) => (
            <div key={reply.id} className="p-3 bg-slate-50 rounded-xl" dir={isRTL ? "rtl" : "ltr"}>
              <div className={`flex items-center gap-2 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Avatar name={reply.user?.full_name || reply.user?.username} />
                <span className="text-xs font-semibold text-slate-700">
                  {reply.user?.full_name || reply.user?.username || "Anonymous"}
                </span>
                <span className="text-xs text-slate-400">{timeAgo(reply.created_at)}</span>
              </div>
              <p className="text-slate-600 text-sm mt-1">{reply.body}</p>
              {reply.admin_reply && (
                <div className="mt-2 p-2 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500">🏛️ Admin: </span>
                  <span className="text-xs text-slate-600">{reply.admin_reply}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CommentCard;
