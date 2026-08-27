import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookText, FileText, LayoutGrid } from 'lucide-react';
import Toolbar from './Toolbar';
import PdfViewer from './PdfViewer';

const LANDING_UNLOCK_DELAY_MS = 200;
const SEARCH_DEBOUNCE_MS = 400;

const SmartReader = ({ 
  pdfUrl, 
  txtUrl, 
  directTxtUrl,
  onClose, 
  onBackToSearch,
  initialPage = 1, 
  initialSearchText = "",
  bookTitle = "Book Reader"
}) => {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  
  // Shared States
  const [layoutMode, setLayoutMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return pdfUrl ? 'pdf' : 'text';
    }
    if (pdfUrl && txtUrl) return 'split';
    if (txtUrl && !pdfUrl) return 'text';
    return 'pdf';
  }); 

  const [viewMode, setViewMode] = useState('scroll'); 
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchText, setSearchText] = useState(initialSearchText);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  
  // Search States
  const [globalMatches, setGlobalMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isIndexing, setIsIndexing] = useState(false);
  
  // Text Data State
  const [allPagesContent, setAllPagesContent] = useState({});
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [pendingLandingPage, setPendingLandingPage] = useState(() => (initialPage > 1 ? initialPage : null));
  const [isLandingLocked, setIsLandingLocked] = useState(() => initialPage > 1 || Boolean(initialSearchText));
  const [pdfReady, setPdfReady] = useState(() => !pdfUrl);
  const [textReady, setTextReady] = useState(() => !txtUrl);

  // ---------------------------------------------------------
  // Lock body scroll while reader is mounted
  // ---------------------------------------------------------
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const shouldLock = initialPage > 1 || Boolean(initialSearchText);
    setPendingLandingPage(initialPage > 1 ? initialPage : null);
    setIsLandingLocked(shouldLock);
    setPdfReady(!pdfUrl);
    setTextReady(!txtUrl);
    setCurrentPage(initialPage);
  }, [initialPage, initialSearchText, pdfUrl, txtUrl]);

  useEffect(() => {
    if (!isLandingLocked) return;
    if (pendingLandingPage !== null) return;

    const needsPdf = Boolean(pdfUrl) && (layoutMode === 'pdf' || layoutMode === 'split');
    const needsText = Boolean(txtUrl) && (layoutMode === 'text' || layoutMode === 'split');

    const pdfSettled = !needsPdf || pdfReady;
    const textSettled = !needsText || textReady;

    if (pdfSettled && textSettled) {
      setIsLandingLocked(false);
    }
  }, [isLandingLocked, pendingLandingPage, layoutMode, pdfUrl, txtUrl, pdfReady, textReady]);

  useEffect(() => {
    setSearchText(initialSearchText || "");
  }, [initialSearchText]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      if (layoutMode === 'split') setLayoutMode(pdfUrl ? 'pdf' : 'text');
    } else {
      if (pdfUrl && txtUrl && layoutMode !== 'split' && layoutMode !== 'pdf' && layoutMode !== 'text') {
        setLayoutMode('split');
      }
    }
  }, [isMobile, layoutMode, pdfUrl, txtUrl]);

  // ---------------------------------------------------------
  // 1. FETCH & SPLIT TEXT BY DELIMITERS (with Fallback to Direct URL)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!txtUrl && !directTxtUrl) {
      setTextReady(true);
      return;
    }

    let cancelled = false;
    setTextReady(false);

    const fetchText = async () => {
      setIsLoadingText(true);
      let text = "";

      // Try primary stream URL first
      try {
        const response = await fetch(txtUrl || directTxtUrl);
        if (response.ok) {
          text = await response.text();
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        // Fallback to direct URL if stream failed
        if (directTxtUrl && directTxtUrl !== txtUrl) {
          try {
            const fallbackResp = await fetch(directTxtUrl);
            if (fallbackResp.ok) {
              text = await fallbackResp.text();
            }
          } catch (fallbackErr) {
            console.error("Text fetch fallback failed:", fallbackErr);
          }
        }
      }

      if (cancelled) return;

      if (!text || text.trim().length === 0) {
        setIsLoadingText(false);
        setTextReady(true);
        return;
      }

      // Split by Comprehensive Delimiters:
      // 1. --- or ——— (3 or more dashes / horizontal rule)
      // 2. ... or . . . or … (3 or more dots / horizontal ellipsis)
      // 3. *** or ___ (3 or more asterisks or underscores)
      // 4. ===PAGE===, PAGE_SEPARATOR, [PAGE X]
      const delimiterPattern = /(?:\r?\n|^)\s*(?:[-—_]{3,}|\*{3,}|(?:\.\s*){3,}|…+|===PAGE===|PAGE_SEPARATOR|\[PAGE\s*\d+\])\s*(?:\r?\n|$)/gi;

      let rawPages = text.split(delimiterPattern)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Fallback: Smart paragraph chunking ONLY if text file has no explicit delimiters and is 1 continuous block
      if (rawPages.length === 1 && text.length > 1500) {
        const paragraphs = text.split(/\n\s*\n/);
        const chunks = [];
        let currentChunk = "";
        for (const para of paragraphs) {
          if ((currentChunk + "\n\n" + para).length > 1400 && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
          } else {
            currentChunk = currentChunk ? currentChunk + "\n\n" + para : para;
          }
        }
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        if (chunks.length > 1) rawPages = chunks;
      }

      if (rawPages.length === 0 && text.trim().length > 0) {
        rawPages = [text.trim()];
      }

      let pages = {};
      rawPages.forEach((content, index) => {
        pages[index + 1] = content; // 1-based index
      });

      if (!cancelled) {
        setAllPagesContent(pages);
        if (!pdfUrl || totalPages <= 1) {
          setTotalPages(rawPages.length || 1);
        }
        setTextReady(true);
        setIsLoadingText(false);
      }
    };

    fetchText();

    return () => {
      cancelled = true;
    };
  }, [txtUrl, directTxtUrl, pdfUrl]);

  // ---------------------------------------------------------
  // 2. FAST GLOBAL SEARCH LOGIC (Smart Jump + safe regex)
  // ---------------------------------------------------------
  useEffect(() => {
    const trimmedSearch = searchText.trim();

    if (!trimmedSearch || Object.keys(allPagesContent).length === 0) {
      setGlobalMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    setIsIndexing(true);
    const timer = setTimeout(() => {
      const matches = [];
      const safeSearchText = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      if (!safeSearchText) {
        setGlobalMatches([]);
        setCurrentMatchIndex(-1);
        setIsIndexing(false);
        return;
      }

      const regex = new RegExp(`(${safeSearchText})`, 'gi');
      const lowerSearch = trimmedSearch.toLowerCase();

      Object.keys(allPagesContent).forEach(pageNum => {
        const text = allPagesContent[pageNum] || "";
        const parts = text.split(regex);
        let localMatchCount = 0;

        parts.forEach(part => {
          if (part.toLowerCase() === lowerSearch) {
            matches.push({
              page: parseInt(pageNum),
              localIndex: localMatchCount
            });
            localMatchCount++;
          }
        });
      });

      setGlobalMatches(matches);

      if (matches.length > 0) {
        const targetMatchIndex = matches.findIndex(m => m.page === currentPage);
        if (targetMatchIndex !== -1) {
          setCurrentMatchIndex(targetMatchIndex);
        } else {
          setCurrentMatchIndex(0);
          setCurrentPage(matches[0].page);
        }
      } else {
        setCurrentMatchIndex(-1);
      }
      setIsIndexing(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchText, allPagesContent]);

  // ---------------------------------------------------------
  // 3. HANDLERS
  // ---------------------------------------------------------
  const handleNextMatch = useCallback(() => {
    setIsLandingLocked(false);
    setGlobalMatches(matches => {
      if (matches.length === 0) return matches;
      setCurrentMatchIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % matches.length;
        setCurrentPage(matches[nextIndex].page);
        return nextIndex;
      });
      return matches;
    });
  }, []);

  const handlePrevMatch = useCallback(() => {
    setIsLandingLocked(false);
    setGlobalMatches(matches => {
      if (matches.length === 0) return matches;
      setCurrentMatchIndex(prevIndex => {
        const nextIndex = prevIndex === 0 ? matches.length - 1 : prevIndex - 1;
        setCurrentPage(matches[nextIndex].page);
        return nextIndex;
      });
      return matches;
    });
  }, []);

  const handleSearchChange = useCallback((value) => {
    setIsLandingLocked(false);
    setSearchText(value);
  }, []);

  const clearSearch = useCallback(() => {
    setIsLandingLocked(false);
    setSearchText('');
    setGlobalMatches([]);
    setCurrentMatchIndex(-1);
  }, []);

  const handlePageSubmit = useCallback((e) => {
    if (e.key === 'Enter') {
      const pageNumber = parseInt(e.target.value);
      const maxPages = Math.max(totalPages, Object.keys(allPagesContent).length || 1);
      if (pageNumber >= 1 && pageNumber <= maxPages) {
        setIsLandingLocked(false);
        setCurrentPage(pageNumber);
      }
    }
  }, [totalPages, allPagesContent]);

  const handleAutoPageChange = useCallback((pageNumber) => {
    setIsLandingLocked(locked => {
      if (locked) return locked;
      setCurrentPage(pageNumber);
      return locked;
    });
  }, []);

  const handleLandingResolved = useCallback((landedPage) => {
    setPendingLandingPage(prev => {
      if (prev === null || landedPage !== prev) return prev;
      window.setTimeout(() => {
        setIsLandingLocked(false);
      }, LANDING_UNLOCK_DELAY_MS);
      return null;
    });
  }, []);

  const displayTotalPages = Math.max(totalPages, Object.keys(allPagesContent).length || 1);

  const readerContent = (
    <div className="fixed inset-0 z-[10080] bg-white flex flex-col min-h-0 h-[100dvh] w-screen overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-2.5 py-2 backdrop-blur sm:px-4 sm:py-2.5 shrink-0">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              if (onBackToSearch) {
                onBackToSearch();
                return;
              }
              onClose?.();
            }}
            className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            title="Back to search"
          >
            <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Back to Search</span>
            <span className="sm:hidden text-[11px]">Back</span>
          </button>
          <div className="min-w-0 flex-col flex max-w-[140px] sm:max-w-xs">
            <span className="truncate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">{bookTitle}</span>
            <span className="truncate text-[11px] sm:text-xs font-bold text-slate-800 font-mono">Page {currentPage} of {displayTotalPages}</span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-0.5 sm:gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 sm:p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setLayoutMode('split')}
            aria-pressed={layoutMode === 'split'}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold transition ${layoutMode === 'split' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="Both PDF and Text"
            disabled={!pdfUrl || !txtUrl}
          >
            <LayoutGrid size={12} className="sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Both</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('text')}
            aria-pressed={layoutMode === 'text'}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold transition ${layoutMode === 'text' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="Text only"
            disabled={!txtUrl && !directTxtUrl}
          >
            <BookText size={12} className="sm:w-3.5 sm:h-3.5" />
            <span>TXT</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('pdf')}
            aria-pressed={layoutMode === 'pdf'}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold transition ${layoutMode === 'pdf' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="PDF only"
            disabled={!pdfUrl}
          >
            <FileText size={12} className="sm:w-3.5 sm:h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <Toolbar 
        searchText={searchText}
        onSearchChange={handleSearchChange}
        searchCount={globalMatches.length}
        activeSearchIndex={currentMatchIndex}
        onSearchPrev={handlePrevMatch}
        onSearchNext={handleNextMatch}
        onClearSearch={clearSearch}
        isIndexing={isIndexing}
        onPageSubmit={handlePageSubmit}
        viewMode={viewMode}
        onPageChange={handleAutoPageChange}
        pdfComponent={pdfUrl ? (
          <PdfViewer 
            pdfUrl={pdfUrl}
            isMobile={isMobile}
            viewMode={viewMode}
            scale={scale}
            setScale={setScale}
            totalPages={totalPages}
            setTotalPages={setTotalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onAutoPageChange={handleAutoPageChange}
            suppressAutoPageTracking={isLandingLocked}
            onDocumentReady={() => setPdfReady(true)}
            onDocumentError={() => setPdfReady(true)}
            onLandingResolved={handleLandingResolved}
            searchText={searchText}
          />
        ) : null}
        textContent={allPagesContent[currentPage] || ""}
        allPagesContent={allPagesContent}
        isLoading={isLoadingText}
        layoutMode={layoutMode}
        suppressAutoPageTracking={isLandingLocked}
        globalMatches={globalMatches}
        currentMatchIndex={currentMatchIndex}
        totalPages={displayTotalPages}
        currentPage={currentPage}
      />
    </div>
  );

  if (typeof document === 'undefined') {
    return readerContent;
  }

  return createPortal(readerContent, document.body);
};

export default SmartReader;
