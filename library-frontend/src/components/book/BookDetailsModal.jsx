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
  StarIcon
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// ✅ Services
import authService from "../../api/authService";

// ✅ Components
import PolicyStatement from "../book/PolicyStatement";
import AccessForm from "../RestrictedAccess/AccessForm";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000");

// ✅ Offline fallback cover
const FALLBACK_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="520">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f1f5f9"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" font-size="22" fill="#64748b"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif">
        No Cover
      </text>
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

// ✅ ADDED PROPS FOR DEEP SEARCH INTEGRATION
const BookDetailsModal = ({ 
  book, 
  onClose, 
  startView = "details",
  autoOpenReader = false,       // Deep search se aaya hai toh true hoga
  initialPage = 1,              // Deep search ka page number
  initialSearchQuery = ""       // Deep search ka keyword
}) => {
  const navigate = useNavigate();
  const [view, setView] = useState(startView);

  // ✅ Initialize SmartReader state based on Deep Search prop
  const [showSmartReader, setShowSmartReader] = useState(autoOpenReader);
  
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

  if (!book) return null;

  // -----------------------------
  // UI
  // -----------------------------
  
  // ✅ SMART READER VIEW (Takes over the screen if true)
  if (showSmartReader) {
    return (
      <SmartReader 
        pdfUrl={pdfUrl} 
        txtUrl={txtUrl} 
        onClose={() => setShowSmartReader(false)} 
        initialPage={initialPage}                  // Pass page number
        initialSearchText={initialSearchQuery}     // Pass keyword for highlighting
      />
    );
  }

  // ✅ DEFAULT MODAL VIEW
  return (
    <AnimatePresence>
      <motion.div
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
          {/* ✅ PREMIUM STICKY HEADER */}
          <motion.div 
            className="sticky top-0 z-[120] bg-gradient-to-r from-white via-white to-blue-50/50 backdrop-blur border-b border-slate-200 shrink-0"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="px-5 md:px-7 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-4">
                {/* Back Button */}
                {view === "read_text" && (
                  <motion.button 
                    onClick={() => setView("details")}
                    whileHover={{ scale: 1.1, backgroundColor: "#e2e8f0" }}
                    className="p-2 rounded-full bg-slate-100 text-slate-700 transition"
                    title="Back to Details"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </motion.button>
                )}
                <div>
                  <motion.p 
                    className="text-[11px] text-slate-500 font-bold uppercase tracking-widest"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {view === "read_text" ? "📖 Reading Mode" : "✨ Book Details"}
                  </motion.p>
                  <motion.h2 
                    className="text-lg md:text-xl font-black text-slate-900 truncate"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {title}
                  </motion.h2>
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                className="p-2 rounded-full bg-slate-100 hover:bg-red-100 transition text-slate-700 hover:text-red-600"
                title="Close (ESC)"
              >
                <XMarkIcon className="w-5 h-5" />
              </motion.button>
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
                <div className="grid grid-cols-1 md:grid-cols-12 h-full">
                  {/* LEFT: PREMIUM COVER SECTION */}
                  <motion.div 
                    className="md:col-span-5 bg-gradient-to-b from-slate-50 via-blue-50/30 to-purple-50/20 border-r border-slate-100 p-6 md:p-8 flex items-center justify-center"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                  >
                    <div className="w-full flex justify-center">
                      <motion.div 
                        className="w-[210px] sm:w-[240px] md:w-[260px] lg:w-[280px] aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl bg-white border-2 border-gradient-to-br from-blue-100 to-purple-100"
                        whileHover={{ scale: 1.05, rotateY: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      >
                        <img
                          src={coverUrl}
                          alt={title}
                          className="w-full h-full object-contain bg-gradient-to-br from-slate-100 to-slate-200"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_COVER;
                          }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* RIGHT: PREMIUM CONTENT SECTION */}
                  <div className="md:col-span-7 flex flex-col relative h-full">
                    {/* Scrollable content */}
                    <motion.div 
                      className="flex-1 px-6 md:px-8 py-6 pb-24 overflow-y-auto"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                    >
                      {/* Animated Badges */}
                      <motion.div 
                        className="flex gap-2 flex-wrap mb-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.1 }}
                      >
                        {[
                          { label: category, icon: "🏷️", color: "emerald" },
                          { label: language, icon: "🌐", color: "blue" },
                        ].map((badge, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`bg-${badge.color}-50 text-${badge.color}-700 text-[11px] font-extrabold px-3 py-1.5 rounded-full uppercase flex items-center gap-1.5 border border-${badge.color}-100`}
                          >
                            <span>{badge.icon}</span>
                            {badge.label}
                          </motion.span>
                        ))}
                        
                        {isRestricted && (
                          <motion.span
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full uppercase flex items-center gap-1.5 ${
                              userHasAccess
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}
                          >
                            {userHasAccess ? (
                              <>
                                <LockOpenIcon className="w-4 h-4" /> UNLOCKED
                              </>
                            ) : (
                              <>
                                <LockClosedIcon className="w-4 h-4" /> RESTRICTED
                              </>
                            )}
                          </motion.span>
                        )}
                      </motion.div>

                      {/* Title + Author with Premium Typography */}
                      <motion.div 
                        className="mb-6"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                      >
                        <h3 className="text-2xl md:text-4xl font-black text-[#002147] leading-tight mb-2">
                          {title}
                        </h3>
                        <motion.p 
                          className="text-lg text-blue-600 font-bold flex items-center gap-2"
                          whileHover={{ x: 5 }}
                        >
                          ✍️ By <span className="text-slate-800">{author}</span>
                        </motion.p>
                      </motion.div>

                      {/* Premium Description Box */}
                      <motion.div 
                        className="rounded-2xl border-2 border-gradient-to-br from-blue-100 to-purple-100 bg-gradient-to-br from-blue-50 to-purple-50/30 p-5 md:p-6 mb-6"
                        whileHover={{ borderColor: "#3b82f6", boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                      >
                        <div className="flex items-center gap-2 mb-3 text-slate-700 font-extrabold text-lg">
                          <SparklesIcon className="w-5 h-5 text-blue-600" />
                          About this Book
                        </div>
                        <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">
                          {description}
                        </p>
                      </motion.div>

                      {/* Star Rating */}
                      <div className="flex justify-center gap-1.5 mb-6">
                        {[...Array(5)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ scale: 1.2, rotate: 15 }}
                          >
                            <StarIcon className={`w-5 h-5 ${i < 4 ? "text-yellow-400" : "text-gray-300"}`} />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* ✅ PREMIUM STICKY FOOTER ACTIONS */}
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent border-t border-slate-100 px-6 md:px-8 py-4"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                    >
                      {isRestricted && !userHasAccess ? (
                        <motion.button
                          onClick={handleRequestClick}
                          whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,33,71,0.3)" }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-gradient-to-r from-[#002147] to-blue-900 text-white py-3.5 px-6 rounded-2xl font-extrabold hover:shadow-lg transition-all flex items-center justify-center gap-3 shadow-md"
                        >
                          <LockClosedIcon className="w-5 h-5" />
                          Request Digital Access
                        </motion.button>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-3">
                          {/* Read PDF Button */}
                          {pdfUrl && (
                            <motion.button
                              onClick={handleReadPdfClick}
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1 py-3.5 px-6 rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2 shadow-md bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg"
                            >
                              <BookOpenIcon className="w-5 h-5" />
                              Read PDF
                            </motion.button>
                          )}

                          {/* Read Text Button */}
                          {txtUrl && (
                            <motion.button
                              onClick={handleReadTextClick}
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1 py-3.5 px-6 rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2 shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg"
                            >
                              <DocumentTextIcon className="w-5 h-5" />
                              Read Text
                            </motion.button>
                          )}

                          {/* Fallback if no files */}
                          {!pdfUrl && !txtUrl && (
                            <div className="w-full py-3.5 px-6 rounded-2xl font-extrabold bg-slate-100 text-slate-400 border border-slate-200 text-center cursor-not-allowed">
                              No Digital Formats Available
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
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
  );
};

export default BookDetailsModal;