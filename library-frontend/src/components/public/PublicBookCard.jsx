// src/components/public/PublicBookCard.jsx
// 3D Realistic Apple Books-style card with depth, spine crease, and resilient fallbacks.
import React, { useEffect, useMemo, useState } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
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

const FALLBACK_NO_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#071927"/>
          <stop offset="50%" stop-color="#052b28"/>
          <stop offset="100%" stop-color="#021018"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="50%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
      </defs>
      <rect width="360" height="520" fill="url(#bg)"/>
      <rect x="18" y="18" width="324" height="484" rx="8" fill="none" stroke="#d4af37" stroke-opacity="0.3" stroke-width="1.5"/>
      <rect x="24" y="24" width="312" height="472" rx="6" fill="none" stroke="#10b981" stroke-opacity="0.25" stroke-width="1"/>
      <circle cx="180" cy="180" r="50" fill="#031525" stroke="#d4af37" stroke-width="2" stroke-opacity="0.5"/>
      <path d="M160 162h40c2.2 0 4 1.8 4 4v32c0 2.2-1.8 4-4 4h-40c-2.2 0-4-1.8-4-4v-32c0-2.2 1.8-4 4-4zm4 8v24h32v-24h-32z" fill="#d4af37"/>
      <path d="M168 178h16v4h-16zm0 8h24v4h-24z" fill="#fde68a"/>
      <text x="180" y="275" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="3" text-anchor="middle">KOKAN ISLAMIC LIBRARY</text>
      <text x="180" y="320" font-family="'Traditional Arabic', 'Amiri', serif" font-size="30" font-weight="bold" fill="url(#gold)" text-anchor="middle">غلاف قيد الإعداد</text>
      <text x="180" y="358" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#ffffff" letter-spacing="2" text-anchor="middle">DIGITAL BOOK</text>
      <rect x="110" y="380" width="140" height="24" rx="12" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.4"/>
      <text x="180" y="396" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#34d399" letter-spacing="1" text-anchor="middle">AVAILABLE ONLINE</text>
    </svg>
  `);
const FALLBACK_BROKEN = FALLBACK_NO_COVER;

const showUpcomingToast = () => {
  toast("عنقریب دستیاب ہوگا...", {
    icon: "⏳",
    duration: 3500,
    style: {
      borderRadius: "16px",
      background: "#031525",
      color: "#FBBF24",
      fontSize: "18px",
      fontWeight: "bold",
      fontFamily: '"Mehr Nastaliq Web", "Mehr", "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif',
      padding: "12px 24px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)"
    }
  });
};

const PublicBookCard = ({
  book,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  className = "",
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const safeText = (value, fallback = "Unknown") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") return value?.name || value?.title || fallback;
    const str = String(value).trim();
    return str.length ? str : fallback;
  };

  const title = useMemo(() => safeText(book?.title, "Untitled Book"), [book]);
  const author = useMemo(() => safeText(book?.author, "علمائے کرام"), [book]);
  const isRestricted = !!book?.is_restricted;
  const userHasAccess = !!book?.user_has_access;
  const hasDigitalPdf = Boolean(book?.pdf_url || book?.pdf_file || book?.txt_file_url || book?.txt_file);

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


  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -7 }}
      onClick={handleCardClick}
      className={`group relative mx-auto w-full max-w-[340px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 cursor-pointer hover:border-amber-400/60 hover:shadow-[0_20px_35px_-12px_rgba(16,185,129,0.22)] sm:max-w-none ${className}`}
    >
      {/* Top Badges */}
      <div className="absolute top-3 start-3 z-20 flex flex-col gap-1">
        {isRestricted ? (
          userHasAccess ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md border border-white/30 backdrop-blur-sm"
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
          <div className="rounded-full bg-slate-900/90 text-amber-300 px-2.5 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-xs flex items-center gap-1 border border-amber-500/30">
            <span>⏳</span> <span>عنقریب...</span>
          </div>
        )}
      </div>

      {/* Favorite / Bookmark Button */}
      {typeof onToggleFavorite === "function" && (
        <motion.button
          onClick={(e) => onToggleFavorite(e, book?.id)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          className={`absolute bottom-3 end-3 z-20 rounded-full p-2 shadow-md transition-all duration-200 ${
            isFavorite
              ? "bg-amber-50 text-amber-600 border border-amber-300 ring-2 ring-amber-500/20"
              : "bg-white/95 text-slate-500 hover:text-emerald-600 border border-slate-200 hover:bg-white hover:shadow-lg"
          }`}
          title={isFavorite ? "Saved in Favorites" : "Save to Favorites"}
        >
          {isFavorite ? (
            <BookmarkSolid className="h-4 w-4 text-amber-600" />
          ) : (
            <BookmarkOutline className="h-4 w-4 text-slate-600 hover:text-emerald-600" />
          )}
        </motion.button>
      )}

      {/* 3D Realistic Book Cover Showcase */}
      <div className="relative flex justify-center bg-gradient-to-b from-slate-50/80 via-white to-amber-50/15 px-3 pb-3 pt-5 transition-all duration-300 group-hover:from-emerald-50/30 sm:px-4 sm:pb-3 sm:pt-6">
        <div className="relative aspect-[2/3] w-[122px] overflow-hidden rounded-xl bg-slate-100 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.2)] transition-all duration-300 group-hover:shadow-[0_16px_28px_-6px_rgba(0,0,0,0.3)] group-hover:-translate-y-1 sm:w-[152px] md:w-[175px] lg:w-[185px]">
          
          {/* 📖 REALISTIC 3D BOOK SPINE CREASE & SHADOW (Apple Books Effect) */}
          <div className="pointer-events-none absolute inset-y-0 start-0 w-3 bg-gradient-to-r from-black/35 via-black/10 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 start-0 w-[1.5px] bg-white/45 z-10" />
          <div className="pointer-events-none absolute inset-y-0 end-0 w-[2px] bg-black/15 z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-black/25 z-10" />

          {!imgLoaded && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse shimmer-placeholder" />
          )}

          {imgSrc && (
            <img
              src={imgSrc}
              alt={title}
              loading="lazy"
              decoding="async"
              onError={handleImageError}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imgLoaded ? "opacity-100 group-hover:scale-105" : "opacity-0"
              }`}
            />
          )}

          {/* Hover Preview Overlay */}
          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/35 transition flex items-center justify-center z-15">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 border border-white/30 px-3.5 py-1.5 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100 shadow-lg backdrop-blur-xs">
              <BookOpenIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>{hasDigitalPdf ? "مطالعہ کریں" : "عنقریب..."}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Book Metadata & Title */}
      <div className="relative z-10 flex flex-grow flex-col px-3.5 pb-4 text-center sm:px-4 sm:pb-5">
        <h3
          className="mb-1.5 line-clamp-2 text-[0.95rem] font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-700 sm:text-sm md:text-base"
          style={{
            fontFamily: '"Mehr Nastaliq Web', 'Mehr', 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif",
            lineHeight: "1.7",
          }}
        >
          {title}
        </h3>

        <p className="line-clamp-1 text-[11px] text-slate-500 sm:text-xs font-medium">
          مؤلف: <span className="text-slate-800 font-semibold">{author}</span>
        </p>
      </div>
    </motion.div>
  );
};

export default PublicBookCard;
