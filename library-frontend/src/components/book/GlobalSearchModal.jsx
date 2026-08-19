import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, BookOpen, ChevronRight, FileText } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000");

// Fallback cover agar book ki image na ho
const FALLBACK_COVER = "data:image/svg+xml;utf8," + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="360" height="520">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" font-size="22" fill="#64748b" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">No Cover</text>
  </svg>
`);

const getMediaUrl = (path) => {
  if (!path) return FALLBACK_COVER;
  let clean = String(path).replace(/\\/g, "/");
  if (clean.startsWith("http")) return clean;
  if (!clean.startsWith("/")) clean = "/" + clean;
  return `${API_BASE_URL}${clean}`;
};

const GlobalSearchModal = ({ isOpen, onClose, onResultClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Debounced API Call Logic
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/books/deep-search?query=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Deep search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms delay taaki har keypress par server request na jaye

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[10vh] px-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      
      {/* Search Container */}
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100 bg-gray-50/50 relative">
          <Search className="text-indigo-500 mr-3 shrink-0" size={24} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search any topic, word, or phrase across all books..."
            className="flex-1 bg-transparent text-lg text-gray-800 placeholder-gray-400 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <Loader2 className="animate-spin text-indigo-400 mx-3 shrink-0" size={20} />}
          
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto bg-white p-2 custom-scrollbar">
          
          {/* Empty State / Initial State */}
          {!hasSearched && query.length < 3 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BookOpen size={48} className="mb-4 text-gray-200" strokeWidth={1.5} />
              <p className="text-lg">Type at least 3 characters to search</p>
              <p className="text-sm text-gray-400 mt-1">We will scan all text files in your library.</p>
            </div>
          )}

          {/* No Results Found */}
          {hasSearched && !isLoading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <FileText size={48} className="mb-4 text-gray-200" strokeWidth={1.5} />
              <p className="text-lg font-medium text-gray-700">No matching text found.</p>
              <p className="text-sm mt-1">Try a different keyword or check spelling.</p>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="p-2 space-y-2">
              <div className="px-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Found {results.length} Matches
              </div>
              
              {results.map((result, index) => (
                <div 
                  key={`${result.book_id}-${index}`}
                  onClick={() => onResultClick(result.book_id, result.page_number, query)}
                  className="group flex gap-4 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 cursor-pointer transition-all"
                >
                  {/* Book Cover Thumbnail */}
                  <img 
                    src={getMediaUrl(result.cover_image)} 
                    alt={result.title} 
                    className="w-12 h-16 object-cover rounded shadow-sm shrink-0 border border-gray-100"
                  />
                  
                  {/* Book Info & Snippet */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-gray-800 text-sm truncate group-hover:text-indigo-700 transition-colors">
                        {result.title}
                      </h4>
                      <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                        Page {result.page_number}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-1 truncate">{result.author || "Unknown Author"}</p>
                    
                    {/* The matching text snippet from the backend */}
                    <div 
                      className="text-sm text-gray-600 line-clamp-2 italic bg-white group-hover:bg-indigo-50 border border-gray-100 group-hover:border-transparent p-2 rounded-lg"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                      // Notice: Backend sends <mark> tags inside the snippet which makes it highlight automatically!
                    />
                  </div>
                  
                  {/* Arrow Icon */}
                  <div className="flex items-center justify-center text-gray-300 group-hover:text-indigo-500 transition-colors pl-2 shrink-0">
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 border-t border-gray-100 p-3 text-center text-xs text-gray-400">
          Press <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-500">ESC</kbd> to close
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;