import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import {
    CalendarDaysIcon,
    ArrowLongRightIcon,
    PhotoIcon,
    EyeIcon,
} from "@heroicons/react/24/outline";
import postService from "../../api/postService";
import { useNavigate } from "react-router-dom";
import { cleanExcerpt } from "../../utils/i18nFormatters";

import AnnouncementModal from "./AnnouncementModal";

import "swiper/css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const LandingPostsPreview = ({ onSelectPost = null }) => {
    const [selectedPost, setSelectedPost] = useState(null);
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();

    const handleSelectPost = (p) => {
        if (onSelectPost) {
            onSelectPost(p);
        } else {
            setSelectedPost(p);
        }
    };

    // Lock body scroll and handle Escape key when popup/modal is open
    useEffect(() => {
        if (!selectedPost) return;
        document.body.style.overflow = "hidden";
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setSelectedPost(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedPost]);

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
                    <h2 className="text-xl font-extrabold text-[#002147] sm:text-3xl">
                        Latest Announcements
                    </h2>
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
                                        className="group w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] items-stretch"
                                    >
                                        {/* Left / Top Canvas: 100% Full Uncropped Poster Frame */}
                                        <div 
                                            onClick={() => handleSelectPost(post)}
                                            className="relative min-h-[320px] sm:min-h-[440px] lg:min-h-[500px] flex items-center justify-center bg-slate-950 p-3 sm:p-6 overflow-hidden cursor-pointer"
                                        >
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

                                                <h3 
                                                    onClick={() => handleSelectPost(post)}
                                                    className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#002147] leading-snug hover:text-blue-700 transition-colors cursor-pointer"
                                                >
                                                    {post?.title || "Untitled Announcement"}
                                                </h3>

                                                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line line-clamp-6 sm:line-clamp-none font-medium">
                                                    {cleanExcerpt(post?.content, 350) || "Click to view complete details and download announcement artwork."}
                                                </p>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectPost(post)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    <span>View Full Details & Download</span>
                                                </button>
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

            {/* Fallback Standalone Modal if not handled by parent */}
            {!onSelectPost && selectedPost && (
                <AnnouncementModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}
        </section>
    );
};

export default LandingPostsPreview;
