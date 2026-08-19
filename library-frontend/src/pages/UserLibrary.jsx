import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";

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

// --- Icons (Outline - for UI) ---
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  FaceFrownIcon,
  XMarkIcon,
  BookOpenIcon,
  LockClosedIcon as LockOutline,
  ChevronRightIcon,
  SparklesIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowUpIcon,
  DocumentTextIcon, // ✅ Added for Text Mode
} from "@heroicons/react/24/outline";

// --- Icons (Solid - for PublicBookCard) ---
import {
  LockClosedIcon as LockSolid,
  EyeIcon as EyeSolid,
  CalendarIcon as CalendarSolid,
} from "@heroicons/react/24/solid";

// --- Constants ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000");
const FALLBACK_NO_COVER = "https://via.placeholder.com/400x600?text=No+Cover";
const FALLBACK_BROKEN = "https://via.placeholder.com/400x600?text=Image+Not+Found";

// ==========================================
// 1. PUBLIC BOOK CARD COMPONENT (Internal)
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

  // --- Helpers ---
  const safeText = (value, fallback = "Unknown") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") return value?.name || value?.title || fallback;
    const str = String(value).trim();
    return str.length ? str : fallback;
  };

  const safeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return "N/A";
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const title = useMemo(() => safeText(book?.title, "Untitled Book"), [book]);
  const author = useMemo(() => safeText(book?.author, "Unknown Author"), [book]);
  const bookId = useMemo(
    () => safeText(book?.id || book?.book_number, "000"),
    [book]
  );

  const isRestricted = !!book?.is_restricted;

  const views = useMemo(() => {
    return safeNumber(
      book?.views ??
        book?.view_count ??
        book?.total_views ??
        book?.total_view ??
        book?.hits ??
        0,
      0
    );
  }, [book]);

  const metaDate = useMemo(
    () => formatDate(book?.created_at || book?.published_date),
    [book]
  );

  // --- Image Resolver ---
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
    if (typeof onClick === "function") onClick();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 cursor-pointer hover:shadow-2xl sm:max-w-none ${className}`}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-20 sm:top-3 sm:left-3">
        {isRestricted ? (
          <div className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md sm:px-3 sm:py-1.5 sm:text-[11px]">
            <LockSolid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Restricted
          </div>
        ) : (
          <div className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md sm:px-3 sm:py-1.5 sm:text-[11px]">
            Open Access
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 z-20 sm:top-3 sm:right-3">
        <div className="rounded-full bg-[#2D89C8] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md sm:px-3 sm:py-1.5 sm:text-[11px]">
          #{bookId}
        </div>
      </div>

      {/* ❤️ Favorite */}
      {typeof onToggleFavorite === "function" && (
        <button
          onClick={(e) => onToggleFavorite(e, book?.id)}
          className="absolute bottom-2 right-2 z-20 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold shadow-md transition hover:bg-gray-50 sm:bottom-3 sm:right-3 sm:px-3 sm:py-1.5 sm:text-[11px]"
          title={isFavorite ? "Remove Favorite" : "Add Favorite"}
        >
          {isFavorite ? "❤️ Saved" : "🤍 Save"}
        </button>
      )}

      {/* COVER AREA */}
      <div className="relative flex justify-center bg-gradient-to-b from-[#F8F9FA] to-white px-3 pb-2 pt-4 transition-colors group-hover:from-[#F1F3F5] sm:px-4 sm:pb-3 sm:pt-5">
        <div className="relative aspect-[2/3] w-[118px] overflow-hidden rounded-2xl bg-gray-200 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl sm:w-[150px] md:w-[175px] lg:w-[185px]">
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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
            <span className="rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 sm:px-4 sm:py-2 sm:text-xs">
              Click to View
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-grow flex-col px-3 pb-3 text-center sm:px-4 sm:pb-4">
        <h3
          className="mb-1 line-clamp-2 font-serif text-[0.95rem] font-extrabold leading-snug text-[#002147] transition-colors group-hover:text-[#2D89C8] sm:text-sm md:text-base"
          style={{
            fontFamily: '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif',
          }}
        >
          {title}
        </h3>

        <p className="mb-2 line-clamp-1 text-[11px] text-gray-500 sm:mb-3 sm:text-xs">{author}</p>

        <div className="mt-auto mb-2 h-px w-full bg-gray-100 sm:mb-3" />

        {/* Meta */}
        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 sm:text-[11px]">
          <div className="flex items-center gap-1">
            <CalendarSolid className="h-3.5 w-3.5 text-gray-300 sm:h-4 sm:w-4" />
            <span>{metaDate}</span>
          </div>

          <div className="flex items-center gap-1">
            <EyeSolid className="h-3.5 w-3.5 text-gray-300 sm:h-4 sm:w-4" />
            <span>{views}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. MAIN USER LIBRARY COMPONENT
// ==========================================
const UserLibrary = () => {
  const navigate = useNavigate();
  const { user, isAuth } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // --- STATE ---
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeRequestRef = useRef(0);
  const [dynamicCategories, setDynamicCategories] = useState([]);  // ✅ Dynamic Categories from DB

  const [sortBy, setSortBy] = useState("newest");

  const [showSuccess, setShowSuccess] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState("grid");
  const [showScrollTop, setShowScrollTop] = useState(false);

  // --- MODAL & FLOW ---
  const [selectedBook, setSelectedBook] = useState(null);

  // Restricted flow
  const [restrictedBook, setRestrictedBook] = useState(null);
  const [isAccessFlowOpen, setIsAccessFlowOpen] = useState(false);

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
  const categories = useMemo(
    () => {
      // ✅ If dynamic categories loaded from DB, use them
      if (dynamicCategories.length > 0) {
        return [
          { value: "all", label: "All Categories" },
          ...dynamicCategories.map(cat => ({
            value: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '_'),
            label: cat.name || cat.category_name,
            id: cat.id
          }))
        ];
      }
      
      // ✅ Fallback to hardcoded if DB load fails
      return [
        { value: "all", label: "All Categories" },
        { value: "aqeedah_fiqh", label: "Aqeedah & Fiqh" },
        { value: "quran_sciences", label: "Quran & Sciences" },
        { value: "history_seerah", label: "History & Seerah" },
        { value: "literature", label: "Literature & Adab" },
        { value: "science_tech", label: "Science & Tech" },
        { value: "islamic_studies", label: "General Islamic Studies" },
      ];
    },
    [dynamicCategories]
  );

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
        search: trimmed,
        limit: 300,
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
  // ✅ NEW: Fetch categories from database (admin-added)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.getAllCategories();
        const categoryList = Array.isArray(data) ? data : data?.categories || [];
        setDynamicCategories(categoryList);
        console.log("✅ Dynamic categories loaded:", categoryList);
      } catch (error) {
        console.warn("⚠️ Could not load categories from DB, using fallback:", error);
        setDynamicCategories([]);
      }
    };

    loadCategories();
  }, []);

  // ✅ NEW: Apply search from URL params or navigation state
  useEffect(() => {
    // Only run once books have loaded and we have books to search through
    if (loading || !Array.isArray(books) || books.length === 0) return;

    const urlSearch = searchParams.get('search');
    const stateSearch = location.state?.preSearch;
    const searchValue = urlSearch || stateSearch;

    if (searchValue && searchValue.trim()) {
      console.log("✅ Setting search term from URL/state:", searchValue);
      setSearchTerm(searchValue);

      // Smooth scroll to grid
      setTimeout(() => {
        const el = document.getElementById("book-grid");
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

  // --- HELPERS ---
  const safeText = (v, f = "") => {
    if (!v) return f;
    if (typeof v === "object") return v?.name || v?.title || v?.slug || f;
    return String(v);
  };

  // ✅ IMPROVED CATEGORY HELPER
  const safeCategory = (book) => {
      // 1. Try nested category object
      if (book.category && typeof book.category === 'object') {
          return book.category.name || book.category.title || "General";
      }
      // 2. Try subcategories array (take first one)
      if (book.subcategories && Array.isArray(book.subcategories) && book.subcategories.length > 0) {
          const sub = book.subcategories[0];
          // If subcategory has a parent category
          if (sub.category && typeof sub.category === 'object') {
              return sub.category.name;
          }
          return sub.name || "General";
      }
      // 3. Try simple string
      if (typeof book.category === 'string') return book.category;
      
      return "General";
  };

  const getCategoryKey = (book) => {
    const catName = safeCategory(book);
    return catName.trim().toLowerCase().replace(/\s+/g, '_');
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

  // Request Access handler
  const handleRequestAccess = (book) => {
    setSelectedBook(null); // close quick view

    if (!isAuth) {
      toast.error("Please login to request access.");
      navigate("/login");
      return;
    }

    setRestrictedBook(book);
    setIsAccessFlowOpen(true);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // --- SORTING ---
  const finalDisplayBooks = useMemo(() => {
    const sorted = [...(Array.isArray(filteredBooks) ? filteredBooks : [])];
    const safeDate = (b) => new Date(b?.created_at || 0).getTime();

    if (sortBy === "newest") sorted.sort((a, b) => safeDate(b) - safeDate(a));
    if (sortBy === "oldest") sorted.sort((a, b) => safeDate(a) - safeDate(b));
    if (sortBy === "az")
      sorted.sort((a, b) => (a?.title || "").localeCompare(b?.title || ""));
    if (sortBy === "favorites")
      return sorted.filter((b) => favorites.includes(b.id));

    return sorted;
  }, [filteredBooks, sortBy, favorites]);

  // --- GROUPING ---
  const groupedByCategory = useMemo(() => {
    const groups = {};
    finalDisplayBooks.forEach((b) => {
      const key = getCategoryKey(b);
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return groups;
  }, [finalDisplayBooks]);

  const orderedCategoryKeys = useMemo(() => {
    const keys = categories
      .filter((c) => c.value !== "all")
      .map((c) => c.value.toLowerCase());

    const extra = Object.keys(groupedByCategory).filter(
      (k) => !keys.includes(k)
    );
    return [...keys, ...extra];
  }, [categories, groupedByCategory]);

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
      <div className="relative z-30 max-w-7xl mx-auto px-4 mt-6 md:sticky md:top-16 md:-mt-20">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-[1.75rem] border border-white/50 bg-white/78 p-3 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl flex flex-col gap-3 justify-between items-center md:p-4 xl:flex-row xl:gap-4"
        >
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-center md:justify-start">
            <div className="hidden md:flex items-center gap-2 text-slate-500 text-sm font-bold bg-slate-100/50 px-3 py-2 rounded-xl">
              <FunnelIcon className="h-4 w-4" /> Filters
            </div>

            <select
              className="min-w-[150px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none transition hover:border-emerald-500 cursor-pointer"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="all">🌍 All Languages</option>
              <option value="english">English</option>
              <option value="urdu">Urdu</option>
              <option value="arabic">Arabic</option>
            </select>

            <select
              className="max-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none transition hover:border-emerald-500 cursor-pointer"
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
          <div className="flex w-full items-center justify-between gap-3 border-t border-slate-200 pt-3 xl:w-auto xl:justify-end xl:border-t-0 xl:pt-0">
            {/* View Toggle */}
            <div className="flex rounded-2xl bg-slate-100 p-1">
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
            <div className="flex items-center gap-2 whitespace-nowrap">
              <ArrowsUpDownIcon className="h-4 w-4 text-slate-400" />
              <select
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">Title (A-Z)</option>
                <option value="favorites">My Favorites</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 mt-6 space-y-12 md:mt-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] bg-slate-200 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : finalDisplayBooks.length > 0 ? (
          orderedCategoryKeys.map((catKey) => {
            const list = groupedByCategory[catKey] || [];
            if (!list.length) return null;

            const preview = list.slice(0, 12);
            // Improve label formatting
            const catLabel =
              categories.find((c) => c.value.toLowerCase() === catKey)?.label ||
              catKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words

            return (
              <section key={catKey} className="relative">
                <div className="flex items-end justify-between mb-6 px-1">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                      {catLabel}
                    </h2>
                    <div className="h-1 w-12 bg-emerald-500 rounded-full mt-2" />
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCategory(catKey);
                      scrollToTop();
                    }}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                  >
                    View All <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* GRID / LIST */}
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
                    {preview.map((book) => (
                      <motion.div
                        key={book.id}
                        layout
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
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
                          <div
                            className={viewMode === "list" ? "w-24 shrink-0" : ""}
                          >
                            <PublicBookCard
                              book={book}
                              onClick={() => setSelectedBook(book)}
                              isFavorite={favorites.includes(book.id)}
                              onToggleFavorite={toggleFavorite}
                              className={viewMode === "list" ? "h-36" : ""} // Adjust height if list view
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
                              </p>

                              <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                                {book.description || "No description provided."}
                              </p>

                              <div className="mt-auto flex gap-2">
                                <button
                                  className="text-xs font-bold text-blue-600 hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/books/${book.id}`); // Correct navigation
                                  }}
                                >
                                  {book.is_restricted ? "Request Access" : "Read Now"}
                                </button>

                                <span className="text-slate-300">•</span>

                                <button
                                  className="text-xs font-bold text-slate-500 hover:text-red-500"
                                  onClick={(e) => toggleFavorite(e, book.id)}
                                >
                                  {favorites.includes(book.id) ? "Saved" : "Save"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </section>
            );
          })
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-slate-100">
            <FaceFrownIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-slate-800">No books found</h3>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="mt-6 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700"
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
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded">
                    {safeCategory(selectedBook)}
                  </span>
                  <button onClick={() => setSelectedBook(null)}>
                    <XMarkIcon className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <h2 className="text-3xl font-serif font-bold mt-4 mb-2 text-slate-900 leading-tight">
                  {selectedBook.title}
                </h2>

                <p className="text-slate-500 text-sm mb-6">
                  By {safeText(selectedBook.author, "Unknown")}
                </p>

                <p className="text-slate-600 text-sm mb-8 flex-grow">
                  {selectedBook.description || "No description provided."}
                </p>

                {/* ✅ UPDATED ACTION BUTTONS */}
                <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 mt-auto">
                  {selectedBook.is_restricted ? (
                    <button
                      onClick={() => handleRequestAccess(selectedBook)}
                      className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-900 transition-colors"
                    >
                      <LockOutline className="w-5" /> Request Access
                    </button>
                  ) : (
                    <div className="flex gap-2">
                        {/* READ (PDF) BUTTON */}
                        <button
                          onClick={() => {
                            if (selectedBook.pdf_url || selectedBook.txt_file_url) {
                                navigate(`/books/${selectedBook.id}`); // Navigate to Reader page
                            } else {
                                toast.error("No content available");
                            }
                          }}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center gap-2 hover:bg-emerald-700 transition-colors"
                        >
                          <BookOpenIcon className="w-5 h-5" /> Read Now
                        </button>
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