import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowLongRightIcon,
  MegaphoneIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import postService from "../../api/postService";

// ✅ Config: API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000");

const LatestPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  // For image error handling (card + modal)
  const [brokenImages, setBrokenImages] = useState({}); // { [postId]: true }
  const [imageScale, setImageScale] = useState(1);
  const [textSize, setTextSize] = useState(16);

  useEffect(() => {
    fetchPosts();
  }, []);

  // ✅ ESC to close modal
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelectedPost(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await postService.getAllPosts();
      console.log("Fetched Posts Data:", data);

      // Safety: if not array
      const list = Array.isArray(data) ? data : data?.posts || [];
      setPosts(list);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Robust Image/File URL helper
  const getFileUrl = (path) => {
    if (!path) return null;

    // If it's already a full URL (cloudinary etc.)
    if (String(path).startsWith("http://") || String(path).startsWith("https://")) {
      return path;
    }

    // Ensure slash
    const cleanPath = String(path).startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
  };

  // ✅ Detect file type (image/pdf/unknown)
  const getFileType = (fileUrl) => {
    if (!fileUrl) return "none";
    const lower = fileUrl.toLowerCase();

    if (lower.endsWith(".pdf")) return "pdf";
    if (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".gif")
    )
      return "image";

    // sometimes backend returns without extension but still image
    // fallback: treat as image if contains "image" keyword
    if (lower.includes("image")) return "image";

    return "file";
  };

  const handleImageFail = (postId) => {
    setBrokenImages((prev) => ({ ...prev, [postId]: true }));
  };

  const totalPosts = useMemo(() => posts.length, [posts]);

  return (
    <div className="min-h-screen bg-[#F3F6F9] py-12 px-4 sm:px-6 font-sans">
      {/* --- HEADER SECTION --- */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full text-[#002147] mb-4 shadow-sm">
          <MegaphoneIcon className="w-8 h-8" />
        </div>

        <h1 className="page-title text-[#002147] mb-3 max-w-3xl mx-auto">
          Latest Announcements
        </h1>

        <p className="body-copy max-w-2xl mx-auto">
          Stay updated with the latest news, events, and official circulars from the Library.
        </p>

        <p className="mt-3 text-sm text-slate-400">
          Total Posts: <b className="text-slate-600">{totalPosts}</b>
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* LOADING */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* POSTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => {
                const fileUrl = getFileUrl(post?.file_url);
                const fileType = getFileType(fileUrl);

                const isBroken = brokenImages[post?.id] === true;

                return (
                  <motion.div
                    key={post?.id || index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className="group card-surface overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                  >
                    {/* IMAGE AREA */}
                    <div
                      className="relative h-56 bg-slate-100 overflow-hidden cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      {/* If image exists and not broken */}
                      {fileUrl && fileType === "image" && !isBroken ? (
                        <img
                          src={fileUrl}
                          alt={post?.title || "Post Image"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={() => handleImageFail(post?.id)}
                        />
                      ) : fileUrl && fileType === "pdf" ? (
                        // PDF placeholder
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-50 border-b border-slate-100">
                          <DocumentTextIcon className="w-16 h-16 mb-2 opacity-40" />
                          <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                            PDF Document
                          </span>
                        </div>
                      ) : (
                        // Default placeholder
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border-b border-slate-100">
                          <PhotoIcon className="w-16 h-16 mb-2 opacity-30" />
                          <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                            No Image
                          </span>
                        </div>
                      )}

                      {/* Date Badge */}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-[#002147] shadow-sm flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {post?.created_at
                          ? new Date(post.created_at).toLocaleDateString()
                          : "N/A"}
                      </div>

                      {/* Tag Badge */}
                      {post?.tags && (
                        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase shadow-md tracking-wider">
                          {post.tags}
                        </div>
                      )}
                    </div>

                    {/* CONTENT AREA */}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3
                        className="card-title text-slate-800 mb-3 line-clamp-2 group-hover:text-blue-700 transition-colors cursor-pointer"
                        onClick={() => setSelectedPost(post)}
                      >
                        {post?.title || "Untitled Announcement"}
                      </h3>

                      <p className="body-copy line-clamp-3 mb-6 flex-1">
                        {post?.content || "Click below to view the details of this announcement."}
                      </p>

                      <div className="pt-4 border-t border-slate-100 mt-auto flex items-center justify-between gap-3">
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="text-sm font-bold text-[#002147] flex items-center gap-2 group/btn"
                        >
                          Read Full Notice
                          <ArrowLongRightIcon className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        {/* Open file quick action */}
                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                            title="Open file"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            Open
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* EMPTY STATE */}
            {!loading && posts.length === 0 && (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300 mt-8">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MegaphoneIcon className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No Announcements Yet</h3>
                <p className="text-slate-500 text-sm">
                  Check back later for updates from the library.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* =========================================================
          MODAL (DETAILS VIEW) - BEST VERSION
         ========================================================= */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative flex w-full max-w-3xl max-h-[calc(100vh-1rem)] flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 sm:right-4 sm:top-4"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              {/* Modal Media (FULL IMAGE VIEW) */}
              <div className="relative w-full overflow-hidden rounded-t-2xl bg-slate-100 max-h-[38vh] sm:max-h-[60vh]">
                {(() => {
                  const fileUrl = getFileUrl(selectedPost?.file_url);
                  const fileType = getFileType(fileUrl);
                  const isBroken = brokenImages[selectedPost?.id] === true;

                  // IMAGE FULL VIEW (with zoom controls)
                  if (fileUrl && fileType === "image" && !isBroken) {
                    return (
                      <div className="flex w-full flex-col items-center bg-black/5">
                        <div className="flex w-full items-center justify-center gap-2 py-2 sm:py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setImageScale(s => Math.max(0.5, s - 0.25)); }}
                            className="px-3 py-1 rounded bg-white/90 border"
                          >-</button>
                          <span className="text-sm font-bold text-slate-700">Zoom</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setImageScale(s => Math.min(3, s + 0.25)); }}
                            className="px-3 py-1 rounded bg-white/90 border"
                          >+</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setImageScale(1); }}
                            className="px-3 py-1 rounded bg-white/90 border ml-2"
                          >Reset</button>
                        </div>
                        <div className="flex w-full items-center justify-center overflow-auto bg-black/5">
                          <img
                            src={fileUrl}
                            alt={selectedPost?.title || "Post Image"}
                            style={{ transform: `scale(${imageScale})`, transition: 'transform 150ms ease' }}
                            className="mx-auto max-h-[38vh] object-contain sm:max-h-[60vh]"
                            onError={() => handleImageFail(selectedPost?.id)}
                          />
                        </div>
                      </div>
                    );
                  }

                  // PDF VIEW PLACEHOLDER
                  if (fileUrl && fileType === "pdf") {
                    return (
                      <div className="py-14 flex flex-col items-center justify-center text-slate-500">
                        <DocumentTextIcon className="w-16 h-16 mb-3 opacity-50" />
                        <p className="font-bold">PDF Attached</p>
                        <p className="text-sm text-slate-400 mt-1">
                          Click Open / Download below to view it.
                        </p>
                      </div>
                    );
                  }

                  // FALLBACK
                  return (
                    <div className="py-14 flex flex-col items-center justify-center text-slate-400">
                      <PhotoIcon className="w-16 h-16 mb-2 opacity-40" />
                      <span className="text-sm font-bold uppercase tracking-wider">
                        No Image Available
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-8">
                <div className="mb-3 flex flex-wrap items-center gap-3 sm:mb-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                    {selectedPost?.tags || "Notice"}
                  </span>

                  <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                    <CalendarDaysIcon className="w-4 h-4" />
                    {selectedPost?.created_at
                      ? new Date(selectedPost.created_at).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>

                <h2 className="mb-4 text-xl font-extrabold leading-tight text-[#002147] sm:mb-6 sm:text-2xl md:text-3xl">
                  {selectedPost?.title || "Untitled Announcement"}
                </h2>

                <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm">
                  <span className="text-slate-500">Text size</span>
                  <button onClick={() => setTextSize(s => Math.max(12, s - 2))} className="px-2 py-1 bg-slate-100 rounded">A-</button>
                  <button onClick={() => setTextSize(s => Math.min(28, s + 2))} className="px-2 py-1 bg-slate-100 rounded">A+</button>
                  <button onClick={() => setTextSize(16)} className="px-2 py-1 bg-slate-100 rounded">Reset</button>
                </div>

                <div className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-slate-600" style={{ fontSize: `${textSize}px` }}>
                  {selectedPost?.content || "No details available."}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 text-right rounded-b-2xl flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                {/* File Actions */}
                <div className="flex gap-2 justify-end sm:justify-start">
                  {selectedPost?.file_url && (
                    <>
                      <a
                        href={getFileUrl(selectedPost.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:shadow-md transition flex items-center gap-2"
                      >
                        <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                        Open
                      </a>

                      <a
                        href={getFileUrl(selectedPost.file_url)}
                        download
                        className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:shadow-md transition flex items-center gap-2"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Download
                      </a>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-6 py-2.5 bg-[#002147] text-white font-bold rounded-xl hover:bg-[#003366] transition-colors shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LatestPosts;
