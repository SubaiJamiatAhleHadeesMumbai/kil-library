import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookText, FileText, LayoutGrid } from 'lucide-react';
import Toolbar from './Toolbar';
import PdfViewer from './PdfViewer';
import TextEditor from './TextEditor';

// ✅ Yahan initialPage aur initialSearchText props add kiye hain
const SmartReader = ({ 
  pdfUrl, 
  txtUrl, 
  onClose, 
  onBackToSearch,
  initialPage = 1, 
  initialSearchText = "" 
}) => {
  
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  // Shared States
  const [layoutMode, setLayoutMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'pdf' : 'split')); 
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'single' : 'scroll')); 
  
  // ✅ States ko initial props se start karwaya hai
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

  const pageInputRef = useRef(null);

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
      if (layoutMode === 'split') setLayoutMode('pdf');
      if (viewMode !== 'single') setViewMode('single');
    }
  }, [isMobile, layoutMode, viewMode]);

  // ---------------------------------------------------------
  // 1. FETCH & SPLIT TEXT BY DELIMITERS 
  // ---------------------------------------------------------
  useEffect(() => {
    if (!txtUrl) {
      setTextReady(true);
      return;
    }

    setTextReady(false);
    const fetchText = async () => {
      setIsLoadingText(true);
      try {
        const response = await fetch(txtUrl);
        const text = await response.text();
        
        // Split by Underscores, ===PAGE===, or PAGE_SEPARATOR
        const rawPages = text.split(/_{5,}|===PAGE===|PAGE_SEPARATOR/gi);
        
        let pages = {};
        rawPages.forEach((content, index) => {
          pages[index + 1] = content.trim(); // 1-based index
        });
        
        setAllPagesContent(pages);
      } catch (error) {
        console.error("Failed to load text:", error);
      } finally {
        setTextReady(true);
        setIsLoadingText(false);
      }
    };
    fetchText();
  }, [txtUrl]);

  // ---------------------------------------------------------
  // 2. FAST GLOBAL SEARCH LOGIC (Updated for Smart Jump)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!searchText.trim() || Object.keys(allPagesContent).length === 0) {
      setGlobalMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    // Debounce search for performance
    setIsIndexing(true);
    const timer = setTimeout(() => {
      const matches = [];
      const safeSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeSearchText})`, 'gi');

      // Scan all pages for matches
      Object.keys(allPagesContent).forEach(pageNum => {
        const text = allPagesContent[pageNum] || "";
        const parts = text.split(regex);
        let localMatchCount = 0;
        
        parts.forEach(part => {
          if (part.toLowerCase() === searchText.toLowerCase()) {
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
        // ✅ SMART JUMP LOGIC:
        // Agar user search result click karke aaya hai, toh uske exact page par jump karo
        const targetMatchIndex = matches.findIndex(m => m.page === currentPage);
        if (targetMatchIndex !== -1) {
          setCurrentMatchIndex(targetMatchIndex);
        } else {
          // Keep externally selected deep-search page stable.
          // Only highlight first available match index when current page has no local match.
          setCurrentMatchIndex(0);
          setCurrentPage(matches[0].page);
        }
      } else {
        setCurrentMatchIndex(-1);
      }
      setIsIndexing(false);
    }, 400); 

    return () => clearTimeout(timer);
  }, [searchText, allPagesContent]); // currentPage is deliberately excluded to prevent loops

  // ---------------------------------------------------------
  // 3. HANDLERS
  // ---------------------------------------------------------
  const handleNextMatch = () => {
    if (globalMatches.length === 0) return;
    setIsLandingLocked(false);
    const nextIndex = (currentMatchIndex + 1) % globalMatches.length;
    setCurrentMatchIndex(nextIndex);
    setCurrentPage(globalMatches[nextIndex].page); 
  };

  const handlePrevMatch = () => {
    if (globalMatches.length === 0) return;
    setIsLandingLocked(false);
    const prevIndex = currentMatchIndex === 0 ? globalMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    setCurrentPage(globalMatches[prevIndex].page); 
  };

  const handleSearchChange = (value) => {
    setIsLandingLocked(false);
    setSearchText(value);
  };

  const clearSearch = () => {
    setIsLandingLocked(false);
    setSearchText('');
    setGlobalMatches([]);
    setCurrentMatchIndex(-1);
  };

  const handlePageSubmit = (e) => {
    if (e.key === 'Enter') {
      setIsLandingLocked(false);
      const page = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1));
      setCurrentPage(page);
      e.target.value = '';
      e.target.blur();
    }
  };

  const handleAutoPageChange = (pageNumber) => {
    if (isLandingLocked) return;
    setCurrentPage(pageNumber);
  };

  const handleLandingResolved = (landedPage) => {
    if (pendingLandingPage === null) return;
    if (landedPage !== pendingLandingPage) return;

    setPendingLandingPage(null);
    window.setTimeout(() => {
      setIsLandingLocked(false);
    }, 200);
  };

  const readerContent = (
    <div className="fixed inset-0 z-[10080] bg-white flex flex-col min-h-0 h-screen w-screen overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onBackToSearch) {
                onBackToSearch();
                return;
              }
              onClose?.();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            title="Back to search"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Search</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Smart Reader</span>
            <span className="truncate text-sm font-semibold text-slate-800">Page {currentPage} of {totalPages}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setLayoutMode('pdf')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${layoutMode === 'pdf' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="PDF only"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">PDF Only</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('text')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${layoutMode === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="TXT only"
            disabled={!txtUrl}
          >
            <BookText size={14} />
            <span className="hidden sm:inline">TXT Only</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('split')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${layoutMode === 'split' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="Both PDF and TXT"
            disabled={!pdfUrl || !txtUrl}
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Both</span>
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
        viewMode={viewMode}
        onPageChange={handleAutoPageChange}
        pdfComponent={(
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
        )}
        textContent={allPagesContent[currentPage] || ""}
        allPagesContent={allPagesContent}
        isLoading={isLoadingText}
        layoutMode={layoutMode}
        suppressAutoPageTracking={isLandingLocked}
        globalMatches={globalMatches}
        currentMatchIndex={currentMatchIndex}
        totalPages={totalPages}
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