import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, BookText, FileText, LayoutGrid, 
  Search, X, ChevronUp, ChevronDown, Maximize2, Minimize2 
} from 'lucide-react';
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
  bookTitle = "Book Reader",
  bookId = null,
  book = null,
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
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [readerTheme, setReaderTheme] = useState('sepia'); // 'sepia' | 'light' | 'dark'

  // Persist reading progress for 1-Click Continue Reading in Navbar
  useEffect(() => {
    if (!currentPage || currentPage < 1) return;
    const activeId = book?.id || bookId;
    if (!activeId || activeId === 'null' || activeId === 'undefined') return;
    try {
      const activeTitle = book?.title || bookTitle || 'Last Read Book';
      const readRecord = {
        bookId: activeId,
        title: activeTitle,
        page: currentPage,
        pdfUrl: pdfUrl || null,
        txtUrl: txtUrl || directTxtUrl || null,
        timestamp: Date.now(),
      };
      localStorage.setItem('kil_last_read_book', JSON.stringify(readRecord));
      window.dispatchEvent(new Event('kil_reading_updated'));
    } catch (e) {
      console.warn('Could not store last read state:', e);
    }
  }, [currentPage, book, bookId, bookTitle, pdfUrl, txtUrl, directTxtUrl]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

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

  // ---------------------------------------------------------
  // Casual Copy Deterrence (Right-click & Save/Print Shortcuts)
  // ---------------------------------------------------------
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ---------------------------------------------------------
  // Mobile Touch Swipe Gesture for Page Turning
  // ---------------------------------------------------------
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - endX;
    const diffY = touchStartY.current - endY;

    // Minimum 45px swipe horizontal, and more horizontal than vertical
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      if (diffX > 0) {
        // Swipe Left -> Next Page
        if (currentPage < displayTotalPages) {
          handlePageSubmit(currentPage + 1);
        }
      } else {
        // Swipe Right -> Previous Page
        if (currentPage > 1) {
          handlePageSubmit(currentPage - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

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

  const displayTotalPages = useMemo(() => {
    const textPagesCount = Object.keys(allPagesContent || {}).length;
    if (pdfUrl) return totalPages;
    return textPagesCount || totalPages || 1;
  }, [pdfUrl, totalPages, allPagesContent]);

  // ---------------------------------------------------------
  // 1. FETCH & SPLIT TEXT BY DELIMITERS (with Fallback to Direct URL)
  // ---------------------------------------------------------
  useEffect(() => {
    const sourceUrl = txtUrl || directTxtUrl;
    if (!sourceUrl) {
      setIsLoadingText(false);
      return;
    }

    let isMounted = true;
    setIsLoadingText(true);

    fetch(sourceUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        
        const PAGE_DELIMITER = /_{5,}|===PAGE===|PAGE_SEPARATOR|\x0c/i;
        const rawPages = text.split(PAGE_DELIMITER);
        const parsed = {};
        
        rawPages.forEach((pageStr, idx) => {
          parsed[idx + 1] = pageStr.trim();
        });

        setAllPagesContent(parsed);
        setIsLoadingText(false);
        setTextReady(true);
      })
      .catch((err) => {
        console.error("Error loading txt content:", err);
        if (isMounted) {
          setIsLoadingText(false);
          setTextReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [txtUrl, directTxtUrl]);

  // ---------------------------------------------------------
  // 2. FAST GLOBAL SEARCH LOGIC (Smart Jump + safe regex)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!searchText.trim()) {
      setGlobalMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    setIsIndexing(true);
    const timeout = setTimeout(() => {
      const matches = [];
      const safeQ = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeQ, 'gi');

      Object.entries(allPagesContent).forEach(([pageStr, content]) => {
        const pageNum = Number(pageStr);
        let match;
        let localIdx = 0;
        while ((match = regex.exec(content)) !== null) {
          matches.push({
            page: pageNum,
            localIndex: localIdx,
            index: match.index,
          });
          localIdx++;
        }
      });

      setGlobalMatches(matches);
      if (matches.length > 0) {
        // Find first match on or after current page, or fallback to index 0
        const firstMatchAfterCurrent = matches.findIndex((m) => m.page >= currentPage);
        const startIdx = firstMatchAfterCurrent !== -1 ? firstMatchAfterCurrent : 0;
        setCurrentMatchIndex(startIdx);
        setCurrentPage(matches[startIdx].page);
      } else {
        setCurrentMatchIndex(-1);
      }
      setIsIndexing(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchText, allPagesContent, currentPage]);

  // ---------------------------------------------------------
  // 3. HANDLERS
  // ---------------------------------------------------------
  const handleNextMatch = useCallback(() => {
    if (globalMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % globalMatches.length;
    setCurrentMatchIndex(nextIdx);
    setCurrentPage(globalMatches[nextIdx].page);
  }, [currentMatchIndex, globalMatches]);

  const handlePrevMatch = useCallback(() => {
    if (globalMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + globalMatches.length) % globalMatches.length;
    setCurrentMatchIndex(prevIdx);
    setCurrentPage(globalMatches[prevIdx].page);
  }, [currentMatchIndex, globalMatches]);

  const handleSearchChange = (val) => {
    setSearchText(val);
  };

  const clearSearch = () => {
    setSearchText("");
    setGlobalMatches([]);
    setCurrentMatchIndex(-1);
  };

  const handlePageSubmit = (page) => {
    setIsLandingLocked(false);
    setCurrentPage(page);
  };

  const handleAutoPageChange = useCallback((pageNum) => {
    if (isLandingLocked) return;
    setCurrentPage(pageNum);
  }, [isLandingLocked]);

  const handleLandingResolved = useCallback((targetPage) => {
    setPendingLandingPage(null);
    setCurrentPage(targetPage);
    setTimeout(() => {
      setIsLandingLocked(false);
    }, LANDING_UNLOCK_DELAY_MS);
  }, []);

  const readerContent = (
    <div 
      className="fixed inset-0 z-[10080] flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {/* --- TOP COMPACT RESPONSIVE HEADER --- */}
      <header className="flex h-12 w-full items-center justify-between border-b border-slate-200/80 bg-white px-2 sm:px-4 shadow-2xs shrink-0 select-none z-30 gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        {/* LEFT: Back Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onBackToSearch) {
                onBackToSearch();
                return;
              }
              onClose?.();
            }}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs"
            title="Back to search"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        {/* CENTER: Clean Search Pill without conflicting outlines */}
        <div className="flex items-center min-w-0 max-w-xs sm:max-w-sm flex-1">
          <div className="relative flex items-center w-full rounded-full border border-slate-200/90 bg-slate-100/80 px-3 py-1 text-xs focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all shadow-2xs">
            <Search size={13} className="text-slate-400 shrink-0 mr-1.5" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search in book..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 p-0 m-0 border-0 outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none"
              style={{
                outline: 'none',
                boxShadow: 'none',
                border: 'none',
              }}
            />
            {isIndexing && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent shrink-0 ml-1.5" />
            )}
            {globalMatches.length > 0 && (
              <div className="flex items-center gap-0.5 shrink-0 ml-1.5 text-[9.5px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                <span>{currentMatchIndex + 1}/{globalMatches.length}</span>
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  className="hover:text-emerald-950 cursor-pointer p-0.5"
                  title="Previous match"
                >
                  <ChevronUp size={11} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  className="hover:text-emerald-950 cursor-pointer p-0.5"
                  title="Next match"
                >
                  <ChevronDown size={11} />
                </button>
              </div>
            )}
            {searchText && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-slate-400 hover:text-slate-700 shrink-0 ml-1 cursor-pointer p-0.5"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* CENTER-RIGHT: Font Size Adjuster + Theme Selector */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Font Size A- / A+ */}
          {(layoutMode === 'text' || layoutMode === 'split') && (
            <div className="flex items-center gap-0.5 rounded-full border border-slate-200/90 bg-slate-100/80 px-2 py-0.5 text-xs font-bold text-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setFontSize((prev) => Math.max(13, prev - 2))}
                className="px-1.5 py-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer text-[11px] font-black"
                title="Decrease Font Size (A-)"
              >
                A-
              </button>
              <span className="font-mono text-[10px] px-1 text-slate-400 font-bold">{fontSize}px</span>
              <button
                type="button"
                onClick={() => setFontSize((prev) => Math.min(32, prev + 2))}
                className="px-1.5 py-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer text-[11px] font-black"
                title="Increase Font Size (A+)"
              >
                A+
              </button>
            </div>
          )}

          {/* Theme Selector: Sepia | Light | Dark */}
          {(layoutMode === 'text' || layoutMode === 'split') && (
            <div className="flex items-center rounded-full border border-slate-200/90 bg-slate-100/80 p-0.5 shadow-2xs text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => setReaderTheme('sepia')}
                className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                  readerTheme === 'sepia' ? 'bg-[#7D4F27] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sepia Warm Mode"
              >
                Sepia
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('light')}
                className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                  readerTheme === 'light' ? 'bg-[#002147] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Light Clean Mode"
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('dark')}
                className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                  readerTheme === 'dark' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dark Night Mode"
              >
                Dark
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: VIEW CONTROLS & FULLSCREEN */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="flex items-center rounded-full border border-slate-200/90 bg-slate-100/80 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              aria-pressed={layoutMode === 'split'}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold transition cursor-pointer ${
                layoutMode === 'split' ? 'bg-[#002147] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Split View (Both PDF & Text)"
              disabled={!pdfUrl || !txtUrl}
            >
              <LayoutGrid size={11} />
              <span className="hidden xs:inline">Both</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('text')}
              aria-pressed={layoutMode === 'text'}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold transition cursor-pointer ${
                layoutMode === 'text' ? 'bg-[#002147] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Text Only"
              disabled={!txtUrl && !directTxtUrl}
            >
              <BookText size={11} />
              <span>TXT</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('pdf')}
              aria-pressed={layoutMode === 'pdf'}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold transition cursor-pointer ${
                layoutMode === 'pdf' ? 'bg-[#002147] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="PDF Only"
              disabled={!pdfUrl}
            >
              <FileText size={11} />
              <span>PDF</span>
            </button>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer shadow-2xs hidden sm:inline-flex"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Reader"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

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
        fontSize={fontSize}
        setFontSize={setFontSize}
        readerTheme={readerTheme}
        setReaderTheme={setReaderTheme}
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
