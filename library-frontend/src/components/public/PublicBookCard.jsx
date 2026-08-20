// src/components/public/PublicBookCard.jsx
// Premium public book card with animated badges and resilient fallbacks.
import React, { useEffect, useMemo, useState } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  CalendarIcon,
  SparklesIcon,
  BookOpenIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://kil2-backend.onrender.com"
    : "http://127.0.0.1:8000")
).replace(/\/$/, "");

const FALLBACK_NO_COVER = "https://via.placeholder.com/400x600?text=No+Cover";
const FALLBACK_BROKEN = "https://via.placeholder.com/400x600?text=Image+Not+Found";

const PublicBookCard = ({
  book,
  onClick,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const safeText = (value, fallback = "Unknown") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") return value?.name || value?.title || fallback;
    const str = String(value).trim();
    return str.length ? str : fallback;
  };

  const safeNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const title = useMemo(() => safeText(book?.title, "Untitled Book"), [book]);
  const author = useMemo(() => safeText(book?.author, "Unknown Author"), [book]);
  const bookId = useMemo(
    () => safeText(book?.id || book?.book_number, "000"),
    [book]
  );
  const isRestricted = !!book?.is_restricted;
  const userHasAccess = !!book?.user_has_access;

  const views = useMemo(() => {
    return safeNumber(
      book?.views ??
        book?.view_count ??
        book?.total_views ??
        book?.total_view ??
        book?.hits ??
        0,
      0
    );
  }, [book]);

  const metaDate = useMemo(
    () => formatDate(book?.created_at || book?.published_date),
    [book]
  );

  useEffect(() => {
    setImgLoaded(false);

    if (!book) {
      setImgSrc(FALLBACK_NO_COVER);
      return;
    }

    const rawUrl = book.cover_image_url || book.cover_image;

    if (!rawUrl) {
      setImgSrc(FALLBACK_NO_COVER);
      return;
    }

    if (typeof rawUrl === "string" && rawUrl.startsWith("http")) {
      setImgSrc(rawUrl);
      return;
    }

    const path = String(rawUrl);
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    setImgSrc(`${API_BASE_URL}${cleanPath}`);
  }, [book]);

  const handleImageError = () => {
    setImgSrc(FALLBACK_BROKEN);
    setImgLoaded(true);
  };

  const handleCardClick = () => {
    if (typeof onClick === "function") onClick();
  };

  if (book?.is_restricted && !book?.user_has_access) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -8 }}
      onClick={handleCardClick}
      className="group relative mx-auto w-full max-w-[340px] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg transition-all duration-300 cursor-pointer hover:shadow-2xl sm:max-w-none"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50" />
      </div>

      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        {isRestricted ? (
          userHasAccess ? (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-white/30 backdrop-blur-sm"
            >
              <LockOpenIcon className="w-3.5 h-3.5 animate-pulse" />
              <span>UNLOCKED</span>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-pink-600 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-white/30"
            >
              <LockClosedIcon className="w-3.5 h-3.5" />
              <span>RESTRICTED</span>
            </motion.div>
          )
        ) : (
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-white/30"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>PUBLIC</span>
          </motion.div>
        )}
      </div>

      <motion.div
        whileHover={{ scale: 1.05, rotate: 3 }}
        className="absolute right-2 top-2 z-20 sm:right-4 sm:top-4"
      >
        <div className="rounded-full border border-blue-400/30 bg-gradient-to-br from-blue-600 to-blue-700 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-lg backdrop-blur-sm sm:px-3 sm:py-1.5">
          #{bookId}
        </div>
      </motion.div>

      {typeof onToggleFavorite === "function" && (
        <motion.button
          onClick={(e) => onToggleFavorite(e, book?.id)}
          whileHover={{ scale: 1.15, rotate: 15 }}
          whileTap={{ scale: 0.95 }}
          className="absolute bottom-2 right-2 z-20 rounded-full border border-gray-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-white sm:bottom-4 sm:right-4 sm:px-3 sm:py-2 sm:text-sm"
          title={isFavorite ? "Remove Favorite" : "Add Favorite"}
        >
          {isFavorite ? (
            <span className="text-lg animate-bounce">❤️</span>
          ) : (
            <span className="text-lg hover:text-red-500 transition">🤍</span>
          )}
        </motion.button>
      )}

      <div className="relative flex justify-center bg-gradient-to-b from-slate-50 via-white to-blue-50/30 px-3 pb-2 pt-4 transition-all duration-300 group-hover:from-blue-50 sm:px-4 sm:pb-4 sm:pt-6">
        <motion.div
          whileHover={{ scale: 1.08, rotateY: 5 }}
          className="relative aspect-[2/3] w-[118px] overflow-hidden rounded-2xl shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1 sm:w-[150px] md:w-[175px] lg:w-[185px]"
        >
          <div className="absolute inset-0 rounded-2xl border-2 border-gradient-to-br from-blue-200/50 via-transparent to-purple-200/50 pointer-events-none z-10" />

          {!imgLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse" />
          )}

          {imgSrc && (
            <img
              src={imgSrc}
              alt={title}
              onError={handleImageError}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full transition-all duration-300 ${
                imgLoaded ? "opacity-100 group-hover:scale-105" : "opacity-0"
              }`}
              style={{
                objectFit: "contain",
                background: "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
              }}
              loading="lazy"
            />
          )}

          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center pb-4"
          >
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-lg shadow-lg sm:px-4 sm:py-2 sm:text-xs ${
                isRestricted && !userHasAccess
                  ? "bg-red-600/90"
                  : "bg-gradient-to-r from-blue-600/90 to-purple-600/90"
              }`}
            >
              <BookOpenIcon className="w-4 h-4" />
              {isRestricted && !userHasAccess ? "Request Access" : "Preview"}
            </motion.span>
          </motion.div>
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-grow flex-col px-3 pb-3 text-center sm:px-4 sm:pb-4">
        <motion.h3
          whileHover={{ color: "#2D89C8" }}
          className="mb-1.5 line-clamp-2 text-[0.95rem] font-black leading-tight text-[#002147] transition-colors duration-200 sm:text-sm md:text-base"
          style={{ letterSpacing: "-0.5px" }}
        >
          {title}
        </motion.h3>

        <p className="mb-2 line-clamp-1 text-[11px] font-semibold text-gray-600 sm:mb-3 sm:text-xs">
          By <span className="text-blue-600 font-bold">{author}</span>
        </p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="mx-auto mb-2 h-0.5 w-12 bg-gradient-to-r from-transparent via-blue-400 to-transparent sm:mb-3"
        />

        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-gray-600 sm:text-[11px]">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-1 rounded-lg border border-blue-100/50 bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-1.5 transition-all group-hover:from-blue-100 group-hover:to-indigo-100 sm:px-2.5"
          >
            <EyeIcon className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-bold text-blue-700">{views}</span>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex items-center gap-1 rounded-lg border border-amber-100/50 bg-gradient-to-r from-amber-50 to-orange-50 px-2 py-1.5 transition-all group-hover:from-amber-100 group-hover:to-orange-100 sm:px-2.5"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-amber-600" />
            <span className="font-bold text-amber-700">{metaDate}</span>
          </motion.div>
        </div>

        <div className="mt-3 flex justify-center gap-1">
          {[...Array(5)].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: index < 4 ? 1 : 0.3, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <StarIcon className={`w-3 h-3 ${index < 4 ? "text-yellow-400" : "text-gray-300"}`} />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {[...Array(3)].map((_, index) => (
          <motion.div
            key={index}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.sin(index) * 10, 0],
            }}
            transition={{
              duration: 3 + index,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-60"
            style={{
              left: `${20 + index * 30}%`,
              top: `${50 + index * 10}%`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default PublicBookCard;