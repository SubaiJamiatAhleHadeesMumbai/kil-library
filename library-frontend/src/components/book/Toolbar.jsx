import StandardFormattedText from "../common/StandardFormattedText";
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  X,
  BookOpen,
  ArrowUp,
} from 'lucide-react';
import { InView } from 'react-intersection-observer';

const SplitViewer = ({
  pdfComponent,
  textContent,
  allPagesContent = {},
  isLoading,
  layoutMode = 'split',
  viewMode = 'scroll',
  searchText = '',
  onSearchChange,
  searchCount = 0,
  activeSearchIndex = -1,
  onSearchPrev,
  onSearchNext,
  onClearSearch,
  onPageChange,
  globalMatches = [],
  currentMatchIndex = -1,
  currentPage = 1,
}) => {
  const textScrollRef = useRef(null);
  const pdfScrollRef = useRef(null);
  const pageRefs = useRef({});
  const activeMarkRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const activeMatch = globalMatches[currentMatchIndex];
  const activeLocalIndex =
    activeMatch && activeMatch.page === currentPage ? activeMatch.localIndex : -1;
  const hasSearch = Boolean(searchText.trim());
  const hasMatches = searchCount > 0;

  // Sorted Page entries
  const pageEntries = useMemo(
    () => Object.entries(allPagesContent || {}).sort((a, b) => Number(a[0]) - Number(b[0])),
    [allPagesContent]
  );

  const totalPagesCount = pageEntries.length || 1;
  const readingProgressPercentage = Math.min(100, Math.max(0, Math.round((currentPage / totalPagesCount) * 100)));

  // Auto-scroll active search match into view inside text panel
  useEffect(() => {
    if (activeMarkRef.current) {
      activeMarkRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentMatchIndex, activeSearchIndex]);

  // Scroll to active page when changed programmatically
  useEffect(() => {
    if (layoutMode === 'text' && viewMode === 'scroll' && currentPage && pageRefs.current[currentPage]) {
      pageRefs.current[currentPage].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, layoutMode, viewMode]);

  // Auto-focus mobile search input when opened
  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchInputRef.current) {
      // Small delay so the open animation doesn't jank on focus
      const t = window.setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 150);
      return () => window.clearTimeout(t);
    }
  }, [isMobileSearchOpen]);

  // Close mobile search on outside click
  useEffect(() => {
    if (!isMobileSearchOpen) return;

    const handleClickOutside = (e) => {
      if (
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(e.target)
      ) {
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileSearchOpen]);

  // Handle Back to Top button visibility on scroll
  const handleTextScroll = (e) => {
    if (e.target.scrollTop > 400) {
      setShowBackToTop(true);
    } else {
      setShowBackToTop(false);
    }
  };

  const scrollToTop = () => {
    if (textScrollRef.current) {
      textScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Search input keyboard shortcuts
  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        onSearchPrev?.();
        return;
      }
      onSearchNext?.();
    }

    if (event.key === 'Escape') {
      if (isMobileSearchOpen) {
        setIsMobileSearchOpen(false);
      } else {
        onClearSearch?.();
      }
    }
  };

  const handleMobileSearchToggle = () => {
    setIsMobileSearchOpen((prev) => !prev);
  };

  const handleMobileClear = () => {
    onClearSearch?.();
    setIsMobileSearchOpen(false);
  };

  // Text highlighter logic (optimized for Urdu & Arabic)
  const highlightText = useCallback(
    (text) => {
      if (!text || !searchText) return text;

      const safeSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeSearchText})`, 'gi');
      const parts = String(text).split(regex);
      let matchIndex = 0;

      return parts.map((part, index) => {
        if (part.toLowerCase() !== searchText.toLowerCase()) return part;

        const isActive = activeLocalIndex === matchIndex;
        matchIndex += 1;

        return (
          <mark
            key={index}
            ref={isActive ? activeMarkRef : null}
            className={`rounded-[5px] px-1 font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] ring-2 ring-emerald-300 scale-105 inline-block'
                : 'bg-emerald-200/90 text-emerald-950 hover:bg-emerald-300'
            }`}
          >
            {part}
          </mark>
        );
      });
    },
    [searchText, activeLocalIndex]
  );

  return (
    <div className="flex h-full w-full flex-1 flex-col min-h-0 overflow-hidden bg-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* --- DOCKED TOP TOOLBAR --- */}
      <header className="z-30 flex shrink-0 items-center justify-between gap-1.5 border-b border-slate-200 bg-white px-2.5 py-1.5 shadow-sm sm:px-3 sm:py-2 relative">
        {/* Reading Progress Line */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${readingProgressPercentage}%` }}
        />

        {/* --- DESKTOP / TABLET: full inline search bar (sm and up) --- */}
        <div className="hidden sm:flex flex-1 items-center gap-2 min-w-[180px]">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:h-8 sm:w-8">
            <Search size={14} />
          </div>

          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search in book..."
            className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
          />

          {hasSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* --- MOBILE: just a title placeholder so header isn't empty on the left --- */}
        <div className="flex sm:hidden flex-1 items-center min-w-0">
          <span className="truncate text-xs font-bold text-slate-500">
            Page {currentPage} / {totalPagesCount}
          </span>
        </div>

        {/* Search Match Counter & Prev/Next Controls (desktop only, inline) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-100">
            <span className="text-emerald-600">{hasMatches ? activeSearchIndex + 1 : 0}</span>
            <span className="text-emerald-300">/</span>
            <span>{searchCount}</span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
            <button
              type="button"
              onClick={onSearchPrev}
              disabled={!hasMatches}
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none"
              title="Previous match"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={onSearchNext}
              disabled={!hasMatches}
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none"
              title="Next match"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="hidden items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 md:inline-flex">
            <span>Enter</span>
            <span className="text-[10px] text-slate-400">to jump</span>
          </div>
        </div>

        {/* --- MOBILE: search trigger icon (only visible below sm) --- */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0" ref={mobileSearchContainerRef}>
          {hasMatches && (
            <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
              <span className="text-emerald-600">{activeSearchIndex + 1}</span>
              <span className="text-emerald-300">/</span>
              <span>{searchCount}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleMobileSearchToggle}
            aria-expanded={isMobileSearchOpen}
            aria-label="Toggle search"
            className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
              isMobileSearchOpen
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <Search size={15} />
            {hasSearch && !isMobileSearchOpen && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </button>

          {/* --- MOBILE: expanding search overlay panel --- */}
          <div
            className={`absolute left-0 right-0 top-full z-40 origin-top border-b border-slate-200 bg-white shadow-lg transition-all duration-200 ease-out ${
              isMobileSearchOpen
                ? 'pointer-events-auto max-h-24 opacity-100'
                : 'pointer-events-none max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Search size={15} className="shrink-0 text-emerald-600" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchText}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search in book..."
                className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
              {hasSearch && (
                <button
                  type="button"
                  onClick={handleMobileClear}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Prev/Next controls inside mobile panel */}
            {hasSearch && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-100">
                  <span className="text-emerald-600">{hasMatches ? activeSearchIndex + 1 : 0}</span>
                  <span className="text-emerald-300">/</span>
                  <span>{searchCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onSearchPrev}
                    disabled={!hasMatches}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm transition active:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Previous match"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={onSearchNext}
                    disabled={!hasMatches}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm transition active:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Next match"
                  >
                    <ChevronDown size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- VIEWER CONTENT AREA (100% FULL SCROLLABLE) --- */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden bg-[#FAF8F5] relative">
        
        {/* --- PDF VIEWER PANE (FULL HEIGHT SCROLL) --- */}
        {(layoutMode === 'pdf' || layoutMode === 'split') && (
          <div
            ref={pdfScrollRef}
            className={`relative flex min-h-0 flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-slate-100 transition-all duration-300 ${
              layoutMode === 'split' ? 'h-1/2 md:h-full md:w-1/2' : 'h-full w-full'
            }`}
          >
            {/* Added Padding to Prevent Floating Controls from covering text */}
            <div className="flex flex-1 min-h-0 justify-center overflow-auto p-4 sm:p-6 pb-20 sm:pb-24 custom-scrollbar">
              {pdfComponent}
            </div>

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                <div className="relative flex items-center justify-center">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600 sm:h-20 sm:w-20" />
                  <FileText className="absolute text-emerald-600" size={22} />
                </div>
                <h3 className="mt-4 text-base sm:text-lg font-bold text-slate-800">Optimizing Document</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 animate-pulse">
                  Rendering pages...
                </p>
              </div>
            )}
          </div>
        )}

        {/* --- TEXT READER PANE (FULL HEIGHT SCROLL) --- */}
        {(layoutMode === 'text' || layoutMode === 'split') && (
          <div
            className={`relative flex min-h-0 flex-col bg-[#F3ECE0] transition-all duration-300 ${
              layoutMode === 'split' ? 'h-1/2 md:h-full md:w-1/2' : 'h-full w-full'
            }`}
          >
            <div
              ref={textScrollRef}
              onScroll={handleTextScroll}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 leading-[2.5] text-right md:px-12 custom-scrollbar"
              dir="rtl"
              style={{
                fontFamily: "'Amiri', 'Noto Nastaliq Urdu', serif",
                fontSize: '1.25rem',
              }}
            >
              <div
                className={`mx-auto space-y-6 rounded-2xl border border-[#E0D1B8] bg-[#FAF6EE] p-4 sm:p-8 text-[#2C2416] shadow-[inset_0_0_40px_rgba(180,140,75,0.04),0_10px_30px_rgba(0,0,0,0.04)] transition-all ${
                  layoutMode === 'text' ? 'max-w-4xl shadow-md' : 'max-w-3xl'
                }`}
              >
                {layoutMode === 'text' && viewMode === 'scroll' && pageEntries.length > 0 ? (
                  <div className="flex flex-col gap-10">
                    {pageEntries.map(([pageKey, pageValue]) => {
                      const pageNum = Number(pageKey);
                      const pageText = String(pageValue || '').trim();
                      const isActivePage = currentPage === pageNum;

                      return (
                        <InView
                          key={pageNum}
                          threshold={0.3}
                          onChange={(inView) => {
                            if (inView) {
                              onPageChange?.(pageNum);
                            }
                          }}
                        >
                          <div
                            ref={(el) => {
                              if (el) pageRefs.current[pageNum] = el;
                            }}
                            id={`text-page-${pageNum}`}
                            className={`relative rounded-xl border-b pb-8 pt-4 transition-all duration-200 ${
                              isActivePage
                                ? 'border-emerald-300 bg-emerald-50/30 px-3 sm:px-5 shadow-xs'
                                : 'border-slate-100'
                            }`}
                          >
                            {/* Page Badge Ribbon */}
                            <div
                              className={`sticky top-0 z-10 -mr-2 mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-sm ${
                                isActivePage
                                  ? 'bg-[#002147] text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <BookOpen size={13} />
                              <span>Page {pageNum}</span>
                            </div>

                            {/* Paragraph Content */}
                            <div className="text-justify leading-relaxed">
                              {pageText ? (
                                <StandardFormattedText
                                  text={pageText}
                                  highlightQuery={searchText}
                                />
                              ) : (
                                <div className="flex h-20 items-center justify-center text-xs font-semibold text-slate-400 animate-pulse">
                                  Loading page {pageNum}...
                                </div>
                              )}
                            </div>
                          </div>
                        </InView>
                      );
                    })}
                  </div>
                ) : textContent ? (
                  <div className="text-justify leading-relaxed">
                    <StandardFormattedText
                      text={textContent}
                      highlightQuery={searchText}
                    />
                  </div>
                ) : (
                  <div className="flex h-44 items-center justify-center text-xs font-bold text-slate-400">
                    No text content available.
                  </div>
                )}
              </div>
            </div>

            {/* Back to Top Floating Button */}
            {showBackToTop && (
              <button
                onClick={scrollToTop}
                className="absolute bottom-6 left-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#002147] text-white shadow-lg transition-all hover:bg-[#12315a] hover:scale-110 focus:outline-none"
                title="Scroll to Top"
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom Scrollbars and Font Imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');

        .custom-scrollbar::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default SplitViewer;