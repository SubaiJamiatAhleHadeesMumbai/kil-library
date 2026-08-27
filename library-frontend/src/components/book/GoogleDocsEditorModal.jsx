import React, { useState, useEffect, useRef } from 'react';
import {
  X, Search, RotateCcw, RotateCw, Printer,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Indent, Outdent, Eraser,
  ChevronDown, ChevronLeft, ChevronRight, FileText, Star, Cloud,
  Maximize2, Minimize2, FileCheck, BookOpen, PlusCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function GoogleDocsEditorModal({
  isOpen,
  onClose,
  onSave,
  bookTitle = '',
  initialFile = null,
  initialText = '',
  initialUrl = null,
  pdfUrl = null
}) {
  const [documentTitle, setDocumentTitle] = useState('Research Text');
  const [isStarred, setIsStarred] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPdfSplitView, setIsPdfSplitView] = useState(true); // Default Split View when PDF available
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRTL, setIsRTL] = useState(true);
  const [fontFamily, setFontFamily] = useState('Jameel Noori Nastaleeq');
  const [fontSize, setFontSize] = useState('18');
  const [textColor, setTextColor] = useState('#111827');
  const [highlightColor, setHighlightColor] = useState('#ffffff');
  const [lineSpacing, setLineSpacing] = useState('1.8');
  const [activeHeading, setActiveHeading] = useState('Normal text');

  // Multi-Page Array State
  const [pages, setPages] = useState(['<p><br></p>']);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRefs = useRef([]);
  const canvasContainerRef = useRef(null);
  const pdfIframeRef = useRef(null);

  // Stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [headingsList, setHeadingsList] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  // Dropdowns
  const [openDropdown, setOpenDropdown] = useState(null);

  // Initialize title
  useEffect(() => {
    if (bookTitle) {
      setDocumentTitle(`Research Text - ${bookTitle}`);
    } else {
      setDocumentTitle('Research Text - Untitled Document');
    }
  }, [bookTitle]);

  // Helper: Read File As Text with UTF-8 & Windows-1256 fallback via native TextDecoder
  const readFileAsText = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // 1. Try Strict UTF-8 first
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        const decoded = utf8Decoder.decode(bytes);
        const mojibakeCount = (decoded.match(/[ùø§©®±²³µ¿]/g) || []).length;
        const urduArabicCount = (decoded.match(/[\u0600-\u06FF]/g) || []).length;
        if (urduArabicCount > 0 || mojibakeCount < 5) {
          return decoded;
        }
      } catch (err) {
        // Not valid UTF-8, continue to Windows-1256
      }

      // 2. Decode as Windows-1256 (Urdu / Arabic ANSI)
      try {
        const win1256Decoder = new TextDecoder('windows-1256');
        const text1256 = win1256Decoder.decode(bytes);
        if (text1256 && text1256.trim()) {
          return text1256;
        }
      } catch (err) {
        console.warn("Windows-1256 decoding failed, falling back to standard UTF-8");
      }

      // 3. Fallback to standard TextDecoder
      const fallbackDecoder = new TextDecoder('utf-8');
      return fallbackDecoder.decode(bytes);
    } catch (err) {
      console.error("Error reading file buffer:", err);
      return '';
    }
  };

  // Helper: Format raw text faithfully into lines (No line mixing)
  const formatPageTextToHtml = (rawPageText) => {
    if (!rawPageText) return '<p><br></p>';
    if (rawPageText.includes('<p>') || rawPageText.includes('<div>') || rawPageText.includes('<h')) {
      return rawPageText;
    }
    const lines = rawPageText.split(/\r?\n/);
    return lines
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '<p><br></p>';
        return `<p>${line}</p>`;
      })
      .join('');
  };

  // Load Content using EXACT SmartReader Delimiter and Chunking Algorithm
  useEffect(() => {
    if (!isOpen) return;

    const loadContent = async () => {
      setIsLoadingContent(true);
      try {
        let textToLoad = '';

        // 1. If File object is provided
        if (initialFile instanceof File) {
          textToLoad = await readFileAsText(initialFile);
          if (initialFile.name) {
            const cleanName = initialFile.name.replace(/\.[^/.]+$/, '');
            setDocumentTitle(cleanName);
          }
        }
        // 2. If Direct Text String is provided
        else if (initialText) {
          textToLoad = initialText;
        }
        // 3. If URL is provided (Edit Mode)
        else if (initialUrl) {
          const fullUrl = initialUrl.startsWith('http')
            ? initialUrl
            : `${import.meta.env.VITE_API_BASE_URL || ''}${initialUrl}`;
          
          const res = await fetch(fullUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            try {
              const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
              const decoded = utf8Decoder.decode(bytes);
              const mojibakeCount = (decoded.match(/[ùø§©®±²³µ¿]/g) || []).length;
              const urduArabicCount = (decoded.match(/[\u0600-\u06FF]/g) || []).length;
              if (urduArabicCount > 0 || mojibakeCount < 5) {
                textToLoad = decoded;
              } else {
                const win1256Decoder = new TextDecoder('windows-1256');
                textToLoad = win1256Decoder.decode(bytes);
              }
            } catch {
              const win1256Decoder = new TextDecoder('windows-1256');
              textToLoad = win1256Decoder.decode(bytes);
            }
          }
        }

        if (textToLoad && textToLoad.trim().length > 0) {
          // Exact Comprehensive Delimiters from SmartReader.jsx:
          // 1. --- or ——— (3 or more dashes / horizontal rule)
          // 2. ... or . . . or … (3 or more dots / horizontal ellipsis)
          // 3. *** or ___ (3 or more asterisks or underscores)
          // 4. ===PAGE===, PAGE_SEPARATOR, [PAGE X]
          const delimiterPattern = /(?:\r?\n|^)\s*(?:[-—_]{3,}|\*{3,}|(?:\.\s*){3,}|…+|===PAGE===|PAGE_SEPARATOR|\[PAGE\s*\d+\])\s*(?:\r?\n|$)/gi;

          let rawPages = textToLoad.split(delimiterPattern)
            .map(p => p.trim())
            .filter(p => p.length > 0);

          // Fallback: Smart paragraph chunking ONLY if text file has no explicit delimiters and is 1 continuous block
          if (rawPages.length === 1 && textToLoad.length > 1500) {
            const paragraphs = textToLoad.split(/\n\s*\n/);
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

          if (rawPages.length === 0 && textToLoad.trim().length > 0) {
            rawPages = [textToLoad.trim()];
          }

          const formattedPages = rawPages.map(pageText => formatPageTextToHtml(pageText));
          setPages(formattedPages.length > 0 ? formattedPages : ['<p><br></p>']);
        } else {
          setPages(['<p><br></p>']);
        }

      } catch (err) {
        console.error("Error loading content:", err);
        toast.error("Could not read text file.");
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadContent();
  }, [isOpen, initialFile, initialText, initialUrl]);

  // Update Live Word, Char, and Outline Headings
  const updateStats = () => {
    let totalWords = 0;
    let totalChars = 0;
    const headings = [];

    pageRefs.current.forEach((el, pIdx) => {
      if (!el) return;
      const text = el.innerText || '';
      if (text.trim()) {
        totalWords += text.trim().split(/\s+/).length;
      }
      totalChars += text.length;

      const hElements = el.querySelectorAll('h1, h2, h3');
      hElements.forEach((hEl, hIdx) => {
        const id = `heading-p${pIdx}-h${hIdx}`;
        hEl.setAttribute('id', id);
        headings.push({
          id,
          text: hEl.innerText || 'Untitled Heading',
          level: hEl.tagName.toLowerCase(),
          page: pIdx + 1
        });
      });
    });

    setWordCount(totalWords);
    setCharCount(totalChars);
    setHeadingsList(headings);
  };

  useEffect(() => {
    const timer = setTimeout(updateStats, 100);
    return () => clearTimeout(timer);
  }, [pages]);

  // Jump to specific page and sync both text & PDF
  const jumpToPage = (pageNum) => {
    const targetPage = Math.max(1, Math.min(pages.length, pageNum));
    setCurrentPage(targetPage);

    // Scroll Google Docs editor to page
    const el = pageRefs.current[targetPage - 1];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Sync PDF Viewer page
    if (pdfIframeRef.current && pdfUrl) {
      try {
        pdfIframeRef.current.src = `${pdfUrl}#page=${targetPage}&toolbar=1&navpanes=0`;
      } catch (err) {
        // Fallback
      }
    }
  };

  // Handle Input on Specific Page
  const handlePageInput = (pageIndex, newHtml) => {
    setPages(prev => {
      const next = [...prev];
      next[pageIndex] = newHtml;
      return next;
    });
  };

  // Insert a new blank page after specified index
  const handleAddPageAfter = (pageIndex) => {
    setPages(prev => {
      const next = [...prev];
      next.splice(pageIndex + 1, 0, '<p><br></p>');
      return next;
    });
    toast.success(`Page ${pageIndex + 2} inserted.`);
    setTimeout(() => jumpToPage(pageIndex + 2), 100);
  };

  // Delete a page
  const handleDeletePage = (pageIndex) => {
    if (pages.length <= 1) {
      toast.error("Document must contain at least one page.");
      return;
    }
    setPages(prev => prev.filter((_, idx) => idx !== pageIndex));
    toast.success(`Page ${pageIndex + 1} deleted.`);
  };

  // Execute Rich Text Command
  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    updateStats();
  };

  // Heading Formatting
  const handleHeadingChange = (headingType, tag) => {
    setActiveHeading(headingType);
    setOpenDropdown(null);
    if (tag === 'p') {
      execCmd('formatBlock', '<p>');
    } else {
      execCmd('formatBlock', `<${tag}>`);
    }
  };

  // Font Family Change
  const handleFontChange = (font) => {
    setFontFamily(font);
    setOpenDropdown(null);
    execCmd('fontName', font);
  };

  // Font Size Change
  const handleFontSizeChange = (delta) => {
    const newSize = Math.max(10, Math.min(72, parseInt(fontSize) + delta));
    setFontSize(newSize.toString());
    execCmd('fontSize', '7');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${newSize}px`;
      try {
        range.surroundContents(span);
      } catch {
        // Fallback
      }
    }
  };

  // Find & Replace Engine across all pages
  const handleFindReplace = (isReplaceAll = false) => {
    if (!findQuery) return;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

    let matchCount = 0;
    const updatedPages = pages.map(p => {
      const matches = p.match(regex);
      if (matches) matchCount += matches.length;
      return isReplaceAll ? p.replace(regex, replaceQuery) : p;
    });

    if (isReplaceAll && matchCount > 0) {
      setPages(updatedPages);
      toast.success(`Replaced ${matchCount} occurrences across all pages!`);
    } else if (matchCount > 0) {
      toast.success(`Found ${matchCount} occurrences.`);
    } else {
      toast.error('No matching text found.');
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          execCmd('bold');
        } else if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          execCmd('italic');
        } else if (e.key === 'u' || e.key === 'U') {
          e.preventDefault();
          execCmd('underline');
        } else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) execCmd('redo');
          else execCmd('undo');
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          execCmd('redo');
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          setShowFindReplace(prev => !prev);
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleSaveAndAttach();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleAddPageAfter(currentPage - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, pages, documentTitle]);

  // Save and Attach Handler (Preserves standard PAGE_SEPARATOR for Reader)
  const handleSaveAndAttach = () => {
    const pageTexts = pageRefs.current.map(el => (el ? el.innerText.trim() : '')).filter(t => t.length > 0);

    if (pageTexts.length === 0) {
      toast.error("Document is empty. Please enter some text.");
      return;
    }

    const combinedPlainText = pageTexts.join('\n\nPAGE_SEPARATOR\n\n');

    const safeTitle = (documentTitle || 'book_research_text')
      .replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_')
      .slice(0, 60);
    
    const fileName = `${safeTitle}.txt`;
    const blob = new Blob([combinedPlainText], { type: 'text/plain;charset=utf-8' });
    const file = new File([blob], fileName, { type: 'text/plain', lastModified: Date.now() });

    if (onSave) {
      onSave({
        file,
        fileName,
        plainText: combinedPlainText,
        wordCount,
        totalPages: pages.length
      });
    }

    toast.success(`✅ ${pages.length} Pages attached to book successfully!`);
    onClose();
  };

  // Download Plain Text File
  const handleDownloadTxt = () => {
    const pageTexts = pageRefs.current.map(el => (el ? el.innerText.trim() : '')).filter(t => t.length > 0);
    const combinedPlainText = pageTexts.join('\n\nPAGE_SEPARATOR\n\n');
    const blob = new Blob([combinedPlainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Document downloaded as .txt");
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[#f0f4f9] text-slate-800 antialiased font-sans select-none overflow-hidden ${isFullscreen ? 'p-0' : 'p-2 sm:p-4'}`}>
      
      {/* Container Card */}
      <div className="flex-1 flex flex-col bg-[#f9fbfd] rounded-2xl shadow-2xl border border-slate-300 overflow-hidden relative">
        
        {/* 1. TOP GOOGLE DOCS HEADER */}
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 gap-3">
          
          {/* Left: Icon, Title & Menus */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-200 flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm">
              <FileText className="w-6 h-6 text-[#1a73e8]" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="text-base font-semibold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-[#1a73e8] px-2 py-0.5 rounded-lg border-transparent transition-all truncate max-w-[300px] sm:max-w-[420px]"
                  title="Click to rename document"
                />
                <button
                  type="button"
                  onClick={() => setIsStarred(!isStarred)}
                  className={`p-1 rounded-full hover:bg-slate-100 transition-colors ${isStarred ? 'text-amber-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                </button>
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-medium ml-1">
                  <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{pages.length} Pages Ready</span>
                </div>
              </div>

              {/* Top Menu Bar */}
              <nav className="flex items-center gap-0.5 text-xs text-slate-600 font-medium -ml-1 mt-0.5">
                {[
                  { name: 'File', key: 'fileMenu', items: [
                    { label: 'Download as .TXT', action: handleDownloadTxt },
                    { label: 'Print Document', action: () => window.print() },
                    { label: 'Clear All Content', action: () => { setPages(['<p><br></p>']); updateStats(); } },
                  ]},
                  { name: 'Edit', key: 'editMenu', items: [
                    { label: 'Undo (Ctrl+Z)', action: () => execCmd('undo') },
                    { label: 'Redo (Ctrl+Y)', action: () => execCmd('redo') },
                    { label: 'Find & Replace (Ctrl+F)', action: () => setShowFindReplace(true) },
                    { label: 'Select All (Ctrl+A)', action: () => execCmd('selectAll') },
                  ]},
                  { name: 'View', key: 'viewMenu', items: [
                    { label: 'Toggle Sidebar Outline', action: () => setIsSidebarOpen(!isSidebarOpen) },
                    { label: isPdfSplitView ? 'Close PDF Split View' : 'Open PDF Split View', action: () => setIsPdfSplitView(!isPdfSplitView) },
                    { label: 'Toggle Fullscreen', action: () => setIsFullscreen(!isFullscreen) },
                    { label: 'Zoom: 100%', action: () => setZoom(100) },
                    { label: 'Zoom: 125%', action: () => setZoom(125) },
                  ]},
                  { name: 'Insert', key: 'insertMenu', items: [
                    { label: 'New Page Break (Ctrl+Enter)', action: () => handleAddPageAfter(currentPage - 1) },
                    { label: 'Horizontal Line', action: () => execCmd('insertHorizontalRule') },
                    { label: 'Paragraph Break', action: () => execCmd('insertParagraph') },
                  ]},
                  { name: 'Format', key: 'formatMenu', items: [
                    { label: 'Bold (Ctrl+B)', action: () => execCmd('bold') },
                    { label: 'Italic (Ctrl+I)', action: () => execCmd('italic') },
                    { label: 'Underline (Ctrl+U)', action: () => execCmd('underline') },
                    { label: 'Clear Formatting', action: () => execCmd('removeFormat') },
                  ]},
                  { name: 'Tools', key: 'toolsMenu', items: [
                    { label: `Word Count: ${wordCount} words`, action: () => toast(`Document contains ${wordCount} words, ${charCount} characters, and ${pages.length} pages.`, { icon: '📊' }) },
                    { label: 'Switch to Urdu RTL', action: () => setIsRTL(true) },
                    { label: 'Switch to English LTR', action: () => setIsRTL(false) },
                  ]},
                ].map(menu => (
                  <div key={menu.key} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === menu.key ? null : menu.key)}
                      className={`px-2 py-0.5 rounded hover:bg-slate-100 hover:text-slate-900 transition-colors ${openDropdown === menu.key ? 'bg-slate-200 text-slate-900' : ''}`}
                    >
                      {menu.name}
                    </button>

                    {openDropdown === menu.key && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[220px] z-50 animate-in fade-in zoom-in-95 duration-100">
                        {menu.items.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { item.action(); setOpenDropdown(null); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#1a73e8] flex items-center justify-between"
                          >
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Center / Right: Synchronized Page Navigator & Controls */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            
            {/* 🔄 Synchronized Dual-Page Stepper */}
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded-full px-2 py-1 gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => jumpToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded-full hover:bg-white text-slate-700 disabled:opacity-30 transition-all"
                title="Previous Page (Syncs both PDF & Text)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs font-black text-slate-800 px-2 min-w-[85px] text-center select-none font-mono">
                Page {currentPage} / {pages.length}
              </span>

              <button
                type="button"
                onClick={() => jumpToPage(currentPage + 1)}
                disabled={currentPage >= pages.length}
                className="p-1 rounded-full hover:bg-white text-slate-700 disabled:opacity-30 transition-all"
                title="Next Page (Syncs both PDF & Text)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Compare with PDF Split View Button */}
            {pdfUrl && (
              <button
                type="button"
                onClick={() => setIsPdfSplitView(!isPdfSplitView)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isPdfSplitView ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}
                title="Toggle Side-by-Side Synchronized PDF View"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isPdfSplitView ? "Close PDF Split" : "🪟 Compare with PDF"}</span>
              </button>
            )}

            {/* Google Blue "Save & Attach to Book" Button */}
            <button
              type="button"
              onClick={handleSaveAndAttach}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all hover:shadow-lg active:scale-95"
            >
              <FileCheck className="w-4 h-4" />
              <span>Save & Attach to Book</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Close Editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 2. GOOGLE DOCS RIBBON TOOLBAR */}
        <div className="flex items-center gap-1 px-4 py-1.5 bg-[#edf2fa] border-b border-slate-200 overflow-x-auto custom-scrollbar flex-shrink-0">
          
          {/* Quick Menu Search */}
          <button
            type="button"
            onClick={() => setShowFindReplace(prev => !prev)}
            className={`p-1.5 rounded-full hover:bg-slate-200/80 transition-colors text-slate-600 ${showFindReplace ? 'bg-blue-100 text-[#1a73e8]' : ''}`}
            title="Search & Replace (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Undo / Redo / Print */}
          <button type="button" onClick={() => execCmd('undo')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-700" title="Undo (Ctrl+Z)">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('redo')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-700" title="Redo (Ctrl+Y)">
            <RotateCw className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => window.print()} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-700" title="Print (Ctrl+P)">
            <Printer className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Zoom Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'zoom' ? null : 'zoom')}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200/80 text-xs font-semibold text-slate-700"
            >
              <span>{zoom}%</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {openDropdown === 'zoom' && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-24 z-50">
                {[75, 90, 100, 125, 150].map(z => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => { setZoom(z); setOpenDropdown(null); }}
                    className={`w-full text-left px-3 py-1 text-xs hover:bg-blue-50 ${zoom === z ? 'font-bold text-[#1a73e8]' : 'text-slate-700'}`}
                  >
                    {z}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Styles / Headings Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'heading' ? null : 'heading')}
              className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-200/80 text-xs font-medium text-slate-700 min-w-[100px] justify-between"
            >
              <span className="truncate">{activeHeading}</span>
              <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
            </button>
            {openDropdown === 'heading' && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-44 z-50">
                {[
                  { label: 'Normal text', tag: 'p', className: 'text-xs' },
                  { label: 'Heading 1 (Badi Surkhi)', tag: 'h1', className: 'text-base font-bold' },
                  { label: 'Heading 2 (Darmiyani)', tag: 'h2', className: 'text-sm font-bold' },
                  { label: 'Heading 3 (Choti)', tag: 'h3', className: 'text-xs font-bold' },
                ].map(h => (
                  <button
                    key={h.tag}
                    type="button"
                    onClick={() => handleHeadingChange(h.label, h.tag)}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${h.className} ${activeHeading === h.label ? 'text-[#1a73e8] bg-blue-50/50 font-bold' : 'text-slate-800'}`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Font Family Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'font' ? null : 'font')}
              className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-200/80 text-xs font-medium text-slate-700 min-w-[130px] justify-between"
            >
              <span className="truncate">{fontFamily}</span>
              <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
            </button>
            {openDropdown === 'font' && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-56 z-50 max-h-64 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Urdu Calligraphy</div>
                {[
                  { label: 'Jameel Noori Nastaleeq', value: 'Jameel Noori Nastaleeq' },
                  { label: 'Noto Nastaliq Urdu', value: 'Noto Nastaliq Urdu' },
                  { label: 'Amiri (Quranic Arabic)', value: 'Amiri' },
                  { label: 'Lateef (Urdu/Sindhi)', value: 'Lateef' },
                ].map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => handleFontChange(f.value)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${fontFamily === f.value ? 'text-[#1a73e8] font-bold bg-blue-50/50' : 'text-slate-700'}`}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="border-t border-slate-100 my-1" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Standard Fonts</div>
                {[
                  { label: 'Arial', value: 'Arial' },
                  { label: 'Times New Roman', value: 'Times New Roman' },
                  { label: 'Calibri', value: 'Calibri' },
                  { label: 'Courier New', value: 'Courier New' },
                ].map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => handleFontChange(f.value)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${fontFamily === f.value ? 'text-[#1a73e8] font-bold bg-blue-50/50' : 'text-slate-700'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Font Size Controls */}
          <div className="flex items-center gap-0.5 bg-slate-200/60 rounded p-0.5">
            <button
              type="button"
              onClick={() => handleFontSizeChange(-1)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-300 text-xs font-bold text-slate-700"
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="w-6 text-center text-xs font-bold text-slate-800">{fontSize}</span>
            <button
              type="button"
              onClick={() => handleFontSizeChange(1)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-300 text-xs font-bold text-slate-700"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Formatting: Bold, Italic, Underline, Strikethrough */}
          <button type="button" onClick={() => execCmd('bold')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800 font-bold" title="Bold (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('italic')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800 italic" title="Italic (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('underline')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800" title="Underline (Ctrl+U)">
            <Underline className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('strikeThrough')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-700" title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Direction Switcher */}
          <button
            type="button"
            onClick={() => setIsRTL(!isRTL)}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${isRTL ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}
            title="Toggle Right-to-Left (Urdu) / Left-to-Right (English)"
          >
            <span>{isRTL ? 'اردو (RTL)' : 'ENG (LTR)'}</span>
          </button>

          {/* Add Page Break Button */}
          <button
            type="button"
            onClick={() => handleAddPageAfter(currentPage - 1)}
            className="px-2.5 py-1 rounded text-xs font-bold bg-blue-100 hover:bg-blue-200 text-[#1a73e8] transition-colors flex items-center gap-1"
            title="Insert Page Break (Ctrl+Enter)"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Page Break</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Alignment Controls */}
          <button type="button" onClick={() => execCmd('justifyRight')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800" title="Align Right (Urdu)">
            <AlignRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('justifyCenter')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800" title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('justifyLeft')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800" title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('justifyFull')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800" title="Justify Text">
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Bullet / Numbered Lists */}
          <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800" title="Bulleted List">
            <List className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-800" title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Clear Formatting */}
          <button type="button" onClick={() => execCmd('removeFormat')} className="p-1.5 rounded hover:bg-slate-200/80 text-slate-700" title="Clear Formatting (T̸)">
            <Eraser className="w-4 h-4" />
          </button>

        </div>

        {/* 2.5 FLOATING FIND & REPLACE BAR */}
        {showFindReplace && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/90 border-b border-blue-200 animate-in slide-in-from-top-2 duration-150 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs shadow-inner">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Find in document..."
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFindReplace(false); }}
                className="outline-none bg-transparent w-40 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs shadow-inner">
              <input
                type="text"
                placeholder="Replace with..."
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFindReplace(false); }}
                className="outline-none bg-transparent w-40 text-slate-800"
              />
            </div>

            <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="rounded text-[#1a73e8]"
              />
              <span>Match case</span>
            </label>

            <button
              type="button"
              onClick={() => handleFindReplace(false)}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm"
            >
              Find Next
            </button>
            <button
              type="button"
              onClick={() => handleFindReplace(true)}
              className="px-3 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Replace All
            </button>

            <button
              type="button"
              onClick={() => setShowFindReplace(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. MAIN WORKSPACE (SIDEBAR + RULER + REAL MULTI-PAGE SHEETS + SYNCHRONIZED PDF SPLIT) */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* PDF SPLIT VIEW LEFT PANEL (WHEN ACTIVE) */}
          {isPdfSplitView && pdfUrl && (
            <div className="w-1/2 h-full border-r border-slate-300 bg-slate-900 flex flex-col flex-shrink-0 relative">
              <div className="bg-slate-800 px-3 py-1.5 border-b border-slate-700 flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  Original PDF Book (Page {currentPage})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Sync Mode Active</span>
                  <button
                    type="button"
                    onClick={() => setIsPdfSplitView(false)}
                    className="text-slate-400 hover:text-white p-0.5 rounded font-bold"
                    title="Close PDF View"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <iframe
                ref={pdfIframeRef}
                src={`${pdfUrl}#page=${currentPage}&toolbar=1&navpanes=0`}
                title="Original Book PDF Reference"
                className="flex-1 w-full h-full border-none bg-slate-900"
              />
            </div>
          )}

          {/* LEFT SIDEBAR: Document Tabs & Outline */}
          <aside className={`${isSidebarOpen && !isPdfSplitView ? 'w-60' : 'w-0'} bg-[#f9fbfd] border-r border-slate-200 transition-all duration-200 flex flex-col flex-shrink-0 overflow-hidden`}>
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#1a73e8]" />
                Document Outline
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Page Jump Fast Index */}
            <div className="p-2 border-b border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Page Index ({pages.length} Pages)</div>
              <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto custom-scrollbar p-1">
                {pages.map((_, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => jumpToPage(pIdx + 1)}
                    className={`py-1 rounded text-xs font-semibold border transition-all ${currentPage === pIdx + 1 ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    P.{pIdx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Headings Outline List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Headings</div>
              {headingsList.length > 0 ? (
                headingsList.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(h.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`w-full text-left py-1 px-2 rounded-lg hover:bg-slate-200/80 text-slate-700 truncate transition-colors flex items-center justify-between ${h.level === 'h1' ? 'font-bold text-slate-900' : h.level === 'h2' ? 'pl-4 font-semibold text-slate-800' : 'pl-6 text-slate-600'}`}
                  >
                    <span className="truncate">{h.text}</span>
                    <span className="text-[9px] text-slate-400 ml-1 font-mono">P.{h.page}</span>
                  </button>
                ))
              ) : (
                <div className="py-6 px-2 text-center text-slate-400 italic">
                  <p className="text-[11px] leading-relaxed">Headings you add to the document (H1, H2) will appear here for fast navigation.</p>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN EDITING AREA WITH RULER & A4 MULTI-PAGE SHEETS */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#e9ecef]/60 relative">
            
            {/* TOP HORIZONTAL RULER */}
            <div className="h-6 bg-[#f8f9fa] border-b border-slate-300 flex items-center justify-center flex-shrink-0 select-none overflow-hidden">
              <div className={`${isPdfSplitView ? 'w-[750px]' : 'w-[816px]'} h-full flex items-center justify-between text-[10px] font-mono text-slate-400 px-16 relative`}>
                <div className="absolute left-[72px] top-0 bottom-0 w-2 flex flex-col items-center justify-center" title="Left Margin">
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#1a73e8]" />
                </div>

                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                  <div key={num} className="flex flex-col items-center">
                    <span>{num}</span>
                    <div className="h-1.5 w-[1px] bg-slate-300" />
                  </div>
                ))}

                <div className="absolute right-[72px] top-0 bottom-0 w-2 flex flex-col items-center justify-center" title="Right Margin">
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#1a73e8]" />
                </div>
              </div>
            </div>

            {/* A4 DOCUMENT MULTI-PAGE CANVAS AREA */}
            <div
              ref={canvasContainerRef}
              onScroll={(e) => {
                const scrollTop = e.target.scrollTop;
                const pageHeightWithGap = (1056 + 24) * (zoom / 100);
                const curr = Math.min(pages.length, Math.max(1, Math.ceil((scrollTop + 200) / pageHeightWithGap)));
                if (curr !== currentPage) {
                  setCurrentPage(curr);
                }
              }}
              className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center custom-scrollbar"
            >
              {isLoadingContent ? (
                <div className="w-[816px] min-h-[1056px] bg-white rounded-xs shadow-md border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <span className="w-8 h-8 border-3 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">Loading research text...</p>
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="flex flex-col items-center gap-6 pb-20"
                >
                  {pages.map((pageHtml, pageIndex) => (
                    <div
                      key={pageIndex}
                      className={`${isPdfSplitView ? 'w-[750px]' : 'w-[816px]'} min-h-[1056px] bg-white rounded-xs shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] border border-slate-200/90 relative flex flex-col justify-between p-12 sm:p-16 group transition-shadow hover:shadow-[0_2px_6px_0_rgba(60,64,67,0.35),0_8px_16px_4px_rgba(60,64,67,0.18)]`}
                    >
                      {/* Top Header of the Page */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono select-none border-b border-slate-100 pb-2 mb-6">
                        <span className="truncate max-w-[280px] font-medium text-slate-500">{documentTitle}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            Page {pageIndex + 1} of {pages.length}
                          </span>
                          {pages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeletePage(pageIndex)}
                              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-all"
                              title="Delete this page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contenteditable Editor for THIS Specific Page */}
                      <div
                        ref={el => pageRefs.current[pageIndex] = el}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => handlePageInput(pageIndex, e.currentTarget.innerHTML)}
                        onBlur={updateStats}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        style={{
                          fontFamily: fontFamily,
                          fontSize: `${fontSize}px`,
                          lineHeight: lineSpacing,
                          color: textColor,
                          minHeight: '800px',
                        }}
                        dangerouslySetInnerHTML={{ __html: pageHtml }}
                        className="flex-1 outline-none border-none leading-relaxed text-slate-900 transition-all cursor-text select-text"
                        placeholder={`Start typing page ${pageIndex + 1} contents here...`}
                      />

                      {/* Bottom Footer of the Page */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono select-none border-t border-slate-100 pt-3 mt-6">
                        <button
                          type="button"
                          onClick={() => handleAddPageAfter(pageIndex)}
                          className="opacity-0 group-hover:opacity-100 text-[#1a73e8] hover:underline font-semibold flex items-center gap-1 transition-opacity"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>+ Insert Page Break Here</span>
                        </button>
                        <span className="font-bold text-slate-500">- {pageIndex + 1} -</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </main>
        </div>

        {/* 4. BOTTOM STATUS BAR */}
        <footer className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-slate-200 text-[11px] font-medium text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#1a73e8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Page {currentPage} of {pages.length}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{wordCount.toLocaleString()} words</span>
            <span>•</span>
            <span>{charCount.toLocaleString()} characters</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded font-bold ${isRTL ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
              {isRTL ? 'اردو Nastaleeq (RTL)' : 'Left-to-Right (English)'}
            </span>
            <span>•</span>
            <span>Zoom: {zoom}%</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
