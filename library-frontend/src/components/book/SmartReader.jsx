import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, BookText, FileText, LayoutGrid, 
  Maximize2, Minimize2, Search, X, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Sun, Moon, Bookmark
} from 'lucide-react';
import Toolbar from './Toolbar';
import PdfViewer from './PdfViewer';
import interactionService from '../../api/interactionService';
import analyticsService, { getVisitorId } from '../../api/analyticsService';

const LANDING_UNLOCK_DELAY_MS = 200;
const SEARCH_DEBOUNCE_MS = 400;

const SmartReader = ({ 
  pdfUrl, 
  directPdfUrl,
  fallbackPdfUrl,
  txtUrl, 
  directTxtUrl,
  onClose, 
  onBackToSearch,
  initialPage = 1, 
  initialSearchText = "",
  bookTitle = "Book Reader",
  book = null,
  bookId = null,
}) => {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  
  // Shared States — Default to 100% Full-Width Single Mode (PDF first, or Text) on ALL devices!
  const [layoutMode, setLayoutMode] = useState(() => {
    if (pdfUrl) return 'pdf';
    if (txtUrl || directTxtUrl) return 'text';
    return 'pdf';
  }); 

  // Zen Focus Mode & Expandable Search
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(() => Boolean(initialSearchText));
  const [textFontSize, setTextFontSize] = useState(1.15); // rem font size for text reader 

  const [viewMode, setViewMode] = useState('scroll');
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchText, setSearchText] = useState(initialSearchText);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [readerTheme, setReaderTheme] = useState(() => localStorage.getItem('kil_reader_theme') || 'sepia');

  const handleZoomIn = () => setScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))));
  const handleZoomOut = () => setScale(s => Math.max(0.7, Number((s - 0.15).toFixed(2))));

  const toggleReaderTheme = () => {
    setReaderTheme(prev => {
      const next = prev === 'sepia' ? 'night' : prev === 'night' ? 'ivory' : 'sepia';
      localStorage.setItem('kil_reader_theme', next);
      return next;
    });
  };
  
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
  const [isHeaderJumpOpen, setIsHeaderJumpOpen] = useState(false);
  const [headerJumpInput, setHeaderJumpInput] = useState(String(initialPage || 1));

  useEffect(() => {
    setHeaderJumpInput(String(currentPage || 1));
  }, [currentPage]);

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
  // Background Analytics Session & Heartbeat Tracker
  // ---------------------------------------------------------
  const activeBookId = bookId || book?.id;
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    if (!activeBookId) return;

    const sId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const vId = getVisitorId();
    const devType = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';

    // 1. Initial Ping on Reader Mount
    analyticsService.pingReadingSession({
      sessionId: sId,
      visitorId: vId,
      bookId: activeBookId,
      pageNo: currentPageRef.current || 1,
      totalPages: totalPagesRef.current || 0,
      durationIncrementSeconds: 5,
      deviceType: devType,
    });

    // 2. Periodic Heartbeat Ping (every 25 seconds)
    const interval = setInterval(() => {
      analyticsService.pingReadingSession({
        sessionId: sId,
        visitorId: vId,
        bookId: activeBookId,
        pageNo: currentPageRef.current || 1,
        totalPages: totalPagesRef.current || 0,
        durationIncrementSeconds: 25,
        deviceType: devType,
      });
    }, 25000);

    // 3. Final Exit Beacon on Reader Close
    return () => {
      clearInterval(interval);
      analyticsService.sendBeaconReadingExit({
        sessionId: sId,
        visitorId: vId,
        bookId: activeBookId,
        pageNo: currentPageRef.current || 1,
        totalPages: totalPagesRef.current || 0,
        durationIncrementSeconds: 5,
        deviceType: devType,
      });
    };
  }, [activeBookId]);


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

  // Keyboard shortcut: Escape exits focus/search, 'F' toggles focus mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFocusMode) {
          setIsFocusMode(false);
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
        }
      }
      if ((e.key === 'f' || e.key === 'F') && !e.target.matches('input, textarea')) {
        setIsFocusMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, isSearchOpen]);

  // ---------------------------------------------------------
  // Live Reading Progress Sync (LocalStorage + Event + Backend)
  // ---------------------------------------------------------
  const effectiveBookId = bookId || book?.id;
  const effectiveTitle = bookTitle || book?.title || "Book";
  const effectiveCover = book?.cover_image_url || book?.cover_image;

  useEffect(() => {
    if (!effectiveBookId) return;

    const pageNum = Number(currentPage) || 1;
    const maxPages = Math.max(totalPages, Object.keys(allPagesContent).length || 1);

    const timer = setTimeout(() => {
      try {
        // 1. Update primary Navbar "Continue Reading" widget key
        const lastReadPayload = {
          bookId: effectiveBookId,
          title: effectiveTitle,
          page: pageNum,
          totalPages: maxPages,
          cover: effectiveCover,
          timestamp: Date.now()
        };
        localStorage.setItem('kil_last_read_book', JSON.stringify(lastReadPayload));

        // 2. Dispatch live cross-component sync event
        window.dispatchEvent(new CustomEvent('kil_reading_updated', { detail: lastReadPayload }));

        // 3. Also update recent reads array for Homepage carousel / Library
        const rawRecent = localStorage.getItem('bookNest_recent_reads');
        let recentReads = [];
        try {
          recentReads = rawRecent ? JSON.parse(rawRecent) : [];
        } catch {}
        if (!Array.isArray(recentReads)) recentReads = [];

        const updatedEntry = {
          book_id: Number(effectiveBookId),
          title: effectiveTitle,
          cover_image_url: effectiveCover,
          last_page_read: pageNum,
          total_pages: maxPages,
          updated_at: new Date().toISOString()
        };
        const filtered = recentReads.filter(r => String(r.book_id) !== String(effectiveBookId));
        filtered.unshift(updatedEntry);
        localStorage.setItem('bookNest_recent_reads', JSON.stringify(filtered.slice(0, 10)));

        // 4. Background Cloud Sync for logged-in users (silently handled if guest/offline)
        interactionService.updateProgress(effectiveBookId, pageNum, maxPages);
      } catch (err) {
        console.warn('Could not sync reading progress:', err);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [effectiveBookId, effectiveTitle, effectiveCover, currentPage, totalPages, allPagesContent]);


  useEffect(() => {
    if (isMobile) {
      if (layoutMode === 'split') setLayoutMode(pdfUrl ? 'pdf' : 'text');
    }
  }, [isMobile, layoutMode, pdfUrl]);

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

      const decodeArrayBuffer = (buffer) => {
        const bytes = new Uint8Array(buffer);
        // If binary ZIP/DOCX signature (PK\x03\x04) is detected, do not decode raw binary as characters!
        if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
          console.warn("Direct DOCX binary file detected. Text must be streamed via /api/books/{id}/stream-text");
          return "";
        }
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          const decoded = utf8Decoder.decode(bytes);
          const mojibakeCount = (decoded.match(/[ùø§©®±²³µ¿]/g) || []).length;
          const urduArabicCount = (decoded.match(/[\u0600-\u06FF]/g) || []).length;
          if (urduArabicCount > 0 || mojibakeCount < 5) {
            return decoded;
          }
          const win1256Decoder = new TextDecoder('windows-1256');
          return win1256Decoder.decode(bytes);
        } catch {
          const win1256Decoder = new TextDecoder('windows-1256');
          return win1256Decoder.decode(bytes);
        }
      };

      // Try primary stream URL first
      try {
        const response = await fetch(txtUrl || directTxtUrl);
        if (response.ok) {
          const buf = await response.arrayBuffer();
          text = decodeArrayBuffer(buf);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        // Fallback to direct URL if stream failed
        if (directTxtUrl && directTxtUrl !== txtUrl) {
          try {
            const fallbackResp = await fetch(directTxtUrl);
            if (fallbackResp.ok) {
              const buf = await fallbackResp.arrayBuffer();
              text = decodeArrayBuffer(buf);
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
    <div 
      className="fixed inset-0 z-[10080] bg-[#FAF8F5] flex flex-col min-h-0 h-screen w-full overflow-hidden"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >
      
      {/* 1. ZEN / FULLSCREEN EXIT PILL (Visible ONLY in Focus Mode) */}
      {isFocusMode && (
        <button
          onClick={() => setIsFocusMode(false)}
          className="fixed top-3 end-4 z-[10090] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-2xl border border-slate-700/80 backdrop-blur-md hover:bg-slate-800 transition cursor-pointer"
          title="Exit Focus Mode (Esc or F)"
        >
          <Minimize2 size={13} />
          <span>Exit Focus</span>
        </button>
      )}

      {/* 2. SULTANI EMERALD & GOLD HEADER BAR (IMAGE 2 MATCH) */}
      {!isFocusMode && (
        <div className="flex flex-col shrink-0 border-b border-[#C5A059]/30 bg-[#0F3D2E] text-white shadow-md z-30">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 px-2 py-1.5 sm:px-4 sm:py-2">
            
            {/* Left: Close / Back Button */}
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
                className="inline-flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#C5A059] hover:text-white transition cursor-pointer text-xs font-bold border border-white/10"
                title="Back to library / search"
              >
                <X size={16} />
                <span className="hidden sm:inline">واپس</span>
              </button>
            </div>

            {/* Center: Book Title & Page Jumper */}
            <div className="min-w-0 flex-1 text-center max-w-xs sm:max-w-md mx-2">
              <h2
                className="truncate text-xs sm:text-sm md:text-base font-bold text-white leading-tight"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                {bookTitle}
              </h2>
              {isHeaderJumpOpen ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const p = parseInt(headerJumpInput, 10);
                    if (!isNaN(p) && p >= 1 && p <= displayTotalPages) {
                      setIsLandingLocked(false);
                      setCurrentPage(p);
                    }
                    setIsHeaderJumpOpen(false);
                  }}
                  className="flex items-center justify-center gap-1 mt-0.5"
                >
                  <span className="text-[10px] text-emerald-200 font-medium">صفحہ:</span>
                  <input
                    type="number"
                    min={1}
                    max={displayTotalPages}
                    value={headerJumpInput}
                    onChange={(e) => setHeaderJumpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setIsHeaderJumpOpen(false);
                    }}
                    onBlur={() => {
                      const p = parseInt(headerJumpInput, 10);
                      if (!isNaN(p) && p >= 1 && p <= displayTotalPages) {
                        setIsLandingLocked(false);
                        setCurrentPage(p);
                      }
                      setIsHeaderJumpOpen(false);
                    }}
                    autoFocus
                    className="w-12 px-1 py-0 bg-white text-[#0F3D2E] font-mono text-[11px] font-bold rounded border border-[#C5A059] text-center outline-none shadow-xs"
                    title="Type page number & press Enter"
                  />
                  <span className="text-[10px] text-emerald-200 font-mono">/ {displayTotalPages}</span>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHeaderJumpInput(String(currentPage));
                    setIsHeaderJumpOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#C5A059] hover:text-white cursor-pointer transition mx-auto"
                  title="Click to jump to any page number"
                >
                  <span>صفحہ <strong>{currentPage}</strong> از {displayTotalPages}</span>
                  <span className="text-[9px] bg-white/10 text-emerald-200 border border-white/20 px-1 py-0.2 rounded font-sans">تبدیل</span>
                </button>
              )}
            </div>

            {/* Right: Actions (Zoom, Font Size, Theme, Search, Mode) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              
              {/* Zoom Controls (- 100% +) (Matches Image 2) */}
              <div className="hidden xs:flex items-center rounded-xl bg-[#082218] border border-[#C5A059]/30 px-1 py-0.5 text-xs text-[#C5A059]">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="px-1.5 py-0.5 hover:text-white transition cursor-pointer font-bold"
                  title="Zoom Out"
                >
                  −
                </button>
                <span className="px-1 text-[10.5px] font-mono font-bold text-white">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="px-1.5 py-0.5 hover:text-white transition cursor-pointer font-bold"
                  title="Zoom In"
                >
                  +
                </button>
              </div>

              {/* Font Size Toggle Aa (Matches Image 2) */}
              <button
                type="button"
                onClick={() => setTextFontSize((s) => (s >= 1.6 ? 1.0 : Number((s + 0.15).toFixed(2))))}
                className="px-2 py-1 rounded-xl bg-[#082218] border border-[#C5A059]/30 text-white font-serif text-xs font-bold hover:border-[#C5A059] transition cursor-pointer"
                title="Font Size (Aa)"
              >
                Aa
              </button>

              {/* Theme Toggle (Moon / Sun / Book) (Matches Image 2) */}
              <button
                type="button"
                onClick={toggleReaderTheme}
                className="p-1.5 rounded-xl bg-[#082218] border border-[#C5A059]/30 text-[#C5A059] hover:text-white hover:border-[#C5A059] transition cursor-pointer"
                title={`Theme: ${readerTheme}`}
              >
                {readerTheme === "night" ? <Sun size={14} /> : readerTheme === "sepia" ? <Moon size={14} /> : <BookText size={14} />}
              </button>

              {/* Search Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  isSearchOpen || globalMatches.length > 0
                    ? "bg-[#C5A059] text-[#0F3D2E] shadow-xs"
                    : "bg-[#082218] text-[#C5A059] border border-[#C5A059]/30 hover:text-white hover:border-[#C5A059]"
                }`}
                title="Search inside book"
              >
                <Search size={13} />
                <span className="hidden md:inline">تلاش</span>
                {globalMatches.length > 0 && (
                  <span className="bg-white/20 text-[#0F3D2E] rounded-full px-1.5 py-0.2 text-[10px] font-mono">
                    {currentMatchIndex + 1}/{globalMatches.length}
                  </span>
                )}
              </button>

              {/* Zen Focus Mode Button */}
              <button
                type="button"
                onClick={() => setIsFocusMode(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-[#C5A059]/30 bg-[#082218] p-1.5 sm:px-2.5 sm:py-1 text-xs font-bold text-[#C5A059] hover:text-white transition cursor-pointer"
                title="Zen Focus Mode (F)"
              >
                <Maximize2 size={13} />
              </button>

              {/* Layout Mode Switcher */}
              <div className="flex items-center gap-0.5 rounded-xl border border-[#C5A059]/30 bg-[#082218] p-0.5 shadow-2xs">
                {pdfUrl && (
                  <button
                    type="button"
                    onClick={() => setLayoutMode("pdf")}
                    aria-pressed={layoutMode === "pdf"}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      layoutMode === "pdf" ? "bg-[#C5A059] text-[#0F3D2E] shadow-xs" : "text-emerald-200/80 hover:text-white"
                    }`}
                    title="PDF Mode"
                  >
                    PDF
                  </button>
                )}
                {(txtUrl || directTxtUrl) && (
                  <button
                    type="button"
                    onClick={() => setLayoutMode("text")}
                    aria-pressed={layoutMode === "text"}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      layoutMode === "text" ? "bg-[#C5A059] text-[#0F3D2E] shadow-xs" : "text-emerald-200/80 hover:text-white"
                    }`}
                    title="Text Mode"
                  >
                    TXT
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search Drawer (Expands smoothly ONLY when search is toggled open) */}
          {isSearchOpen && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/95 px-3 py-2 animate-in slide-in-from-top-1 duration-200">
              <div className="flex flex-1 items-center gap-2 max-w-xl">
                <Search size={14} className="text-emerald-600 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search word or phrase in book..."
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-mono">
                  {globalMatches.length > 0 ? `${currentMatchIndex + 1}/${globalMatches.length}` : '0 found'}
                </span>
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  disabled={globalMatches.length === 0}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
                  title="Previous match"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  disabled={globalMatches.length === 0}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
                  title="Next match"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg ml-1"
                  title="Close search"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
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
              fallbackPdfUrl={fallbackPdfUrl || directPdfUrl}
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
          textFontSize={textFontSize}
        />

        {/* Floating Side Navigation (< and >) — Universal (Image 2 Match) */}
        <button
          type="button"
          onClick={() => handleAutoPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-12 sm:h-12 bg-white/95 hover:bg-emerald-50 text-[#0F3D2E] shadow-xl rounded-full disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 border border-[#E6E2DD] active:scale-90 flex items-center justify-center cursor-pointer group"
          title="Previous Page (<)"
        >
          <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={() => handleAutoPageChange(Math.min(displayTotalPages, currentPage + 1))}
          disabled={currentPage >= displayTotalPages}
          aria-label="Next Page"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-12 sm:h-12 bg-white/95 hover:bg-emerald-50 text-[#0F3D2E] shadow-xl rounded-full disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 border border-[#E6E2DD] active:scale-90 flex items-center justify-center cursor-pointer group"
          title="Next Page (>)"
        >
          <ChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return readerContent;
  }

  return createPortal(readerContent, document.body);
};

export default SmartReader;
