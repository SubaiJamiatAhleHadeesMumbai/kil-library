// src/components/book/BookDetailsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import SmartReader from './SmartReader';
import {
  XMarkIcon,
  BookOpenIcon,
  LockClosedIcon,
  LockOpenIcon,
  LanguageIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  SparklesIcon,
  StarIcon,
  ShareIcon,
  UserIcon,
  LinkIcon,
  CheckIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import BookPurchaseModal from "./BookPurchaseModal";

// Services
import authService from "../../api/authService";

// Components
import PolicyStatement from "../book/PolicyStatement";
import AccessForm from "../RestrictedAccess/AccessForm";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

// ✅ Offline fallback cover (Coming Soon Badge)
const FALLBACK_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1120"/>
          <stop offset="50%" stop-color="#002147"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <rect width="360" height="520" fill="url(#bg)"/>
      <rect x="16" y="16" width="328" height="488" rx="8" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 4"/>
      <rect x="22" y="22" width="316" height="476" rx="6" fill="none" stroke="#10b981" stroke-opacity="0.3" stroke-width="1"/>
      <circle cx="180" cy="180" r="54" fill="#0f172a" stroke="#10b981" stroke-width="2" stroke-opacity="0.4"/>
      <path d="M160 162h40c2.2 0 4 1.8 4 4v32c0 2.2-1.8 4-4 4h-40c-2.2 0-4-1.8-4-4v-32c0-2.2 1.8-4 4-4zm4 8v24h32v-24h-32z" fill="#34d399"/>
      <path d="M168 178h16v4h-16zm0 8h24v4h-24z" fill="#6ee7b7"/>
      <text x="180" y="275" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="3" text-anchor="middle">MARKAZ ISLAMIC LIBRARY</text>
      <text x="180" y="320" font-family="'Traditional Arabic', 'Amiri', serif" font-size="28" font-weight="bold" fill="url(#gold)" text-anchor="middle">قَرِيبـاً</text>
      <text x="180" y="355" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#ffffff" letter-spacing="2" text-anchor="middle">COMING SOON</text>
      <rect x="120" y="375" width="120" height="22" rx="11" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.4"/>
      <text x="180" y="390" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399" letter-spacing="1" text-anchor="middle">COVER IN PROCESS</text>
    </svg>
  `);

const getMediaUrl = (path) => {
  if (!path) return null;
  let clean = String(path).replace(/\\/g, "/");
  if (clean.startsWith("http")) return clean;
  if (!clean.startsWith("/")) clean = "/" + clean;
  return `${API_BASE_URL}${clean}`;
};

const getSafeName = (value, fallback = "N/A") => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value?.name) return value.name;
  return fallback;
};

// âœ… ADDED PROPS FOR DEEP SEARCH INTEGRATION
const BookDetailsModal = ({ 
  book, 
  onClose, 
  onBackToSearch,
  startView = "details",
  autoOpenReader = false,       // Deep search se aaya hai toh true hoga
  initialPage = 1,              // Deep search ka page number
  initialSearchQuery = ""       // Deep search ka keyword
}) => {
  const navigate = useNavigate();
  const [view, setView] = useState(startView);

  // âœ… Initialize SmartReader state based on Deep Search prop
  const [showSmartReader, setShowSmartReader] = useState(autoOpenReader);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  const [textContent, setTextContent] = useState("");
  const [isLoadingText, setIsLoadingText] = useState(false);

  // -----------------------------
  // UX: Body Scroll Lock + ESC Close
  // -----------------------------
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      // Sirf tab close karein jab SmartReader open na ho
      if (e.key === "Escape" && !showSmartReader) handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showSmartReader]);

  // Handle prop changes (just in case book changes without unmounting)
  useEffect(() => {
    if (book) setView(startView);
    if (autoOpenReader) setShowSmartReader(true);
  }, [book, startView, autoOpenReader]);

  // -----------------------------
  // Derived Data
  // -----------------------------
  const title = book?.title || "Untitled";
  const author = getSafeName(book?.author, "Unknown");
  const category = getSafeName(book?.category, "General");
  const language = getSafeName(book?.language, "Urdu");
  const description = book?.description || "No description available.";
  
  const isRestricted = !!book?.is_restricted;
  const userHasAccess = !!book?.user_has_access;

  const coverUrl = useMemo(() => {
    const raw = book?.cover_image_url || book?.cover_image;
    return getMediaUrl(raw) || FALLBACK_COVER;
  }, [book]);

  const pdfUrl = useMemo(() => {
    return getMediaUrl(book?.pdf_url || book?.pdf_file);
  }, [book]);

  const txtUrl = useMemo(() => {
    return getMediaUrl(book?.txt_file_url || book?.txt_file);
  }, [book]);

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleClose = () => {
    setView("details");
    onClose?.();
  };

  const handleRequestClick = (e) => {
    e.preventDefault();
    if (book?.id) {
      localStorage.setItem("pendingRestrictedBookId", String(book.id));
    }
    if (!authService.isAuthenticated()) {
      toast.error("Please login to request access");
      handleClose();
      navigate("/login");
      return;
    }
    setView("policy");
  };

  const handleReadPdfClick = () => {
    if (!pdfUrl && !txtUrl) {
      toast.error("No digital format available to read.");
      return;
    }
    setShowSmartReader(true);
  };

  const handleReadTextClick = async () => {
    if (!txtUrl && !pdfUrl) {
      toast.error("No digital format available to read.");
      return;
    }
    setShowSmartReader(true);
  };

  // -----------------------------
  // Share Handlers
  // -----------------------------
  const getShareUrl = () => {
    const base = window.location.origin || "";
    return `${base}/books?bookId=${book?.id || ""}`;
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const titleText = book?.title || "Book";
    const authorText = author !== "Unknown" ? ` by ${author}` : "";
    const shareMessage = `Check out "${titleText}"${authorText} on Markaz Islamic Library:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: titleText,
          text: shareMessage,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Share error:", err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Book link copied to clipboard!", { icon: "🔗" });
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!", { icon: "📋" });
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  if (!book) return null;

  // -----------------------------
  // UI
  // -----------------------------
  
  // âœ… SMART READER VIEW (Takes over the screen if true)
  if (showSmartReader) {
    return (
      <SmartReader 
        key={`${book?.id || 'book'}-${initialPage}-${initialSearchQuery}`}
        book={book}
        bookId={book?.id}
        bookTitle={book?.title}
        pdfUrl={pdfUrl} 
        txtUrl={txtUrl} 
        onClose={() => setShowSmartReader(false)} 
        onBackToSearch={() => {
          setShowSmartReader(false);
          handleClose();
          onBackToSearch?.();
        }}
        initialPage={initialPage}                  // Pass page number
        initialSearchText={initialSearchQuery}     // Pass keyword for highlighting
      />
    );
  }

  // ✅ DEFAULT MODAL VIEW
  return (
    <>
      <AnimatePresence>
        <motion.div
          key="book-details-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden relative max-h-[92vh] border border-white/30 flex flex-col"
        >
          {/* âœ… PREMIUM STICKY HEADER */}
          <motion.div 
            className="sticky top-0 z-[120] bg-white/95 backdrop-blur-md border-b border-slate-100 shrink-0"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                {/* Back Button for read text view */}
                {view === "read_text" && (
                  <motion.button 
                    onClick={() => setView("details")}
                    whileHover={{ scale: 1.1, backgroundColor: "#e2e8f0" }}
                    className="p-1.5 rounded-full bg-slate-100 text-slate-700 transition cursor-pointer"
                    title="Back to Details"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                  </motion.button>
                )}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold">
                    <BookOpenIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">
                      {view === "read_text" ? "Reading Mode" : "Book Details"}
                    </span>
                    <span className="hidden sm:inline-block text-slate-300 mx-1.5">•</span>
                    <span className="hidden sm:inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Share Button */}
                <motion.button
                  onClick={handleShare}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs transition border border-slate-200/80 cursor-pointer shadow-2xs"
                  title="Share this book"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </motion.button>

                {/* Copy Link Button */}
                <motion.button
                  onClick={handleCopyLink}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-2xs"
                  title="Copy link"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </motion.button>

                {/* Close Button */}
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-100 transition text-slate-600 hover:text-rose-600 cursor-pointer shadow-2xs"
                  title="Close (ESC)"
                >
                  <XMarkIcon className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ===================== DETAILS VIEW ===================== */}
          <AnimatePresence mode="wait">
            {view === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 min-h-full">
                  {/* LEFT: PREMIUM COVER SECTION */}
                  <motion.div 
                    className="md:col-span-5 bg-gradient-to-b from-slate-50 via-slate-100/50 to-blue-50/20 border-b md:border-b-0 md:border-r border-slate-100 p-5 sm:p-7 flex flex-col items-center justify-start md:justify-center"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                  >
                    {/* Cover Wrapper */}
                    <div className="relative group my-auto flex flex-col items-center">
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition duration-500" />
                      <motion.div 
                        className="relative w-[180px] sm:w-[210px] md:w-[230px] lg:w-[260px] aspect-[2/3] rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200/80"
                        whileHover={{ scale: 1.03 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      >
                        <img
                          src={coverUrl}
                          alt={title}
                          className="w-full h-full object-contain bg-slate-50"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_COVER;
                          }}
                        />
                      </motion.div>
                    </div>

                    {/* MOBILE QUICK ACTION STRIP (Right below cover for instant 1-tap read) */}
                    <div className="w-full mt-5 md:hidden space-y-2">
                      {isRestricted && !userHasAccess ? (
                        <button
                          type="button"
                          onClick={handleRequestClick}
                          className="w-full py-3 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 bg-[#002147] text-white shadow-md cursor-pointer"
                        >
                          <LockClosedIcon className="w-4 h-4" /> Request Digital Access
                        </button>
                      ) : (
                        <>
                          {pdfUrl && (
                            <button
                              type="button"
                              onClick={handleReadPdfClick}
                              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-[#002147] text-white shadow-lg shadow-emerald-600/25 active:scale-98 cursor-pointer"
                            >
                              <BookOpenIcon className="w-5 h-5" />
                              <span>Read Free Online / سمارٹ ریڈر</span>
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {pdfUrl && (
                              <button
                                type="button"
                                onClick={() => setShowPurchaseModal(true)}
                                className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5 text-slate-600" />
                                <span>{book.is_download_paid ? `Download (₹${book.download_price || 49})` : 'Download PDF'}</span>
                              </button>
                            )}
                            {txtUrl && (
                              <button
                                type="button"
                                onClick={handleReadTextClick}
                                className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <DocumentTextIcon className="w-3.5 h-3.5 text-slate-600" />
                                <span>Text Mode</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>

                  {/* RIGHT: CONTENT SECTION */}
                  <div className="md:col-span-7 flex flex-col relative h-full">
                    {/* Scrollable content */}
                    <div className="flex-1 px-5 sm:px-8 py-6 pb-28 overflow-y-auto space-y-6">
                      
                      {/* Title & Author Header */}
                      <div>
                        {/* Badges */}
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          <span className="bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase border border-emerald-100 flex items-center gap-1">
                            <span>🏷️</span> {category}
                          </span>
                          <span className="bg-blue-50 text-blue-800 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase border border-blue-100 flex items-center gap-1">
                            <span>🌐</span> {language}
                          </span>
                          {isRestricted && (
                            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase flex items-center gap-1 ${
                              userHasAccess
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}>
                              {userHasAccess ? <LockOpenIcon className="w-3.5 h-3.5" /> : <LockClosedIcon className="w-3.5 h-3.5" />}
                              {userHasAccess ? "UNLOCKED" : "RESTRICTED"}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#002147] leading-tight tracking-tight">
                          {title}
                        </h2>

                        {/* Author */}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                            <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-slate-400 font-semibold">Author:</span>
                            <span className="text-slate-900">{author}</span>
                          </div>
                          {book?.publisher && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                              <span className="text-slate-400 font-semibold">Pub:</span>
                              <span className="text-slate-900">{getSafeName(book.publisher)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4 Quick Spec Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex flex-col text-center justify-center">
                          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Format</span>
                          <span className="text-xs font-black text-[#002147] mt-0.5">{pdfUrl ? 'Digital PDF' : 'E-Book'}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex flex-col text-center justify-center">
                          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Language</span>
                          <span className="text-xs font-black text-[#002147] mt-0.5">{language}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex flex-col text-center justify-center">
                          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Access</span>
                          <span className="text-xs font-black text-emerald-700 mt-0.5">{isRestricted ? 'Restricted' : 'Free Public'}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex flex-col text-center justify-center">
                          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Reader</span>
                          <span className="text-xs font-black text-blue-700 mt-0.5">Smart Reader</span>
                        </div>
                      </div>

                      {/* Description Box */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-2 text-slate-800 font-extrabold text-sm">
                          <SparklesIcon className="w-4 h-4 text-emerald-600" />
                          <span>About this Book</span>
                        </div>
                        <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                          {description}
                        </p>
                      </div>
                    </div>

                    {/* âœ… DESKTOP STICKY BOTTOM ACTION BAR */}
                    <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-white/80 border-t border-slate-200 px-6 sm:px-8 py-4 z-20">
                      {isRestricted && !userHasAccess ? (
                        <motion.button
                          onClick={handleRequestClick}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-[#002147] text-white py-3.5 px-6 rounded-2xl font-extrabold hover:shadow-lg transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer"
                        >
                          <LockClosedIcon className="w-5 h-5" />
                          Request Digital Access
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-3">
                          {/* Read PDF Button (Free Online) */}
                          {pdfUrl && (
                            <motion.button
                              onClick={handleReadPdfClick}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-[2] py-3.5 px-5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 bg-gradient-to-r from-emerald-600 to-[#002147] text-white cursor-pointer"
                            >
                              <BookOpenIcon className="w-5 h-5" />
                              <span>Read Free Online / سمارٹ ریڈر</span>
                            </motion.button>
                          )}

                          {/* Download PDF Button */}
                          {pdfUrl && (
                            <motion.button
                              type="button"
                              onClick={() => setShowPurchaseModal(true)}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer shadow-xs"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 text-slate-600" />
                              <span>{book.is_download_paid ? `Download (₹${book.download_price || 49})` : 'Download PDF'}</span>
                            </motion.button>
                          )}

                          {/* Read Text Button */}
                          {txtUrl && (
                            <motion.button
                              onClick={handleReadTextClick}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              className="py-3.5 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                            >
                              <DocumentTextIcon className="w-4 h-4" />
                              <span>Text</span>
                            </motion.button>
                          )}

                          {/* Fallback */}
                          {!pdfUrl && !txtUrl && (
                            <div className="w-full py-3.5 px-4 rounded-2xl font-semibold text-xs bg-slate-100 text-slate-400 border border-slate-200 text-center cursor-not-allowed">
                              No Digital Formats Available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ===================== IN-APP TEXT READER ===================== */}
            {view === "read_text" && (
              <motion.div
                key="read_text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 md:p-8"
              >
                <div className="max-w-4xl mx-auto bg-white p-6 md:p-12 rounded-2xl shadow-sm border border-slate-200 min-h-full">
                  {isLoadingText ? (
                    <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
                      Loading text...
                    </div>
                  ) : (
                    <div 
                      className="prose max-w-none text-slate-800 text-base md:text-lg leading-loose font-serif whitespace-pre-wrap"
                      dir={language.toLowerCase() === 'urdu' || language.toLowerCase() === 'arabic' ? 'rtl' : 'ltr'}
                    >
                      {textContent || "This document is empty."}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ===================== POLICY VIEW ===================== */}
            {view === "policy" && (
              <motion.div
                key="policy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto p-4 md:p-6"
              >
                <PolicyStatement
                  onAccept={() => setView("access_form")}
                  onCancel={() => setView("details")}
                />
              </motion.div>
            )}

            {/* ===================== ACCESS FORM VIEW ===================== */}
            {view === "access_form" && (
              <motion.div
                key="access_form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto p-4 md:p-6"
              >
                <AccessForm
                  book={book}
                  onSuccess={() => {
                    toast.success("Request Submitted!");
                    localStorage.removeItem("pendingRestrictedBookId");
                    handleClose();
                  }}
                  onCancel={() => setView("details")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    {/* Paid Download & UPI Purchase Modal */}
    <BookPurchaseModal
      key="book-purchase-modal"
      book={book}
      pdfUrl={pdfUrl}
      isOpen={showPurchaseModal}
      onClose={() => setShowPurchaseModal(false)}
    />
  </>
  );
};

export default BookDetailsModal;