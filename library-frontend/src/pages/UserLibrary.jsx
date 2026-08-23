import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

// --- Services + Hooks ---
import { bookService } from "../api/bookService";
import { categoryService } from "../api/categoryService";
import { useBookSearch } from "../hooks/useBookSearch";
import useAuth from "../hooks/useAuth";

// --- Components ---
import RestrictedAccessFlow from "../components/book/RestrictedAccessFlow";
import SuccessScreen from "../components/RestrictedAccess/SuccessScreen";
import LibrarySearchStrip from "../components/public/LibrarySearchStrip";
import { getBookCover } from "../utils/cover";

// --- Icons ---
import {
  FaceFrownIcon,
  XMarkIcon,
  BookOpenIcon,
  LockClosedIcon as LockOutline,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  SparklesIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  BookmarkIcon as BookmarkOutline,
} from "@heroicons/react/24/outline";

import {
  LockClosedIcon as LockSolid,
  BookmarkIcon as BookmarkSolid,
} from "@heroicons/react/24/solid";

// --- Constants ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const FALLBACK_NO_COVER = "https://via.placeholder.com/400x600?text=No+Cover";
const FALLBACK_BROKEN = "https://via.placeholder.com/400x600?text=Image+Not+Found";

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
      fontFamily: '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif',
      padding: "12px 24px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
    }
  });
};

