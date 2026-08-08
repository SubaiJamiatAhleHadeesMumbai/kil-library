import React, { useEffect, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, FileText, Search, X } from 'lucide-react';
import { InView } from 'react-intersection-observer';

const SplitViewer = ({
  pdfComponent,
  textContent,
  allPagesContent = {},
  isLoading,
  layoutMode,
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
  const pageRefs = useRef({});
  const activeMatch = globalMatches[currentMatchIndex];
  const activeLocalIndex = activeMatch && activeMatch.page === currentPage ? activeMatch.localIndex : -1;
  const hasSearch = Boolean(searchText.trim());
  const hasMatches = searchCount > 0;

  const pageEntries = useMemo(() => Object.entries(allPagesContent || {}).sort((a, b) => Number(a[0]) - Number(b[0])), [allPagesContent]);

  const highlightText = (text) => {
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
          className={`rounded-[4px] px-0.5 font-semibold transition-all duration-200 ${
            isActive
              ? 'bg-emerald-600 px-1 text-white shadow-[0_4px_10px_rgba(16,185,129,0.24)] ring-2 ring-emerald-200'
              : 'bg-emerald-200 text-emerald-950 shadow-[inset_0_-1px_0_rgba(16,185,129,0.08)] hover:bg-emerald-300'
          }`}
        >
          {part}
        </mark>
      );
    });
  };

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
      onClearSearch?.();
    }
  };

  useEffect(() => {
    if (layoutMode === 'text' && viewMode === 'scroll' && currentPage && pageRefs.current[currentPage]) {
      pageRefs.current[currentPage].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, layoutMode, viewMode]);

  return (
    <div className="flex h-full w-full flex-1 min-h-0 overflow-hidden bg-[#F1F5F9]">
      <div className="absolute left-1/2 top-3 z-30 flex w-[min(94vw,820px)] -translate-x-1/2 items-center gap-2 rounded-[1.5rem] border border-emerald-100 bg-white/96 px-3 py-2 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.48)] backdrop-blur-2xl sm:px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 shadow-inner shadow-white/70">
          <Search size={16} />
        </div>

        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search within the book..."
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-[15px]"
        />

        {hasSearch ? (
          <button
            type="button"
            onClick={onClearSearch}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Clear search"
          >
            <X size={16} />
          </button>
        ) : null}

        <div className="hidden items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
          <span className="text-emerald-500">{hasMatches ? `${activeSearchIndex + 1}` : '0'}</span>
          <span>/</span>
          <span>{searchCount}</span>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={onSearchPrev}
            disabled={!hasMatches}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            title="Previous match"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={onSearchNext}
            disabled={!hasMatches}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            title="Next match"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="ml-1 hidden rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-400 lg:inline-flex">
          Press <span className="mx-1 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-bold text-slate-500">Enter</span> to jump
        </div>
      </div>

      {(layoutMode === 'pdf' || layoutMode === 'split') && (
        <div className={`relative flex min-h-0 flex-col border-r border-slate-200 bg-slate-100 transition-all duration-500 ease-in-out ${
          layoutMode === 'split' ? 'w-1/2' : 'w-full'
        }`}>
          <div className="flex flex-1 min-h-0 justify-center overflow-auto px-4 pb-4 pt-24 custom-scrollbar">
            {pdfComponent}
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="relative flex items-center justify-center">
                <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                <FileText className="absolute text-indigo-600" size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-800">Optimizing Document</h3>
              <p className="text-sm text-slate-500 animate-pulse">Rendering high-quality pages...</p>
            </div>
          )}
        </div>
      )}

      {(layoutMode === 'text' || layoutMode === 'split') && (
        <div className={`relative flex min-h-0 flex-col bg-[#FCFBF7] transition-all duration-500 ${
          layoutMode === 'split' ? 'w-1/2' : 'w-full'
        }`}>
          <div
            ref={textScrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-6 pb-8 pt-24 leading-[2.2] text-right md:px-10 md:pt-24"
            dir="rtl"
            style={{
              fontFamily: "'Amiri', 'Noto Nastaliq Urdu', serif",
              fontSize: '1.25rem',
            }}
          >
            <div className="mx-auto max-w-3xl space-y-6 rounded-[1.75rem] border border-emerald-100 bg-white/70 px-5 py-5 pt-16 text-slate-800 shadow-[0_20px_60px_-48px_rgba(16,185,129,0.65)] backdrop-blur-sm md:px-6">
              {layoutMode === 'text' && viewMode === 'scroll' && pageEntries.length > 0 ? (
                <div className="flex flex-col gap-12 pb-6">
                  {pageEntries.map(([pageKey, pageValue]) => {
                    const pageNum = Number(pageKey);
                    const pageText = String(pageValue || '').trim();

                    return (
                      <InView
                        key={pageNum}
                        threshold={0.35}
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
                          className={`relative rounded-2xl border-b pb-10 pt-8 min-h-[320px] transition-all ${currentPage === pageNum ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-inset ring-emerald-200' : 'border-gray-100'}`}
                        >
                          <div className={`absolute top-0 left-0 select-none rounded px-2 py-1 text-xs font-bold ${currentPage === pageNum ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-300'}`}>
                            Page {pageNum}
                          </div>
                          <div className="mt-8 space-y-4">
                            {pageText ? pageText.split('\n').map((para, i) => (
                              <p key={`${pageNum}-${i}`} className="rounded-xl px-4 py-2 transition-colors hover:bg-emerald-50/70">
                                {highlightText(para)}
                              </p>
                            )) : (
                              <div className="flex h-20 items-center justify-center text-sm text-gray-300 animate-pulse">
                                Loading text...
                              </div>
                            )}
                          </div>
                        </div>
                      </InView>
                    );
                  })}
                </div>
              ) : textContent ? (
                textContent.split('\n').map((para, i) => (
                  <p key={i} className="rounded-xl px-4 py-2 transition-colors hover:bg-emerald-50/70">
                    {highlightText(para)}
                  </p>
                ))
              ) : null}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          border: 2px solid #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        p {
          word-spacing: 2px;
          text-align: justify;
          text-justify: inter-word;
        }
      `}</style>
    </div>
  );
};

export default SplitViewer;