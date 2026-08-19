import React, { useState, useEffect, useRef } from 'react';
import Toolbar from './Toolbar';
import PdfViewer from './PdfViewer';
import TextEditor from './TextEditor';

// ✅ Yahan initialPage aur initialSearchText props add kiye hain
const SmartReader = ({ 
  pdfUrl, 
  txtUrl, 
  onClose, 
  initialPage = 1, 
  initialSearchText = "" 
}) => {
  // Shared States
  const [layoutMode, setLayoutMode] = useState('split'); 
  const [viewMode, setViewMode] = useState('scroll'); 
  
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

  const pageInputRef = useRef(null);

  // ---------------------------------------------------------
  // 1. FETCH & SPLIT TEXT BY DELIMITERS 
  // ---------------------------------------------------------
  useEffect(() => {
    if (!txtUrl) return;
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
    const nextIndex = (currentMatchIndex + 1) % globalMatches.length;
    setCurrentMatchIndex(nextIndex);
    setCurrentPage(globalMatches[nextIndex].page); 
  };

  const handlePrevMatch = () => {
    if (globalMatches.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? globalMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    setCurrentPage(globalMatches[prevIndex].page); 
  };

  const handlePageSubmit = (e) => {
    if (e.key === 'Enter') {
      const page = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1));
      setCurrentPage(page);
      e.target.value = '';
      e.target.blur();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col h-screen w-screen overflow-hidden">
      {/* Top Header / Toolbar */}
      <Toolbar 
        pdfUrl={pdfUrl}
        currentPage={currentPage}
        totalPages={totalPages}
        
        // Search Props
        searchText={searchText}
        setSearchText={setSearchText}
        globalMatches={globalMatches}
        currentMatchIndex={currentMatchIndex}
        isIndexing={isIndexing}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        
        pageInputRef={pageInputRef}
        viewMode={viewMode}
        setViewMode={setViewMode}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        handlePageSubmit={handlePageSubmit}
        onNextPage={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        onPrevPage={() => setCurrentPage(p => Math.max(1, p - 1))}
        onClose={onClose}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex w-full h-[calc(100vh-64px)] overflow-hidden bg-gray-100">
        
        {/* PDF VIEWER SECTION */}
        {(layoutMode === 'split' || layoutMode === 'pdf') && (
          <div className={`${layoutMode === 'split' ? 'w-1/2' : 'w-full'} h-full border-r border-gray-300`}>
            <PdfViewer 
              pdfUrl={pdfUrl}
              viewMode={viewMode}
              scale={scale}
              setScale={setScale}
              totalPages={totalPages}
              setTotalPages={setTotalPages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage} 
            />
          </div>
        )}

        {/* TEXT EDITOR SECTION */}
        {(layoutMode === 'split' || layoutMode === 'text') && (
          <div className={`${layoutMode === 'split' ? 'w-1/2' : 'w-full'} h-full`}>
            <TextEditor 
              textContent={allPagesContent[currentPage] || ""}
              textSize={18}
              isLoading={isLoadingText}
              pdfUrl={pdfUrl}
              searchText={searchText}
              viewMode={viewMode}
              totalPages={totalPages}
              onPageChange={setCurrentPage} 
              allPagesContent={allPagesContent}
              
              // Search Highlights Props
              globalMatches={globalMatches}
              currentMatchIndex={currentMatchIndex}
              currentPage={currentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartReader;