// src/components/public/PublicBookCard.jsx
// Clean public book card with resilient fallbacks.
import React, { useEffect, useMemo, useState } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  BookOpenIcon,
  BookmarkIcon as BookmarkSolid,
} from "@heroicons/react/24/solid";
import { BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? ""
    : "http://127.0.0.1:8000")
).replace(/\/$/, "");

const FALLBACK_NO_COVER = "https://via.placeholder.com/400x600?text=No+Cover";
const FALLBACK_BROKEN = "https://via.placeholder.com/400x600?text=Image+Not+Found";

const showUpcomingToast = () => {
  toast("عنقریب...", {
    icon: "⏳",
    duration: 3500,
    style: {
      borderRadius: "16px",
      background: "#0F172A",
      color: "#38BDF8",
      fontSize: "20px",
      fontWeight: "bold",
      fontFamily: '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif',
      padding: "12px 24px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
    }
  });
};

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

  const title = useMemo(() => safeText(book?.title, "Untitled Book"), [book]);
  const author = useMemo(() => safeText(book?.author, "Unknown Author"), [book]);
  const isRestricted = !!book?.is_restricted;
  const userHasAccess = !!book?.user_has_access;
  const hasDigitalPdf = Boolean(book?.pdf_url || book?.pdf_file || book?.txt_file_url || book?.txt_file);

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
    if (!hasDigitalPdf) {
      showUpcomingToast();
    }
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
      whileHover={{ y: -6 }}
      onClick={handleCardClick}
      className="group relative mx-auto w-full max-w-[340px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 cursor-pointer hover:shadow-xl sm:max-w-none"
    >
      {/* Badges: Only show if Restricted or Upcoming */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        {isRestricted ? (
          userHasAccess ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md border border-white/30 backdrop-blur-sm"
            >
              <LockOpenIcon className="w-3.5 h-3.5" />
              <span>UNLOCKED</span>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md border border-white/30"
            >
              <LockClosedIcon className="w-3.5 h-3.5" />
              <span>RESTRICTED</span>
            </motion.div>
          )
        ) : null}

        {!hasDigitalPdf && (
          <div className="rounded-full bg-slate-900/90 text-amber-300 px-2.5 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-xs flex items-center gap-1 border border-slate-700">
            <span>⏳</span> <span>عنقریب...</span>
          </div>
        )}
      </div>

      {typeof onToggleFavorite === "function" && (
        <motion.button
          onClick={(e) => onToggleFavorite(e, book?.id)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          className={`absolute bottom-2 right-2 z-20 rounded-full p-2 shadow-md transition-all duration-200 sm:bottom-3 sm:right-3 ${
            isFavorite
              ? "bg-emerald-50 text-emerald-600 border border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white/95 text-slate-500 hover:text-emerald-600 border border-slate-200 hover:bg-white hover:shadow-lg"
          }`}
          title={isFavorite ? "Saved in Favorites" : "Save to Favorites"}
        >
          {isFavorite ? (
            <BookmarkSolid className="h-4 w-4 text-emerald-600" />
          ) : (
            <BookmarkOutline className="h-4 w-4 text-slate-600 hover:text-emerald-600" />
          )}
        </motion.button>
      )}

      {/* Cover */}
      <div className="relative flex justify-center bg-gradient-to-b from-slate-50 via-white to-blue-50/20 px-3 pb-2 pt-4 transition-all duration-300 group-hover:from-blue-50 sm:px-4 sm:pb-3 sm:pt-5">
        <div className="relative aspect-[2/3] w-[118px] overflow-hidden rounded-2xl bg-gray-100 shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 sm:w-[150px] md:w-[175px] lg:w-[185px]">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
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
                background: "#e5e7eb",
              }}
              loading="lazy"
            />
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100 sm:px-4 sm:py-2">
              {hasDigitalPdf ? "Preview" : "عنقریب..."}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="relative z-10 flex flex-grow flex-col px-3 pb-4 text-center sm:px-4 sm:pb-5">
        <h3
          className="mb-1.5 line-clamp-2 font-serif text-[0.95rem] font-extrabold leading-snug text-[#002147] transition-colors group-hover:text-emerald-700 sm:text-sm md:text-base"
          style={{
            fontFamily: '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif',
          }}
        >
          {title}
        </h3>

        <p className="line-clamp-1 text-[11px] text-gray-500 sm:text-xs">
          By <span className="text-slate-600 font-semibold">{author}</span>
        </p>
      </div>
    </motion.div>
  );
};

export default PublicBookCard;
