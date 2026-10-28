// src/components/public/PublicBookCard.jsx
// Square-Curve HD Book Card with Light Pearl Stage, 3D Page Depth, Auto-Generated Urdu Hardcovers, and Hover-Only Green Actions.
import React, { useEffect, useMemo, useState } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  BookmarkIcon as BookmarkSolid,
} from "@heroicons/react/24/solid";
import {
  BookmarkIcon as BookmarkOutline,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000")
).replace(/\/$/, "");

// Rich Cloth Hardcover Palettes for books without an uploaded cover image
const HARDCOVER_PALETTES = [
  "from-[#124B38] to-[#09291E]", // Royal Emerald
  "from-[#5A1E28] to-[#340F15]", // Classic Burgundy
  "from-[#1B365D] to-[#0D1E38]", // Deep Navy
  "from-[#4A3519] to-[#2B1D0B]", // Warm Bronze
];

const showUpcomingToast = () => {
  toast("عنقریب دستیاب ہوگا...", {
    icon: "⏳",
    duration: 3500,
    style: {
      borderRadius: "16px",
      background: "#F3F8F5",
      color: "#0F3D2E",
      border: "1px solid #C5A059",
      fontSize: "16px",
      fontWeight: "bold",
      fontFamily: "'Noto Naskh Arabic', 'Amiri', serif",
      padding: "12px 20px",
    },
  });
};

