import React, { useState } from 'react';
import {
  Share2, Download, Crop, File, BookOpen,
  Copy, Search, X, Columns, ChevronLeft, ChevronRight,
  Minus, Plus, Type, FileText, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';

const Toolbar = ({
  // Data Props
  pdfUrl,
  currentPage,
  totalPages,

  // Global Search Props
  searchText,
  setSearchText,
  globalMatches = [],      
  currentMatchIndex = -1,  
  onNextMatch,
  onPrevMatch,
  isIndexing = false,         

  pageInputRef,

  // State Props
  viewMode, setViewMode,
  layoutMode, setLayoutMode,

  // Action Handlers
  handlePageSubmit,
  onNextPage, onPrevPage,
  onClose
}) => {

  const [showSearch, setShowSearch] = useState(false);

  const getBtnClass = (isActive) =>
    `p-2 rounded-md transition-all duration-200 ${isActive
      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200 font-medium'
      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`;

  const toggleSearch = () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchText("");
    } else {
      setShowSearch(true);
    }
  };

  const dispatchCustomEvent = (eventName, detail = null) => {
    document.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4 z-30 relative select-none">

      {/* --- LEFT BRANDING & CLOSE BUTTON --- */}
      <div className="font-bold text-gray-500 hidden lg:flex items-center gap-2 text-sm tracking-wide">
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 mr-2 transition-colors"
          title="Close Reader"
        >
          <X size={20} />
        </button>
        <BookOpen size={18} className="text-indigo-600" />
        <span>Smart Reader</span>
      </div>

      {/* --- CENTER CONTROLS --- */}
      <div className="flex items-center gap-2 bg-white p-1 overflow-x-auto custom-scrollbar">

        {/* GROUP 1: FILE ACTIONS */}
        <div className="flex items-center gap-0.5 bg-gray-50/80 p-1 rounded-lg border border-gray-100 shrink-0">
          <a href={pdfUrl} download className={getBtnClass(false)} title="Download Source PDF" onClick={(e) => !pdfUrl && e.preventDefault()}>
            <Download size={18} />
          </a>
        </div>

        {/* GROUP 2: LAYOUT FOCUS */}
        <div className="flex items-center gap-0.5 bg-gray-50/80 p-1 rounded-lg border border-gray-100 shrink-0">
          <button onClick={() => setLayoutMode('pdf')} className={getBtnClass(layoutMode === 'pdf')} title="PDF Only"><File size={18} /></button>
          <button onClick={() => setLayoutMode('split')} className={getBtnClass(layoutMode === 'split')} title="Split View"><Columns size={18} /></button>
          <button onClick={() => setLayoutMode('text')} className={getBtnClass(layoutMode === 'text')} title="Text Only"><FileText size={18} /></button>
        </div>

        {/* GROUP 3: NAVIGATION */}
        <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-lg border border-gray-100 shrink-0">
          <button onClick={onPrevPage} disabled={currentPage <= 1} className="p-2 text-gray-600 hover:text-indigo-600 disabled:opacity-30 rounded-md">
            <ChevronLeft size={18} />
          </button>
          <div className="bg-white border border-gray-300 rounded-md px-2 py-1 flex items-center h-8 shadow-inner">
            <input ref={pageInputRef} type="number" className="w-8 bg-transparent outline-none text-center font-bold text-gray-700 text-sm" placeholder={currentPage} onKeyDown={handlePageSubmit} />
            <span className="text-gray-400 text-xs border-l border-gray-200 pl-2 ml-1">/ {totalPages}</span>
          </div>
          <button onClick={onNextPage} disabled={currentPage >= totalPages} className="p-2 text-gray-600 hover:text-indigo-600 disabled:opacity-30 rounded-md">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* GROUP 4: TEXT TOOLS */}
        {layoutMode !== 'pdf' && (
          <div className="flex items-center gap-0.5 bg-gray-50/80 p-1 rounded-lg border border-gray-100 shrink-0">
            <button onClick={() => dispatchCustomEvent('decrease-text')} className={getBtnClass(false)} title="Decrease Text"><Minus size={16} /></button>
            <div className="px-1 text-gray-400"><Type size={18} /></div>
            <button onClick={() => dispatchCustomEvent('increase-text')} className={getBtnClass(false)} title="Increase Text"><Plus size={16} /></button>
          </div>
        )}

        {/* GROUP 5: GLOBAL SEARCH */}
        <div className="flex items-center ml-2 shrink-0">
          {showSearch ? (
            <div className="flex items-center bg-white rounded-lg pl-2 pr-1 py-1 animate-in slide-in-from-right-5 fade-in duration-200 border border-indigo-200 shadow-md ring-2 ring-indigo-50">
              {isIndexing ? (
                <Loader2 size={14} className="text-indigo-500 mr-2 animate-spin" />
              ) : (
                <Search size={14} className="text-indigo-500 mr-2" />
              )}
              <input
                type="text"
                autoFocus
                placeholder={isIndexing ? "Indexing book..." : "Find globally..."}
                className="bg-transparent outline-none text-sm w-28 text-gray-700 placeholder-gray-400"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && !isIndexing && (
                <span className="text-xs font-mono font-bold text-gray-500 border-l border-gray-200 pl-2 ml-1 mr-1 min-w-[40px] text-center whitespace-nowrap">
                  {globalMatches.length > 0 ? `${currentMatchIndex + 1} - ${globalMatches.length}` : '0 - 0'}
                </span>
              )}
              <div className="flex items-center gap-0.5 border-l border-gray-200 pl-1 ml-1">
                <button onClick={onPrevMatch} disabled={globalMatches.length === 0} className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={onNextMatch} disabled={globalMatches.length === 0} className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
              </div>
              <button onClick={toggleSearch} className="p-1 ml-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={toggleSearch} className={`${getBtnClass(false)} ml-1`} title="Search Globally">
              <Search size={18} />
            </button>
          )}

          {/* TEXT ALIGNMENT & FONTS */}
          {layoutMode !== 'pdf' && (
            <>
              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                <button onClick={() => dispatchCustomEvent("text-align", "left")} title="Align Left" className="p-1.5 rounded hover:bg-gray-100"><AlignLeft size={16} /></button>
                <button onClick={() => dispatchCustomEvent("text-align", "center")} title="Align Center" className="p-1.5 rounded hover:bg-gray-100"><AlignCenter size={16} /></button>
                <button onClick={() => dispatchCustomEvent("text-align", "right")} title="Align Right" className="p-1.5 rounded hover:bg-gray-100"><AlignRight size={16} /></button>
                <button onClick={() => dispatchCustomEvent("text-align", "justify")} title="Justify" className="p-1.5 rounded hover:bg-gray-100"><AlignJustify size={16} /></button>
              </div>

              <div className="ml-2 flex gap-2 border-l pl-2">
                <select onChange={(e) => dispatchCustomEvent("line-spacing", e.target.value)} className="px-2 py-1 rounded border border-gray-200 text-sm bg-gray-50 hover:bg-white cursor-pointer" title="Line Spacing">
                  <option value="">Spacing</option>
                  <option value="1.2">1.2</option>
                  <option value="1.5">1.5</option>
                  <option value="1.8">1.8</option>
                  <option value="2">2.0</option>
                </select>

                <select onChange={(e) => dispatchCustomEvent("change-font", e.target.value)} className="px-2 py-1 rounded border border-gray-200 text-sm bg-gray-50 hover:bg-white cursor-pointer">
                  <option value="">Font Family</option>
                  <option value="'Noto Nastaliq Urdu', serif">Noto Nastaliq Urdu</option>
                  <option value="'Amiri', serif">Amiri</option>
                  <option value="'Scheherazade New', serif">Scheherazade</option>
                  <option value="'Cairo', sans-serif">Cairo</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- RIGHT ACTIONS --- */}
      <div className="flex items-center pl-2">
        {layoutMode !== 'pdf' && (
          <button onClick={() => dispatchCustomEvent("download-content")} title="Export Formatted Text as PDF" className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
            <Download size={16} /> <span className="text-xs font-bold hidden md:block">Export</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;