// ==========================================
// 1. PUBLIC BOOK CARD COMPONENT (Clean UI)
// ==========================================
const PublicBookCard = ({
  book,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  className = "",
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const safeText = (value, fallback = "Unknown") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") return value?.name || value?.title || fallback;
    const str = String(value).trim();
    return str.length ? str : fallback;
  };

  const title = useMemo(() => safeText(book?.title, "Untitled Book"), [book]);
  const author = useMemo(() => safeText(book?.author, "Unknown Author"), [book]);
  const isRestricted = !!book?.is_restricted;
  const hasDigitalPdf = Boolean(book?.pdf_url || book?.pdf_file || book?.txt_file_url || book?.txt_file);

  useEffect(() => {
    setImgLoaded(false);

    if (!book) {
      setImgSrc(FALLBACK_NO_COVER);
      return;
    }

    const rawUrl = book.cover_image_url || book.cover_image;
    if (!rawUrl) {
      setImgSrc(FALLBACK_NO_COVER);
      return;
    }

    if (typeof rawUrl === "string" && rawUrl.startsWith("http")) {
      setImgSrc(rawUrl);
      return;
    }

    const path = String(rawUrl);
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    setImgSrc(`${API_BASE_URL}${cleanPath}`);
  }, [book]);

  const handleImageError = () => {
    setImgSrc(FALLBACK_BROKEN);
    setImgLoaded(true);
  };

  const handleCardClick = () => {
    if (!hasDigitalPdf) {
      showUpcomingToast();
    }
    if (typeof onClick === "function") onClick();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 cursor-pointer hover:shadow-xl hover:border-slate-300 sm:max-w-none ${className}`}
    >
      {/* Badges - Only Restricted or Upcoming */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 sm:top-3 sm:left-3">
        {isRestricted && (
          <div className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md sm:px-3 sm:py-1.5 sm:text-[11px]">
            <LockSolid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Restricted
          </div>
        )}

        {!hasDigitalPdf && (
          <div className="rounded-full bg-slate-900/90 text-amber-300 px-2.5 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-xs flex items-center gap-1 border border-slate-700">
            <span>⏳</span> <span>عنقریب...</span>
          </div>
        )}
      </div>

      {/* Favorite / Bookmark Button */}
      {typeof onToggleFavorite === "function" && (
        <button
          onClick={(e) => onToggleFavorite(e, book?.id)}
          className={`absolute bottom-2 right-2 z-20 rounded-full p-2 shadow-md transition-all duration-200 sm:bottom-3 sm:right-3 ${
            isFavorite
              ? "bg-emerald-50 text-emerald-600 border border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white/95 text-slate-500 hover:text-emerald-600 border border-slate-200 hover:bg-white hover:shadow-lg"
          }`}
          title={isFavorite ? "Saved in Favorites" : "Save to Favorites"}
        >
          {isFavorite ? (
            <BookmarkSolid className="h-4 w-4 text-emerald-600" />
          ) : (
            <BookmarkOutline className="h-4 w-4 text-slate-600 hover:text-emerald-600" />
          )}
        </button>
      )}

      {/* COVER AREA */}
      <div className="relative flex justify-center bg-gradient-to-b from-[#F8F9FA] to-white px-3 pb-2 pt-4 transition-colors group-hover:from-[#F1F3F5] sm:px-4 sm:pb-3 sm:pt-5">
        <div className="relative aspect-[2/3] w-[118px] overflow-hidden rounded-2xl bg-gray-100 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl sm:w-[150px] md:w-[175px] lg:w-[185px]">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}

          {imgSrc && (
            <img
              src={imgSrc}
              alt={title}
              onError={handleImageError}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full transition-opacity duration-300 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ objectFit: "contain", background: "#e5e7eb" }}
              loading="lazy"
            />
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100 sm:px-4 sm:py-2">
              {hasDigitalPdf ? "Click to View" : "عنقریب..."}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-grow flex-col px-3 pb-4 text-center sm:px-4 sm:pb-5">
        <h3
          className="mb-1.5 line-clamp-2 font-serif text-[0.95rem] font-extrabold leading-snug text-[#002147] transition-colors group-hover:text-emerald-700 sm:text-sm md:text-base"
          style={{
            fontFamily: '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif',
          }}
        >
          {title}
        </h3>

        <p className="line-clamp-1 text-[11px] text-gray-500 sm:text-xs">{author}</p>
      </div>
    </div>
  );
};

// ==========================================
// 2. MAIN USER LIBRARY COMPONENT
// ==========================================
const UserLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuth } = useAuth();

  // --- STATE ---
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState("oldest"); // Natural Excel order
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
        sort_order: 'asc',
        search: trimmed,
        limit: 5000,
      });

      if (requestId === activeRequestRef.current) {
        setBooks(Array.isArray(data) ? data : data?.books || []);
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
  }, [searchTerm]);

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
    if (book.category && typeof book.category === 'object') {
      return book.category.name || book.category.title || "General";
    }
    if (book.subcategories && Array.isArray(book.subcategories) && book.subcategories.length > 0) {
      const sub = book.subcategories[0];
      if (sub.category && typeof sub.category === 'object') {
        return sub.category.name;
      }
      return sub.name || "General";
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
    const safeDate = (b) => new Date(b?.created_at || 0).getTime();
    const safeSerial = (b) => Number(b?.serial_number) || Number(b?.id) || 0;

    if (sortBy === "newest") sorted.sort((a, b) => safeDate(b) - safeDate(a));
    if (sortBy === "oldest") sorted.sort((a, b) => safeSerial(a) - safeSerial(b));
    if (sortBy === "az")
      sorted.sort((a, b) => (a?.title || "").localeCompare(b?.title || ""));
    if (sortBy === "favorites")
      return sorted.filter((b) => favorites.includes(b.id));

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
    return found ? found.label : selectedCategory.replace(/_/g, " ");
  }, [selectedCategory, categories]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-slate-800 pb-24 relative">
      {/* HERO SECTION */}
      <div className="relative bg-[#0F172A] pt-12 pb-32 px-4 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <SparklesIcon className="w-4 h-4" /> Digital Library
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Discover Islamic{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Knowledge
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-8 max-w-4xl"
          >
            <LibrarySearchStrip
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              title="Library Search"
              subtitle="Search the library collection"
              description="Search by title, author, language, category, and deep-book content with a premium discovery experience."
              placeholder="Search by title, author, or ISBN..."
              showHint={true}
            />
          </motion.div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="relative z-30 max-w-7xl mx-auto px-4 mt-4 md:sticky md:top-16 md:mt-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl border border-white/60 bg-white/85 p-2.5 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.4)] backdrop-blur-xl flex flex-col gap-2.5 justify-between items-stretch md:p-3 xl:flex-row xl:items-center xl:gap-3"
        >
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-start">
            <select
              className="min-w-[140px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium outline-none transition hover:border-emerald-500 cursor-pointer"
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
              className="max-w-[220px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium outline-none transition hover:border-emerald-500 cursor-pointer"
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

          {/* Controls */}
          <div className="flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-2.5 xl:w-auto xl:justify-end xl:border-t-0 xl:pt-0">
            {/* View Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-white shadow text-emerald-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Grid view"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>

              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "list"
                    ? "bg-white shadow text-emerald-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="List view"
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <ArrowsUpDownIcon className="h-4 w-4 text-slate-400" />
              <select
                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="oldest">Serial # (1, 2, 3...)</option>
                <option value="newest">Newest First</option>
                <option value="az">Title (A-Z)</option>
                <option value="favorites">My Favorites</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] bg-slate-200 rounded-2xl animate-pulse"
              />
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
                              <LockOutline className="w-4 h-4 text-red-500" />
                            )}
                          </div>

                          <h3 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-2">
                            {book.title}
                          </h3>

                          <p className="text-xs text-slate-500 mb-2">
                            By {safeText(book.author, "Unknown")}
                            {book.translator && ` (ترجمہ: ${book.translator})`}
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

      {/* QUICK VIEW MODAL */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedBook(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full md:w-5/12 bg-slate-50 flex items-center justify-center p-8">
                <img
                  src={getBookCover(selectedBook)}
                  alt={selectedBook.title}
                  className="w-40 shadow-2xl rounded-lg"
                />
              </div>

              <div className="w-full md:w-7/12 p-8 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-full">
                    {safeCategory(selectedBook)}
                  </span>
                  <button onClick={() => setSelectedBook(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                    <XMarkIcon className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <h2 className="text-2xl md:text-3xl font-serif font-bold mt-4 mb-2 text-slate-900 leading-tight">
                  {selectedBook.title}
                </h2>

                <p className="text-slate-500 text-sm mb-4">
                  By {safeText(selectedBook.author, "Unknown")}
                  {selectedBook.translator && ` (ترجمہ: ${selectedBook.translator})`}
                  {selectedBook.publisher && ` — ${selectedBook.publisher}`}
                </p>

                <p className="text-slate-600 text-sm mb-6 flex-grow">
                  {selectedBook.description || "No description provided."}
                </p>

                {/* ACTION BUTTONS */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 mt-auto">
                  {selectedBook.is_restricted ? (
                    <button
                      onClick={() => handleRequestAccess(selectedBook)}
                      className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-900 transition-colors"
                    >
                      <LockOutline className="w-5 h-5" /> Request Access
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      {selectedBook.pdf_url || selectedBook.txt_file_url ? (
                        <button
                          onClick={() => {
                            navigate(`/read/${selectedBook.id}`);
                          }}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <BookOpenIcon className="w-5 h-5" /> Read Now
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            showUpcomingToast();
                          }}
                          className="flex-1 bg-slate-900 text-amber-300 py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm text-base"
                        >
                          <span>⏳</span> <span>عنقریب...</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
