import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import {
    CalendarDaysIcon,
    ArrowLongRightIcon,
    PhotoIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import postService from "../../api/postService";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";

import "swiper/css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000");

const LandingPostsPreview = () => {
    const [selectedPost, setSelectedPost] = useState(null);

    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const { data } = await postService.getAllPosts();
                const list = Array.isArray(data) ? data : data?.posts || [];
                setPosts(list.slice(0, 5)); // take few for slider
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
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/70 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)] sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">
                        <SparklesIcon className="h-4 w-4" />
                        Latest updates
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#002147] sm:text-3xl">
                        Latest Announcements
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                        Stay informed with the newest library news, events, and important updates.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/posts")}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
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
                            delay: 4000,
                            disableOnInteraction: false,
                        }}
                        breakpoints={{
                            640: { slidesPerView: 1 },
                            1024: { slidesPerView: 1 },
                        }}
                        className="!pb-2"
                    >
                        {posts.map((post, i) => {
                            const imageUrl = getFileUrl(post?.file_url);

                            return (
                                <SwiperSlide key={post.id || i}>
                                    <div
                                        onClick={() => setSelectedPost(post)}
                                        className="group w-full cursor-pointer overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                    >
                                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[16/8]">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={post?.title}
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <PhotoIcon className="h-16 w-16 text-slate-300" />
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 sm:p-5">
                                                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white backdrop-blur">
                                                    Announcement
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5 sm:p-6">
                                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                <CalendarDaysIcon className="h-4 w-4" />
                                                {post?.created_at
                                                    ? new Date(post.created_at).toLocaleDateString()
                                                    : "N/A"}
                                            </div>

                                            <h3 className="mb-3 text-xl font-bold text-slate-800 sm:text-2xl">
                                                {post?.title || "Untitled Announcement"}
                                            </h3>

                                            <p className="text-sm leading-6 text-slate-600 line-clamp-3 sm:text-[15px]">
                                                {post?.content || "Click to read full announcement"}
                                            </p>
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

            <AnimatePresence>
                {selectedPost && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4"
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
                            className="w-full max-w-3xl max-h-[calc(100vh-1rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]"
                        >
                            {/* Close */}
                            <button
                                onClick={() => setSelectedPost(null)}
                                className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 sm:right-4 sm:top-4"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            {/* Image */}
                            <div className="max-h-[40vh] overflow-hidden bg-slate-100 sm:max-h-[70vh]">
                                {getFileUrl(selectedPost?.file_url) ? (
                                    <img
                                        src={getFileUrl(selectedPost.file_url)}
                                        alt={selectedPost.title}
                                        className="mx-auto h-full w-full object-contain"
                                    />
                                ) : (
                                    <div className="h-64 flex items-center justify-center">
                                        <PhotoIcon className="w-16 h-16 text-slate-300" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-8">
                                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                                    <CalendarDaysIcon className="w-4 h-4" />
                                    {selectedPost?.created_at
                                        ? new Date(selectedPost.created_at).toLocaleDateString()
                                        : "N/A"}
                                </div>

                                <h2 className="mb-4 text-xl font-extrabold text-[#002147] sm:text-2xl">
                                    {selectedPost?.title}
                                </h2>

                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
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
