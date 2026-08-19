import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthProvider';
import settingsService from '../api/settingsService';
import { Toaster, toast } from "react-hot-toast";
import {
  FaceFrownIcon,
  HeartIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

// Components
import LibraryHero from "../components/public/LibraryHero";
import LibrarySearchStrip from "../components/public/LibrarySearchStrip";
import PublicBookCard from "../components/public/PublicBookCard";
import BookDetailsModal from "../components/book/BookDetailsModal";
import RestrictedAccessFlow from "../components/book/RestrictedAccessFlow";
import SuccessScreen from "../components/RestrictedAccess/SuccessScreen"; // ✅ Missing Import Fixed

// Services + Hooks
import { bookService } from "../api/bookService";
import { categoryService } from "../api/categoryService";
import { useBookSearch } from "../hooks/useBookSearch";
import LandingPostsPreview from "../components/public/LandingPostsPreview";
import DonationPanel from "../components/donation/DonationPanel";

// ✅ Skeleton Loader (Premium UI)
const BookCardSkeleton = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000");

const getBookImage = (book) => {
  const rawUrl = book?.cover_image_url || book?.cover_image;
  if (!rawUrl) return "https://via.placeholder.com/240x320?text=No+Cover";
  if (typeof rawUrl === "string" && rawUrl.startsWith("http")) return rawUrl;
  const path = String(rawUrl);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const getText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value?.name || value?.title || fallback;
  const str = String(value).trim();
  return str.length ? str : fallback;
};

const getBookSubcategorySlugs = (book) => {
  if (!Array.isArray(book?.subcategories)) return [];
  return book.subcategories
    .map((sub) => {
      const label = getText(sub);
      return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    })
    .filter(Boolean);
};

const getBookViews = (book) => {
  const value = Number(book?.views ?? book?.view_count ?? book?.total_views ?? book?.hits ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const CompactBookCard = ({ book, label, meta, onClick, progress = null, chips = [] }) => (
  <button
    onClick={onClick}
    className="group w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
  >
    <div className="flex gap-3">
      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm">
        <img
          src={getBookImage(book)}
          alt={book?.title || "Book cover"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex max-w-full rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </span>
          {meta ? <span className="text-[11px] text-slate-400">{meta}</span> : null}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-[#002147]">
          {book?.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
          {getText(book?.author, "Unknown Author")}
        </p>

        {Array.isArray(chips) && chips.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.slice(0, 2).map((chip) => (
              <span
                key={chip}
                className="inline-flex max-w-full rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {typeof progress === "number" && progress > 0 ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
              <span>Reading progress</span>
              <span>{Math.min(100, Math.max(0, Math.round(progress)))}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  </button>
);

const PublicHome = () => {
  const navigate = useNavigate();
  const { isAdmin, user, loading: authLoading } = useAuth(); // ✅ Auth Hook

  // --- 1) SMART REDIRECT (Admin Protection) ---
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      console.log("👮‍♂️ Admin Detected on Public Home -> Redirecting to Dashboard");
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  // --- 2) DATA STATE ---
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [homepageSettings, setHomepageSettings] = useState({ theme: 'aurora', sections: {}, layout: {} });
  const [dynamicCategories, setDynamicCategories] = useState([]);  // ✅ Dynamic Categories from DB

  // Filters
  const [sortBy, setSortBy] = useState("newest");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [recentReads, setRecentReads] = useState([]);

  // Router location state (preSearch)
  const location = useLocation();

  // --- 3) MODAL STATE ---
  const [selectedBook, setSelectedBook] = useState(null);
  const [restrictedBook, setRestrictedBook] = useState(null);
  const [isAccessFlowOpen, setIsAccessFlowOpen] = useState(false);

  // --- 4) FAVORITES ---
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("bookNest_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const featuredBooks = useMemo(() => {
    if (!Array.isArray(books) || books.length === 0) return [];
    const featuredIds = homepageSettings?.sections?.featured?.featured_books || [];
    if (Array.isArray(featuredIds) && featuredIds.length) {
      const byId = new Map(books.map((b) => [b.id, b]));
      const list = featuredIds.map((id) => byId.get(id)).filter(Boolean);
      if (list.length) return list;
    }
    return books.slice(0, 6);
  }, [books]);

  const recentReadBooks = useMemo(() => {
    if (!Array.isArray(recentReads) || recentReads.length === 0) return [];
    const byId = new Map(books.map((book) => [String(book.id), book]));
    return recentReads
      .map((entry) => ({ ...entry, book: byId.get(String(entry.book_id)) }))
      .filter((entry) => entry.book)
      .slice(0, 4);
  }, [books, recentReads]);

  const recommendedBooks = useMemo(() => {
    if (!Array.isArray(books) || books.length === 0) return [];

    const favoriteSet = new Set(favorites.map((id) => String(id)));
    const recentSeedBooks = recentReadBooks.map((entry) => entry.book).filter(Boolean);
    const seedBooks = [...recentSeedBooks, ...books.filter((book) => favoriteSet.has(String(book.id)))];
    const seedCategorySlugs = new Set(seedBooks.flatMap((book) => getBookSubcategorySlugs(book)));
    const seedLanguages = new Set(seedBooks.map((book) => String(book?.language?.name || book?.language?.Name || book?.language || "").toLowerCase()).filter(Boolean));
    const seedAuthors = new Set(seedBooks.map((book) => getText(book?.author).toLowerCase()).filter(Boolean));

    const scored = books
      .filter((book) => !favoriteSet.has(String(book.id)))
      .map((book) => {
        let score = 0;
        const reasons = [];
        const slugs = getBookSubcategorySlugs(book);
        const lang = String(book?.language?.name || book?.language?.Name || book?.language || "").toLowerCase();
        const author = getText(book?.author).toLowerCase();

        if (slugs.some((slug) => seedCategorySlugs.has(slug))) {
          score += 4;
          reasons.push("Similar category");
        }
        if (lang && seedLanguages.has(lang)) {
          score += 3;
          reasons.push("Same language");
        }
        if (author && seedAuthors.has(author)) {
          score += 2;
          reasons.push("Same author");
        }
        if (recentReadBooks.length > 0 && book.id > recentReadBooks[0].book.id) {
          score += 1;
          reasons.push("Fresh pick");
        }
        const popularityBoost = Math.min(3, Math.round(getBookViews(book) / 25));
        if (popularityBoost > 0) {
          score += popularityBoost;
          reasons.push("Popular");
        }

        if (reasons.length === 0) {
          reasons.push("Good match");
        }

        return { book, score, reasons };
      })
      .sort((a, b) => b.score - a.score || getBookViews(b.book) - getBookViews(a.book))
      .slice(0, 4)
      .map((item) => ({ book: item.book, reasons: item.reasons }));

    if (scored.length > 0) return scored;
    return books.slice(0, 4).map((book) => ({ book, reasons: ["Good match"] }));
  }, [books, favorites, recentReadBooks]);

  const trendingBooks = useMemo(() => {
    if (!Array.isArray(books) || books.length === 0) return [];
    return [...books]
      .sort((a, b) => getBookViews(b) - getBookViews(a) || new Date(b?.created_at || b?.published_date || 0) - new Date(a?.created_at || a?.published_date || 0))
      .slice(0, 4);
  }, [books]);

  // Categories list
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
        { value: "ahkam_masail", label: "Ahkam & Masail" },
        { value: "history_seerah", label: "History & Seerah" },
        { value: "literature", label: "Literature" },
        { value: "science_tech", label: "Science & Tech" },
      ];
    },
    [dynamicCategories]
  );

  // --- 5) SEARCH HOOK ---
  const {
    searchTerm,
    setSearchTerm,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategory,
    setSelectedCategory,
    filteredBooks,
  } = useBookSearch(books);

  // --- 6) FETCH BOOKS ---
  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookService.getAllBooks(0, 200);
      const list = Array.isArray(data) ? data : data?.books || [];
      setBooks(list);
    } catch (error) {
      console.error("❌ PublicHome Load Error:", error);
      toast.error("Could not load library catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bookNest_recent_reads");
      const parsed = saved ? JSON.parse(saved) : [];
      setRecentReads(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentReads([]);
    }
  }, []);

  // ✅ NEW: Fetch categories from database (admin-added)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.getAllCategories();
        const categoryList = Array.isArray(data) ? data : data?.categories || [];
        setDynamicCategories(categoryList);
      } catch (error) {
        console.warn("⚠️ Could not load categories from DB, using fallback:", error);
        setDynamicCategories([]);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getHomepageSettings();
        setHomepageSettings(data || { theme: 'aurora', sections: {}, layout: {} });
      } catch (error) {
        console.error('Unable to load homepage settings', error);
      }
    };

    loadSettings();
  }, []);

  // --- 7) AUTO-SEARCH EFFECT (from other pages) ---
  useEffect(() => {
    if (location.state?.preSearch) {
      setSearchTerm(location.state.preSearch);

      // Smooth scroll to grid
      setTimeout(() => {
        const el = document.getElementById("book-grid");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [location.state, setSearchTerm]);

  // --- 8) HANDLERS ---
  const toggleFavorite = (e, bookId) => {
    e.stopPropagation();

    setFavorites((prev) => {
      const exists = prev.includes(bookId);
      const newFavs = exists
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId];

      try {
        localStorage.setItem("bookNest_favorites", JSON.stringify(newFavs));
      } catch {
        // ignore storage errors
      }

      return newFavs;
    });
  };

  const handleRequestAccess = (book) => {
    setSelectedBook(null);
    setRestrictedBook(book);
    setIsAccessFlowOpen(true);
  };

  const handleClearAll = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedLanguage("all");
    setSortBy("newest");
    setShowFavoritesOnly(false);
  };

  const handleResumeReading = (bookId) => {
    navigate(`/read/${bookId}`);
  };

  // --- 9) SORTING (after filters) ---
  const sortedBooks = useMemo(() => {
    const list = Array.isArray(filteredBooks) ? [...filteredBooks] : [];

    const safeTitle = (b) => String(b?.title || b?.name || "").toLowerCase();

    if (sortBy === "az") {
      return list.sort((a, b) => safeTitle(a).localeCompare(safeTitle(b)));
    }

    if (sortBy === "oldest") {
      return list.sort((a, b) => {
        const da = new Date(a?.created_at || a?.upload_date || 0).getTime();
        const db = new Date(b?.created_at || b?.upload_date || 0).getTime();
        return da - db;
      });
    }

    // newest (default)
    return list.sort((a, b) => {
      const da = new Date(a?.created_at || a?.upload_date || 0).getTime();
      const db = new Date(b?.created_at || b?.upload_date || 0).getTime();
      return db - da;
    });
  }, [filteredBooks, sortBy]);

  // --- 10) FAVORITES FILTER (client side) ---
  const finalBooks = useMemo(() => {
    if (!showFavoritesOnly) return sortedBooks;
    return sortedBooks.filter((b) => favorites.includes(b.id));
  }, [sortedBooks, showFavoritesOnly, favorites]);

  const themeClasses = useMemo(() => {
    const theme = homepageSettings?.theme || 'aurora';
    if (theme === 'night') {
      return {
        shell: 'bg-slate-950 text-slate-100',
        card: 'bg-slate-900/90 text-slate-100 border-slate-800',
        muted: 'text-slate-400',
        hero: 'from-slate-950 via-slate-900 to-slate-800',
      };
    }
    if (theme === 'day') {
      return {
        shell: 'bg-[#F9FAFB] text-gray-800',
        card: 'bg-white text-slate-800 border-slate-200',
        muted: 'text-slate-500',
        hero: 'from-slate-950 via-slate-900 to-zinc-950',
      };
    }
    return {
      shell: 'bg-[#F9FAFB] text-gray-800',
      card: 'bg-slate-950/85 text-slate-100 border-slate-800',
      muted: 'text-slate-400',
      hero: 'from-slate-950 via-slate-900 to-zinc-950',
    };
  }, [homepageSettings?.theme]);

  const sectionVisibility = useMemo(() => homepageSettings?.sections || {}, [homepageSettings?.sections]);
  const getSectionConfig = useCallback((key, fallback) => {
    return sectionVisibility?.[key] || fallback || {};
  }, [sectionVisibility]);

  const language = homepageSettings?.language || 'en';
  const siteTitle = homepageSettings?.site_title || 'Kokan Library';
  const heroBadge = homepageSettings?.hero_badge || 'Adaptive Knowledge Grid';
  const layout = homepageSettings?.layout || {};
  const showHeroStats = layout.show_stats !== false;
  const showSearchStripBlock = layout.show_search_strip !== false;
  const showFeaturedPanel = layout.show_featured_books !== false;
  const showDonationBlock = layout.show_donation_panel !== false;

  useEffect(() => {
    document.title = siteTitle;
  }, [siteTitle]);

  // --- LOADING SCREEN FOR ADMIN REDIRECT ---
  if (authLoading) return null; // Or a spinner

  return (
    <div className={`min-h-screen font-sans animate-in fade-in duration-500 ${themeClasses.shell}`}>
      <Toaster position="top-right" />
      <div className="sr-only" aria-label="Current site language">{language}</div>

      {getSectionConfig('hero', { enabled: true }).enabled !== false && <LibraryHero />}

      {getSectionConfig('hero', { enabled: true }).enabled !== false && (
      <div className="app-shell-container py-12">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 px-6 py-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.85)] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_22%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr] items-start">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200 shadow-[0_0_0_1px_rgba(56,189,248,0.05)]">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-cyan-500/40" />
                {heroBadge}
              </span>

              <h2 className="page-title max-w-3xl text-white">
                {getSectionConfig('hero', { title: 'Welcome to the future of the library' }).title || 'Welcome to the future of the library'}
              </h2>

              <p className="body-copy max-w-2xl text-slate-300 md:text-[0.98rem]">
                {getSectionConfig('hero', { description: 'Kokan Library now surfaces trusted Islamic resources with a digital-first, future-ready lens.' }).description || 'Kokan Library now surfaces trusted Islamic resources with a digital-first, future-ready lens.'}
              </p>

              <div className="flex flex-wrap gap-3">
                {getSectionConfig('hero', { primary_cta_label: 'Explore the catalog', primary_cta_url: '/books' }).primary_cta_label ? (
                  <a href={getSectionConfig('hero', { primary_cta_url: '/books' }).primary_cta_url || '/books'} className="inline-flex items-center rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400">
                    {getSectionConfig('hero', { primary_cta_label: 'Explore the catalog' }).primary_cta_label || 'Explore the catalog'}
                  </a>
                ) : null}
                {getSectionConfig('hero', { secondary_cta_label: 'Request access', secondary_cta_url: '/contact' }).secondary_cta_label ? (
                  <a href={getSectionConfig('hero', { secondary_cta_url: '/contact' }).secondary_cta_url || '/contact'} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-white/20">
                    {getSectionConfig('hero', { secondary_cta_label: 'Request access' }).secondary_cta_label || 'Request access'}
                  </a>
                ) : null}
              </div>

              {showHeroStats ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-cyan-500/15 bg-white/5 p-5 shadow-[0_30px_60px_-40px_rgba(96,165,250,0.35)] backdrop-blur-xl">
                    <p className="text-[clamp(1.75rem,1.2rem+1.8vw,2.6rem)] font-semibold text-white">50+</p>
                    <p className="mt-2 eyebrow text-cyan-200/80">Islamic Books</p>
                  </div>
                  <div className="rounded-3xl border border-violet-500/15 bg-white/5 p-5 shadow-[0_30px_60px_-40px_rgba(168,85,247,0.28)] backdrop-blur-xl">
                    <p className="text-[clamp(1.75rem,1.2rem+1.8vw,2.6rem)] font-semibold text-white">10+</p>
                    <p className="mt-2 eyebrow text-violet-200/80">Categories</p>
                  </div>
                  <div className="rounded-3xl border border-slate-400/10 bg-white/5 p-5 shadow-[0_30px_60px_-40px_rgba(148,163,184,0.25)] backdrop-blur-xl">
                    <p className="text-[clamp(1.75rem,1.2rem+1.8vw,2.6rem)] font-semibold text-white">100%</p>
                    <p className="mt-2 eyebrow text-slate-300/80">Free Access</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 opacity-70" />
              <div className="space-y-5">
                <h3 className="section-title text-white">Why this library feels futuristic</h3>
                <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg">
                    <p className="card-title text-white">Authentic Sources</p>
                    <p className="mt-1 text-slate-400">Every book is verified from scholarly and reliable references.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg">
                    <p className="card-title text-white">Easy Categorization</p>
                    <p className="mt-1 text-slate-400">Quran, Hadith, Fiqh, and Seerah are organized into clear sections.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg">
                    <p className="card-title text-white">Multi-language Support</p>
                    <p className="mt-1 text-slate-400">Arabic, Urdu, and English books are available in one place.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg">
                    <p className="card-title text-white">Offline Reading</p>
                    <p className="mt-1 text-slate-400">Download and read books without needing internet access.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg">
                    <p className="card-title text-white">Bookmark & Notes</p>
                    <p className="mt-1 text-slate-400">Save favorite books and add personal notes as you read.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg">
                    <p className="card-title text-white">Free & Open Access</p>
                    <p className="mt-1 text-slate-400">Everything is free and dynamically accessible for every reader.</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 bottom-6 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/10 blur-3xl" />
            </div>
          </div>
        </div>
      </div>
      )}

      {getSectionConfig('search', { enabled: true }).enabled !== false && showSearchStripBlock && (
      <div className="app-shell-container scroll-mt-24 pb-8" id="search">
        <LibrarySearchStrip
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          title={getSectionConfig('search', { title: 'Library Search' }).title || 'Library Search'}
          subtitle={getSectionConfig('search', { subtitle: 'Search the library collection' }).subtitle || 'Search the library collection'}
          description={getSectionConfig('search', { description: 'Find books, authors, publishers and smart recommendations right from the library section.' }).description || 'Find books, authors, publishers and smart recommendations right from the library section.'}
          placeholder={getSectionConfig('search', { placeholder: 'Search by title, author, or ISBN...' }).placeholder || 'Search by title, author, or ISBN...'}
          showHint={Boolean(getSectionConfig('search', { show_hint: true }).show_hint !== false)}
          enableVoice={Boolean(getSectionConfig('search', { enable_voice: true }).enable_voice !== false)}
          enableDeepSearch={Boolean(getSectionConfig('search', { enable_deep: true }).enable_deep !== false)}
          enableSuggestions={Boolean(getSectionConfig('search', { show_suggestions: true }).show_suggestions !== false)}
        />
      </div>
      )}

      {getSectionConfig('continue_reading', { enabled: true }).enabled !== false && recentReadBooks.length > 0 && (
      <div className="app-shell-container pb-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-emerald-600">Continue reading</p>
            <h3 className="section-title text-slate-900">Pick up where you left off</h3>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recentReadBooks.map((entry) => (
            <CompactBookCard
              key={entry.book.id}
              book={entry.book}
              label={`Page ${entry.last_page_read || 1}`}
              meta={entry.total_pages > 0 ? `Page ${entry.last_page_read || 1} of ${entry.total_pages}` : (entry.updated_at ? new Date(entry.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Recently")}
              progress={entry.total_pages > 0 ? ((Number(entry.last_page_read || 1) / Number(entry.total_pages)) * 100) : null}
              onClick={() => handleResumeReading(entry.book.id)}
            />
          ))}
        </div>
      </div>
      )}

      {getSectionConfig('recommended', { enabled: true }).enabled !== false && recommendedBooks.length > 0 && (
      <div className="app-shell-container pb-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-cyan-600">Recommended for you</p>
            <h3 className="section-title text-slate-900">Smart picks based on your activity</h3>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recommendedBooks.map((book) => (
            <CompactBookCard
              key={book.book.id}
              book={book.book}
              label="Suggested"
              meta={book.book?.language?.name || book.book?.language || ""}
              chips={book.reasons}
              onClick={() => setSelectedBook(book.book)}
            />
          ))}
        </div>
      </div>
      )}

      {getSectionConfig('trending', { enabled: true }).enabled !== false && trendingBooks.length > 0 && (
      <div className="app-shell-container pb-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-amber-600">Trending books</p>
            <h3 className="section-title text-slate-900">Most visible right now</h3>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {trendingBooks.map((book, index) => (
            <CompactBookCard
              key={book.id}
              book={book}
              label={`#${index + 1}`}
              meta={`${getBookViews(book)} views`}
              onClick={() => setSelectedBook(book)}
            />
          ))}
        </div>
      </div>
      )}

      {getSectionConfig('featured', { enabled: true }).enabled !== false && showFeaturedPanel && (
      <div className="app-shell-container pb-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <p className="eyebrow text-indigo-600">{getSectionConfig('featured', { title: 'Library Highlights' }).title || 'Library Highlights'}</p>
            <h2 className="section-title text-slate-900">{getSectionConfig('featured', { subtitle: 'Recommended by the library team' }).subtitle || 'Recommended by the library team'}</h2>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("book-grid");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Browse full collection
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <BookCardSkeleton key={idx} />
            ))}
          </div>
        ) : featuredBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBooks.map((book) => (
              <PublicBookCard
                key={book.id}
                book={book}
                isFavorite={favorites.includes(book.id)}
                onToggleFavorite={(e) => toggleFavorite(e, book.id)}
                onClick={() => setSelectedBook(book)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No featured titles are available yet. Please check back soon.
          </div>
        )}
      </div>
      )}

      {getSectionConfig('catalog', { enabled: true }).enabled !== false && (
      <div className="app-shell-container py-8" id="book-grid">
        {/* Header + Stats */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 border-b border-gray-200 pb-4">
          <div>
            <h2 className="page-title font-serif text-[#002147] max-w-4xl">
              {searchTerm ? `Results for "${searchTerm}"` : getSectionConfig('catalog', { title: 'Explore the Library' }).title || 'Explore the Library'}
            </h2>
            <p className="body-copy mt-1">
              {getSectionConfig('catalog', { description: 'Browse our handpicked selection, curated recommendations, and full catalog from Kokan Islamic Library.' }).description || 'Browse our handpicked selection, curated recommendations, and full catalog from Kokan Islamic Library.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavoritesOnly((p) => !p)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold transition-all shadow-sm ${showFavoritesOnly
                ? "bg-pink-50 border-pink-200 text-pink-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              title="Show only favorite books"
            >
              <HeartIcon className="w-5 h-5" />
              Favorites
              {favorites.length > 0 && (
                <span className="ml-1 text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={loadBooks}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold shadow-sm disabled:opacity-50"
              title="Refresh Books"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {/* Count */}
            <div className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-bold text-gray-700">{finalBooks.length}</span>{" "}
              books
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : finalBooks.length > 0 ? (
          <div className="mb-10">
            {/* --- LATEST ARRIVALS SWIPER (Only on Default View) --- */}
            {!searchTerm && !showFavoritesOnly && sortedBooks.length > 0 && (
               <div className="mb-12">
                   <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-4">
                     Trending Now
                   </h3>
                   <Swiper
                     modules={[Autoplay, Navigation]}
                     spaceBetween={20}
                     loop={sortedBooks.length > 4}
                     autoplay={{
                       delay: 3000,
                       disableOnInteraction: false,
                     }}
                     breakpoints={{
                       320: { slidesPerView: 2 },
                       640: { slidesPerView: 3 },
                       768: { slidesPerView: 4 },
                       1024: { slidesPerView: 5 },
                     }}
                   >
                     {sortedBooks.slice(0, 8).map((book) => (
                       <SwiperSlide key={book.id}>
                         <PublicBookCard
                           book={book}
                           isFavorite={favorites.includes(book.id)}
                           onToggleFavorite={(e) => toggleFavorite(e, book.id)}
                           onClick={() => setSelectedBook(book)}
                         />
                       </SwiperSlide>
                     ))}
                   </Swiper>
               </div>
            )}

            {/* --- MAIN GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {finalBooks.map((book) => (
                    <PublicBookCard
                      key={book.id}
                      book={book}
                      isFavorite={favorites.includes(book.id)}
                      onToggleFavorite={(e) => toggleFavorite(e, book.id)}
                      onClick={() => setSelectedBook(book)}
                    />
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <FaceFrownIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700 font-bold text-lg">
              No books found matching your criteria.
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Try different keywords or clear filters.
            </p>

            <button
              onClick={handleClearAll}
              className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#2D89C8] text-white font-bold hover:bg-[#2374ac] transition-colors shadow-sm"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
      )}

      {/* Modals */}
      {selectedBook && (
        <BookDetailsModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onRequestAccess={() => handleRequestAccess(selectedBook)}
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

      {getSectionConfig('posts', { enabled: true }).enabled !== false || getSectionConfig('donation', { enabled: true }).enabled !== false ? (
      <div className="app-shell-container py-16 border-t border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {getSectionConfig('posts', { enabled: true }).enabled !== false && (
          <div className="lg:col-span-2">
            <LandingPostsPreview />
          </div>
          )}

          {getSectionConfig('donation', { enabled: true }).enabled !== false && showDonationBlock && (
          <div className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
            <DonationPanel />
          </div>
          )}

        </div>
      </div>
      ) : null}

    </div>
  );
};

export default PublicHome;