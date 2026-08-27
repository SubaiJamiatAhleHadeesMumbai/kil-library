import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

// --- Services + Hooks ---
import { bookService } from "../api/bookService";
import { categoryService } from "../api/categoryService";
import { subcategoryService } from "../api/subcategoryService";
import { useBookSearch, normalizeText, getText, deduplicateBooks } from "../hooks/useBookSearch";
import useAuth from "../hooks/useAuth";
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
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  SparklesIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  BookmarkIcon as BookmarkOutline,
  FolderIcon,
  FolderOpenIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  UserIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
  TagIcon,
  ArrowRightIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

import {
  LockClosedIcon as LockSolid,
  BookmarkIcon as BookmarkSolid,
} from "@heroicons/react/24/solid";

// --- Constants ---
const FALLBACK_NO_COVER =
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

// ==========================================
// 1. PUBLIC BOOK CARD COMPONENT
// ==========================================
const PublicBookCard = ({
  book,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  isOurPub = false,
  className = "",
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

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
    setImgError(false);

    if (!book) {
      setImgSrc(null);
      return;
    }

    const rawUrl = book.cover_image_url || book.cover_image;
    if (!rawUrl) {
      setImgSrc(null);
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
    setImgError(true);
    setImgLoaded(true);
  };

  const handleCardClick = () => {
    if (!hasDigitalPdf) {
      toast("Digital PDF coming soon...", {
        icon: "⏳",
        duration: 3000,
        style: {
          borderRadius: "16px",
          background: "#0F172A",
          color: "#38BDF8",
          fontSize: "14px",
          fontWeight: "bold",
          padding: "12px 20px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
        }
      });
    }
    if (typeof onClick === "function") onClick();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 cursor-pointer hover:shadow-xl hover:border-slate-300 sm:max-w-none ${className}`}
    >
      {/* Badges - Restricted / Markaz / Upcoming */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 sm:top-3 sm:left-3">
        {isRestricted && (
          <div className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md sm:px-3 sm:py-1.5 sm:text-[11px]">
            <LockSolid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Restricted
          </div>
        )}

        {isOurPub && (
          <div className="flex items-center gap-1 rounded-full bg-amber-500/95 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-md backdrop-blur-xs border border-amber-300">
            <span>🏛️</span>
            <span>Markaz Dawah</span>
          </div>
        )}

        {!hasDigitalPdf && (
          <div className="rounded-full bg-slate-900/90 text-amber-300 px-2.5 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-xs flex items-center gap-1 border border-slate-700">
            <span>⏳</span> <span>Upcoming</span>
          </div>
        )}
      </div>

      {/* Favorite Button */}
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
        <div className="relative aspect-[2/3] w-[118px] overflow-hidden rounded-2xl bg-slate-900 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl sm:w-[150px] md:w-[175px] lg:w-[185px]">
          {!imgLoaded && !imgError && imgSrc && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}

          {imgSrc && !imgError ? (
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
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-between p-3 text-center bg-gradient-to-br from-[#111a2d] via-[#1e293b] to-[#0f172a] text-white border border-slate-700/50">
              <div className="w-full flex justify-end">
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">KIL</span>
              </div>
              <div className="flex flex-col items-center justify-center my-auto">
                <div className="p-2.5 rounded-full bg-slate-800/80 text-emerald-400 mb-2 border border-slate-700 shadow-xs">
                  <BookOpenIcon className="w-6 h-6 stroke-2" />
                </div>
                <p className="text-xs font-bold line-clamp-3 leading-snug px-1 text-slate-100">{title}</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate w-full">{author}</p>
            </div>
          )}
        </div>
      </div>

      {/* TEXT INFO */}
      <div className="p-3 text-center sm:p-4">
        <h3
          className="line-clamp-1 font-bold text-slate-800 text-xs sm:text-sm group-hover:text-emerald-600 transition-colors"
          title={title}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuth } = useAuth();
  const { currentLang, t } = useLanguage();

  // --- STATE ---
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [dynamicSubcategories, setDynamicSubcategories] = useState([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState("all"); // 'all' | 'our_publications' | 'folders' | 'authors' | 'publishers'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState("oldest");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");
  const [publisherSearch, setPublisherSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const activeRequestRef = useRef(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modals
  const [selectedBook, setSelectedBook] = useState(null);
  const [restrictedBook, setRestrictedBook] = useState(null);
  const [isAccessFlowOpen, setIsAccessFlowOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Modal Handlers with URL Sync
  const handleOpenBookModal = (book) => {
    setSelectedBook(book);
    if (book?.id) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("bookId", String(book.id));
        return next;
      }, { replace: true });
    }
  };

  const handleCloseBookModal = () => {
    setSelectedBook(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("bookId");
      next.delete("id");
      return next;
    }, { replace: true });
  };

  // Deep Link / Shared Link Handler (/books?bookId=123)
  const urlBookId = searchParams.get("bookId") || searchParams.get("id");

  useEffect(() => {
    if (!urlBookId) return;

    if (selectedBook && String(selectedBook.id) === String(urlBookId)) return;

    const matched = books.find((b) => String(b.id) === String(urlBookId));
    if (matched) {
      setSelectedBook(matched);
      return;
    }

    let isMounted = true;
    const fetchSharedBook = async () => {
      try {
        const bookData = await bookService.getBookById(urlBookId);
        if (isMounted && bookData) {
          setSelectedBook(bookData);
        }
      } catch (err) {
        console.error("Failed to load shared book by ID:", urlBookId, err);
      }
    };

    fetchSharedBook();

    return () => {
      isMounted = false;
    };
  }, [urlBookId, books, selectedBook]);

  // Favorites
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("bookNest_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Search Hook
  const {
    searchTerm,
    setSearchTerm,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    filteredBooks,
  } = useBookSearch(books);

  // Fetch Categories & Subcategories
  useEffect(() => {
    const loadTaxonomy = async () => {
      try {
        const [catData, subcatData] = await Promise.allSettled([
          categoryService.getAllCategories(),
          subcategoryService.getAllSubcategories(),
        ]);

        if (catData.status === "fulfilled") {
          const list = Array.isArray(catData.value) ? catData.value : catData.value?.categories || [];
          setDynamicCategories(list);
        }
        if (subcatData.status === "fulfilled") {
          const subList = Array.isArray(subcatData.value) ? subcatData.value : [];
          setDynamicSubcategories(subList);
        }
      } catch (error) {
        console.error("Could not load categories/subcategories", error);
      }
    };
    loadTaxonomy();
  }, []);

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

  useEffect(() => {
    const handler = window.setTimeout(() => {
      fetchBooks(searchTerm);
    }, 300);

    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLanguage, selectedCategory, selectedSubcategory, sortBy, activeLibraryTab]);

  // Our Publications strict filter
  const isOurPublication = (book) => {
    if (!book) return false;
    if (book.is_our_publication === true || book.is_markaz_publication === true) return true;

    const rawPub = getText(book.publisher);
    if (!rawPub) return false;

    const pubNorm = normalizeText(rawPub);
    const pubLatin = String(rawPub).toLowerCase().replace(/[^a-z0-9]/g, "");

    const markazArabicList = [
      "مركز الدعوة الاسلامية والخيرية",
      "مركز الدعوة الاسلامية",
      "مركز الدعوة",
      "مرکز الدعوة الاسلامیة والخیریة",
      "مرکز الدعوۃ الاسلامیہ والخیریہ",
      "مرکز الدعوة",
      "مرکز الدعوۃ",
      "شعبة النشر مركز الدعوة",
      "مطبوعات مركز الدعوة",
      "مطبوعات مرکز الدعوۃ"
    ].map(normalizeText);

    const markazLatinList = [
      "markazdawah",
      "markazuddawah",
      "markazdawahislamic",
      "markazdawahislamicandcharitable",
      "markazdawahpublication",
      "markazdawahpublications"
    ];

    return markazArabicList.some(kw => pubNorm.includes(kw)) || markazLatinList.some(kw => pubLatin.includes(kw));
  };

  // Category Tree Hierarchy
  const categoryTree = useMemo(() => {
    return (dynamicCategories || []).map((cat) => {
      const catId = cat.id;
      const catNorm = normalizeText(cat.name);

      const subcats = (dynamicSubcategories || []).filter(sc => {
        return sc.category_id === catId || (sc.category && sc.category.id === catId) || normalizeText(sc.category?.name) === catNorm;
      });

      const categoryBooks = (books || []).filter(b => {
        const bCatId = b.category_id || (typeof b.category === 'object' ? b.category?.id : null);
        const bCatName = normalizeText(getText(b.category));
        const bSubcats = Array.isArray(b.subcategories) ? b.subcategories : [];
        return (
          bCatId === catId ||
          bCatName === catNorm ||
          bSubcats.some(sc => sc.category_id === catId || (sc.category && sc.category.id === catId) || normalizeText(sc.category?.name) === catNorm)
        );
      });

      const subcatsWithCount = subcats.map(sc => {
        const scCount = (books || []).filter(b => {
          const bSubcats = Array.isArray(b.subcategories) ? b.subcategories : [];
          return bSubcats.some(item => item.id === sc.id || normalizeText(item.name) === normalizeText(sc.name));
        }).length;
        return {
          ...sc,
          count: scCount
        };
      });

      return {
        ...cat,
        subcategories: subcatsWithCount,
        count: categoryBooks.length
      };
    });
  }, [dynamicCategories, dynamicSubcategories, books]);

  const activeCategorySubcategories = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all" || selectedCategory === "our_publications") {
      return [];
    }
    const found = categoryTree.find(c => String(c.id) === String(selectedCategory) || normalizeText(c.name) === normalizeText(selectedCategory));
    return found ? found.subcategories : [];
  }, [selectedCategory, categoryTree]);

  const filteredFolderCategories = useMemo(() => {
    const q = normalizeText(folderSearch);
    if (!q) return categoryTree;
    return categoryTree.filter(cat => {
      const catName = normalizeText(cat.name);
      const hasSubcatMatch = cat.subcategories.some(sc => normalizeText(sc.name).includes(q));
      return catName.includes(q) || hasSubcatMatch;
    });
  }, [categoryTree, folderSearch]);

  // Authors
  const authorsDirectory = useMemo(() => {
    const map = new Map();
    (books || []).forEach((book) => {
      const author = typeof book?.author === "object" ? book.author?.name : book?.author;
      const clean = String(author || "").trim().replace(/\s+/g, " ");
      if (!clean || clean.toLowerCase() === "unknown" || clean.length < 2) return;
      const key = clean.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: clean, count: 1, sampleBook: book });
      } else {
        const item = map.get(key);
        item.count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [books]);

  const filteredAuthors = useMemo(() => {
    const q = authorSearch.trim().toLowerCase();
    if (!q) return authorsDirectory;
    return authorsDirectory.filter(a => a.name.toLowerCase().includes(q));
  }, [authorsDirectory, authorSearch]);

  // Publishers
  const publishersDirectory = useMemo(() => {
    const map = new Map();
    (books || []).forEach((book) => {
      const pub = typeof book?.publisher === "object" ? book.publisher?.name : book?.publisher;
      const clean = String(pub || "").trim().replace(/\s+/g, " ");
      if (!clean || clean.toLowerCase() === "unknown" || clean.length < 2) return;
      const key = clean.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: clean, count: 1, sampleBook: book });
      } else {
        const item = map.get(key);
        item.count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [books]);

  const filteredPublishers = useMemo(() => {
    const q = publisherSearch.trim().toLowerCase();
    if (!q) return publishersDirectory;
    return publishersDirectory.filter(p => p.name.toLowerCase().includes(q));
  }, [publishersDirectory, publisherSearch]);

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

  // Final Display Books
  const finalDisplayBooks = useMemo(() => {
    let list = Array.isArray(filteredBooks) ? filteredBooks : [];

    if (activeLibraryTab === "our_publications" || selectedCategory === "our_publications") {
      list = list.filter(isOurPublication);
    }

    const sorted = [...list];
    const safeDate = (b) => new Date(b?.created_at || b?.published_date || 0).getTime();
    const safeSerial = (b) => Number(b?.serial_number) || Number(b?.id) || 0;
    const safeId = (b) => Number(b?.id) || 0;

    if (sortBy === "newest") {
      sorted.sort((a, b) => {
        const dDiff = safeDate(b) - safeDate(a);
        if (dDiff !== 0) return dDiff;
        return safeId(b) - safeId(a);
      });
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => safeSerial(a) - safeSerial(b));
    } else if (sortBy === "az") {
      sorted.sort((a, b) => (a?.title || "").localeCompare(b?.title || ""));
    } else if (sortBy === "favorites") {
      return sorted.filter((b) => favorites.includes(b.id));
    }

    return deduplicateBooks(sorted);
  }, [filteredBooks, activeLibraryTab, selectedCategory, sortBy, favorites]);

  // Pagination
  const totalPages = Math.ceil(finalDisplayBooks.length / itemsPerPage) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalDisplayBooks.slice(start, start + itemsPerPage);
  }, [finalDisplayBooks, currentPage, itemsPerPage]);

  const activeCategoryLabel = useMemo(() => {
    if (activeLibraryTab === "our_publications" || selectedCategory === "our_publications") {
      return currentLang === 'ar' ? 'منشورات مركز الدعوة' : currentLang === 'ur' ? 'مطبوعات مرکز الدعوۃ الاسلامیہ' : 'Markaz Dawah Publications';
    }
    if (selectedCategory === "all" || !selectedCategory) return currentLang === 'ur' ? 'تمام کتب' : 'All Books';
    const found = categoryTree.find(c => String(c.id) === String(selectedCategory) || normalizeText(c.name) === normalizeText(selectedCategory));
    return found ? found.name : selectedCategory;
  }, [selectedCategory, categoryTree, activeLibraryTab, currentLang]);

  const activeSubcategoryLabel = useMemo(() => {
    if (!selectedSubcategory || selectedSubcategory === "all") return null;
    const found = (dynamicSubcategories || []).find(sc => String(sc.id) === String(selectedSubcategory) || normalizeText(sc.name) === normalizeText(selectedSubcategory));
    return found ? found.name : null;
  }, [selectedSubcategory, dynamicSubcategories]);

  const safeText = (v, f = "") => {
    if (!v) return f;
    if (typeof v === "object") return v.name || v.title || f;
    return String(v);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-slate-800 pb-24 relative">
      {/* ================= HERO & SEARCH SECTION ================= */}
      <div className="relative bg-[#0B1120] pt-10 pb-16 px-4 rounded-b-[2.5rem] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-72 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Markaz{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Islamic Library
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mx-auto max-w-3xl"
          >
            <LibrarySearchStrip
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search books by title, author, subject, or ISBN..."
            />
          </motion.div>

          {/* 5 CLEAN PRIMARY VIEW TABS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar gap-2 mt-5 pt-1 px-2 max-w-full"
          >
            <button
              onClick={() => {
                setActiveLibraryTab("all");
                setSelectedCategory("all");
                setSelectedSubcategory("all");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeLibraryTab === "all" && selectedCategory === "all"
                  ? "bg-emerald-500 text-white shadow-emerald-500/40 shadow-md scale-105"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
              }`}
            >
              <BookOpenIcon className="w-4 h-4" />
              <span>{currentLang === 'ur' ? 'تمام کتب' : 'All Books'}</span>
            </button>

            <button
              onClick={() => {
                setActiveLibraryTab("our_publications");
                setSelectedCategory("our_publications");
                setSelectedSubcategory("all");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeLibraryTab === "our_publications" || selectedCategory === "our_publications"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/50 shadow-md scale-105 ring-2 ring-amber-300/40"
                  : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/30"
              }`}
              title="Markaz Dawah Islamic & Charitable Publications"
            >
              <SparklesIcon className="w-4 h-4 text-amber-300" />
              <span>
                {currentLang === 'ar' 
                  ? 'منشورات مركز الدعوة' 
                  : currentLang === 'ur' 
                    ? 'مطبوعات مرکز الدعوۃ' 
                    : 'Our Publications'}
              </span>
            </button>

            <button
              onClick={() => setActiveLibraryTab("folders")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeLibraryTab === "folders"
                  ? "bg-emerald-500 text-white shadow-emerald-500/40 shadow-md scale-105"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
              }`}
            >
              <FolderIcon className="w-4 h-4" />
              <span>{currentLang === 'ur' ? 'فولڈرز اور زمرہ جات' : 'Folders & Topics'}</span>
            </button>

            <button
              onClick={() => setActiveLibraryTab("authors")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeLibraryTab === "authors"
                  ? "bg-emerald-500 text-white shadow-emerald-500/40 shadow-md scale-105"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
              }`}
            >
              <UserGroupIcon className="w-4 h-4" />
              <span>{currentLang === 'ur' ? 'مصنفین' : 'Authors'}</span>
            </button>

            <button
              onClick={() => setActiveLibraryTab("publishers")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeLibraryTab === "publishers"
                  ? "bg-emerald-500 text-white shadow-emerald-500/40 shadow-md scale-105"
                  : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
              }`}
            >
              <BuildingOfficeIcon className="w-4 h-4" />
              <span>{currentLang === 'ur' ? 'ناشرین' : 'Publishers'}</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* ================= VIEW: FOLDERS & TOPICS ================= */}
      {activeLibraryTab === "folders" && (
        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FolderIcon className="w-7 h-7 text-emerald-600" />
                <span>{currentLang === 'ur' ? 'موضوعاتی فولڈرز اور ذیلی زمرہ جات' : 'Topic Folders & Subcategories Archive'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === 'ur' 
                  ? 'مکمل زمرہ کھولنے کے لیے فولڈر پر یا مخصوص کتب کے لیے ذیلی زمرے پر کلک کریں' 
                  : 'Click on a Category folder to view its entire collection, or click a subcategory tag to filter directly.'}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-80">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={currentLang === 'ur' ? 'زمرہ یا ذیلی زمرہ تلاش کریں...' : 'Search categories & subcategories...'}
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium placeholder:text-slate-400"
              />
              {folderSearch && (
                <button onClick={() => setFolderSearch("")} className="text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFolderCategories.map((cat) => (
              <motion.div
                key={cat.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      onClick={() => {
                        setSelectedCategory(String(cat.id));
                        setSelectedSubcategory("all");
                        setActiveLibraryTab("all");
                        setTimeout(scrollToTop, 100);
                      }}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                        <FolderOpenIcon className="w-6 h-6 stroke-2" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 text-base leading-tight transition-colors">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {cat.subcategories.length} {currentLang === 'ur' ? 'ذیلی زمرہ جات' : 'Subcategories'}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-800 transition-colors">
                      {cat.count} {currentLang === 'ur' ? 'کتب' : 'Books'}
                    </span>
                  </div>

                  {cat.subcategories.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {cat.subcategories.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory(String(cat.id));
                              setSelectedSubcategory(String(sub.id));
                              setActiveLibraryTab("all");
                              setTimeout(scrollToTop, 100);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                          >
                            <span>{sub.name}</span>
                            {sub.count > 0 && (
                              <span className="text-[9px] bg-slate-200/80 px-1.5 py-0.2 rounded-full font-bold text-slate-600">
                                {sub.count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400 italic">No subcategories defined</p>
                    </div>
                  )}
                </div>

                <div 
                  onClick={() => {
                    setSelectedCategory(String(cat.id));
                    setSelectedSubcategory("all");
                    setActiveLibraryTab("all");
                    setTimeout(scrollToTop, 100);
                  }}
                  className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  <span>{currentLang === 'ur' ? 'تمام کتب کھولیں' : 'Open Entire Category'}</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ================= VIEW: AUTHORS ================= */}
      {activeLibraryTab === "authors" && (
        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <UserGroupIcon className="w-7 h-7 text-blue-600" />
                <span>{currentLang === 'ur' ? 'مصنفین کی ڈائرکٹری' : 'Authors Directory'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === 'ur' ? 'مصنف پر کلک کرکے ان کی تمام کتب دیکھیں' : 'Click on any author to view their published books'}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-72">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={currentLang === 'ur' ? 'مصنف کا نام تلاش کریں...' : 'Search author name...'}
                value={authorSearch}
                onChange={(e) => setAuthorSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium placeholder:text-slate-400"
              />
              {authorSearch && (
                <button onClick={() => setAuthorSearch("")} className="text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAuthors.map((author, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -3 }}
                onClick={() => {
                  setSearchTerm(author.name);
                  setActiveLibraryTab("all");
                  setTimeout(scrollToTop, 100);
                }}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                    {author.name}
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">
                    {author.count} {currentLang === 'ur' ? 'کتب' : 'Books'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ================= VIEW: PUBLISHERS ================= */}
      {activeLibraryTab === "publishers" && (
        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BuildingOfficeIcon className="w-7 h-7 text-purple-600" />
                <span>{currentLang === 'ur' ? 'ناشرین اور مکتبہ جات' : 'Publishers Directory'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === 'ur' ? 'ناشر پر کلک کرکے ان کی کتب دیکھیں' : 'Click on any publisher to view all published books'}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-72">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={currentLang === 'ur' ? 'ناشر کا نام تلاش کریں...' : 'Search publisher name...'}
                value={publisherSearch}
                onChange={(e) => setPublisherSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium placeholder:text-slate-400"
              />
              {publisherSearch && (
                <button onClick={() => setPublisherSearch("")} className="text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPublishers.map((pub, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -3 }}
                onClick={() => {
                  setSearchTerm(pub.name);
                  setActiveLibraryTab("all");
                  setTimeout(scrollToTop, 100);
                }}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-purple-400 transition-all cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                  <BuildingOfficeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-purple-600 transition-colors">
                    {pub.name}
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">
                    {pub.count} {currentLang === 'ur' ? 'کتب' : 'Books'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ================= VIEW: BOOKS ================= */}
      {(activeLibraryTab === "all" || activeLibraryTab === "our_publications") && (
        <>
          {/* STICKY FILTER TOOLBAR (RESPONSIVE: MOBILE APP-STYLE + DESKTOP) */}
          <div className="relative z-30 max-w-7xl mx-auto px-3 sm:px-4 mt-4 md:sticky md:top-16 md:mt-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="rounded-2xl sm:rounded-3xl border border-white/60 bg-white/95 p-3 sm:p-4 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.3)] backdrop-blur-xl flex flex-col gap-3"
            >
              {/* --- DESKTOP TOOLBAR (md and above) --- */}
              <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                  {/* Language Selector */}
                  <select
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-emerald-500 cursor-pointer"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="all">🌐 All Languages</option>
                    <option value="urdu">Urdu (اردو)</option>
                    <option value="arabic">Arabic (العربية)</option>
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                  </select>

                  {/* Primary Category Selector */}
                  <select
                    className="max-w-[260px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-emerald-500 cursor-pointer truncate"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubcategory("all");
                    }}
                  >
                    <option value="all">📖 All Categories ({books.length})</option>
                    <option value="our_publications">🏛️ Our Publications ({books.filter(isOurPublication).length})</option>
                    {categoryTree.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        📖 {cat.name} ({cat.count})
                      </option>
                    ))}
                  </select>

                  {/* Subcategory Selector */}
                  {activeCategorySubcategories.length > 0 && (
                    <select
                      className="max-w-[220px] rounded-xl border border-emerald-300 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-800 outline-none transition hover:border-emerald-500 cursor-pointer truncate"
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                    >
                      <option value="all">🔖 All Subcategories</option>
                      {activeCategorySubcategories.map((sub) => (
                        <option key={sub.id} value={String(sub.id)}>
                          🔖 {sub.name} ({sub.count})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Clear Button */}
                  {(selectedCategory !== "all" || selectedSubcategory !== "all" || selectedLanguage !== "all" || searchTerm) && (
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedSubcategory("all");
                        setSelectedLanguage("all");
                        setSearchTerm("");
                        setActiveLibraryTab("all");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-bold transition cursor-pointer"
                      title="Clear All Filters"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl bg-slate-100 p-0.5">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === "grid"
                          ? "bg-white shadow-xs text-emerald-600"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                      title="Grid view"
                    >
                      <Squares2X2Icon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === "list"
                          ? "bg-white shadow-xs text-emerald-600"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                      title="List view"
                    >
                      <ListBulletIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                    <ArrowsUpDownIcon className="h-4 w-4 text-slate-400" />
                    <select
                      className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
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
              </div>

              {/* --- MOBILE TOOLBAR (Below md) --- */}
              <div className="flex md:hidden flex-col gap-2.5">
                {/* Top Action Row on Mobile */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setIsMobileFilterOpen(true)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                      selectedLanguage !== "all" || sortBy !== "oldest"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                    <span>Filter & Sort</span>
                    {(selectedLanguage !== "all" || sortBy !== "oldest") && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {(selectedCategory !== "all" || selectedSubcategory !== "all" || selectedLanguage !== "all" || searchTerm) && (
                      <button
                        onClick={() => {
                          setSelectedCategory("all");
                          setSelectedSubcategory("all");
                          setSelectedLanguage("all");
                          setSearchTerm("");
                          setActiveLibraryTab("all");
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold transition cursor-pointer"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}

                    <div className="flex rounded-xl bg-slate-100 p-0.5">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === "grid" ? "bg-white shadow-xs text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        <Squares2X2Icon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === "list" ? "bg-white shadow-xs text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        <ListBulletIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Horizontal Category Carousel Rail */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedSubcategory("all");
                      setActiveLibraryTab("all");
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === "all" && activeLibraryTab === "all"
                        ? "bg-[#002147] text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>📖 All Books</span>
                    <span className="text-[10px] opacity-75">({books.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCategory("our_publications");
                      setSelectedSubcategory("all");
                      setActiveLibraryTab("our_publications");
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === "our_publications" || activeLibraryTab === "our_publications"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    <span>🏛️ Our Publications</span>
                    <span className="text-[10px] opacity-80">({books.filter(isOurPublication).length})</span>
                  </button>

                  {categoryTree.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(String(cat.id));
                        setSelectedSubcategory("all");
                        setActiveLibraryTab("all");
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        String(selectedCategory) === String(cat.id)
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        String(selectedCategory) === String(cat.id) ? "bg-emerald-800 text-white" : "bg-slate-200/80 text-slate-600"
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategories Pill Strip (Both Mobile & Desktop) */}
              {activeCategorySubcategories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1.5 border-t border-slate-100 no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                    <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Topics:</span>
                  </span>

                  <button
                    onClick={() => setSelectedSubcategory("all")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedSubcategory === "all"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    All Topics
                  </button>

                  {activeCategorySubcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubcategory(String(sub.id))}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        String(selectedSubcategory) === String(sub.id)
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/60"
                      }`}
                    >
                      <span>{sub.name}</span>
                      {sub.count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          String(selectedSubcategory) === String(sub.id) ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          {sub.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* MAIN CONTENT */}
          <div id="book-grid-container" className="max-w-7xl mx-auto px-4 mt-6 md:mt-10 space-y-8">
            
            {/* Active Header & Count Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div>
                <div className="flex items-center flex-wrap gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {activeCategoryLabel}
                  </h2>
                  {activeSubcategoryLabel && (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-200">
                      <TagIcon className="w-3.5 h-3.5" />
                      <span>{activeSubcategoryLabel}</span>
                    </span>
                  )}
                  {(selectedCategory !== "all" || selectedSubcategory !== "all") && (
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedSubcategory("all");
                        setActiveLibraryTab("all");
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer"
                    >
                      Show All Books
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Showing <span className="font-bold text-slate-900">{finalDisplayBooks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, finalDisplayBooks.length)}</span> of <span className="font-bold text-slate-900">{finalDisplayBooks.length}</span> total books
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-emerald-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Books Loading / Empty / Grid / List */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                    <div className="aspect-[2/3] bg-slate-100 rounded-xl animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : finalDisplayBooks.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-sm">
                <FaceFrownIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-1">No Books Found</h3>
                <p className="text-sm text-slate-500 mb-6">
                  We couldn't find any books matching your criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                    setSelectedSubcategory("all");
                    setSelectedLanguage("all");
                    setActiveLibraryTab("all");
                  }}
                  className="bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-full hover:bg-emerald-700 transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {paginatedBooks.map((book) => (
                    <PublicBookCard
                      key={book.id}
                      book={book}
                      isFavorite={favorites.includes(book.id)}
                      onToggleFavorite={toggleFavorite}
                      isOurPub={isOurPublication(book)}
                      onClick={() => handleOpenBookModal(book)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedBooks.map((book) => (
                    <div
                      key={book.id}
                      onClick={() => handleOpenBookModal(book)}
                      className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-4 cursor-pointer"
                    >
                      <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={book.cover_image_url || book.cover_image || FALLBACK_NO_COVER}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{book.title}</h4>
                          {isOurPublication(book) && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              🏛️ مرکز الدعوة
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{safeText(book.author, "Unknown Author")}</p>
                      </div>
                      <span className="text-xs text-emerald-600 font-bold">View →</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    scrollToTop();
                  }}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1.5">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          scrollToTop();
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-1 text-slate-400 font-bold">...</span>}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    scrollToTop();
                  }}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* BOOK DETAILS / READER MODAL */}
      {selectedBook && (
        <BookDetailsModal
          book={selectedBook}
          onClose={handleCloseBookModal}
          onRequestAccess={handleRequestAccess}
        />
      )}

      {/* RESTRICTED ACCESS MODAL */}
      {isAccessFlowOpen && restrictedBook && (
        <RestrictedAccessFlow
          isOpen={isAccessFlowOpen}
          book={restrictedBook}
          onClose={() => {
            setIsAccessFlowOpen(false);
            setRestrictedBook(null);
          }}
          onSuccess={() => setShowSuccess(true)}
        />
      )}

      {/* SUCCESS SCREEN */}
      {showSuccess && (
        <SuccessScreen
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
        />
      )}

      {/* MOBILE FILTER & SORT BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0"
            />

            {/* Bottom Sheet Modal Container */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl p-6 space-y-5 z-10 max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AdjustmentsHorizontalIcon className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Filter & Sort Library</h3>
                </div>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Language Selection Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Language (زبان)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "🌐 All Languages" },
                    { id: "urdu", label: "اردو (Urdu)" },
                    { id: "arabic", label: "العربية (Arabic)" },
                    { id: "english", label: "English" },
                    { id: "hindi", label: "Hindi" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition text-left border cursor-pointer ${
                        selectedLanguage === lang.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sorting Selection Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Sort By (ترتیب)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "oldest", label: "🔢 Serial # (1, 2...)" },
                    { id: "newest", label: "✨ Newest First" },
                    { id: "az", label: "🔤 Title (A - Z)" },
                    { id: "favorites", label: "⭐ My Favorites" },
                  ].map((sortOption) => (
                    <button
                      key={sortOption.id}
                      onClick={() => setSortBy(sortOption.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition text-left border cursor-pointer ${
                        sortBy === sortOption.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sortOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedSubcategory("all");
                    setSelectedLanguage("all");
                    setSortBy("oldest");
                    setSearchTerm("");
                    setIsMobileFilterOpen(false);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#002147] text-white text-xs font-bold hover:bg-slate-900 transition shadow-sm"
                >
                  Apply & View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserLibrary;
