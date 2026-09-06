import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

import GlobalSearchModal from "../book/GlobalSearchModal";
import BookDetailsModal from "../book/BookDetailsModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

/* ---------------- Debounce Hook ---------------- */
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
};

/* ---------------- Main Component ---------------- */
const LibrarySearchStrip = ({
  searchTerm = "",
  onSearchChange,
  suggestions = [],
  loading = false,
  autoFocus = false,
  onDeepSearchResultClick,
  placeholder = "Search books by title, author, subject, or ISBN...",
  enableVoice = true,
  enableDeepSearch = true,
  enableSuggestions = true,
}) => {
  const navigate = useNavigate();
  const [localValue, setLocalValue] = useState(searchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [listening, setListening] = useState(false);
  
  // Deep Search Modal State
  const [isDeepSearchOpen, setIsDeepSearchOpen] = useState(false);
  const [deepSearchQuery, setDeepSearchQuery] = useState("");

  // Auto-Opening Book States
  const [deepSearchBook, setDeepSearchBook] = useState(null);
  const [deepSearchConfig, setDeepSearchConfig] = useState({ page: 1, query: "" });
  const [isFetchingBook, setIsFetchingBook] = useState(false);

  const inputRef = useRef(null);
  const debouncedValue = useDebounce(localValue, 300);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  /* -------- Apply debounced value -------- */
  useEffect(() => {
    onSearchChange?.(debouncedValue);
  }, [debouncedValue]);

  /* -------- Keyboard Shortcuts -------- */
  useEffect(() => {
    const handler = (e) => {
      // Normal Search: Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Deep Search: Ctrl + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsDeepSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* -------- Voice Search -------- */
  const startVoiceSearch = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice search not supported in this browser");
      return;
    }

    try {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "ur-PK";

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setLocalValue(text);
      };
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  /* -------- Deep Search Result Click Handlers -------- */
  const handleDeepResultClick = (bookIdOrItem, pageNumber, queryText) => {
    setIsDeepSearchOpen(false);

    const bookId = typeof bookIdOrItem === 'object' ? bookIdOrItem.book_id : bookIdOrItem;
    const page = typeof bookIdOrItem === 'object' ? (bookIdOrItem.page_number || 1) : (pageNumber || 1);
    const q = typeof bookIdOrItem === 'object' ? (bookIdOrItem.query || "") : (queryText || "");

    if (onDeepSearchResultClick) {
      onDeepSearchResultClick({ book_id: bookId, page_number: page, query: q });
      return;
    }

    if (bookId) {
      navigate(`/read/${bookId}?page=${page}&q=${encodeURIComponent(q)}`);
    }
  };

  const openDeepSearch = () => {
    setIsDeepSearchOpen(true);
  };

  const returnToDeepSearch = () => {
    setDeepSearchBook(null);
    setIsDeepSearchOpen(true);
  };

  return (
    <>
      <div className="relative w-full">
        {/* ================= ULTRA-MODERN FLOATING SEARCH BAR ================= */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative group"
        >
          <div className="relative flex min-h-[56px] sm:min-h-[62px] items-center rounded-2xl sm:rounded-full bg-white border border-slate-200/90 hover:border-emerald-400 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 px-3 sm:px-4">
            
            {/* Search Icon */}
            <div className="flex items-center justify-center p-2 rounded-full text-emerald-600 bg-emerald-50/80 mr-1 sm:mr-2 flex-shrink-0">
              <MagnifyingGlassIcon className="h-5 w-5 stroke-2" />
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent px-2 py-3 text-sm sm:text-base text-slate-900 outline-none placeholder:text-slate-400 font-medium border-0 focus:outline-none focus:ring-0"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Clear Button */}
              <AnimatePresence>
                {localValue && (
                  <motion.button
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    onClick={() => setLocalValue("")}
                    className="rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Clear search"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Voice Search Button */}
              {enableVoice ? (
                <button
                  type="button"
                  onClick={startVoiceSearch}
                  title="Voice Search"
                  className={`rounded-full p-2 sm:p-2.5 transition-all cursor-pointer ${
                    listening
                      ? "bg-rose-500 text-white animate-pulse shadow-md"
                      : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <MicrophoneIcon className="h-5 w-5" />
                </button>
              ) : null}

              {/* Deep Search Button */}
              {enableDeepSearch ? (
                <button
                  type="button"
                  onClick={openDeepSearch}
                  title="Search inside full book texts"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-bold text-xs transition border border-slate-200/80 hover:border-indigo-200 cursor-pointer shadow-2xs"
                >
                  {isFetchingBook ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                  ) : (
                    <DocumentTextIcon className="h-4 w-4 text-indigo-500" />
                  )}
                  <span className="hidden sm:inline">Deep Search</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* ================= SUGGESTIONS DROPDOWN ================= */}
          <AnimatePresence>
            {enableSuggestions && showSuggestions && localValue && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                {suggestions.slice(0, 5).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setLocalValue(item);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer"
                  >
                    {item}
                  </button>
                ))}

                <div className="border-t border-slate-100 bg-slate-50 p-2">
                  <button
                    onClick={() => setIsDeepSearchOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl p-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 cursor-pointer"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    Search "{localValue}" inside full book pages...
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ✅ DEEP SEARCH MODAL */}
      <GlobalSearchModal 
        isOpen={isDeepSearchOpen}
        onClose={() => setIsDeepSearchOpen(false)}
        onResultClick={handleDeepResultClick}
        initialQuery={deepSearchQuery}
      />

      {/* ✅ AUTO-OPENING BOOK READER MODAL */}
      {deepSearchBook && (
        <BookDetailsModal
          book={deepSearchBook}
          onClose={() => setDeepSearchBook(null)}
          onBackToSearch={returnToDeepSearch}
          startView="details"
          autoOpenReader={true}
          initialPage={deepSearchConfig.page}
          initialSearchQuery={deepSearchConfig.query}
        />
      )}
    </>
  );
};

export default LibrarySearchStrip;