const PublicBookCard = ({
  book,
  onClick,
  onQuickLook,
  onReadClick,
  isFavorite = false,
  onToggleFavorite,
  className = "",
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hasValidCover, setHasValidCover] = useState(false);

  const safeText = (value, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") return value?.name || value?.title || fallback;
    const str = String(value).trim();
    return str.length ? str : fallback;
  };

  const title = useMemo(() => safeText(book?.title, "کتاب"), [book]);
  const author = useMemo(() => safeText(book?.author, "علمائے کرام"), [book]);
  const isRestricted = !!book?.is_restricted;
  const userHasAccess = !!book?.user_has_access;
  const hasDigitalPdf = Boolean(
    book?.pdf_url || book?.pdf_file || book?.txt_file_url || book?.txt_file
  );
  const pageCount = Number(book?.page_count || book?.pages || book?.total_pages || 0);

  // Pick a consistent hardcover color palette based on book ID or title
  const clothGradient = useMemo(() => {
    const seed = Number(book?.id) || title.length || 0;
    return HARDCOVER_PALETTES[seed % HARDCOVER_PALETTES.length];
  }, [book?.id, title]);

  useEffect(() => {
    setImgLoaded(false);

    if (!book) {
      setImgSrc(null);
      setHasValidCover(false);
      return;
    }

    const rawUrl = book.cover_image_url || book.cover_image;
    if (!rawUrl || String(rawUrl).trim() === "") {
      setImgSrc(null);
      setHasValidCover(false);
      return;
    }

    setHasValidCover(true);
    if (typeof rawUrl === "string" && rawUrl.startsWith("http")) {
      setImgSrc(rawUrl);
      return;
    }

    const path = String(rawUrl);
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    setImgSrc(`${API_BASE_URL}${cleanPath}`);
  }, [book]);

  const handleImageError = () => {
    setHasValidCover(false);
    setImgSrc(null);
    setImgLoaded(true);
  };

  const handlePrimaryRead = (e) => {
    if (e) e.stopPropagation();
    if (!hasDigitalPdf) {
      showUpcomingToast();
      if (typeof onClick === "function") onClick(book);
      return;
    }
    if (typeof onReadClick === "function") {
      onReadClick(book);
    } else if (typeof onClick === "function") {
      onClick(book);
    }
  };

  const handleQuickLookClick = (e) => {
    if (e) e.stopPropagation();
    if (typeof onQuickLook === "function") {
      onQuickLook(book);
    } else if (typeof onClick === "function") {
      onClick(book);
    }
  };

  const handleDownloadClick = (e) => {
    if (e) e.stopPropagation();
    const rawPdf = book?.pdf_url || book?.pdf_file;
    if (rawPdf) {
      const fullPdfUrl = String(rawPdf).startsWith("http")
        ? rawPdf
        : `${API_BASE_URL}${String(rawPdf).startsWith("/") ? "" : "/"}${rawPdf}`;
      window.open(fullPdfUrl, "_blank", "noopener,noreferrer");
    } else {
      handlePrimaryRead();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      onClick={() => {
        if (typeof onClick === "function") onClick(book);
      }}
      className={`group relative mx-auto w-full max-w-[340px] sm:max-w-none overflow-hidden rounded-[22px] border-[1.5px] border-[#D5E4DC] bg-white shadow-[0_10px_26px_-10px_rgba(15,61,46,0.08)] transition-all duration-300 cursor-pointer hover:border-[#C5A059] hover:shadow-[0_16px_34px_-10px_rgba(15,61,46,0.16)] flex flex-col justify-between ${className}`}
      dir="rtl"
    >
      {/* TOP SQUARE-CURVE LIGHT PEARL STAGE (#EAF3EE -> #F4F9F6) */}
      <div className="relative flex items-center justify-center bg-gradient-to-b from-[#EAF3EE] to-[#F4F9F6] border-b border-[#DCECE4] px-4 pt-5 pb-4 transition-colors duration-300 group-hover:from-[#E3EFE8] group-hover:to-[#F0F7F3]">
        
        {/* Top-Right: Bookmark Circle Button (Does NOT cover book image) */}
        {typeof onToggleFavorite === "function" && (
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, book?.id)}
            className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xs cursor-pointer ${
              isFavorite
                ? "bg-[#165B43] text-white border border-[#165B43]"
                : "bg-white text-slate-500 border border-[#D5E4DC] hover:bg-[#165B43] hover:text-white hover:border-[#165B43]"
            }`}
            title={isFavorite ? "محفوظ شدہ" : "محفوظ کریں"}
          >
            {isFavorite ? (
              <BookmarkSolid className="h-3.5 w-3.5" />
            ) : (
              <BookmarkOutline className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Top-Left: Page Count or Status Pill (Does NOT cover book image) */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-col items-end gap-1">
          {isRestricted ? (
            userHasAccess ? (
              <span className="inline-flex items-center gap-1 bg-[#165B43] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                <LockOpenIcon className="w-3 h-3" />
                <span>کھلی رسائی</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                <LockClosedIcon className="w-3 h-3" />
                <span>مخصوص</span>
              </span>
            )
          ) : !hasDigitalPdf ? (
            <span className="inline-flex items-center gap-1 bg-white border border-[#C5A059] text-[#0F3D2E] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
              <span>⏳</span>
              <span>عنقریب</span>
            </span>
          ) : pageCount > 0 ? (
            <span
              className="inline-flex items-center bg-white border border-[#DCECE4] text-[#0F3D2E] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs"
              style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
            >
              {pageCount} صفحات
            </span>
          ) : null}
        </div>

        {/* SQUARE-CURVE 3D HD BOOK COVER WITH GOLD FRAME & 3D LEFT PAGE EDGES */}
        <div
          className="relative w-[138px] h-[198px] sm:w-[148px] sm:h-[210px] rounded-[14px] border-2 border-[#C5A059] bg-white overflow-hidden transition-transform duration-300 group-hover:-translate-y-1"
          style={{
            boxShadow:
              "-3px 0 0 #FFFFFF, -4px 0 0 #D5D2CA, -6px 0 0 #F5F3EE, 0 14px 24px -6px rgba(10, 38, 28, 0.28), 0 4px 10px rgba(0, 0, 0, 0.10)",
          }}
        >
          {/* Right-side RTL Spine Crease Highlight */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-2.5 z-10"
            style={{
              background:
                "linear-gradient(to left, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.34) 40%, rgba(0,0,0,0) 100%)",
            }}
          />

          {hasValidCover && imgSrc ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-[#EAF3EE] animate-pulse" />
              )}
              <img
                src={imgSrc}
                alt={title}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-fill transition-opacity duration-300 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  filter: "contrast(1.06) saturate(1.08)",
                }}
              />
            </>
          ) : (
            /* AUTO-GENERATED ROYAL CLOTH HARDCOVER WITH REAL URDU TITLE & AUTHOR */
            <div
              className={`w-full h-full bg-gradient-to-br ${clothGradient} p-2.5 flex flex-col justify-between select-none`}
            >
              <div className="border border-[#C5A059]/60 rounded-lg h-full p-2 flex flex-col justify-between items-center text-center relative z-10">
                <span
                  className="text-[8.5px] text-[#DFC286] font-bold tracking-wide"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  کوکن اسلامک لائبریری
                </span>

                <div className="my-auto px-1 space-y-1.5">
                  <div className="w-6 h-[1px] bg-[#C5A059]/50 mx-auto" />
                  <div
                    className="text-[12px] font-extrabold text-white leading-[1.65] line-clamp-4"
                    style={{ fontFamily: "'Noto Naskh Arabic', 'Amiri', serif" }}
                  >
                    {title}
                  </div>
                  <div className="w-6 h-[1px] bg-[#C5A059]/50 mx-auto" />
                </div>

                <span
                  className="text-[8.5px] text-[#DFC286] font-semibold border-t border-[#C5A059]/30 pt-1 w-full truncate"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {author}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM METADATA & HOVER-ONLY GREEN ACTION BUTTONS */}
      <div className="p-3.5 text-center flex-1 flex flex-col justify-between bg-white">
        <div>
          <h3
            className="text-[13.5px] sm:text-[14px] font-extrabold text-[#0F3D2E] leading-[1.7] line-clamp-2 min-h-[2.95rem] transition-colors group-hover:text-[#165B43]"
            style={{
              fontFamily: "'Noto Naskh Arabic', 'Amiri', serif",
            }}
          >
            {title}
          </h3>

          <div
            className="inline-block bg-[#F3F8F5] border border-[#DCECE4] rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[#165B43] mt-1 max-w-full truncate"
            style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
          >
            ✍️ {author}
          </div>
        </div>

        {/* Action Buttons Row (White by default -> Green ONLY on Hover/Click) */}
        <div
          className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100"
          dir="rtl"
        >
          <button
            type="button"
            onClick={handlePrimaryRead}
            className="flex-1 py-1.5 px-2.5 rounded-full bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] active:bg-[#165B43] active:text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
            style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
          >
            <span>📖</span>
            <span>مطالعہ</span>
          </button>

          <button
            type="button"
            onClick={handleQuickLookClick}
            className="py-1.5 px-2.5 rounded-full bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] active:bg-[#165B43] active:text-white text-xs font-extrabold transition-all flex items-center justify-center shadow-2xs cursor-pointer"
            title="مختصر تعارف (جھلک)"
          >
            <EyeIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDownloadClick}
            className="py-1.5 px-2.5 rounded-full bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] active:bg-[#165B43] active:text-white text-xs font-extrabold transition-all flex items-center justify-center shadow-2xs cursor-pointer"
            title="ڈاؤنلوڈ"
          >
            <span>⬇</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PublicBookCard;
