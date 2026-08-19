import React, { useEffect, useRef } from 'react';
import { InView } from 'react-intersection-observer';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const TextEditor = ({
  textContent,
  textSize = 18,
  isLoading,
  pdfUrl,
  
  // Search Props
  searchText,
  globalMatches = [],
  currentMatchIndex = -1,
  
  // Page & View Props
  viewMode,           
  totalPages,
  onPageChange,       
  allPagesContent,    
  currentPage
}) => {
  const editorRef = useRef(null);
  const isSyncingRef = useRef(false); // Feedback loop rokne ke liye

  // ---------------------------------------------------------
  // 1. FAST HIGHLIGHT LOGIC
  // ---------------------------------------------------------
  const getHighlightedText = (text, pageNum) => {
    if (!text) return <span className="text-gray-300 italic">...</span>;
    if (!searchText) return text;

    // Check if the currently active match is on this page
    const activeMatch = globalMatches[currentMatchIndex];
    const isActivePage = activeMatch && activeMatch.page === pageNum;
    const activeLocalIndex = isActivePage ? activeMatch.localIndex : -1;

    // Safe regex split
    const safeSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeSearchText})`, 'gi');
    const parts = text.split(regex);

    let matchCounter = 0;

    return parts.map((part, index) => {
      if (part.toLowerCase() === searchText.toLowerCase()) {
        const isActive = matchCounter === activeLocalIndex;
        matchCounter++;

        return (
          <mark
            key={index}
            id={isActive ? "match-active" : undefined}
            className={`
              rounded-[2px] px-0.5 transition-all duration-300
              ${isActive
                ? 'bg-orange-500 text-white font-bold shadow-md scale-110 inline-block mx-0.5 ring-2 ring-orange-200'
                : 'bg-yellow-300 text-black hover:bg-yellow-400'
              }
            `}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // ---------------------------------------------------------
  // 2. AUTO SCROLL & SYNC LOGIC
  // ---------------------------------------------------------
  
  // Auto-scroll to active search match
  useEffect(() => {
    setTimeout(() => {
      const activeElement = document.getElementById(`match-active`);
      if (activeElement && editorRef.current) {
        isSyncingRef.current = true; // Block InView from overriding page
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => isSyncingRef.current = false, 1000);
      }
    }, 100);
  }, [currentMatchIndex, currentPage]);

  // Sync scroll with PDF page changes
  useEffect(() => {
    if (viewMode === 'scroll' && !isSyncingRef.current) {
      const pageElement = document.getElementById(`text-page-${currentPage}`);
      if (pageElement) {
        isSyncingRef.current = true;
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => isSyncingRef.current = false, 1000);
      }
    }
  }, [currentPage, viewMode]);

  // ---------------------------------------------------------
  // 3. FORMATTING FUNCTIONS (Font, Alignment, Spacing, Size)
  // ---------------------------------------------------------
  const applyTextAlignment = (alignment) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      let node = selection.getRangeAt(0).startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === 1) {
          const display = window.getComputedStyle(node).display;
          if (display === "block" || display === "list-item") {
            node.style.textAlign = alignment;
            return;
          }
        }
        node = node.parentNode;
      }
    }
    if (editorRef.current) editorRef.current.style.textAlign = alignment;
  };

  const applyFontFamily = (fontFamily) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontFamily = fontFamily;
      span.style.lineHeight = "1.9";
      range.surroundContents(span);
      selection.removeAllRanges();
      return;
    }
    if (editorRef.current) editorRef.current.style.fontFamily = fontFamily;
  };

  const applyLineSpacing = (lineHeight) => {
    if (!editorRef.current) return;
    editorRef.current.style.lineHeight = lineHeight;
  };

  const applyFontSizeToSelection = (delta) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
       if(editorRef.current) {
          const currentSize = parseInt(window.getComputedStyle(editorRef.current).fontSize);
          editorRef.current.style.fontSize = `${Math.min(48, Math.max(12, currentSize + delta))}px`;
       }
       return; 
    }
    const span = document.createElement("span");
    const parentEl = range.startContainer.parentElement;
    const currentSize = parentEl?.style?.fontSize ? parseInt(parentEl.style.fontSize) : textSize;
    span.style.fontSize = `${Math.min(48, Math.max(12, currentSize + delta))}px`;
    span.style.lineHeight = "1.8";
    range.surroundContents(span);
    selection.removeAllRanges();
  };

  // ---------------------------------------------------------
  // 4. PDF EXPORT
  // ---------------------------------------------------------
  const buildPDFContainer = () => {
    const wrapper = document.createElement("div");
    wrapper.style.width = "794px"; 
    wrapper.style.padding = "24px";
    wrapper.style.background = "#fff";
    wrapper.style.direction = "rtl";
    wrapper.style.color = "#000";
    wrapper.style.fontFamily = editorRef.current?.style.fontFamily || "serif";

    Object.keys(allPagesContent).sort((a, b) => a - b).forEach((pageNum) => {
      const pageDiv = document.createElement("div");
      pageDiv.style.pageBreakAfter = "always";
      pageDiv.style.lineHeight = "1.8";
      pageDiv.innerHTML = allPagesContent[pageNum] || "";
      wrapper.appendChild(pageDiv);
    });

    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    document.body.appendChild(wrapper);
    return wrapper;
  };

  const downloadAsPDF = async () => {
    try {
      const pdfContainer = buildPDFContainer();
      const canvas = await html2canvas(pdfContainer, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      document.body.removeChild(pdfContainer);

      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = pageWidth / canvas.width;
      const pageCanvasHeight = pageHeight / ratio;

      let y = 0;
      let pageIndex = 0;

      while (y < canvas.height) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pageCanvasHeight, canvas.height - y);
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, y, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
        
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageCanvas.height * ratio);
        y += pageCanvasHeight;
        pageIndex++;
      }
      pdf.save("document-export.pdf");
    } catch (error) {
      console.error("PDF Export failed:", error);
    }
  };

  // ---------------------------------------------------------
  // 5. EVENT LISTENERS
  // ---------------------------------------------------------
  useEffect(() => {
    const inc = () => applyFontSizeToSelection(2);
    const dec = () => applyFontSizeToSelection(-2);
    const handleFont = (e) => { if (e.detail) applyFontFamily(e.detail); };
    const handleAlign = (e) => { if (e.detail) applyTextAlignment(e.detail); };
    const handleLineSpace = (e) => { if (e.detail) applyLineSpacing(e.detail); };
    const handlerDownload = () => downloadAsPDF();

    document.addEventListener("download-content", handlerDownload);
    document.addEventListener("line-spacing", handleLineSpace);
    document.addEventListener("increase-text", inc);
    document.addEventListener("decrease-text", dec);
    document.addEventListener("change-font", handleFont);
    document.addEventListener("text-align", handleAlign);

    return () => {
      document.removeEventListener("increase-text", inc);
      document.removeEventListener("decrease-text", dec);
      document.removeEventListener("change-font", handleFont);
      document.removeEventListener("text-align", handleAlign);
      document.removeEventListener("line-spacing", handleLineSpace);
      document.removeEventListener("download-content", handlerDownload);
    };
  }, []);

  return (
    <div className="flex-1 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10 relative h-full">
      <div
        ref={editorRef}
        className="w-full h-full p-4 md:p-8 overflow-y-auto outline-none leading-loose text-gray-800 font-serif custom-scrollbar text-right whitespace-pre-wrap selection:bg-indigo-100 selection:text-indigo-800"
        dir="rtl"
        style={{ fontSize: `${textSize}px` }}
      >
        {Object.keys(allPagesContent).length > 0 ? (
          viewMode === 'scroll' ? (
            <div className="flex flex-col gap-12 pb-20">
              {Array.from({ length: totalPages }, (_, i) => {
                const pageNum = i + 1;
                const pageText = allPagesContent[pageNum] || "";

                return (
                  <InView 
                    key={pageNum} 
                    threshold={0.3} 
                    onChange={(inView) => {
                      // Only trigger page sync if not currently auto-scrolling
                      if (inView && !isSyncingRef.current) {
                        onPageChange(pageNum);
                      }
                    }}
                  >
                    {/* Added ID here to enable auto-scrolling to the correct page */}
                    <div id={`text-page-${pageNum}`} className="relative border-b border-gray-100 pb-10 min-h-[300px]">
                      <div className="absolute top-0 left-0 text-xs font-bold text-gray-300 select-none bg-gray-50 px-2 py-1 rounded">
                        Page {pageNum}
                      </div>
                      <div className="mt-8">
                        {pageText ? getHighlightedText(pageText, pageNum) : (
                          <div className="flex items-center justify-center h-20 text-gray-300 animate-pulse text-sm">
                            Loading text...
                          </div>
                        )}
                      </div>
                    </div>
                  </InView>
                );
              })}
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: textContent || allPagesContent[currentPage] }} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-50 flex items-center justify-center">
              <span className="text-4xl grayscale opacity-50">📄</span>
            </div>
            <p className="text-xl font-bold text-gray-400">No Text Document Available</p>
          </div>
        )}
      </div>

      {isLoading && !textContent && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default TextEditor;