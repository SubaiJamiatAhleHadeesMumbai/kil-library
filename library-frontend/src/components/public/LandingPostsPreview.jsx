import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import {
    CalendarDaysIcon,
    ArrowLongRightIcon,
    PhotoIcon,
    SparklesIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import postService from "../../api/postService";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import "swiper/css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const LandingPostsPreview = () => {
    const [selectedPost, setSelectedPost] = useState(null);
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const { data } = await postService.getAllPosts();
                const list = Array.isArray(data) ? data : data?.posts || [];
                setPosts(list.slice(0, 5));
            } catch {
                setPosts([]);
            }
        })();
    }, []);

    const getFileUrl = (p) =>
        !p
            ? null
            : p.startsWith("http")
                ? p
                : `${API_BASE_URL}${p.startsWith("/") ? p : `/${p}`}`;

    return (
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/70 p-3 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)] sm:p-5 lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-700 sm:text-xs">
                        <SparklesIcon className="h-4 w-4" />
                        Latest updates
                    </div>
                    <h2 className="text-xl font-extrabold text-[#002147] sm:text-3xl">
                        Latest Announcements
                    </h2>
                    <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-base">
                        Stay informed with the newest library news, events, and important updates.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/posts")}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 sm:text-sm"
                >
                    View All
                    <ArrowLongRightIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="mt-6">
                {posts.length > 0 ? (
                    <Swiper
                        modules={[Autoplay]}
                        slidesPerView={1}
                        loop={posts.length > 1}
                        autoplay={{
                            delay: 5000,
                            disableOnInteraction: false,
                        }}
                        className="!pb-1.5"
                    >
                        {posts.map((post, i) => {
                            const imageUrl = getFileUrl(post?.file_url);

                            return (
                                <SwiperSlide key={post.id || i}>
                                    <div
                                        onClick={() => setSelectedPost(post)}
                                        className="group w-full cursor-pointer overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] items-stretch"
                                    >
                                        {/* Left / Top Canvas: 100% Full Uncropped Poster Frame */}
                                        <div className="relative min-h-[320px] sm:min-h-[440px] lg:min-h-[500px] flex items-center justify-center bg-slate-950 p-3 sm:p-6 overflow-hidden">
                                            {imageUrl ? (
                                                <>
                                                    {/* Soft Ambient Blurred Background */}
                                                    <img
                                                        src={imageUrl}
                                                        alt="Ambient Blur"
                                                        className="absolute inset-0 h-full w-full object-cover filter blur-2xl opacity-30 scale-125 select-none pointer-events-none"
                                                        aria-hidden="true"
                                                    />

                                                    {/* Real 100% Complete Sharp Poster */}
                                                    <img
                                                        src={imageUrl}
                                                        alt={post?.title}
                                                        className="relative z-10 max-h-[300px] sm:max-h-[420px] lg:max-h-[480px] w-auto max-w-full object-contain rounded-xl shadow-2xl drop-shadow-md transition-transform duration-500 group-hover:scale-[1.02]"
                                                    />

                                                    {/* Hover Click to Expand Badge */}
                                                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white border border-white/20 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
                                                        <EyeIcon className="w-4 h-4 text-cyan-400" />
                                                        <span>Click to Zoom</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-slate-500">
                                                    <PhotoIcon className="h-16 w-16 text-slate-400 mb-2 opacity-50" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Announcement</span>
                                                </div>
                                            )}

                                            {/* Tag / Announcement Badge */}
                                            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20">
                                                <span className="inline-flex rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">
                                                    {post?.tags || "Announcement"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right / Bottom Info Panel */}
                                        <div className="flex flex-col justify-between p-5 sm:p-7 lg:p-8 bg-gradient-to-b from-white to-slate-50/70 border-t border-slate-100 lg:border-t-0 lg:border-l lg:border-slate-100">
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-blue-800 border border-blue-100">
                                                        <CalendarDaysIcon className="h-4 w-4 text-blue-600" />
                                                        {post?.created_at
                                                            ? new Date(post.created_at).toLocaleDateString()
                                                            : "Recent"}
                                                    </span>
                                                </div>

                                                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#002147] leading-snug group-hover:text-blue-700 transition-colors">
                                                    {post?.title || "Untitled Announcement"}
                                                </h3>

                                                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line line-clamp-6 sm:line-clamp-none font-medium">
                                                    {post?.content || "Click to view complete details and download announcement artwork."}
                                                </p>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:underline">
                                                    <EyeIcon className="w-4 h-4" />
                                                    View Full Details & Download
                                                </span>
                                                <span className="text-xs text-slate-400 font-semibold">
                                                    Markaz Ahle Hadees Kokan
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            );
                        })}
                    </Swiper>
                ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
                        No announcements yet. Please check back soon.
                    </div>
                )}
            </div>

            {/* FULL-SCREEN POSTER LIGHTBOX MODAL */}
            <AnimatePresence>
                {selectedPost && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedPost(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 z-30 flex items-center justify-between bg-[#002147] text-white px-5 py-4 shrink-0 rounded-t-2xl shadow-sm">
                                <h3 className="text-base sm:text-lg font-bold truncate pr-4">
                                    {selectedPost?.title}
                                </h3>
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    aria-label="Close"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Full Poster Image View */}
                            <div className="bg-slate-950 p-4 sm:p-6 flex items-center justify-center min-h-[300px]">
                                {getFileUrl(selectedPost?.file_url) ? (
                                    <img
                                        src={getFileUrl(selectedPost.file_url)}
                                        alt={selectedPost.title}
                                        className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                                    />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-slate-400">
                                        <PhotoIcon className="w-16 h-16 opacity-40" />
                                    </div>
                                )}
                            </div>

                            {/* Content & Actions */}
                            <div className="p-5 sm:p-8 bg-white space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                                        {selectedPost?.created_at
                                            ? new Date(selectedPost.created_at).toLocaleDateString()
                                            : "N/A"}
                                    </div>

                                    {getFileUrl(selectedPost?.file_url) && (
                                        <a
                                            href={getFileUrl(selectedPost.file_url)}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow-sm transition"
                                        >
                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                            Download Poster
                                        </a>
                                    )}
                                </div>

                                <p className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">
                                    {selectedPost?.content}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default LandingPostsPreview;
