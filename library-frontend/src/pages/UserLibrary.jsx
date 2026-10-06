import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

// --- Services + Hooks ---
import { bookService } from "../api/bookService";
import { categoryService } from "../api/categoryService";
import settingsService from "../api/settingsService";
import { useBookSearch } from "../hooks/useBookSearch";
import useAuth from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";

// --- Components ---
import RestrictedAccessFlow from "../components/book/RestrictedAccessFlow";
import SuccessScreen from "../components/RestrictedAccess/SuccessScreen";
import LibrarySearchStrip from "../components/public/LibrarySearchStrip";
import BookDetailsModal from "../components/book/BookDetailsModal";
import { getBookCover } from "../utils/cover";

// --- Icons ---
import {
  FaceFrownIcon,
  XMarkIcon,
  BookOpenIcon,
  LockClosedIcon as LockOutline,
  LockOpenIcon as LockOpenOutline,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  BookmarkIcon as BookmarkOutline,
} from "@heroicons/react/24/outline";

import {
  BookmarkIcon as BookmarkSolid,
} from "@heroicons/react/24/solid";

// --- Constants ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const FALLBACK_NO_COVER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#g)" />
  <rect x="24" y="24" width="352" height="552" rx="16" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="8 8" />
  <g fill="#94a3b8" transform="translate(160, 230) scale(3.3)">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 2v20" stroke="#64748b" stroke-width="2"/>
  </g>
  <text x="200" y="340" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" text-anchor="middle">No Cover Available</text>
  <text x="200" y="375" fill="#64748b" font-family="'Noto Naskh Arabic', serif" font-size="20" text-anchor="middle">غلاف دستیاب نہیں</text>
</svg>
`)}`;
const FALLBACK_BROKEN = FALLBACK_NO_COVER;

const showUpcomingToast = () => {
  toast("عنقریب...", {
    icon: "⏳",
    duration: 3500,
    style: {
      borderRadius: "16px",
      background: "#0F172A",
      color: "#38BDF8",
      fontSize: "20px",
      fontWeight: "bold",
      fontFamily: '"Noto Nastaliq Urdu", "Mehr Nastaliq Web", "Mehr", "Jameel Noori Nastaleeq", serif',
      padding: "12px 24px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
    }
  });
};

const safeBookText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") {
    const text = value.en || value.ur || value.ar || value.name || value.title;
    if (typeof text === "string" && text.trim()) return text.trim();
    for (const k of Object.keys(value)) {
      if (typeof value[k] === "string" && value[k].trim()) return value[k].trim();
    }
    return fallback;
  }
  const str = String(value).trim();
  return str.length ? str : fallback;
};

import PublicBookCard from "../components/public/PublicBookCard";


