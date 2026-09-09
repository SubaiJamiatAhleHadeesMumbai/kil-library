import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { InView } from 'react-intersection-observer';
import { 
  ZoomIn, ZoomOut, FileText, ChevronLeft, 
  ChevronRight, Maximize2, LayoutGrid, Type 
} from 'lucide-react';

// Local bundled worker matching exact pdfjs version 5.4.296 (zero SyntaxError, zero QUIC error)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.classic.js';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import BookReaderLoader, { SinglePageSkeleton } from './BookReaderLoader';

const PdfViewer = ({ 
  pdfUrl, 
  fallbackPdfUrl = null,
  viewMode = 'scroll', 
  scale = 1.0, 
  setScale = () => {}, 
  setTotalPages = () => {}, 
  setCurrentPage = () => {}, 
  onAutoPageChange = () => {},
  suppressAutoPageTracking = false,
  onDocumentReady,
  onDocumentError,
  onLandingResolved,
  totalPages = 1,
  currentPage = 1,
  searchText = ''
}) => {
  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const pageRefs = useRef({});
  const isProgrammaticScrollRef = useRef(false);
  const scrolledPageRef = useRef(null);
  const isUserScrollingPdfRef = useRef(false);
  const userScrollTimerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState(pdfUrl);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const [docTotalPages, setDocTotalPages] = useState(() => totalPages || 1);

  // Sync active URL when pdfUrl prop changes
  useEffect(() => {
    setActivePdfUrl(pdfUrl);
    setFallbackAttempted(false);
    setLoadError(null);
  }, [pdfUrl]);

  // Synchronize internal docTotalPages with prop
  useEffect(() => {
    if (totalPages && totalPages > 1) {
      setDocTotalPages(totalPages);
    }
  }, [totalPages]);

  const effectiveTotalPages = Math.max(docTotalPages, totalPages || 1);

  // Keyboard vertical scrolling support (ArrowUp, ArrowDown, PageUp, PageDown, Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowDown') {
        scrollAreaRef.current?.scrollBy({ top: 140, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        scrollAreaRef.current?.scrollBy({ top: -140, behavior: 'smooth' });
      } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        scrollAreaRef.current?.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        scrollAreaRef.current?.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stable memoized file source so <Document> does NOT reload on every re-render (e.g. on scroll/page change)
  const fileSource = useMemo(() => {
    if (!activePdfUrl) return null;
    const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
    if (typeof activePdfUrl === 'string') {
      return {
        url: activePdfUrl,
        withCredentials: false,
        httpHeaders: token ? { Authorization: `Bearer ${token}` } : {}
      };
    }
    return activePdfUrl;
  }, [activePdfUrl]);

  // Handle responsive width for mobile and desktop containers
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        const pad = window.innerWidth < 768 ? 12 : 24;
        setContainerWidth(Math.max(280, w - pad));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Automatic responsive scaling based on container width vs standard A4 PDF width (595.28 pt)
  // Ensures readable width on mobile, comfortable centered reading on desktop, and respects user zoom
  const dynamicScale = useMemo(() => {
    if (!containerWidth) return scale;
    if (window.innerWidth < 768) {
      const fit = (containerWidth / 595.28) * scale;
      return Math.max(0.45, Math.min(2.5, fit));
    }
    // Tablet / Desktop:
    const targetWidth = Math.min(containerWidth * 0.95, 920);
    const fit = (targetWidth / 595.28) * scale;
    return Math.max(0.5, Math.min(2.8, fit));
  }, [containerWidth, scale]);

  const renderHighlightedText = useCallback((textItem) => {
    if (!searchText || !textItem?.str) return textItem.str;

    const safeSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeSearchText})`, 'gi');
    const parts = String(textItem.str).split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() !== searchText.toLowerCase()) return part;

      return (
        <mark
          key={index}
          className="rounded-[2px] bg-emerald-300 px-0.5 font-semibold text-emerald-950"
        >
          {part}
        </mark>
      );
    });
  }, [searchText]);

  const handlePrev = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNext = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const handlePdfScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    isUserScrollingPdfRef.current = true;
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    userScrollTimerRef.current = setTimeout(() => {
      isUserScrollingPdfRef.current = false;
    }, 300);
  }, []);

  useEffect(() => {
    if (viewMode !== 'scroll' || !currentPage) return;

    // IF THE USER IS ACTIVELY SCROLLING THE PDF, DO NOT FORCE SCROLL / SNAP JUMP!
    if (isUserScrollingPdfRef.current) return;

    // If currentPage change was triggered by user's natural scrolling, DO NOT snap/jump!
    if (scrolledPageRef.current === currentPage) {
      scrolledPageRef.current = null;
      return;
    }
    scrolledPageRef.current = null;

    let rafId = null;
    let releaseTimer = null;

    const jumpToPage = () => {
      const targetPage = pageRefs.current[currentPage];

      if (!targetPage) {
        rafId = window.requestAnimationFrame(jumpToPage);
        return;
      }

      isProgrammaticScrollRef.current = true;
      // Keep target page slightly below the top controls for better context visibility.
      const landingOffset = 24;
      const scrollBehavior = suppressAutoPageTracking ? 'auto' : 'smooth';
      if (scrollAreaRef.current) {
        const nextTop = Math.max(0, targetPage.offsetTop - landingOffset);
        scrollAreaRef.current.scrollTo({ top: nextTop, behavior: scrollBehavior });
      } else {
        targetPage.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      }

      releaseTimer = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 450);
    };

    rafId = window.requestAnimationFrame(jumpToPage);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (releaseTimer) window.clearTimeout(releaseTimer);
      isProgrammaticScrollRef.current = false;
    };
  }, [currentPage, viewMode, totalPages, pdfUrl]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 min-h-0 w-full bg-[#FAF8F5] relative flex flex-col items-stretch overflow-hidden h-full"
    >
      {/* --- ULTRA-COMPACT SLEEK FLOATING CONTROLS (DOCKED AT BOTTOM) --- */}
      {pdfUrl && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-slate-900/90 text-white backdrop-blur-xl shadow-xl border border-slate-700/60 rounded-full px-2.5 py-1 text-xs transition-all hover:scale-102">
          {/* Prev page button */}
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1 hover:bg-white/20 rounded-full disabled:opacity-25 transition cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Ultra-compact Zoom controls */}
          <div className="flex items-center gap-0.5 border-x border-slate-700 px-1.5 mx-0.5">
            <button
              onClick={() => setScale(s => Math.max(0.4, s - 0.1))}
              className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full text-slate-300 font-mono text-xs font-bold leading-none transition cursor-pointer"
              title="Zoom Out (−)"
            >
              −
            </button>
            <span className="text-[10px] font-bold min-w-[32px] text-center font-mono text-slate-200 tracking-tight">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(2.5, s + 0.1))}
              className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded-full text-slate-300 font-mono text-xs font-bold leading-none transition cursor-pointer"
              title="Zoom In (+)"
            >
              +
            </button>
          </div>

          {/* Page indicator */}
          <div className="flex items-center gap-1 text-[10px] font-semibold px-1 font-mono">
            <span className="bg-sky-500/25 text-sky-300 px-1.5 py-0.2 rounded font-bold">{currentPage}</span>
            <span className="opacity-35">/</span>
            <span className="text-slate-300">{totalPages}</span>
          </div>

          {/* Next page button */}
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-1 hover:bg-white/20 rounded-full disabled:opacity-25 transition cursor-pointer"
            title="Next Page"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* --- SIDE NAVIGATION (For Single/Dual Mode on Desktop Only) --- */}
      {(viewMode === 'single' || viewMode === 'dual') && pdfUrl && (
        <>
          <button 
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white shadow-xl rounded-full text-slate-700 disabled:opacity-30 hover:bg-indigo-50 transition-all border border-slate-100 group"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button 
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white shadow-xl rounded-full text-slate-700 disabled:opacity-30 hover:bg-indigo-50 transition-all border border-slate-100 group"
          >
            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* --- MAIN VIEWER AREA --- */}
      <div 
        ref={scrollAreaRef} 
        onScroll={handlePdfScroll}
        className="flex-1 min-h-0 w-full overflow-y-auto px-1 sm:px-3 pt-2 pb-28 sm:pb-32 custom-scrollbar overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {!pdfUrl ? (
          <div className="flex flex-col items-center justify-center text-slate-400 h-full animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-slate-50">
              <FileText size={40} className="text-slate-300"/>
            </div>
            <h3 className="text-lg font-semibold text-slate-600">No Document Selected</h3>
            <p className="text-sm">Upload a PDF to start viewing</p>
          </div>
        ) : loadError ? (
          // Error UI with Retry Action
          <div className="flex flex-col items-center justify-center text-red-400 h-full py-16 animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-red-500/5">
              <FileText size={40} className="text-red-400"/>
            </div>
            <h3 className="text-lg font-bold text-red-400">Unable to load PDF</h3>
            <p className="text-xs text-slate-400 max-w-sm text-center px-4 mt-1 leading-relaxed">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                if (fallbackPdfUrl && activePdfUrl !== fallbackPdfUrl) {
                  setFallbackAttempted(true);
                  setActivePdfUrl(fallbackPdfUrl);
                } else {
                  setActivePdfUrl(pdfUrl);
                }
              }}
              className="mt-5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md cursor-pointer"
            >
              Retry Loading PDF
            </button>
          </div>
        ) : (
          <Document 
            file={fileSource} 
            className={`flex ${viewMode === 'grid' ? 'flex-wrap justify-center gap-8' : 'flex-col gap-10 items-center'} w-full`}
            onLoadSuccess={({numPages}) => {
              setDocTotalPages(numPages);
              setTotalPages(numPages);
              setLoadError(null);
              onDocumentReady?.(numPages);
            }}
            onLoadError={(err) => {
              console.error('PDF load error:', err);
              // If primary stream failed, try fallback direct URL seamlessly once
              if (!fallbackAttempted && fallbackPdfUrl && fallbackPdfUrl !== activePdfUrl) {
                console.warn('Primary stream PDF failed. Automatically falling back to direct URL:', fallbackPdfUrl);
                setFallbackAttempted(true);
                setActivePdfUrl(fallbackPdfUrl);
                return;
              }
              const errMsg = err?.message || '';
              if (errMsg.includes('InvalidPDFException') || errMsg.includes('Invalid PDF structure')) {
                setLoadError('Access to this document is restricted or your session has expired. Please check your permissions or re-login.');
              } else {
                setLoadError(errMsg || 'Unknown error while loading PDF.');
              }
              onDocumentError?.(err);
            }}
            loading={<BookReaderLoader />}
          >
            
            {/* 1. SCROLL VIEW (VERTICAL UPPER SE NICHE SCROLL) */}
            {viewMode === 'scroll' && Array.from(new Array(effectiveTotalPages), (_, index) => (
              <InView
                key={index}
                threshold={0.3}
                onChange={(inView) => {
                  if (inView && suppressAutoPageTracking && currentPage === index + 1) {
                    onLandingResolved?.(index + 1);
                  }

                  if (inView && !isProgrammaticScrollRef.current && !suppressAutoPageTracking) {
                    scrolledPageRef.current = index + 1;
                    onAutoPageChange(index + 1);
                  }
                }}
              >
                <div
                  ref={(el) => {
                    if (el) pageRefs.current[index + 1] = el;
                  }}
                  className="relative group"
                >
                  <div className="absolute -left-12 top-0 text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity vertical-text">
                    PAGE {index + 1}
                  </div>
                  <div className={`shadow-[0_8px_30px_rgb(0,0,0,0.08)] border rounded-sm overflow-hidden bg-white transition-transform duration-500 ${currentPage === index + 1 ? 'border-indigo-500 ring-4 ring-indigo-200 shadow-[0_12px_40px_rgba(79,70,229,0.18)]' : 'border-slate-200'}`}>
                    <Page 
                      pageNumber={index + 1} 
                      scale={dynamicScale} 
                      renderTextLayer={true} 
                      renderAnnotationLayer={true} 
                      customTextRenderer={renderHighlightedText}
                      loading={<SinglePageSkeleton scale={dynamicScale} pageNumber={index + 1} />}
                    />
                  </div>
                </div>
              </InView>
            ))}

            {/* 2. SINGLE PAGE VIEW */}
            {viewMode === 'single' && (
              <div className={`shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white rounded-sm animate-in zoom-in-95 duration-300 ${currentPage ? 'ring-4 ring-indigo-200 border border-indigo-500' : 'border border-slate-200'}`}>
                <Page 
                  pageNumber={currentPage} 
                  scale={dynamicScale * 1.1} 
                  renderTextLayer={true} 
                  renderAnnotationLayer={true} 
                  customTextRenderer={renderHighlightedText}
                  loading={<SinglePageSkeleton scale={dynamicScale * 1.1} pageNumber={currentPage} />}
                />
              </div>
            )}

            {/* 3. DUAL PAGE VIEW (BOOK) */}
            {viewMode === 'dual' && (
              <div className="flex gap-0 shadow-2xl rounded-sm overflow-hidden border border-slate-300 animate-in slide-in-from-bottom-4 duration-500">
                <div className={`bg-white border-r relative ${currentPage ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
                  <Page 
                    pageNumber={currentPage} 
                    scale={dynamicScale * 0.9} 
                    renderTextLayer={true} 
                    renderAnnotationLayer={true} 
                    customTextRenderer={renderHighlightedText} 
                    loading={<SinglePageSkeleton scale={dynamicScale * 0.9} pageNumber={currentPage} />}
                  />
                  <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-black/5" /> {/* Book Spine Shadow */}
                </div>
                {currentPage + 1 <= totalPages && (
                  <div className={`bg-white relative ${currentPage + 1 === currentPage ? 'ring-2 ring-indigo-100' : ''}`}>
                    <Page 
                      pageNumber={currentPage + 1} 
                      scale={dynamicScale * 0.9} 
                      renderTextLayer={true} 
                      renderAnnotationLayer={true} 
                      customTextRenderer={renderHighlightedText} 
                      loading={<SinglePageSkeleton scale={dynamicScale * 0.9} pageNumber={currentPage + 1} />}
                    />
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-l from-transparent to-black/5" />
                  </div>
                )}
              </div>
            )}

            {/* 4. GRID VIEW */}
            {viewMode === 'grid' && Array.from(new Array(totalPages), (_, index) => (
               <div 
                 key={index} 
                 onClick={() => {
                   setCurrentPage(index + 1);
                   // Logic to switch mode could be added here
                 }}
                 className={`group cursor-pointer transition-all relative ${currentPage === index + 1 ? 'scale-105' : 'hover:scale-105'}`}
               >
                  <div className={`absolute inset-0 rounded-xl transition-all ${currentPage === index + 1 ? 'ring-4 ring-indigo-500 ring-offset-4' : 'group-hover:ring-2 group-hover:ring-slate-300 group-hover:ring-offset-2'}`} />
                  <div className="bg-white shadow-md rounded-lg overflow-hidden border border-slate-200">
                    <Page 
                      pageNumber={index + 1} 
                      width={180} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false} 
                      loading={<div className="w-[180px] h-[240px] bg-slate-100 animate-pulse rounded" />}
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${currentPage === index + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      Page {index + 1}
                    </span>
                  </div>
               </div>
            ))}
          </Document>
        )}
      </div>

      {/* CSS for custom styling */}
      <style>{`
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
        .react-pdf__Page,
        .react-pdf__Page__canvas,
        .react-pdf__Page__textContent {
          touch-action: pan-y !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>
    </div>
  );
};

export default PdfViewer;