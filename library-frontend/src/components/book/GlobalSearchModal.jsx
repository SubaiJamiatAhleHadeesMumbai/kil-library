import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, BookOpen, ChevronRight, FileText, AlertCircle, Copy, Download, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const SEARCH_I18N = {
  en: {
    placeholder: "Search book text, topics, or phrases...",
    foundMatches: (count) => `Found ${count} match${count === 1 ? '' : 'es'}`,
    page: "Page",
    copyCitation: "Copy Citation",
    citationCopied: "Citation copied to clipboard!",
    exportReport: "Export Research Report",
    recentSearches: "Recent Searches",
    clear: "Clear",
    initialPrompt: "Type at least 1 character to search",
    initialDesc: "Deep search scans book text and returns matching pages fast.",
    noResults: "No matching text found.",
    noResultsDesc: "Try a different keyword or check spelling.",
    searchFailed: "Search Failed",
    networkError: "Network error occurred while searching.",
    unknownAuthor: "Unknown Author",
    bookCitation: "Book",
    authorCitation: "Author",
    pageCitation: "Page",
    linkCitation: "Library Link",
    printReport: "Print / Save PDF",
    close: "Close",
    reportTitle: "Research Report",
    libraryBrand: "Markaz Islamic Library",
    restrictedBadge: "Restricted",
  },
  ur: {
    placeholder: "کتاب کے متن میں تلاش کریں...",
    foundMatches: (count) => `کل ${count} نتائج موصول ہوئے`,
    page: "صفحہ",
    copyCitation: "اقتباس بمع حوالہ",
    citationCopied: "اقتباس بمع حوالہ کاپی ہو گیا!",
    exportReport: "تحقیقی رپورٹ ایکسپورٹ",
    recentSearches: "حالیہ تلاش",
    clear: "صاف کریں",
    initialPrompt: "تلاش کے لیے کم از کم 1 حرف لکھیں",
    initialDesc: "یہ انجن کتب کے صفحات کو اسکین کر کے الفاظ تلاش کرتا ہے۔",
    noResults: "متن میں کوئی نتیجہ نہیں ملا۔",
    noResultsDesc: "کوئی دوسرا لفظ لکھیں یا ہجے (Spelling) چیک کریں۔",
    searchFailed: "تلاش میں رکاوٹ آئی",
    networkError: "سرور سے رابطہ نہیں ہو سکا۔",
    unknownAuthor: "معلوم نہیں",
    bookCitation: "کتاب",
    authorCitation: "مصنف",
    pageCitation: "صفحہ",
    linkCitation: "مرکز لائبریری لنک",
    printReport: "پرنٹ / پی ڈی ایف محفوظ کریں",
    close: "بند کریں",
    reportTitle: "تحقیقی رپورٹ",
    libraryBrand: "مرکز اسلامی لائبریری",
    restrictedBadge: "مخصوص کتاب",
  },
  ar: {
    placeholder: "ابحث في محتوى الكتب...",
    foundMatches: (count) => `تم العثور على ${count} نتيجة`,
    page: "صفحة",
    copyCitation: "نسخ الاقتباس مع المرجع",
    citationCopied: "تم نسخ الاقتباس مع المرجع بنجاح!",
    exportReport: "تصدير التقرير البحثي",
    recentSearches: "عمليات البحث الأخيرة",
    clear: "مسح",
    initialPrompt: "اكتب حرفًا واحدًا على الأقل للبحث",
    initialDesc: "يبحث هذا المحرك في صفحات الكتب ويعرض النصوص المطابقة بسرعة.",
    noResults: "لم يتم العثور على نص مطابق.",
    noResultsDesc: "يرجى تجربة كلمة أخرى أو التحقق من صحة الكتابة.",
    searchFailed: "فشل البحث",
    networkError: "حدث خطأ أثناء الاتصال بالخادم.",
    unknownAuthor: "مؤلف غير معروف",
    bookCitation: "الكتاب",
    authorCitation: "المؤلف",
    pageCitation: "الصفحة",
    linkCitation: "رابط المكتبة",
    printReport: "طباعة / حفظ كملف PDF",
    close: "إغلاق",
    reportTitle: "تقرير بحثي",
    libraryBrand: "المكتبة الإسلامية",
    restrictedBadge: "كتاب مقيد",
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

// Fallback SVG cover when book image is missing (Coming Soon Badge)
const FALLBACK_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1120"/>
          <stop offset="50%" stop-color="#002147"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <rect width="360" height="520" fill="url(#bg)"/>
      <rect x="16" y="16" width="328" height="488" rx="8" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 4"/>
      <rect x="22" y="22" width="316" height="476" rx="6" fill="none" stroke="#10b981" stroke-opacity="0.3" stroke-width="1"/>
      <circle cx="180" cy="180" r="54" fill="#0f172a" stroke="#10b981" stroke-width="2" stroke-opacity="0.4"/>
      <path d="M160 162h40c2.2 0 4 1.8 4 4v32c0 2.2-1.8 4-4 4h-40c-2.2 0-4-1.8-4-4v-32c0-2.2 1.8-4 4-4zm4 8v24h32v-24h-32z" fill="#34d399"/>
      <path d="M168 178h16v4h-16zm0 8h24v4h-24z" fill="#6ee7b7"/>
      <text x="180" y="275" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="3" text-anchor="middle">MARKAZ ISLAMIC LIBRARY</text>
      <text x="180" y="320" font-family="'Traditional Arabic', 'Amiri', serif" font-size="28" font-weight="bold" fill="url(#gold)" text-anchor="middle">قَرِيبـاً</text>
      <text x="180" y="355" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#ffffff" letter-spacing="2" text-anchor="middle">COMING SOON</text>
      <rect x="120" y="375" width="120" height="22" rx="11" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.4"/>
      <text x="180" y="390" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399" letter-spacing="1" text-anchor="middle">COVER IN PROCESS</text>
    </svg>
  `);

const getMediaUrl = (path) => {
  if (!path) return FALLBACK_COVER;
  let clean = String(path).replace(/\\/g, "/");
  if (clean.startsWith("http")) return clean;
  if (!clean.startsWith("/")) clean = "/" + clean;
  return `${API_BASE_URL}${clean}`;
};

const HISTORY_STORAGE_KEY = 'kil2-deep-search-history';
const MAX_HISTORY_ITEMS = 8;

const highlightQueryText = (text, query) => {
  if (!text) return null;
  const value = String(text);
  const term = String(query || '').trim();
  if (!term) return value;

  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = value.split(new RegExp(`(${safe})`, 'gi'));

  return parts.map((part, index) => (
    part.toLowerCase() === term.toLowerCase()
      ? <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5 font-semibold text-slate-900">{part}</mark>
      : <span key={`${part}-${index}`}>{part}</span>
  ));
};

const GlobalSearchModal = ({ isOpen, onClose, onResultClick, initialQuery = '' }) => {
  const { currentLang = 'ur', isRTL = true } = useLanguage();
  const loc = SEARCH_I18N[currentLang] || SEARCH_I18N.ur;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchSettings, setSearchSettings] = useState({ citation_enabled: true, export_enabled: true });
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );

  const navigate = useNavigate();
  const inputRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const activeRequestRef = useRef(null);

  const handleCardClick = (result) => {
    if (onResultClick) {
      onResultClick(result.book_id, result.page_number, query, result);
    } else {
      navigate(`/read/${result.book_id}?page=${result.page_number}&q=${encodeURIComponent(query)}`);
      onClose?.();
    }
  };

  const copyCitation = (result, e) => {
    e.stopPropagation();
    e.preventDefault();
    const cleanSnippet = (result.snippet || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\.{3,}/g, '')
      .trim();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const citationText = `"${cleanSnippet}"\n\n📖 ${loc.bookCitation}: ${result.title}\n✍️ ${loc.authorCitation}: ${result.author || loc.unknownAuthor}\n📄 ${loc.pageCitation}: ${result.page_number}\n🔗 ${loc.linkCitation}: ${origin}/read/${result.book_id}?page=${result.page_number}`;
    
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(citationText);
      toast.success(loc.citationCopied);
    } else {
      toast.error('Clipboard access not available.');
    }
  };

  const exportResearchReport = () => {
    if (results.length === 0) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export report');
      return;
    }

    const rowsHtml = results.map((r, i) => `
      <div style="margin-bottom: 20px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="font-size: 15px; color: #1e293b; line-height: 1.8;">${r.snippet}</div>
        <div style="margin-top: 10px; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          <strong>${loc.bookCitation}:</strong> ${r.title} | <strong>${loc.authorCitation}:</strong> ${r.author || 'N/A'} | <strong>${loc.pageCitation}:</strong> ${r.page_number}
          | <a href="${origin}/read/${r.book_id}?page=${r.page_number}" target="_blank" style="color: #0284c7;">${loc.readPage}</a>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${currentLang}">
      <head>
        <meta charset="utf-8">
        <title>${loc.reportTitle} - ${query}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; max-width: 800px; margin: auto; }
          h1 { color: #002147; border-bottom: 2px solid #002147; padding-bottom: 10px; font-size: 22px; }
          mark { background: #fde047; padding: 2px 4px; border-radius: 4px; font-weight: bold; }
          .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #002147; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">🖨️ ${loc.printReport}</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer;">${loc.close}</button>
        </div>
        <h1>${loc.reportTitle}: ${query}</h1>
        <div class="meta">${loc.libraryBrand} • ${loc.foundMatches(results.length)}</div>
        ${rowsHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const addRecentSearch = useCallback((value) => {
    const term = String(value || '').trim();
    if (!term) return;

    setRecentSearches((current) => {
      const next = [term, ...current.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, MAX_HISTORY_ITEMS);
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('Unable to save deep search history', err);
      }
      return next;
    });
  }, []);

  // Handle ESC key press to close modal
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Modal open/close lifecycle & keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      setQuery(initialQuery || '');
      try {
        const savedHistory = JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
        if (Array.isArray(savedHistory)) {
          setRecentSearches(savedHistory.filter(Boolean).slice(0, MAX_HISTORY_ITEMS));
        }
      } catch (err) {
        setRecentSearches([]);
      }
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setError(null);
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    }
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
    }
  }, [initialQuery, isOpen]);

  // Efficient mobile media query listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const handleMediaChange = (e) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  // Debounced API search with caching & AbortController
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cached = searchCacheRef.current.get(normalizedQuery);
    if (cached) {
      setResults(cached);
      setHasSearched(true);
      setIsLoading(false);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      setError(null);

      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }

      const controller = new AbortController();
      activeRequestRef.current = controller;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/books/deep-search?query=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.disabled) {
            setError(data.message || 'Deep search is disabled by administrator.');
            setResults([]);
            return;
          }
          const nextResults = data.results || [];
          if (data.settings) {
            setSearchSettings(data.settings);
          }
          searchCacheRef.current.set(normalizedQuery, nextResults);
          setResults(nextResults);
          addRecentSearch(query.trim());
        } else {
          setError('Unable to fetch search results. Please try again.');
          setResults([]);
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Deep search failed:', err);
          setError('Network error occurred while searching.');
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const runRecentSearch = (term) => {
    setQuery(term);
    setHasSearched(true);
    setError(null);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (err) {
      console.warn('Unable to clear deep search history', err);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-start sm:pt-[10vh] px-0 sm:px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Book Search"
    >
      {/* Search Modal Container */}
      <div 
        className={`bg-white shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[80vh] animate-in fade-in zoom-in-95 duration-200 ${
          isMobile ? 'rounded-t-[1.5rem]' : 'rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white/95 px-3 py-3 backdrop-blur sm:px-4 sm:py-4">
          <div className="rounded-full bg-indigo-50 p-2 text-indigo-600 shrink-0">
            <Search size={isMobile ? 18 : 24} />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder={loc.placeholder}
            className={`flex-1 bg-transparent text-base sm:text-lg text-gray-800 placeholder-gray-400 outline-none ${isRTL ? 'text-right' : 'text-left'}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search input"
          />
          {isLoading && <Loader2 className="animate-spin text-indigo-500 shrink-0" size={20} />}
          
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
            aria-label="Close search modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-2 sm:bg-white sm:p-2 custom-scrollbar" dir={isRTL ? "rtl" : "ltr"}>
          {/* Initial State */}
          {!hasSearched && query.trim().length < 1 && (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center text-gray-400">
              <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <BookOpen size={36} className="text-indigo-200" strokeWidth={1.5} />
              </div>
              <p className="text-base font-semibold text-slate-700 sm:text-lg">{loc.initialPrompt}</p>
              <p className="mt-1 text-sm text-slate-500">{loc.initialDesc}</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center text-red-500">
              <div className="mb-4 rounded-3xl bg-red-50 p-4">
                <AlertCircle size={36} className="text-red-400" strokeWidth={1.5} />
              </div>
              <p className="text-base font-semibold text-slate-700 sm:text-lg">{loc.searchFailed}</p>
              <p className="mt-1 text-sm text-slate-500">{error}</p>
            </div>
          )}

          {/* No Results State */}
          {hasSearched && !isLoading && !error && results.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center text-gray-500">
              <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <FileText size={36} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="text-base font-semibold text-slate-700 sm:text-lg">{loc.noResults}</p>
              <p className="mt-1 text-sm text-slate-500">{loc.noResultsDesc}</p>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-2 p-2 sm:p-3">
              <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 sm:px-3">
                <span>{loc.foundMatches(results.length)}</span>
                {searchSettings.export_enabled && (
                  <button
                    type="button"
                    onClick={exportResearchReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>{loc.exportReport}</span>
                  </button>
                )}
              </div>
              
              {results.map((result, index) => (
                <div
                  key={`${result.book_id}-${result.page_number}-${index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(result)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCardClick(result);
                  }}
                  className="group flex w-full text-left gap-3 rounded-2xl border border-transparent bg-white p-3 shadow-sm transition-all hover:border-indigo-100 hover:bg-indigo-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:gap-4 cursor-pointer"
                >
                  {/* Book Cover Thumbnail */}
                  <img 
                    src={getMediaUrl(result.cover_image)} 
                    alt={result.title} 
                    onError={(e) => { e.target.src = FALLBACK_COVER; }}
                    className="h-16 w-12 shrink-0 rounded-xl border border-gray-100 object-cover shadow-sm sm:h-18 sm:w-14"
                  />
                  
                  {/* Book Info & Snippet */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h4 className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-indigo-700">
                        {highlightQueryText(result.title, query)}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="whitespace-nowrap rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                          {loc.page} {result.page_number}
                        </span>
                        {result.is_restricted && (
                          <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 flex items-center gap-1">
                            <Lock size={10} />
                            <span>{loc.restrictedBadge}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="mb-1 truncate text-xs text-slate-500">
                      {highlightQueryText(result.author || loc.unknownAuthor, query)}
                    </p>
                    
                    {/* Matching text snippet with highlight tags (<mark>) */}
                    <div 
                      className="line-clamp-2 rounded-xl border border-gray-100 bg-slate-50 p-2 text-sm italic text-slate-600 group-hover:border-transparent group-hover:bg-white [&>mark]:bg-amber-200 [&>mark]:font-semibold [&>mark]:text-slate-900 [&>mark]:px-0.5 [&>mark]:rounded"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />

                    {/* 1-Click Citation Tool */}
                    {searchSettings.citation_enabled && (
                      <div className="mt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => copyCitation(result, e)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-white border border-slate-200 bg-slate-50/80 transition shadow-2xs cursor-pointer"
                          title={loc.copyCitation}
                        >
                          <Copy size={12} />
                          <span>{loc.copyCitation}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Navigation Arrow */}
                  <div className={`flex shrink-0 items-center justify-center pl-1 text-gray-300 transition-colors group-hover:text-indigo-500 ${isRTL ? 'rotate-180' : ''}`}>
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Search History */}
          {recentSearches.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 px-3 py-4 sm:px-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {loc.recentSearches}
                </p>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[11px] font-semibold text-slate-400 transition hover:text-rose-600 cursor-pointer"
                >
                  {loc.clear}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => runRecentSearch(term)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-100 bg-white px-3 py-2 text-center text-[11px] text-gray-400 sm:bg-gray-50 sm:p-3 sm:text-xs">
          {currentLang === 'en' ? (
            <>Press <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-500 shadow-2xs">ESC</kbd> to close</>
          ) : currentLang === 'ar' ? (
            <>للإغلاق اضغط على <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-500 shadow-2xs">ESC</kbd></>
          ) : (
            <>بند کرنے کے لیے <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-500 shadow-2xs">ESC</kbd> دبائیں</>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};

export default GlobalSearchModal;