// ==========================================
// 2. MAIN USER LIBRARY COMPONENT
// ==========================================
const UserLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuth, user } = useAuth();
  const isAdmin = Boolean(user && (user.role === 'admin' || user.is_superuser || user.is_staff || user.role === 'ADMIN'));

  // --- THEME & SEARCH BAR LAYOUT OPTIONS (1, 2, 3) ---
  const themeContext = useTheme?.();
  const uiSettings = themeContext?.uiSettings;
  const updatePreview = themeContext?.updatePreview;

  const [activeLayout, setActiveLayout] = useState(() => {
    return localStorage.getItem("kil_library_search_layout") || uiSettings?.library_search_layout || "option1";
  });

  useEffect(() => {
    if (uiSettings?.library_search_layout) {
      setActiveLayout(uiSettings.library_search_layout);
    }
  }, [uiSettings?.library_search_layout]);

  const handleAdminLayoutChange = async (newLayout) => {
    setActiveLayout(newLayout);
    try {
      localStorage.setItem("kil_library_search_layout", newLayout);
      if (updatePreview) {
        updatePreview({ library_search_layout: newLayout });
      }
      await settingsService.updateUiSettings({
        ...(uiSettings || {}),
        library_search_layout: newLayout,
      });
      toast.success(`Active Search Layout: ${newLayout === 'option1' ? 'Option 1 (Sticky Unified)' : newLayout === 'option2' ? 'Option 2 (Catalog Header)' : 'Option 3 (Classic + Floating)'}`);
    } catch {
      toast.success(`Active Search Layout: ${newLayout.toUpperCase()}`);
    }
  };

  // Scroll tracking to trigger sticky bar or floating pill
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledPastHero(window.scrollY > 280);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- STATE ---
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState("newest"); // Default: Latest / Newest first
  const [showScrollTop, setShowScrollTop] = useState(false);
  const activeRequestRef = useRef(0);

  // Pagination State (Items per page dropdown: 10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // --- MODAL & FLOW ---
  const [selectedBook, setSelectedBook] = useState(null);

  // Restricted flow
  const [restrictedBook, setRestrictedBook] = useState(null);
  const [isAccessFlowOpen, setIsAccessFlowOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // --- FAVORITES ---
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("bookNest_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- CATEGORIES ---
  const categories = useMemo(() => {
    if (dynamicCategories.length > 0) {
      return [
        { value: "all", label: "All Categories" },
        { value: "general", label: "General" },
        ...dynamicCategories.map(cat => ({
          value: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '_'),
          label: cat.name || cat.category_name,
          id: cat.id
        }))
      ];
    }
    return [
      { value: "all", label: "All Categories" },
      { value: "general", label: "General" },
      { value: "aqeedah_fiqh", label: "Aqeedah & Fiqh" },
      { value: "quran_sciences", label: "Quran & Sciences" },
      { value: "history_seerah", label: "History & Seerah" },
      { value: "literature", label: "Literature & Adab" },
      { value: "science_tech", label: "Science & Tech" },
      { value: "islamic_studies", label: "General Islamic Studies" },
    ];
  }, [dynamicCategories]);

  // --- SEARCH HOOK ---
  const {
    searchTerm,
    setSearchTerm,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategory,
    setSelectedCategory,
    filteredBooks,
  } = useBookSearch(books);

  const fetchBooks = async (searchText = "") => {
    const requestId = ++activeRequestRef.current;
    setLoading(true);

    try {
      const trimmed = searchText?.trim() || "";
      const data = await bookService.getAllBooks({
        approved_only: true,
        sort_order: 'desc',
        search: trimmed,
        limit: 5000,
      });

      if (requestId === activeRequestRef.current) {
        const rawList = Array.isArray(data) ? data : data?.books || [];
        const list = rawList.filter(b => b.is_approved === true);
        setBooks(list);
      }
    } catch (error) {
      console.error(error);
      if (requestId === activeRequestRef.current) {
        toast.error("Failed to load library.");
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.getAllCategories();
        const categoryList = Array.isArray(data) ? data : data?.categories || [];
        setDynamicCategories(categoryList);
      } catch (error) {
        setDynamicCategories([]);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (loading || !Array.isArray(books) || books.length === 0) return;

    const urlSearch = searchParams.get('search');
    const stateSearch = location.state?.preSearch;
    const searchValue = urlSearch || stateSearch;

    if (searchValue && searchValue.trim()) {
      setSearchTerm(searchValue);
      setTimeout(() => {
        const el = document.getElementById("book-grid-container");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [loading, books.length, searchParams.toString(), location.state?.preSearch, setSearchTerm]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      fetchBooks(searchTerm);
    }, 350);

    return () => window.clearTimeout(handler);
  }, [searchTerm, isAuth]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLanguage, selectedCategory, sortBy]);

  // --- HELPERS ---
  const safeText = (v, f = "") => {
    if (!v) return f;
    if (typeof v === "object") return v?.name || v?.title || v?.slug || f;
    return String(v);
  };

  const safeCategory = (book) => {
    if (!book) return "General";
    if (book.category && typeof book.category === 'object') {
      return safeBookText(book.category.name || book.category.title || book.category, "General");
    }
    if (book.subcategories && Array.isArray(book.subcategories) && book.subcategories.length > 0) {
      const sub = book.subcategories[0];
      if (sub.category && typeof sub.category === 'object') {
        return safeBookText(sub.category.name || sub.category, "General");
      }
      return safeBookText(sub.name, "General");
    }
    if (typeof book.category === 'string') return book.category;
    return "General";
  };

  const toggleFavorite = (e, bookId) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId];

      try {
        localStorage.setItem("bookNest_favorites", JSON.stringify(updated));
      } catch {}

      return updated;
    });
  };

  const handleRequestAccess = (book) => {
    setSelectedBook(null);
    if (!isAuth) {
      toast.error("Please login to request access.");
      navigate("/login");
      return;
    }
    setRestrictedBook(book);
    setIsAccessFlowOpen(true);
  };

  const scrollToTop = () => {
    const el = document.getElementById("book-grid-container");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- SORTING ---
  const finalDisplayBooks = useMemo(() => {
    const sorted = [...(Array.isArray(filteredBooks) ? filteredBooks : [])];
    const safeId = (b) => Number(b?.id) || 0;

    if (sortBy === "newest") {
      sorted.sort((a, b) => safeId(b) - safeId(a));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => safeId(a) - safeId(b));
    } else if (sortBy === "az") {
      sorted.sort((a, b) => safeBookText(a?.title).localeCompare(safeBookText(b?.title)));
    } else if (sortBy === "favorites") {
      return sorted.filter((b) => favorites.includes(b.id));
    }

    return sorted;
  }, [filteredBooks, sortBy, favorites]);

  // --- PAGINATION (10 per page) ---
  const totalPages = Math.ceil(finalDisplayBooks.length / itemsPerPage) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalDisplayBooks.slice(start, start + itemsPerPage);
  }, [finalDisplayBooks, currentPage, itemsPerPage]);

  const activeCategoryLabel = useMemo(() => {
    if (selectedCategory === "all") return "All Books";
    const found = categories.find(c => c.value === selectedCategory);
    return found ? safeBookText(found.label, "All Books") : selectedCategory.replace(/_/g, " ");
  }, [selectedCategory, categories]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-slate-800 pb-24 relative">
      {/* 🛠️ ADMIN REALTIME LAYOUT CONTROLLER */}
      {isAdmin && (
        <div className="bg-slate-900 text-white px-3 py-2 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 z-40 relative">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-slate-200">Admin Live Control:</span>
            <span className="text-slate-400 hidden sm:inline">Search Layout Mode (/books)</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "option1", label: "Option 1 (Sticky Unified)" },
              { id: "option2", label: "Option 2 (Catalog Header)" },
              { id: "option3", label: "Option 3 (Classic + Floating)" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleAdminLayoutChange(opt.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  activeLayout === opt.id
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          HERO SECTION: DYNAMIC ACCORDING TO ACTIVE LAYOUT
      ======================================================== */}
      {activeLayout === "option2" ? (
        /* OPTION 2: MINIMALIST ROYAL ISLAMIC BANNER */
        <div className="relative bg-gradient-to-b from-[#031525] via-[#052827] to-[#020d18] pt-6 pb-8 sm:pt-10 sm:pb-12 px-4 rounded-b-[2rem] shadow-2xl border-b border-amber-500/20 overflow-hidden text-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide mb-2 sm:mb-3 backdrop-blur-sm shadow-xs">
              <BookOpenIcon className="w-4 h-4 text-amber-400" />
              <span>مرکز اہل حدیث کوکن • ڈیجیٹل کتب خانہ</span>
            </div>
            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-md"
              style={{ fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq Web', 'Mehr', 'Jameel Noori Nastaleeq', serif" }}
            >
              کوکن اسلامک لائبریری
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-emerald-200/90 font-medium">
              7,800+ مستند اسلامی کتب، تفاسیر اور علمی مخطوطات کا ذخیرہ
            </p>
          </div>
        </div>
      ) : (
        /* OPTION 1 & OPTION 3: ROYAL ISLAMIC HERO (WITH EMBEDDED SEARCH & PILLS) */
        <div className="relative bg-gradient-to-b from-[#031525] via-[#052827] to-[#020d18] pt-8 pb-12 sm:pt-12 sm:pb-20 px-4 rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-2xl border-b border-amber-500/20 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide mb-3 sm:mb-4 backdrop-blur-sm shadow-xs">
                <BookOpenIcon className="w-4 h-4 text-amber-400" />
                <span>مرکز اہل حدیث کوکن • ڈیجیٹل کتب خانہ</span>
              </div>

              <h1
                className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 sm:mb-4 leading-tight drop-shadow-md"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq Web', 'Mehr', 'Jameel Noori Nastaleeq', serif" }}
              >
                کوکن اسلامک لائبریری
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/90 font-medium max-w-2xl mx-auto leading-relaxed">
                مستند اسلامی علوم، تفاسیر، کتبِ احادیث، فقہ اور فتاویٰ کا جدید اور تیز ترین ڈیجیٹل ذخیرہ۔
              </p>
            </motion.div>

            <div className="mx-auto mt-6 sm:mt-8 max-w-4xl">
              <LibrarySearchStrip
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                title="Library Search"
                subtitle="Search the library collection"
                description="Search by title, author, language, category, and deep-book content with a premium discovery experience."
                placeholder="کتاب کا نام، مصنف یا موضوع تلاش کریں..."
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                showHint={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* OPTION 2: SEARCH BAR DIRECTLY ABOVE CATALOG */}
      {activeLayout === "option2" && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 mt-4">
          <LibrarySearchStrip
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            title="Library Search"
            subtitle="Search the library collection"
            placeholder="کتاب کا نام، مصنف یا موضوع تلاش کریں..."
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            showHint={false}
          />
        </div>
      )}

      {/* ========================================================
          FILTER BAR (STICKY ON SCROLL)
      ======================================================== */}
      <div className="sticky top-14 sm:top-16 z-30 max-w-7xl mx-auto px-2 sm:px-4 mt-2 sm:mt-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl border border-white/70 bg-white/95 p-2 sm:p-2.5 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.4)] backdrop-blur-xl flex flex-col gap-2 justify-between items-stretch md:flex-row md:items-center md:gap-3"
        >
          {/* OPTION 1: LIVE SEARCH SLIDES IN ONLY WHEN SCROLLED PAST HERO (ZERO DUPLICATE AT TOP) */}
          <AnimatePresence>
            {activeLayout === "option1" && isScrolledPastHero && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="relative flex-1 min-w-[200px]"
              >
                <div className="relative flex items-center rounded-xl bg-slate-100/90 border border-slate-200/90 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all px-3 py-1.5">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Quick search books..."
                    className="w-full bg-transparent px-2 py-0.5 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                      title="Clear search"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters (Language & Category) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap flex-1">
            <select
              className="flex-1 sm:flex-initial min-w-[120px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs sm:text-sm font-medium outline-none transition hover:border-emerald-500 cursor-pointer"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="all">🌐 All Languages</option>
              <option value="urdu">Urdu (اردو)</option>
              <option value="arabic">Arabic (عربی)</option>
              <option value="english">English (انگریزی)</option>
              <option value="hindi">Hindi (ہندی)</option>
            </select>

            <select
              className="flex-1 sm:flex-initial max-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs sm:text-sm font-medium outline-none transition hover:border-emerald-500 cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Controls (View Toggle & Sort) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-slate-100 pt-1.5 md:border-t-0 md:pt-0">
            {/* View Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white shadow text-emerald-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Grid view"
              >
                <Squares2X2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white shadow text-emerald-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="List view"
              >
                <ListBulletIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 sm:px-2.5">
              <ArrowsUpDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              <select
                className="bg-transparent text-xs sm:text-sm font-medium text-slate-700 outline-none cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Serial # (1, 2, 3...)</option>
                <option value="az">Title (A-Z)</option>
                <option value="favorites">My Favorites</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ========================================================
          OPTION 3: FLOATING SEARCH JUMP PILL ON SCROLL
      ======================================================== */}
      <AnimatePresence>
        {activeLayout === "option3" && isScrolledPastHero && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-20 right-4 sm:right-8 z-40"
          >
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs shadow-2xl border border-white/20 transition-all hover:scale-105 cursor-pointer active:scale-95"
              title="Jump to Search"
            >
              <MagnifyingGlassIcon className="w-4 h-4 text-emerald-400" />
              <span>Search Books (Top)</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT CONTAINER */}
      <div id="book-grid-container" className="max-w-7xl mx-auto px-4 mt-6 md:mt-12 space-y-8">
        
        {/* Active Catalog Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 bg-white/60 p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {activeCategoryLabel}
              </h2>
              {selectedCategory !== "all" && (
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-bold transition-colors"
                >
                  Show All
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Showing <span className="font-bold text-slate-900">{finalDisplayBooks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, finalDisplayBooks.length)}</span> of <span className="font-bold text-slate-900">{finalDisplayBooks.length}</span> total books
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Books Per Page Selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Books per page:</span>
              <div className="relative inline-block">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                    scrollToTop();
                  }}
                  className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1 pr-7 appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#002147]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 animate-pulse">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/90 p-3 space-y-3 shadow-2xs"
              >
                <div className="aspect-[2/3] rounded-xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded-md w-4/5" />
                  <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedBooks.length > 0 ? (
          <div>
            {/* BOOK GRID / LIST (10 items per page) */}
            <motion.div
              id="book-grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-6"
                  : "grid grid-cols-1 md:grid-cols-2 gap-4"
              }
            >
              <AnimatePresence>
                {paginatedBooks.map((book) => (
                  <motion.div
                    key={book.id}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`group relative ${
                      viewMode === "list"
                        ? "flex bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                        : ""
                    }`}
                  >
                    <div
                      className={`relative cursor-pointer w-full ${
                        viewMode === "list"
                          ? "flex gap-4"
                          : "transition-transform duration-300 group-hover:-translate-y-2"
                      }`}
                      onClick={() => setSelectedBook(book)}
                    >
                      {/* Image / Card Area */}
                      <div className={viewMode === "list" ? "w-24 shrink-0" : ""}>
                        <PublicBookCard
                          book={book}
                          onClick={() => setSelectedBook(book)}
                          isFavorite={favorites.includes(book.id)}
                          onToggleFavorite={toggleFavorite}
                          className={viewMode === "list" ? "h-36" : ""}
                        />
                      </div>

                      {/* List View Details */}
                      {viewMode === "list" && (
                        <div className="flex-1 flex flex-col justify-center py-1">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                              {safeCategory(book)}
                            </span>
                            {book.is_restricted && (
                              book.user_has_access ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <LockOpenOutline className="w-3.5 h-3.5" />
                                  <span>Unlocked</span>
                                </span>
                              ) : (
                                <LockOutline className="w-4 h-4 text-red-500" />
                              )
                            )}
                          </div>

                          <h3 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-2">
                            {safeBookText(book?.title, "Untitled Book")}
                          </h3>

                          <p className="text-xs text-slate-500 mb-2">
                            By {safeBookText(book?.author, "Unknown Author")}
                            {book.translator && ` (ترجمہ: ${safeBookText(book.translator)})`}
                          </p>

                          <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                            {book.description || `Publisher: ${book.publisher || 'N/A'}`}
                          </p>

                          <div className="mt-auto flex items-center gap-2">
                            {book.pdf_url || book.txt_file_url ? (
                              <button
                                className="text-xs font-bold text-emerald-600 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/read/${book.id}`);
                                }}
                              >
                                Read Now
                              </button>
                            ) : (
                              <button
                                className="text-xs font-bold text-amber-600 inline-flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showUpcomingToast();
                                }}
                              >
                                <span>⏳</span> <span>عنقریب...</span>
                              </button>
                            )}

                            <span className="text-slate-300">•</span>

                            <button
                              className={`inline-flex items-center gap-1 text-xs font-bold transition-colors ${
                                favorites.includes(book.id) ? "text-emerald-600" : "text-slate-500 hover:text-emerald-600"
                              }`}
                              onClick={(e) => toggleFavorite(e, book.id)}
                            >
                              {favorites.includes(book.id) ? (
                                <>
                                  <BookmarkSolid className="h-4 w-4 text-emerald-600" />
                                  <span>Saved</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkOutline className="h-4 w-4" />
                                  <span>Save</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* 📄 CLEAN PAGINATION BAR WITH ROWS PER PAGE DROPDOWN */}
            {finalDisplayBooks.length > 0 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                {/* Books Per Page Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Books per page:</span>
                  <div className="relative inline-block">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                        scrollToTop();
                      }}
                      className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 pr-8 appearance-none cursor-pointer outline-none shadow-2xs focus:ring-2 focus:ring-[#002147]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-xs text-slate-400 ml-2">
                    Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, finalDisplayBooks.length)} of {finalDisplayBooks.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {/* Previous Button */}
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(p => p - 1);
                        scrollToTop();
                      }
                    }}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                    if (endPage - startPage + 1 < maxVisible) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }

                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => { setCurrentPage(1); scrollToTop(); }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === 1
                              ? "bg-[#002147] text-white shadow-sm"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="dots-start" className="px-1 text-slate-400 text-xs">...</span>);
                      }
                    }

                    for (let p = startPage; p <= endPage; p++) {
                      pages.push(
                        <button
                          key={p}
                          onClick={() => { setCurrentPage(p); scrollToTop(); }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === p
                              ? "bg-[#002147] text-white shadow-sm"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="dots-end" className="px-1 text-slate-400 text-xs">...</span>);
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => { setCurrentPage(totalPages); scrollToTop(); }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === totalPages
                              ? "bg-[#002147] text-white shadow-sm"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}

                  {/* Next Button */}
                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(p => p + 1);
                        scrollToTop();
                      }
                    }}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-slate-100">
            <FaceFrownIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-800">No books found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No books matched the selected filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setSelectedLanguage("all");
              }}
              className="mt-6 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 text-sm"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Scroll top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-4 bg-[#002147] text-white rounded-full shadow-2xl hover:bg-blue-900 transition-colors border-2 border-white/20"
            title="Scroll to top"
          >
            <ArrowUpIcon className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* QUICK VIEW / BOOK DETAILS MODAL */}
      {selectedBook && (
        <BookDetailsModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onRequestAccess={(b) => handleRequestAccess(b)}
        />
      )}

      {isAccessFlowOpen && (
        <RestrictedAccessFlow
          isOpen={isAccessFlowOpen}
          book={restrictedBook}
          onClose={() => setIsAccessFlowOpen(false)}
          onSuccess={() => setShowSuccess(true)}
        />
      )}

      {showSuccess && (
        <SuccessScreen
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  );
};

export default UserLibrary;
