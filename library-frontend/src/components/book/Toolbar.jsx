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
  fontSize = 18,
  setFontSize,
  readerTheme = 'sepia',
  setReaderTheme,
}) => {
  const textScrollRef = useRef(null);
  const pdfScrollRef = useRef(null);
  const pageRefs = useRef({});
  const activeMarkRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  // Theme definitions
  const themeStyles = useMemo(() => {
    switch (readerTheme) {
      case 'dark':
        return {
          containerBg: 'bg-[#0B0F19]',
          cardBg: 'bg-[#151E2E]',
          cardBorder: 'border-[#1E293B]',
          text: 'text-[#E2E8F0]',
          ribbonActive: 'bg-emerald-600 text-white',
          ribbonInactive: 'bg-slate-800 text-slate-400',
          pageBorder: 'border-slate-800',
          floatingBg: 'bg-[#151E2E]/95 border-[#1E293B] text-slate-200 shadow-xl',
        };
      case 'light':
        return {
          containerBg: 'bg-[#F1F5F9]',
          cardBg: 'bg-[#FFFFFF]',
          cardBorder: 'border-[#E2E8F0]',
          text: 'text-[#0F172A]',
          ribbonActive: 'bg-[#002147] text-white',
          ribbonInactive: 'bg-slate-100 text-slate-500',
          pageBorder: 'border-slate-100',
          floatingBg: 'bg-white/95 border-slate-200 text-slate-700 shadow-lg',
        };
      case 'sepia':
      default:
        return {
          containerBg: 'bg-[#F3ECE0]',
          cardBg: 'bg-[#FAF6EE]',
          cardBorder: 'border-[#E0D1B8]',
          text: 'text-[#2C2416]',
          ribbonActive: 'bg-[#002147] text-white',
          ribbonInactive: 'bg-[#EADECE] text-amber-900/70',
          pageBorder: 'border-[#EADECE]/70',
          floatingBg: 'bg-[#FAF6EE]/95 border-[#E0D1B8] text-amber-950 shadow-lg',
        };
    }
  }, [readerTheme]);

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

  return (
    <div className="flex h-full w-full flex-1 flex-col min-h-0 overflow-hidden bg-slate-100 font-sans selection:bg-emerald-500 selection:text-white">

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
            <div className="flex flex-1 min-h-0 w-full h-full">
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
            className={`relative flex min-h-0 flex-col ${themeStyles.containerBg} transition-all duration-300 ${
              layoutMode === 'split' ? 'h-1/2 md:h-full md:w-1/2' : 'h-full w-full'
            }`}
          >
            <div
              ref={textScrollRef}
              onScroll={handleTextScroll}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 leading-[2.3] sm:leading-[2.6] text-right md:px-12 custom-scrollbar"
              dir="rtl"
              style={{
                fontFamily: "'Amiri', 'Noto Nastaliq Urdu', serif",
                fontSize: `${fontSize}px`,
              }}
            >
              <div
                className={`mx-auto space-y-4 sm:space-y-6 rounded-2xl border ${themeStyles.cardBorder} ${themeStyles.cardBg} p-3 sm:p-8 ${themeStyles.text} shadow-sm transition-all ${
                  layoutMode === 'text' ? 'max-w-4xl shadow-md' : 'max-w-3xl'
                }`}
              >
                {pageEntries.length > 0 ? (
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
                                ? 'border-emerald-500/40 bg-emerald-500/5 px-3 sm:px-5 shadow-xs'
                                : themeStyles.pageBorder
                            }`}
                          >
                            {/* Page Badge Ribbon */}
                            <div
                              className={`sticky top-0 z-10 -mr-2 mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold shadow-sm ${
                                isActivePage
                                  ? themeStyles.ribbonActive
                                  : themeStyles.ribbonInactive
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
                className="absolute bottom-6 left-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#002147] text-white shadow-lg transition-all hover:bg-[#12315a] hover:scale-110 focus:outline-none cursor-pointer"
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