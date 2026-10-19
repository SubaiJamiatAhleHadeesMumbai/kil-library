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
import { useLanguage } from "../context/LanguageContext";

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
  FunnelIcon,
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
  const { language, isRTL } = useLanguage();
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const getCategoryIcon = (slug, label) => {
    const s = String(slug || label || "").toLowerCase();
    if (s.includes("tafseer") || s.includes("تفسیر") || s.includes("quran")) return "📖";
    if (s.includes("hadees") || s.includes("hadith") || s.includes("حدیث")) return "📚";
    if (s.includes("fiqh") || s.includes("فقہ")) return "📜";
    if (s.includes("history") || s.includes("seerah") || s.includes("تاریخ") || s.includes("سیرت")) return "⏰";
    if (s.includes("adab") || s.includes("literature") || s.includes("ادب")) return "✏️";
    if (s.includes("aqeedah") || s.includes("tasawwuf") || s.includes("عقیدہ")) return "🪙";
    if (s.includes("fatawa") || s.includes("فتاوی")) return "⚖️";
    if (s.includes("all") || s.includes("تمام")) return "🌐";
    return "📑";
  };

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
    <div className="min-h-screen bg-[#FAF8F5] font-sans text-[#1E293B] pb-24 relative islamic-lattice-bg" dir={isRTL ? "rtl" : "ltr"}>
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
              { id: "option1", label: "Option 1 (Sidebar + Grid - Image 2)" },
              { id: "option2", label: "Option 2 (Catalog Header)" },
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
          PAGE BODY: TWO-COLUMN LAYOUT (IMAGE 2 MATCH)
      ======================================================== */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        
        {/* MOBILE TOP BAR (< 1024px): Quick Search + Category Drawer Toggle */}
        <div className="lg:hidden mb-5 space-y-3">
          {/* Deep Emerald Search Pill */}
          <div className="relative rounded-2xl bg-[#0F3D2E] text-white px-3.5 py-2.5 flex items-center border border-[#C5A059]/40 shadow-sm">
            <MagnifyingGlassIcon className="w-5 h-5 text-[#C5A059] shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="کتاب، مصنف یا موضوع تلاش کریں..."
              className="bg-transparent text-sm text-white placeholder-emerald-200/60 px-3 py-0.5 outline-none w-full font-medium"
              style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 text-emerald-200 hover:text-white transition"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontal Quick Category Scroller + Drawer Button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3D2E] text-[#C5A059] font-bold text-xs shrink-0 shadow-xs border border-[#C5A059]/40 active:scale-95 transition"
            >
              <FunnelIcon className="w-4 h-4" />
              <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>تمام موضوعات</span>
            </button>

            {categories.slice(0, 8).map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.value);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all shadow-2xs ${
                    isSelected
                      ? "bg-[#0F3D2E] text-white border border-[#C5A059]/50 shadow-sm"
                      : "bg-white text-slate-700 border border-[#E6E2DD] hover:bg-emerald-50/60"
                  }`}
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  <span>{getCategoryIcon(cat.value, cat.label)}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          
          {/* ========================================================
              LEFT COLUMN: CATEGORY SIDEBAR (DESKTOP)
          ======================================================== */}
          <aside className="w-full lg:w-64 xl:w-72 shrink-0 hidden lg:block lg:sticky lg:top-20 z-20">
            <div className="rounded-3xl bg-white border border-[#E6E2DD] p-5 shadow-sm space-y-5">
              
              {/* Brand Title */}
              <div className="text-center pb-4 border-b border-[#E6E2DD]">
                <h2
                  className="text-xl font-black text-[#0F3D2E] leading-tight"
                  style={{ fontFamily: "'Noto Naskh Arabic', 'Plus Jakarta Sans', system-ui, sans-serif" }}
                >
                  کوکن اسلامک لائبریری
                </h2>
                <span className="text-[11px] font-bold text-[#C5A059] uppercase tracking-wider block mt-1">
                  Kokan Islamic Library
                </span>
              </div>

              {/* Deep Emerald Search Bar (Matches Image 2) */}
              <div className="relative rounded-2xl bg-[#0F3D2E] text-white px-3.5 py-2.5 flex items-center border border-[#C5A059]/40 shadow-xs focus-within:ring-2 focus-within:ring-[#C5A059]/50 transition">
                <MagnifyingGlassIcon className="w-4 h-4 text-[#C5A059] shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="تلاش کریں..."
                  className="bg-transparent text-xs sm:text-sm text-white placeholder-emerald-200/60 px-2 py-0.5 outline-none w-full font-medium"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="p-0.5 text-emerald-200 hover:text-white transition"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Categories Navigation (Matches Image 2) */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                  <span>علمی زمرہ جات</span>
                  <span className="text-[10px] text-[#C5A059] font-mono font-bold">Categories</span>
                </div>

                <nav className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.value);
                          setCurrentPage(1);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                          isSelected
                            ? "bg-[#0F3D2E] text-white shadow-md border border-[#C5A059]/50"
                            : "bg-white hover:bg-emerald-50/70 text-slate-700 hover:text-[#0F3D2E] border border-[#E6E2DD] shadow-2xs"
                        }`}
                        style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-base leading-none">{getCategoryIcon(cat.value, cat.label)}</span>
                          <span className="truncate">{cat.label}</span>
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#C5A059] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* ========================================================
              RIGHT COLUMN: CATALOG HEADER & BOOK GRID (IMAGE 2)
          ======================================================== */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            
            {/* Top Catalog Header & Controls Bar */}
            <div className="rounded-3xl bg-white border border-[#E6E2DD] p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-black text-[#0F3D2E] tracking-tight flex items-center gap-2.5 leading-snug"
                  style={{ fontFamily: "'Noto Naskh Arabic', 'Plus Jakarta Sans', system-ui, sans-serif" }}
                >
                  <span>جدید اسلامی کتب خانہ</span>
                </h1>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  <span>زمرہ: </span>
                  <strong className="text-[#0F3D2E]">{activeCategoryLabel}</strong>
                  <span className="mx-2">•</span>
                  <span>دستیاب کتب: </span>
                  <strong className="text-[#C5A059] font-mono">{finalDisplayBooks.length}</strong>
                </p>
              </div>

              {/* Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Language Select */}
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-[#E6E2DD] bg-[#FAF8F5] text-slate-800 px-3 py-2 text-xs font-bold outline-none shadow-2xs hover:border-emerald-300 cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  <option value="all">🌐 تمام زبانیں (All)</option>
                  <option value="urdu">اردو (Urdu)</option>
                  <option value="arabic">عربی (Arabic)</option>
                  <option value="english">انگریزی (English)</option>
                  <option value="hindi">ہندی (Hindi)</option>
                </select>

                {/* Sort Select */}
                <div className="flex items-center gap-1.5 rounded-xl border border-[#E6E2DD] bg-[#FAF8F5] px-2.5 py-1.5 shadow-2xs">
                  <ArrowsUpDownIcon className="w-4 h-4 text-[#C5A059]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    <option value="newest">تازہ ترین (Newest)</option>
                    <option value="oldest">نمبر شمار (Serial #)</option>
                    <option value="az">حروفِ تہجی (A-Z)</option>
                    <option value="favorites">محفوظ شدہ (Favorites)</option>
                  </select>
                </div>

                {/* Grid / List View Toggle */}
                <div className="flex rounded-xl bg-[#FAF8F5] p-1 border border-[#E6E2DD] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-[#0F3D2E] text-white shadow-xs"
                        : "text-slate-500 hover:text-[#0F3D2E]"
                    }`}
                    title="Grid view"
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-[#0F3D2E] text-white shadow-xs"
                        : "text-slate-500 hover:text-[#0F3D2E]"
                    }`}
                    title="List view"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* BOOKS CATALOG GRID */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 animate-pulse">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[#E6E2DD] bg-white p-4 space-y-4 shadow-xs">
                    <div className="aspect-[2/3] rounded-xl bg-slate-100 mx-auto w-3/4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 rounded-md w-4/5 mx-auto" />
                      <div className="h-3 bg-slate-100 rounded-md w-1/2 mx-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedBooks.length > 0 ? (
              <div>
                <motion.div
                  id="book-grid"
                  layout
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
                      : "grid grid-cols-1 gap-4"
                  }
                >
                  <AnimatePresence>
                    {paginatedBooks.map((book) => (
                      <motion.div
                        key={book.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="w-full"
                      >
                        {viewMode === "grid" ? (
                          <PublicBookCard
                            book={book}
                            onClick={() => setSelectedBook(book)}
                            isFavorite={favorites.includes(book.id)}
                            onToggleFavorite={toggleFavorite}
                          />
                        ) : (
                          /* Clean List View Card */
                          <div
                            onClick={() => setSelectedBook(book)}
                            className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-white border border-[#E6E2DD] hover:border-emerald-300 hover:shadow-md transition cursor-pointer shadow-2xs"
                          >
                            <div className="w-20 sm:w-24 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-[#E6E2DD]">
                              <img
                                src={getBookCover(book) || FALLBACK_NO_COVER}
                                alt={book.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = FALLBACK_NO_COVER; }}
                              />
                            </div>
                            <div className="flex-1 min-w-0 text-center sm:text-right">
                              <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full inline-block mb-1">
                                {safeCategory(book)}
                              </span>
                              <h3 className="text-base font-bold text-[#0F3D2E] leading-snug line-clamp-1" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                                {safeBookText(book.title)}
                              </h3>
                              <p className="text-xs text-[#64748B] mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                                مؤلف: <span className="text-slate-800 font-semibold">{safeBookText(book.author)}</span>
                              </p>
                              {book.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                  {book.description}
                                </p>
                              )}
                            </div>
                            <div className="flex sm:flex-col gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/read/${book.id}`);
                                }}
                                className="px-4 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                              >
                                📖 مطالعہ
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* 📄 CLEAN PAGINATION BAR (IMAGE 2 MATCH) */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#E6E2DD] shadow-xs">
                  {/* Books Per Page Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#64748B]">فی صفحہ کتب:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                        scrollToTop();
                      }}
                      className="rounded-xl border border-[#E6E2DD] bg-[#FAF8F5] text-slate-800 px-3 py-1.5 text-xs font-bold outline-none shadow-2xs hover:border-emerald-300 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs text-[#64748B] ml-2">
                      صفحہ {currentPage} از {totalPages}
                    </span>
                  </div>

                  {/* Page Navigation Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentPage > 1) {
                          setCurrentPage((p) => p - 1);
                          scrollToTop();
                        }
                      }}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-[#E6E2DD] bg-[#FAF8F5] text-slate-700 hover:bg-emerald-50 hover:text-[#0F3D2E] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                      <span>پچھلا</span>
                    </button>

                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                      if (endPage - startPage + 1 < maxVisible) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }

                      for (let p = startPage; p <= endPage; p++) {
                        pages.push(
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setCurrentPage(p);
                              scrollToTop();
                            }}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                              currentPage === p
                                ? "bg-[#0F3D2E] text-white shadow-sm font-black"
                                : "bg-[#FAF8F5] text-slate-700 border border-[#E6E2DD] hover:bg-emerald-50 hover:text-[#0F3D2E]"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      }

                      return pages;
                    })()}

                    <button
                      type="button"
                      onClick={() => {
                        if (currentPage < totalPages) {
                          setCurrentPage((p) => p + 1);
                          scrollToTop();
                        }
                      }}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-[#E6E2DD] bg-[#FAF8F5] text-slate-700 hover:bg-emerald-50 hover:text-[#0F3D2E] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
                    >
                      <span>اگلا</span>
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-[#E6E2DD] p-8">
                <FaceFrownIcon className="h-14 w-14 text-[#C5A059] mx-auto mb-3" />
                <h3 className="text-xl font-bold text-[#0F3D2E]" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  کوئی کتاب نہیں ملی
                </h3>
                <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  منتخب کردہ فلٹرز یا تلاش کے مطابق کوئی کتاب دستیاب نہیں ہے۔
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                    setSelectedLanguage("all");
                  }}
                  className="mt-5 px-6 py-2.5 bg-[#0F3D2E] hover:bg-[#165B44] text-white rounded-xl font-bold shadow-md text-xs transition cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  فلٹرز ختم کریں (Reset Filters)
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================
          MOBILE CATEGORY DRAWER (SLIDE-UP MODAL)
      ======================================================== */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col border border-[#E6E2DD]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E6E2DD]">
                <h3 className="text-lg font-bold text-[#0F3D2E] flex items-center gap-2" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  <span>علمی موضوعات و زمرہ جات</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.value);
                        setCurrentPage(1);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition text-right ${
                        isSelected
                          ? "bg-[#0F3D2E] text-white shadow-md border border-[#C5A059]/40"
                          : "bg-slate-50 text-slate-700 hover:bg-emerald-50/70 border border-[#E6E2DD]"
                      }`}
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-lg">{getCategoryIcon(cat.value, cat.label)}</span>
                        <span>{cat.label}</span>
                      </span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-[#C5A059]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SCROLL TO TOP FLOATING BUTTON */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-20 right-6 z-40 p-3.5 bg-[#0F3D2E] text-[#C5A059] rounded-full shadow-2xl hover:bg-[#165B44] transition border border-[#C5A059]/40 cursor-pointer"
            title="Scroll to top"
          >
            <ArrowUpIcon className="w-5 h-5" />
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
