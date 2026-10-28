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
import BookDetailsModal from "../components/book/BookDetailsModal";
import PublicBookCard from "../components/public/PublicBookCard";
import { getBookCover } from "../utils/cover";

// --- Icons ---
import {
  FaceFrownIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000")
).replace(/\/$/, "");

const URDU_ALPHABET = [
  "آ",
  "ا",
  "ب",
  "پ",
  "ت",
  "ٹ",
  "ث",
  "ج",
  "چ",
  "ح",
  "خ",
  "د",
  "ڈ",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ک",
  "گ",
  "ل",
  "م",
  "ن",
  "و",
  "ہ",
  "ی",
];

const CATEGORY_URDU_MAP = {
  "all categories": "تمام کتب",
  general: "عمومی کتب",
  "aqeedah & fiqh": "عقیدہ و منہج",
  "quran & sciences": "قرآن و علومِ قرآن",
  "history & seerah": "سیرت و تاریخ",
  "literature & adab": "ادب و اخلاق",
  "science & tech": "جدید مباحث",
  "general islamic studies": "اسلامی معلومات",
};

const safeBookText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") {
    const text = value.ur || value.ar || value.en || value.name || value.title;
    if (typeof text === "string" && text.trim()) return text.trim();
    for (const k of Object.keys(value)) {
      if (typeof value[k] === "string" && value[k].trim()) return value[k].trim();
    }
    return fallback;
  }
  const str = String(value).trim();
  return str.length ? str : fallback;
};

const toUrduCategoryLabel = (label) => {
  const clean = safeBookText(label, "عمومی کتب");
  const lower = clean.toLowerCase();
  return CATEGORY_URDU_MAP[lower] || clean;
};

const resolveCoverUrl = (raw) => {
  if (!raw || String(raw).trim() === "") return null;
  const s = String(raw).trim();
  if (s.startsWith("http")) return s;
  return `${API_BASE_URL}${s.startsWith("/") ? "" : "/"}${s}`;
};

const UserLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuth, user } = useAuth();
  const { isRTL } = useLanguage();
  const isAdmin = Boolean(
    user &&
      (user.role === "admin" ||
        user.is_superuser ||
        user.is_staff ||
        user.role === "ADMIN")
  );

  const themeContext = useTheme?.();
  const uiSettings = themeContext?.uiSettings;
  const updatePreview = themeContext?.updatePreview;

  const [activeLayout, setActiveLayout] = useState(() => {
    return (
      localStorage.getItem("kil_library_search_layout") ||
      uiSettings?.library_search_layout ||
      "option1"
    );
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
      toast.success(`Active Layout Updated: ${newLayout}`);
    } catch {
      toast.success(`Active Layout: ${newLayout}`);
    }
  };

  // --- STATE ---
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState("newest");
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const [selectedLetter, setSelectedLetter] = useState("all");
  const [librarySectionMode, setLibrarySectionMode] = useState("all"); // 'all' | 'continue' | 'favorites'
  const [showScrollTop, setShowScrollTop] = useState(false);
  const activeRequestRef = useRef(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // --- MODAL & FLOW ---
  const [selectedBook, setSelectedBook] = useState(null);
  const [restrictedBook, setRestrictedBook] = useState(null);
  const [isAccessFlowOpen, setIsAccessFlowOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // --- RECENT READS (FOR CONTINUE READING BAR & TAB) ---
  const [recentReads, setRecentReads] = useState(() => {
    try {
      const raw = localStorage.getItem("bookNest_recent_reads");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncRecentReads = () => {
      try {
        const raw = localStorage.getItem("bookNest_recent_reads");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setRecentReads(parsed);
      } catch {}
    };
    window.addEventListener("storage", syncRecentReads);
    window.addEventListener("kil_reading_updated", syncRecentReads);
    return () => {
      window.removeEventListener("storage", syncRecentReads);
      window.removeEventListener("kil_reading_updated", syncRecentReads);
    };
  }, []);

  // --- FAVORITES ---
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("bookNest_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const getCategoryIcon = (slug, label) => {
    const s = String(slug || label || "").toLowerCase();
    if (s.includes("tafseer") || s.includes("تفسیر") || s.includes("quran") || s.includes("قرآن"))
      return "📖";
    if (s.includes("hadees") || s.includes("hadith") || s.includes("حدیث"))
      return "✨";
    if (s.includes("fiqh") || s.includes("فقہ")) return "⚖️";
    if (s.includes("history") || s.includes("seerah") || s.includes("تاریخ") || s.includes("سیرت"))
      return "🕌";
    if (s.includes("adab") || s.includes("literature") || s.includes("ادب") || s.includes("دعوت"))
      return "📜";
    if (s.includes("aqeedah") || s.includes("tasawwuf") || s.includes("عقیدہ"))
      return "🪙";
    if (s.includes("fatawa") || s.includes("فتاوی")) return "⚖️";
    if (s.includes("all") || s.includes("تمام")) return "🌐";
    return "📑";
  };

  // --- CATEGORIES ---
  const categories = useMemo(() => {
    if (dynamicCategories.length > 0) {
      return [
        { value: "all", label: "تمام کتب" },
        ...dynamicCategories.map((cat) => ({
          value: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, "_"),
          label: toUrduCategoryLabel(cat.name || cat.category_name),
          id: cat.id,
        })),
      ];
    }
    return [
      { value: "all", label: "تمام کتب" },
      { value: "quran_sciences", label: "قرآن و علومِ قرآن" },
      { value: "hadith_sciences", label: "حدیث و اصولِ حدیث" },
      { value: "aqeedah_fiqh", label: "عقیدہ و منہج" },
      { value: "fiqh_fatawa", label: "فقہ و فتاویٰ" },
      { value: "history_seerah", label: "سیرت و تاریخ" },
      { value: "literature", label: "دعوت و اصلاح" },
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

  // --- UNIQUE AUTHORS LIST FOR DROPDOWN ---
  const uniqueAuthors = useMemo(() => {
    const map = new Map();
    for (const b of books) {
      const a = safeBookText(b?.author, "").trim();
      if (a && a !== "Unknown" && a !== "نامعلوم") {
        map.set(a, (map.get(a) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((x, y) => y[1] - x[1])
      .map(([name, count]) => ({ name, count }));
  }, [books]);

  const fetchBooks = async (searchText = "") => {
    const requestId = ++activeRequestRef.current;
    setLoading(true);

    try {
      const trimmed = searchText?.trim() || "";
      const data = await bookService.getAllBooks({
        approved_only: true,
        sort_order: "desc",
        search: trimmed,
        limit: 5000,
      });

      if (requestId === activeRequestRef.current) {
        const rawList = Array.isArray(data) ? data : data?.books || [];
        const list = rawList.filter((b) => b.is_approved === true);
        setBooks(list);
      }
    } catch (error) {
      console.error(error);
      if (requestId === activeRequestRef.current) {
        toast.error("کتب خانہ لوڈ کرنے میں دشواری پیش آئی۔");
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.getAllCategories();
        const categoryList = Array.isArray(data) ? data : data?.categories || [];
        setDynamicCategories(categoryList);
      } catch {
        setDynamicCategories([]);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (loading || !Array.isArray(books) || books.length === 0) return;

    const urlSearch = searchParams.get("search");
    const stateSearch = location.state?.preSearch;
    const searchValue = urlSearch || stateSearch;

    if (searchValue && searchValue.trim()) {
      setSearchTerm(searchValue);
      setTimeout(() => {
        const el = document.getElementById("book-grid-container");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [
    loading,
    books.length,
    searchParams.toString(),
    location.state?.preSearch,
    setSearchTerm,
  ]);

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
  }, [
    searchTerm,
    selectedLanguage,
    selectedCategory,
    sortBy,
    selectedAuthor,
    selectedLetter,
    librarySectionMode,
  ]);

  const safeCategory = (book) => {
    if (!book) return "عمومی کتب";
    if (book.category && typeof book.category === "object") {
      return toUrduCategoryLabel(
        book.category.name || book.category.title || book.category
      );
    }
    if (
      book.subcategories &&
      Array.isArray(book.subcategories) &&
      book.subcategories.length > 0
    ) {
      const sub = book.subcategories[0];
      if (sub.category && typeof sub.category === "object") {
        return toUrduCategoryLabel(sub.category.name || sub.category);
      }
      return toUrduCategoryLabel(sub.name);
    }
    if (typeof book.category === "string") return toUrduCategoryLabel(book.category);
    return "عمومی کتب";
  };

  const toggleFavorite = (e, bookId) => {
    if (e) e.stopPropagation();
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
      toast.error("رسائی کی درخواست کے لیے لاگ ان کریں۔");
      navigate("/login");
      return;
    }
    setRestrictedBook(book);
    setIsAccessFlowOpen(true);
  };

  const recordBookOpenAndNavigate = (book) => {
    if (!book) return;
    if (book.is_restricted && !book.user_has_access) {
      handleRequestAccess(book);
      return;
    }
    try {
      const coverUrl = book?.cover_image_url || book?.cover_image;
      const authorStr = safeBookText(book?.author, "علمائے کرام");
      const existing = recentReads.find(
        (r) => String(r.book_id) === String(book.id)
      );
      const nextEntry = {
        book_id: Number(book.id),
        title: safeBookText(book?.title, "کتاب"),
        author: authorStr,
        cover_image_url: coverUrl,
        last_page_read: existing?.last_page_read || 1,
        total_pages: Number(book?.page_count || existing?.total_pages || 0),
        updated_at: new Date().toISOString(),
      };
      const filtered = recentReads.filter(
        (entry) => String(entry.book_id) !== String(book.id)
      );
      const nextList = [nextEntry, ...filtered].slice(0, 12);
      setRecentReads(nextList);
      localStorage.setItem("bookNest_recent_reads", JSON.stringify(nextList));
      window.dispatchEvent(
        new CustomEvent("kil_reading_updated", { detail: nextEntry })
      );
    } catch {}
    navigate(`/read/${book.id}`);
  };

  const scrollToTop = () => {
    const el = document.getElementById("book-grid-container");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- CONTINUE READING FEATURED BOOK (KHAAS FEATURE 1) ---
  const continueReadingItem = useMemo(() => {
    if (recentReads.length > 0) {
      const latest = recentReads[0];
      const matchedBook = books.find(
        (b) => String(b.id) === String(latest.book_id)
      );
      const lastPage = Math.max(1, Number(latest.last_page_read || 1));
      const totalPages = Number(
        latest.total_pages || matchedBook?.page_count || 0
      );
      const pct =
        totalPages > 0
          ? Math.min(100, Math.max(5, Math.round((lastPage / totalPages) * 100)))
          : 25;
      return {
        isRecent: true,
        bookId: latest.book_id,
        title: safeBookText(latest.title || matchedBook?.title, "کتاب"),
        author: safeBookText(
          latest.author || matchedBook?.author,
          "علمائے کرام"
        ),
        coverUrl: resolveCoverUrl(
          latest.cover_image_url ||
            matchedBook?.cover_image_url ||
            matchedBook?.cover_image
        ),
        lastPage,
        totalPages,
        pct,
        bookObj: matchedBook || { id: latest.book_id, title: latest.title },
      };
    }

    if (books.length > 0) {
      const firstBook = books[0];
      const totalPages = Number(firstBook?.page_count || 0);
      return {
        isRecent: false,
        bookId: firstBook.id,
        title: safeBookText(firstBook.title, "کتاب"),
        author: safeBookText(firstBook.author, "علمائے کرام"),
        coverUrl: resolveCoverUrl(
          firstBook.cover_image_url || firstBook.cover_image
        ),
        lastPage: 1,
        totalPages,
        pct: 10,
        bookObj: firstBook,
      };
    }

    return null;
  }, [recentReads, books]);

  // --- FILTERING & SORTING (WITH AUTHOR, ALPHABET, AND LIBRARY SECTION TABS) ---
  const finalDisplayBooks = useMemo(() => {
    let list = [...(Array.isArray(filteredBooks) ? filteredBooks : [])];

    // 1. Library Section Mode ('all' | 'continue' | 'favorites')
    if (librarySectionMode === "continue") {
      const recentIds = new Set(recentReads.map((r) => String(r.book_id)));
      list = list.filter((b) => recentIds.has(String(b.id)));
    } else if (librarySectionMode === "favorites" || sortBy === "favorites") {
      list = list.filter((b) => favorites.includes(b.id));
    }

    // 2. Author Filter
    if (selectedAuthor !== "all") {
      list = list.filter(
        (b) => safeBookText(b?.author, "").trim() === selectedAuthor
      );
    }

    // 3. Urdu Alphabet Letter Filter (Khaas Feature 2)
    if (selectedLetter !== "all") {
      list = list.filter((b) => {
        const cleanTitle = safeBookText(b?.title, "")
          .replace(/^[\s"'«»()[\]۔،\-–—]+/, "")
          .trim();
        if (!cleanTitle) return false;
        const firstChar = cleanTitle.charAt(0);
        if (selectedLetter === "ا") {
          return firstChar === "ا" || firstChar === "أ" || firstChar === "إ";
        }
        if (selectedLetter === "ہ") {
          return firstChar === "ہ" || firstChar === "ه" || firstChar === "ھ";
        }
        if (selectedLetter === "ی") {
          return firstChar === "ی" || firstChar === "ي" || firstChar === "ے";
        }
        return firstChar === selectedLetter;
      });
    }

    // 4. Sorting
    const safeId = (b) => Number(b?.id) || 0;
    if (sortBy === "newest") {
      list.sort((a, b) => safeId(b) - safeId(a));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => safeId(a) - safeId(b));
    } else if (sortBy === "az") {
      list.sort((a, b) =>
        safeBookText(a?.title).localeCompare(safeBookText(b?.title))
      );
    }

    return list;
  }, [
    filteredBooks,
    librarySectionMode,
    recentReads,
    favorites,
    selectedAuthor,
    selectedLetter,
    sortBy,
  ]);

  // --- PAGINATION ---
  const totalPages = Math.ceil(finalDisplayBooks.length / itemsPerPage) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalDisplayBooks.slice(start, start + itemsPerPage);
  }, [finalDisplayBooks, currentPage, itemsPerPage]);

  const activeCategoryLabel = useMemo(() => {
    if (librarySectionMode === "continue") return "زیرِ مطالعہ کتب";
    if (librarySectionMode === "favorites") return "محفوظ شدہ کتب";
    if (selectedCategory === "all") return "تمام کتب";
    const found = categories.find((c) => c.value === selectedCategory);
    return found
      ? toUrduCategoryLabel(found.label)
      : toUrduCategoryLabel(selectedCategory.replace(/_/g, " "));
  }, [selectedCategory, categories, librarySectionMode]);

  return (
    <div
      id="book-grid-container"
      className="min-h-screen bg-[#FAF8F5] text-[#0F291E] pb-20 relative"
      dir={isRTL ? "rtl" : "rtl"}
      style={{ fontFamily: "'Noto Naskh Arabic', 'Amiri', serif" }}
    >
      {/* 🛠️ ADMIN REALTIME LAYOUT CONTROLLER */}
      {isAdmin && (
        <div className="bg-slate-900 text-white px-3 py-2 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 z-40 relative">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">ایڈمن کنٹرول:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "option1", label: "ڈیزائن ۱ (سائڈ بار + گرڈ)" },
              { id: "option2", label: "ڈیزائن ۲ (کیٹلاگ ہیڈر)" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleAdminLayoutChange(opt.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  activeLayout === opt.id
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
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
          PAGE BODY: TWO-COLUMN LIGHT PEARL & SQUARE-CURVE HD LAYOUT
      ======================================================== */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        
        {/* MOBILE TOP BAR (< 1024px): Light Pearl Search + Category Drawer Toggle */}
        <div className="lg:hidden mb-4 space-y-2.5">
          <div className="relative rounded-full bg-white px-4 py-2.5 flex items-center border border-[#C8DDD2] shadow-2xs">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#165B43] shrink-0 ml-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="کتاب یا مصنف تلاش کریں..."
              className="bg-transparent text-xs sm:text-sm text-[#0F3D2E] placeholder-slate-400 outline-none w-full font-bold"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 text-slate-400 hover:text-[#0F3D2E] transition"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3F8F5] text-[#0F3D2E] hover:bg-[#165B43] hover:text-white font-extrabold text-xs shrink-0 border border-[#C5A059] transition cursor-pointer"
            >
              <FunnelIcon className="w-3.5 h-3.5" />
              <span>علمی موضوعات</span>
            </button>

            {categories.slice(0, 8).map((cat) => {
              const isSelected =
                librarySectionMode === "all" && selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setLibrarySectionMode("all");
                    setSelectedCategory(cat.value);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#165B43] text-white border border-[#165B43] shadow-xs"
                      : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white"
                  }`}
                >
                  <span>{getCategoryIcon(cat.value, cat.label)}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TWO-COLUMN DESKTOP WORKSPACE */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ========================================================
              RIGHT COLUMN (IN RTL): LIGHT PEARL SIDEBAR (#F3F8F5)
          ======================================================== */}
          <aside className="w-full lg:w-68 xl:w-72 shrink-0 hidden lg:block lg:sticky lg:top-20 z-20">
            <div className="rounded-3xl bg-[#F3F8F5] border border-[#D5E4DC] p-4 shadow-xs space-y-3.5">
              
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-[#C5A059]/40 pb-2.5">
                <span className="text-sm font-extrabold text-[#0F3D2E]">
                  📚 علمی موضوعات و زمرہ جات
                </span>
                <span className="text-[10px] font-bold bg-white px-2.5 py-0.5 rounded-full border border-[#C5A059] text-[#0F3D2E]">
                  فہرست
                </span>
              </div>

              {/* Clean White Search Pill */}
              <div className="relative rounded-full bg-white px-3.5 py-2 flex items-center border border-[#C8DDD2] focus-within:border-[#165B43] transition">
                <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="کتاب یا مصنف تلاش کریں..."
                  className="bg-transparent text-xs text-[#0F3D2E] placeholder-slate-400 outline-none w-full font-bold"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="p-0.5 text-slate-400 hover:text-[#0F3D2E] transition"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Library Views + Scholarly Categories */}
              <nav className="space-y-1.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-0.5 custom-scrollbar">
                {/* 1. All Books */}
                <button
                  type="button"
                  onClick={() => {
                    setLibrarySectionMode("all");
                    setSelectedCategory("all");
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-extrabold transition-all text-right cursor-pointer ${
                    librarySectionMode === "all" && selectedCategory === "all"
                      ? "bg-[#165B43] text-white border border-[#165B43] shadow-xs"
                      : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white hover:border-[#165B43]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🌐</span>
                    <span>تمام کتب</span>
                  </span>
                  <span className="text-[11px] font-mono opacity-90">
                    {books.length}
                  </span>
                </button>

                {/* 2. Continue Reading (زیرِ مطالعہ) */}
                <button
                  type="button"
                  onClick={() => {
                    setLibrarySectionMode("continue");
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-bold transition-all text-right cursor-pointer ${
                    librarySectionMode === "continue"
                      ? "bg-[#165B43] text-white border border-[#165B43] shadow-xs"
                      : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white hover:border-[#165B43]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>📖</span>
                    <span>زیرِ مطالعہ (جاری)</span>
                  </span>
                  <span className="text-[11px] font-mono opacity-90">
                    {recentReads.length}
                  </span>
                </button>

                {/* 3. Saved / Bookmarked Books (محفوظ شدہ کتب) */}
                <button
                  type="button"
                  onClick={() => {
                    setLibrarySectionMode("favorites");
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-bold transition-all text-right cursor-pointer ${
                    librarySectionMode === "favorites"
                      ? "bg-[#165B43] text-white border border-[#165B43] shadow-xs"
                      : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white hover:border-[#165B43]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🔖</span>
                    <span>محفوظ شدہ کتب</span>
                  </span>
                  <span className="text-[11px] font-mono opacity-90">
                    {favorites.length}
                  </span>
                </button>

                <div className="pt-1.5 border-t border-[#DCECE4]" />

                {/* Dynamic Scholarly Categories */}
                {categories
                  .filter((c) => c.value !== "all")
                  .map((cat) => {
                    const isSelected =
                      librarySectionMode === "all" &&
                      selectedCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setLibrarySectionMode("all");
                          setSelectedCategory(cat.value);
                          setCurrentPage(1);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-bold transition-all text-right cursor-pointer ${
                          isSelected
                            ? "bg-[#165B43] text-white border border-[#165B43] shadow-xs"
                            : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white hover:border-[#165B43]"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="text-sm leading-none">
                            {getCategoryIcon(cat.value, cat.label)}
                          </span>
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
          </aside>

          {/* ========================================================
              MAIN COLUMN: CONTINUE READING + HEADER + ALPHABET + HD GRID
          ======================================================== */}
          <main className="flex-1 min-w-0 w-full space-y-4">
            
            {/* KHAAS FEATURE 1: CONTINUE READING TOP BAR ("آخری مطالعہ جہاں سے چھوڑا تھا") */}
            {continueReadingItem && (
              <div className="bg-gradient-to-l from-[#F3F8F5] to-white border border-[#D5E4DC] border-r-4 border-r-[#165B43] rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    onClick={() =>
                      recordBookOpenAndNavigate(continueReadingItem.bookObj)
                    }
                    className="w-11 h-15 rounded-lg border border-[#C5A059] bg-[#124B38] overflow-hidden shrink-0 shadow-xs cursor-pointer flex items-center justify-center"
                  >
                    {continueReadingItem.coverUrl ? (
                      <img
                        src={continueReadingItem.coverUrl}
                        alt={continueReadingItem.title}
                        className="w-full h-full object-fill"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-[9px] text-[#DFC286] font-bold text-center px-1 leading-tight">
                        📖
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="inline-block bg-[#E5F2EC] text-[#165B43] text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full mb-0.5">
                      {continueReadingItem.isRecent
                        ? "📖 آخری مطالعہ جہاں سے چھوڑا تھا"
                        : "📖 مطالعہ کے لیے منتخب کتاب"}
                    </span>
                    <div className="text-sm sm:text-[15px] font-extrabold text-[#0F3D2E] truncate">
                      {continueReadingItem.title}
                    </div>
                    <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                      <div className="w-28 sm:w-36 h-1.5 bg-[#DCECE4] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#165B43] rounded-full transition-all duration-300"
                          style={{ width: `${continueReadingItem.pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">
                        {continueReadingItem.totalPages > 0
                          ? `صفحہ ${continueReadingItem.lastPage} از ${continueReadingItem.totalPages} (${continueReadingItem.pct}% مکمل)`
                          : continueReadingItem.isRecent
                          ? `صفحہ ${continueReadingItem.lastPage} جاری`
                          : `مؤلف: ${continueReadingItem.author}`}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    recordBookOpenAndNavigate(continueReadingItem.bookObj)
                  }
                  className="self-start sm:self-center shrink-0 px-4 py-1.5 rounded-full bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] active:bg-[#165B43] active:text-white text-xs font-extrabold transition-all shadow-2xs cursor-pointer"
                >
                  {continueReadingItem.isRecent
                    ? `صفحہ ${continueReadingItem.lastPage} سے مطالعہ جاری رکھیں ←`
                    : "ابھی مطالعہ شروع کریں ←"}
                </button>
              </div>
            )}

            {/* KHAAS FEATURE 2: LIGHT PEARL CATALOG HEADER + AUTHOR FILTER + URDU ALPHABET BAR */}
            <div className="bg-[#F3F8F5] border border-[#D5E4DC] border-b-2 border-b-[#C5A059] rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0F3D2E] flex items-center gap-2">
                    <span>📖 جدید اسلامی کتب خانہ</span>
                  </h1>
                  <p className="text-xs font-bold text-[#165B43] mt-0.5">
                    <span>زمرہ: {activeCategoryLabel}</span>
                    <span className="mx-2">•</span>
                    <span>دستیاب کتب: {finalDisplayBooks.length}</span>
                  </p>
                </div>

                {/* Controls Toolbar (Hover-Only Green Pills) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Language Select */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded-full border border-[#C8DDD2] bg-white text-[#0F3D2E] hover:border-[#165B43] px-3 py-1.5 text-xs font-extrabold outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="all">🌐 تمام زبانیں</option>
                    <option value="urdu">اردو</option>
                    <option value="arabic">عربی</option>
                    <option value="english">انگریزی</option>
                    <option value="hindi">ہندی</option>
                  </select>

                  {/* Author Select */}
                  <select
                    value={selectedAuthor}
                    onChange={(e) => {
                      setSelectedAuthor(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded-full border border-[#C8DDD2] bg-white text-[#0F3D2E] hover:border-[#165B43] px-3 py-1.5 text-xs font-extrabold outline-none shadow-2xs cursor-pointer max-w-[180px]"
                  >
                    <option value="all">✍️ تمام مصنفین</option>
                    {uniqueAuthors.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name} ({a.count})
                      </option>
                    ))}
                  </select>

                  {/* Sort Select */}
                  <div className="flex items-center gap-1 rounded-full border border-[#C8DDD2] bg-white hover:border-[#165B43] px-3 py-1.5 shadow-2xs">
                    <ArrowsUpDownIcon className="w-3.5 h-3.5 text-[#165B43]" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent text-xs font-extrabold text-[#0F3D2E] outline-none cursor-pointer"
                    >
                      <option value="newest">تازہ ترین</option>
                      <option value="oldest">قدیم ترین</option>
                      <option value="az">حروفِ تہجی</option>
                      <option value="favorites">محفوظ شدہ</option>
                    </select>
                  </div>

                  {/* Grid / List View Toggle */}
                  <div className="flex rounded-full bg-white p-0.5 border border-[#C8DDD2] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-full transition-all cursor-pointer ${
                        viewMode === "grid"
                          ? "bg-[#165B43] text-white"
                          : "text-slate-500 hover:text-[#165B43]"
                      }`}
                      title="گرڈ ویو"
                    >
                      <Squares2X2Icon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-full transition-all cursor-pointer ${
                        viewMode === "list"
                          ? "bg-[#165B43] text-white"
                          : "text-slate-500 hover:text-[#165B43]"
                      }`}
                      title="فہرست ویو"
                    >
                      <ListBulletIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* URDU ALPHABET QUICK FILTER STRIP (حروف تہجی) */}
              <div className="flex items-center gap-1 pt-2.5 border-t border-[#DCECE4] overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-extrabold text-[#165B43] ml-1.5 shrink-0">
                  حروف تہجی:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLetter("all")}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold transition shrink-0 cursor-pointer ${
                    selectedLetter === "all"
                      ? "bg-[#165B43] text-white shadow-2xs"
                      : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white"
                  }`}
                >
                  سب
                </button>
                {URDU_ALPHABET.map((letter) => {
                  const isActive = selectedLetter === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() =>
                        setSelectedLetter(isActive ? "all" : letter)
                      }
                      className={`min-w-[26px] h-[26px] px-1.5 rounded-md text-xs font-bold transition shrink-0 flex items-center justify-center cursor-pointer ${
                        isActive
                          ? "bg-[#165B43] text-white shadow-2xs"
                          : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOOKS CATALOG GRID (4-COLUMN SQUARE-CURVE HD CARDS) */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[22px] border border-[#D5E4DC] bg-white overflow-hidden shadow-2xs"
                  >
                    <div className="bg-[#EAF3EE] p-5 flex justify-center">
                      <div className="w-[148px] h-[210px] rounded-[14px] bg-white/70" />
                    </div>
                    <div className="p-4 space-y-2">
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
                      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "grid grid-cols-1 gap-3.5"
                  }
                >
                  <AnimatePresence>
                    {paginatedBooks.map((book) => (
                      <motion.div
                        key={book.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="w-full"
                      >
                        {viewMode === "grid" ? (
                          <PublicBookCard
                            book={book}
                            onClick={() => setSelectedBook(book)}
                            onQuickLook={() => setSelectedBook(book)}
                            onReadClick={() => recordBookOpenAndNavigate(book)}
                            isFavorite={favorites.includes(book.id)}
                            onToggleFavorite={toggleFavorite}
                          />
                        ) : (
                          /* Clean Light Pearl List View Card */
                          <div
                            onClick={() => setSelectedBook(book)}
                            className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-white border border-[#D5E4DC] hover:border-[#C5A059] hover:shadow-md transition cursor-pointer shadow-2xs"
                          >
                            <div className="w-20 sm:w-24 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-[#EAF3EE] border-2 border-[#C5A059] flex items-center justify-center">
                              {getBookCover(book) ? (
                                <img
                                  src={getBookCover(book)}
                                  alt={book.title}
                                  className="w-full h-full object-fill"
                                />
                              ) : (
                                <span className="text-xs font-bold text-[#0F3D2E] text-center px-1">
                                  {safeBookText(book.title)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-center sm:text-right">
                              <span className="text-[10px] font-bold text-[#165B43] bg-[#F3F8F5] border border-[#DCECE4] px-2.5 py-0.5 rounded-full inline-block mb-1">
                                {safeCategory(book)}
                              </span>
                              <h3 className="text-base font-extrabold text-[#0F3D2E] leading-relaxed line-clamp-1">
                                {safeBookText(book.title)}
                              </h3>
                              <p className="text-xs text-[#165B43] font-bold mt-0.5">
                                ✍️ {safeBookText(book.author, "علمائے کرام")}
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
                                  recordBookOpenAndNavigate(book);
                                }}
                                className="px-4 py-1.5 rounded-full bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] text-xs font-extrabold transition shadow-2xs cursor-pointer"
                              >
                                📖 مطالعہ
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBook(book);
                                }}
                                className="px-4 py-1.5 rounded-full bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] text-xs font-extrabold transition shadow-2xs cursor-pointer inline-flex items-center justify-center gap-1"
                              >
                                <EyeIcon className="w-3.5 h-3.5" />
                                <span>جھلک</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* 📄 LIGHT PEARL PAGINATION BAR */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F3F8F5] p-4 rounded-2xl border border-[#D5E4DC] shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#0F3D2E]">
                      فی صفحہ کتب:
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                        scrollToTop();
                      }}
                      className="rounded-xl border border-[#C8DDD2] bg-white text-[#0F3D2E] px-3 py-1 text-xs font-extrabold outline-none shadow-2xs hover:border-[#165B43] cursor-pointer"
                    >
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                      <option value={96}>96</option>
                    </select>
                    <span className="text-xs font-bold text-[#165B43] mr-2">
                      صفحہ {currentPage} از {totalPages}
                    </span>
                  </div>

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
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-extrabold border border-[#C8DDD2] bg-white text-[#0F3D2E] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
                    >
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                      <span>پچھلا</span>
                    </button>

                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      let startPage = Math.max(
                        1,
                        currentPage - Math.floor(maxVisible / 2)
                      );
                      let endPage = Math.min(
                        totalPages,
                        startPage + maxVisible - 1
                      );

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
                            className={`w-8 h-8 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                              currentPage === p
                                ? "bg-[#165B43] text-white shadow-xs"
                                : "bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43]"
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
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-extrabold border border-[#C8DDD2] bg-white text-[#0F3D2E] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
                    >
                      <span>اگلا</span>
                      <ChevronLeftIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-14 bg-[#F3F8F5] rounded-3xl shadow-2xs border border-[#D5E4DC] p-8">
                <FaceFrownIcon className="h-12 w-12 text-[#C5A059] mx-auto mb-2.5" />
                <h3 className="text-lg font-extrabold text-[#0F3D2E]">
                  کوئی کتاب نہیں ملی
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto font-semibold">
                  منتخب کردہ فلٹرز یا تلاش کے مطابق کوئی کتاب دستیاب نہیں ہے۔
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                    setSelectedLanguage("all");
                    setSelectedAuthor("all");
                    setSelectedLetter("all");
                    setLibrarySectionMode("all");
                  }}
                  className="mt-4 px-5 py-2 bg-white text-[#0F3D2E] border border-[#C8DDD2] hover:bg-[#165B43] hover:text-white hover:border-[#165B43] rounded-full font-extrabold shadow-2xs text-xs transition cursor-pointer"
                >
                  تمام فلٹرز ختم کریں
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
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative w-full sm:max-w-md bg-[#F3F8F5] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 max-h-[85vh] flex flex-col border border-[#D5E4DC]"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-[#C5A059]/40">
                <h3 className="text-base font-extrabold text-[#0F3D2E] flex items-center gap-2">
                  <span>📚 علمی موضوعات و زمرہ جات</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 rounded-full bg-white text-slate-500 hover:text-[#0F3D2E] border border-[#DCECE4]"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="py-3.5 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setLibrarySectionMode("continue");
                    setCurrentPage(1);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-extrabold transition text-right ${
                    librarySectionMode === "continue"
                      ? "bg-[#165B43] text-white"
                      : "bg-white text-[#0F3D2E] border border-[#DCECE4]"
                  }`}
                >
                  <span>📖 زیرِ مطالعہ (جاری)</span>
                  <span>{recentReads.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLibrarySectionMode("favorites");
                    setCurrentPage(1);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-extrabold transition text-right ${
                    librarySectionMode === "favorites"
                      ? "bg-[#165B43] text-white"
                      : "bg-white text-[#0F3D2E] border border-[#DCECE4]"
                  }`}
                >
                  <span>🔖 محفوظ شدہ کتب</span>
                  <span>{favorites.length}</span>
                </button>

                {categories.map((cat) => {
                  const isSelected =
                    librarySectionMode === "all" &&
                    selectedCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setLibrarySectionMode("all");
                        setSelectedCategory(cat.value);
                        setCurrentPage(1);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-extrabold transition text-right ${
                        isSelected
                          ? "bg-[#165B43] text-white shadow-xs"
                          : "bg-white text-[#0F3D2E] border border-[#DCECE4] hover:bg-[#165B43] hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base">
                          {getCategoryIcon(cat.value, cat.label)}
                        </span>
                        <span>{cat.label}</span>
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
                      )}
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
            className="fixed bottom-20 right-6 z-40 p-3 bg-white text-[#0F3D2E] hover:bg-[#165B43] hover:text-white rounded-full shadow-lg transition border border-[#C5A059] cursor-pointer"
            title="اوپر جائیں"
          >
            <ArrowUpIcon className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* QUICK LOOK / BOOK DETAILS MODAL (KHAAS FEATURE 5: 👁️ جھلک) */}
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

      {showSuccess && <SuccessScreen onClose={() => setShowSuccess(false)} />}
    </div>
  );
};

export default UserLibrary;
