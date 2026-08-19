import React, { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  MicrophoneIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

// ✅ GlobalSearchModal aur BookDetailsModal ko import karein
import GlobalSearchModal from "../book/GlobalSearchModal";
import BookDetailsModal from "../book/BookDetailsModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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
  onDeepSearchResultClick,
  title = "Library Search",
  subtitle = "Search the library collection",
  description = "Find books, authors, publishers and smart recommendations instantly.",
  showHint = true,
  placeholder = "Search books, authors, publishers...",
  enableVoice = true,
  enableDeepSearch = true,
  enableSuggestions = true,
}) => {
  const [localValue, setLocalValue] = useState(searchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [listening, setListening] = useState(false);
  const [mobileMode, setMobileMode] = useState("search");
  
  // ✅ Deep Search Modal ka State
  const [isDeepSearchOpen, setIsDeepSearchOpen] = useState(false);

  // ✅ Auto-Opening the Book States
  const [deepSearchBook, setDeepSearchBook] = useState(null);
  const [deepSearchConfig, setDeepSearchConfig] = useState({ page: 1, query: "" });
  const [isFetchingBook, setIsFetchingBook] = useState(false);

  const inputRef = useRef(null);
  const debouncedValue = useDebounce(localValue, 300);

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

    setMobileMode("voice");
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setListening(true);

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setLocalValue(text);
      setShowSuggestions(false);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  /* -------- Deep Search Result Click Handler -------- */
  const handleDeepResultClick = async (bookId, pageNumber, searchQuery) => {
    setIsDeepSearchOpen(false); // Modal band karo
    setIsFetchingBook(true);    // Loading spinner shuru karo
    
    try {
      // API se us book ka pura data fetch karo taaki reader me pass kar sakein
      const res = await fetch(`${API_BASE_URL}/api/books/${bookId}`);
      if (res.ok) {
        const bookData = await res.json();
        setDeepSearchConfig({ page: pageNumber, query: searchQuery });
        setDeepSearchBook(bookData); // Ye state set hote hi BookDetailsModal khul jayega
      } else {
        console.error("Failed to load book details");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingBook(false);
    }

    // Call optional parent prop if needed
    if(onDeepSearchResultClick) {
      onDeepSearchResultClick(bookId, pageNumber, searchQuery);
    }
  };

  const focusSearchInput = () => {
    setMobileMode("search");
    inputRef.current?.focus();
  };

  const openDeepSearch = () => {
    setMobileMode("deep");
    setIsDeepSearchOpen(true);
  };

  return (
    <>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.55)] backdrop-blur sm:rounded-[2rem] sm:p-6">
        <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative rounded-[1.4rem] border border-slate-700/30 bg-gradient-to-br from-[#111a2d] via-[#1f2b42] to-[#243a56] p-4 text-white shadow-[0_24px_70px_-45px_rgba(15,23,42,1)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300 sm:text-sm">{title}</p>
              <h2 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">{subtitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{description}</p>
            </div>
            <div className="inline-flex max-w-full items-center rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-200 backdrop-blur sm:px-4 sm:text-sm">
              <span className="truncate">Ctrl + K{enableVoice ? ' • Voice Search' : ''}{enableDeepSearch ? ' • Deep Search' : ''}</span>
            </div>
          </div>
        </div>

        {/* ================= SEARCH BAR ================= */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative mt-4 sm:mt-5"
        >
          <motion.div
            whileFocusWithin={{
              scale: 1.005,
              boxShadow: "0 14px 35px rgba(56,189,248,0.2)",
            }}
            className="flex min-h-[52px] items-center rounded-2xl border border-slate-300/90 bg-white px-2 shadow-sm transition sm:min-h-[56px]"
          >
            <MagnifyingGlassIcon className="ml-2 h-5 w-5 flex-shrink-0 text-slate-400 sm:ml-3 sm:h-6 sm:w-6" />

            <input
              ref={inputRef}
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:px-4 sm:py-4 sm:text-base"
            />

            <div className="flex items-center gap-1 pr-1 sm:pr-2">
              {/* Clear Button */}
              <AnimatePresence>
                {localValue && (
                  <motion.button
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    onClick={() => setLocalValue("")}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Voice Search Button */}
              {enableVoice ? (
                <button
                  onClick={startVoiceSearch}
                  title="Voice Search"
                  className={`rounded-full p-2 transition-colors ${
                    listening ? "bg-rose-100 text-rose-600 animate-pulse" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <MicrophoneIcon className="h-5 w-5" />
                </button>
              ) : null}

              {/* Deep Search Button */}
              {enableDeepSearch ? (
                <button
                  onClick={openDeepSearch}
                  title="Deep Search inside Books (Ctrl+Shift+F)"
                  className="rounded-full border border-transparent p-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  {isFetchingBook ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                  ) : (
                    <DocumentTextIcon className="h-5 w-5" />
                  )}
                </button>
              ) : null}
            </div>
          </motion.div>

          {/* ================= MOBILE QUICK TABS ================= */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
            <button
              type="button"
              onClick={focusSearchInput}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                mobileMode === "search"
                  ? "border-sky-300 bg-sky-50 text-sky-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Search
            </button>

            <button
              type="button"
              onClick={enableVoice ? startVoiceSearch : undefined}
              disabled={!enableVoice}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                mobileMode === "voice"
                  ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600"
              } ${!enableVoice ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <MicrophoneIcon className="h-4 w-4" />
              Voice
            </button>

            <button
              type="button"
              onClick={enableDeepSearch ? openDeepSearch : undefined}
              disabled={!enableDeepSearch}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                mobileMode === "deep"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600"
              } ${!enableDeepSearch ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <DocumentTextIcon className="h-4 w-4" />
              Deep
            </button>
          </div>

          {/* ================= SUGGESTIONS ================= */}
          <AnimatePresence>
            {enableSuggestions && showSuggestions && localValue && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              >
                {suggestions.slice(0, 5).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setLocalValue(item);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50"
                  >
                    {item}
                  </button>
                ))}

                <div className="border-t border-slate-100 bg-slate-50 p-2">
                  <button
                    onClick={() => setIsDeepSearchOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    Search "{localValue}" inside book texts...
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= SKELETON ================= */}
          {loading && (
            <div className="absolute mt-2 w-full space-y-3 rounded-xl border bg-white p-4 shadow">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded bg-gray-200"
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* ================= HINT ================= */}
        {showHint ? (
          <div className="mt-3 hidden flex-col gap-2 px-1 text-xs text-slate-500 sm:flex sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <p className="truncate">⌘/Ctrl + K • Voice Search • Live Results</p>
            <p className="inline-flex w-fit rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-medium text-indigo-600">
              New: Deep Search (Ctrl+Shift+F)
            </p>
          </div>
        ) : null}
      </section>

      {/* ✅ DEEP SEARCH MODAL RENDER */}
      <GlobalSearchModal 
        isOpen={isDeepSearchOpen}
        onClose={() => setIsDeepSearchOpen(false)}
        onResultClick={handleDeepResultClick}
      />

      {/* ✅ HIDDEN BOOK MODAL (Auto-opens SmartReader when deepSearchBook is set) */}
      {deepSearchBook && (
        <BookDetailsModal
          book={deepSearchBook}
          onClose={() => setDeepSearchBook(null)}
          startView="details"
          autoOpenReader={true} // Seedha reader me khulega
          initialPage={deepSearchConfig.page}
          initialSearchQuery={deepSearchConfig.query}
        />
      )}
    </>
  );
};

export default LibrarySearchStrip;