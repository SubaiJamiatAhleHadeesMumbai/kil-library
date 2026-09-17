import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    CalendarDaysIcon,
    PhotoIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { cleanExcerpt } from "../../utils/i18nFormatters";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const AnnouncementModal = ({ post, onClose }) => {
    useEffect(() => {
        if (!post) return;

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [post, onClose]);

    if (!post) return null;

    const imageUrl = !post?.file_url
        ? null
        : post.file_url.startsWith("http")
            ? post.file_url
            : `${API_BASE_URL}${post.file_url.startsWith("/") ? post.file_url : `/${post.file_url}`}`;

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="announcement-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
                style={{ position: "fixed", inset: 0, zIndex: 100000 }}
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 15 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl sm:max-w-3xl max-h-[88vh] rounded-3xl bg-white shadow-2xl flex flex-col border border-slate-200/90 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between bg-[#002147] text-white px-5 py-3.5 sm:py-4 shrink-0 shadow-sm">
                        <h3 className="text-sm sm:text-base font-bold truncate pr-3">
                            {post.title || "Announcement Details"}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {/* Poster Image View */}
                        <div className="bg-slate-950 p-4 sm:p-6 flex items-center justify-center min-h-[180px] sm:min-h-[260px]">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={post.title}
                                    className="max-h-[45vh] sm:max-h-[55vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                                />
                            ) : (
                                <div className="h-48 flex items-center justify-center text-slate-400">
                                    <PhotoIcon className="w-14 h-14 opacity-40" />
                                </div>
                            )}
                        </div>

                        {/* Content & Actions */}
                        <div className="p-5 sm:p-7 bg-white space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                                    {post.created_at
                                        ? new Date(post.created_at).toLocaleDateString()
                                        : "N/A"}
                                </div>

                                {imageUrl && (
                                    <a
                                        href={imageUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow-sm transition cursor-pointer"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                        Download Poster
                                    </a>
                                )}
                            </div>

                            <div className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {post.content && /<[a-z][\s\S]*>/i.test(post.content) ? (
                                    <div
                                        dangerouslySetInnerHTML={{ __html: post.content }}
                                        className="prose max-w-none text-slate-800"
                                    />
                                ) : (
                                    cleanExcerpt(post.content, 0)
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default AnnouncementModal;
