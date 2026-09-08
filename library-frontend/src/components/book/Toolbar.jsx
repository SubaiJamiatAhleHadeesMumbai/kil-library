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
  textFontSize = 1.15,
}) => {
  const textScrollRef = useRef(null);
  const pdfScrollRef = useRef(null);
  const pageRefs = useRef({});
  const activeMarkRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);
  const isProgrammaticTextScrollRef = useRef(false);
  const scrolledTextPageRef = useRef(null);
  const isUserScrollingTextRef = useRef(false);
  const userTextScrollTimerRef = useRef(null);
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

  // Synchronized Scrolling: scroll text pane to active page when changed by PDF scroll or controls
  useEffect(() => {
    if (
      (layoutMode === 'text' || layoutMode === 'split') &&
      viewMode === 'scroll' &&
      currentPage &&
      pageRefs.current[currentPage]
    ) {
      // If user is actively scrolling the text pane, do not snap back!
      if (isUserScrollingTextRef.current) return;
      if (scrolledTextPageRef.current === currentPage) {
        scrolledTextPageRef.current = null;
        return;
      }
      scrolledTextPageRef.current = null;

      isProgrammaticTextScrollRef.current = true;
      pageRefs.current[currentPage].scrollIntoView({ behavior: 'smooth', block: 'start' });

      const timer = window.setTimeout(() => {
        isProgrammaticTextScrollRef.current = false;
      }, 500);

      return () => window.clearTimeout(timer);
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

  // Handle Back to Top button visibility and user scroll tracking
  const handleTextScroll = (e) => {
    if (e.target.scrollTop > 400) {
      setShowBackToTop(true);
    } else {
      setShowBackToTop(false);
    }

    if (isProgrammaticTextScrollRef.current) return;
    isUserScrollingTextRef.current = true;
    if (userTextScrollTimerRef.current) clearTimeout(userTextScrollTimerRef.current);
    userTextScrollTimerRef.current = setTimeout(() => {
      isUserScrollingTextRef.current = false;
    }, 300);
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
    <div className="flex h-full w-full flex-1 flex-col min-h-0 overflow-hidden bg-[#FAF8F5] font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Subtle Top Reading Progress Line */}
      <div className="h-0.5 w-full bg-slate-200 shrink-0 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
          style={{ width: `${readingProgressPercentage}%` }}
        />
      </div>

      {/* --- VIEWER CONTENT AREA (100% FULL SCROLLABLE) --- */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden bg-[#FAF8F5] relative h-full w-full">
        
        {/* --- PDF VIEWER PANE (FULL HEIGHT SCROLL) --- */}
        {(layoutMode === 'pdf' || layoutMode === 'split') && (
          <div
            ref={pdfScrollRef}
            className={`relative flex min-h-0 flex-1 flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-[#FAF8F5] transition-all duration-300 ${
              layoutMode === 'split' ? 'h-1/2 md:h-full md:w-1/2' : 'h-full w-full'
            }`}
          >
            {pdfComponent}

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
              className="flex-1 min-h-0 overflow-y-auto px-2 py-3 sm:px-6 sm:py-6 leading-[2.2] sm:leading-[2.5] text-right md:px-10 pb-24 sm:pb-28 custom-scrollbar"
              dir="rtl"
              style={{
                fontFamily: "'Jameel Noori Nastaleeq', 'JameelNoori', 'Gulzar', 'Noto Nastaliq Urdu', serif",
                fontSize: `${textFontSize}rem`,
              }}
            >
              <div
                className={`mx-auto space-y-4 sm:space-y-6 rounded-2xl border border-[#E0D1B8] bg-[#FAF6EE] p-4 sm:p-8 text-[#2C2416] shadow-[inset_0_0_40px_rgba(180,140,75,0.04),0_10px_30px_rgba(0,0,0,0.04)] transition-all ${
                  layoutMode === 'text' ? 'max-w-4xl shadow-md' : 'max-w-3xl'
                }`}
              >
                {(layoutMode === 'text' || layoutMode === 'split') && viewMode === 'scroll' && pageEntries.length > 0 ? (
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
                            if (inView && !isProgrammaticTextScrollRef.current) {
                              scrolledTextPageRef.current = pageNum;
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