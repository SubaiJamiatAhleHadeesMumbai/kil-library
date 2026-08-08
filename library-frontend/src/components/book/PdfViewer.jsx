import React, { useEffect, useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { InView } from 'react-intersection-observer';
import { 
  ZoomIn, ZoomOut, FileText, ChevronLeft, 
  ChevronRight, Maximize2, LayoutGrid, Type 
} from 'lucide-react';

// Always match worker version with the runtime PDF.js API bundled by react-pdf.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PdfViewer = ({ 
  pdfUrl, 
  viewMode = 'scroll', 
  scale, 
  setScale, 
  setTotalPages, 
  setCurrentPage, 
  onAutoPageChange = setCurrentPage,
  suppressAutoPageTracking = false,
  onDocumentReady,
  onDocumentError,
  onLandingResolved,
  totalPages,
  currentPage,
  searchText = ''
}) => {
  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const pageRefs = useRef({});
  const isProgrammaticScrollRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadError, setLoadError] = useState(null); // ✅ optional: surfaces real errors instead of silent infinite spinner

  // Handle responsive width for mobile
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 48); // padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Automatic scaling for mobile devices
  const dynamicScale = containerWidth < 768 ? (containerWidth / 600) * scale : scale;

  const renderHighlightedText = (textItem) => {
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
  };

  const handlePrev = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNext = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  useEffect(() => {
    if (viewMode !== 'scroll' || !currentPage) return;

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
      if (scrollAreaRef.current) {
        const nextTop = Math.max(0, targetPage.offsetTop - landingOffset);
        scrollAreaRef.current.scrollTo({ top: nextTop, behavior: 'auto' });
      } else {
        targetPage.scrollIntoView({ behavior: 'auto', block: 'start' });
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
      className="flex-1 min-h-0 bg-[#F8FAFC] relative flex flex-col items-stretch overflow-hidden h-full"
    >
      {/* --- TOP FLOATING CONTROLS --- */}
      {pdfUrl && (
        <div className="absolute top-6 z-40 flex items-center gap-2 bg-white/80 backdrop-blur-md shadow-lg border border-slate-200 rounded-2xl px-4 py-2 transition-all hover:shadow-xl">
          <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
             <button 
              onClick={() => setScale(s => Math.max(0.4, s - 0.1))} 
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ZoomOut size={18}/>
            </button>
            <span className="text-xs font-bold text-slate-700 min-w-[45px] text-center font-mono">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={() => setScale(s => Math.min(2, s + 0.1))} 
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ZoomIn size={18}/>
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="bg-slate-100 px-2 py-1 rounded text-indigo-600">{currentPage}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
        </div>
      )}

      {/* --- SIDE NAVIGATION (For Single/Dual Mode) --- */}
      {(viewMode === 'single' || viewMode === 'dual') && pdfUrl && (
        <>
          <button 
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white shadow-xl rounded-full text-slate-700 disabled:opacity-30 hover:bg-indigo-50 transition-all border border-slate-100 group"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button 
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-white shadow-xl rounded-full text-slate-700 disabled:opacity-30 hover:bg-indigo-50 transition-all border border-slate-100 group"
          >
            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* --- MAIN VIEWER AREA --- */}
      <div ref={scrollAreaRef} className="flex-1 min-h-0 w-full overflow-y-auto px-2 py-3 md:px-4 md:py-4 scroll-smooth custom-scrollbar">
        {!pdfUrl ? (
          <div className="flex flex-col items-center justify-center text-slate-400 h-full animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-slate-50">
              <FileText size={40} className="text-slate-300"/>
            </div>
            <h3 className="text-lg font-semibold text-slate-600">No Document Selected</h3>
            <p className="text-sm">Upload a PDF to start viewing</p>
          </div>
        ) : loadError ? (
          // ✅ FIX: Silent-stuck-loader ki jagah ab actual error dikhega
          <div className="flex flex-col items-center justify-center text-red-400 h-full animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-red-50/50">
              <FileText size={40} className="text-red-300"/>
            </div>
            <h3 className="text-lg font-semibold text-red-600">Failed to load PDF</h3>
            <p className="text-sm text-red-400 max-w-sm text-center px-4">{loadError}</p>
          </div>
        ) : (
          <Document 
            file={pdfUrl} 
            className={`flex ${viewMode === 'grid' ? 'flex-wrap justify-center gap-8' : 'flex-col gap-10 items-center'} w-full`}
            onLoadSuccess={({numPages}) => {
              setTotalPages(numPages);
              onDocumentReady?.(numPages);
            }}
            onLoadError={(err) => {
              // ✅ FIX: Errors ab console + UI dono mein dikhenge, silent fail nahi hoga
              console.error('PDF load error:', err);
              setLoadError(err?.message || 'Unknown error while loading PDF.');
              onDocumentError?.(err);
            }}
            loading={
              <div className="flex flex-col items-center justify-center gap-4 h-full mt-20">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Optimizing Pages...</p>
              </div>
            }
          >
            
            {/* 1. SCROLL VIEW */}
            {viewMode === 'scroll' && Array.from(new Array(totalPages), (_, index) => (
              <InView
                key={index}
                threshold={0.3}
                onChange={(inView) => {
                  if (inView && suppressAutoPageTracking && currentPage === index + 1) {
                    onLandingResolved?.(index + 1);
                  }

                  if (inView && !isProgrammaticScrollRef.current && !suppressAutoPageTracking) {
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
                />
              </div>
            )}

            {/* 3. DUAL PAGE VIEW (BOOK) */}
            {viewMode === 'dual' && (
              <div className="flex gap-0 shadow-2xl rounded-sm overflow-hidden border border-slate-300 animate-in slide-in-from-bottom-4 duration-500">
                <div className={`bg-white border-r relative ${currentPage ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
                  <Page pageNumber={currentPage} scale={dynamicScale * 0.9} renderTextLayer={true} renderAnnotationLayer={true} customTextRenderer={renderHighlightedText} />
                  <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-black/5" /> {/* Book Spine Shadow */}
                </div>
                {currentPage + 1 <= totalPages && (
                  <div className={`bg-white relative ${currentPage + 1 === currentPage ? 'ring-2 ring-indigo-100' : ''}`}>
                    <Page pageNumber={currentPage + 1} scale={dynamicScale * 0.9} renderTextLayer={true} renderAnnotationLayer={true} customTextRenderer={renderHighlightedText} />
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