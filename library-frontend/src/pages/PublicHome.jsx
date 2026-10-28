import StandardFormattedText from "../components/common/StandardFormattedText";
import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthProvider';
import settingsService from '../api/settingsService';
import { Toaster, toast } from "react-hot-toast";
import {
  FaceFrownIcon,
  HeartIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  PlusIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  CheckBadgeIcon,
  PhotoIcon,
  XMarkIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
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
import SuccessScreen from "../components/RestrictedAccess/SuccessScreen";
const AskQuestionModal = lazy(() => import("../components/fatawa/AskQuestionModal"));
import AppPageLoader from "../components/common/loaders/AppPageLoader";
import KokanHubBento from "../components/public/KokanHubBento";
import NewspaperClippingsHomeSection from "../components/public/NewspaperClippingsHomeSection";
import ImpactStatsCounter from "../components/public/ImpactStatsCounter";
import WhatsAppCommunityBlock from "../components/public/WhatsAppCommunityBlock";
import IslamicAnnouncementTicker from "../components/public/IslamicAnnouncementTicker";
import IslamicUpdatesWidget from "../components/public/IslamicUpdatesWidget";

// Services + Hooks
import { bookService } from "../api/bookService";
import { categoryService } from "../api/categoryService";
import { fatawaService } from "../api/fatawaService";
import aboutService from "../api/aboutService";
import galleryService from "../api/galleryService";
import { useBookSearch, deduplicateBooks } from "../hooks/useBookSearch";
import LandingPostsPreview from "../components/public/LandingPostsPreview";
import AnnouncementModal from "../components/public/AnnouncementModal";
import HomepagePostersCarousel from "../components/public/HomepagePostersCarousel";
import DonationPanel from "../components/donation/DonationPanel";
import { getErrorMessage } from "../utils/errorMessage";
import { cleanExcerpt, formatCategoryName } from "../utils/i18nFormatters";

const getYouTubeEmbedUrl = (url) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return url;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

// --- API & IMAGE HELPERS ---
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const resolveImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = String(value);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const SVG_NO_COVER =
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

const getBookImage = (book) => {
  const rawUrl = book?.cover_image_url || book?.cover_image;
  if (!rawUrl) return SVG_NO_COVER;
  if (typeof rawUrl === "string" && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"))) return rawUrl;
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

// --- SUB-COMPONENTS ---

// High-Fidelity Skeleton Loader
const BookCardSkeleton = () => (
  <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs animate-pulse flex flex-col justify-between">
    <div className="h-48 bg-slate-100" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
      <div className="h-3 bg-slate-100 rounded-md w-2/3" />
      <div className="pt-2 flex justify-between items-center">
        <div className="h-5 w-16 bg-emerald-50 rounded-full border border-emerald-200" />
        <div className="h-5 w-10 bg-slate-100 rounded-md" />
      </div>
    </div>
  </div>
);

// Compact Book Card for Continue Reading Section
const CompactBookCard = ({ book, label, meta, onClick, progress = null, chips = [] }) => {
  const coverUrl = resolveImageUrl(book?.cover_image_url || book?.cover_image) || SVG_NO_COVER;
  const authorName = typeof book?.author === 'object' ? (book.author?.name || "Unknown Author") : (book?.author || "Unknown Author");

  return (
    <button
      onClick={onClick}
      type="button"
      className="group w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-slate-900"
    >
      <div className="flex gap-3.5">
        <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-xs relative border border-slate-200">
          <img
            src={coverUrl}
            alt={book?.title || "Book cover"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = SVG_NO_COVER; }}
          />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex max-w-full rounded-full bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                {label}
              </span>
              {meta ? <span className="text-[11px] text-slate-500 font-bold font-mono">{meta}</span> : null}
            </div>
            <h4 className="mt-1 line-clamp-1 text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-800">
              {book?.title}
            </h4>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {authorName}
            </p>
          </div>

          {Array.isArray(chips) && chips.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {chips.slice(0, 2).map((chip) => (
                <span
                  key={chip}
                  className="inline-flex max-w-full rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-semibold text-slate-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {typeof progress === "number" && progress > 0 ? (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span>Reading progress</span>
                <span className="font-bold text-emerald-700">{Math.min(100, Math.max(1, Math.round(progress)))}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
};

// --- MAIN COMPONENT ---
const PublicHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const { t, currentLang, isRTL } = useLanguage();

  const getLangText = useCallback((urText, arText, enText) => {
    if (currentLang === 'ar') return arText || enText || urText;
    if (currentLang === 'en') return enText || urText || arText;
    return urText || arText || enText;
  }, [currentLang]);

  // Fail-safe helper for extracting localized strings from multilingual objects or strings
  const resolveMultilingualText = useCallback((val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'object') {
      const preferred = currentLang === 'ar'
        ? (val.ar || val.ur || val.en)
        : currentLang === 'en'
        ? (val.en || val.ur || val.ar)
        : (val.ur || val.ar || val.en);
      if (typeof preferred === 'string' && preferred.trim()) {
        return preferred.trim();
      }
      for (const k of ['ur', 'ar', 'en', ...Object.keys(val)]) {
        if (typeof val[k] === 'string' && val[k].trim()) {
          return val[k].trim();
        }
      }
      return fallback;
    }
    return String(val);
  }, [currentLang]);

  // Data States
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [homepageSettings, setHomepageSettings] = useState(null);
  const [homepageSettingsLoaded, setHomepageSettingsLoaded] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [homeGallery, setHomeGallery] = useState([]);
  const [gallerySwiper, setGallerySwiper] = useState(null);
  const [islamicUpdates, setIslamicUpdates] = useState({ jumah: null, moon: null });
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [selectedAnnouncementPost, setSelectedAnnouncementPost] = useState(null);
  const [aboutContent, setAboutContent] = useState({ hero: {}, intro: {}, display: {} });
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [recentFatawa, setRecentFatawa] = useState([]);

  // Filters & State
  const [sortBy, setSortBy] = useState("newest");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [recentReads, setRecentReads] = useState([]);

  // Modal State
  const [selectedBook, setSelectedBook] = useState(null);
  const [restrictedBook, setRestrictedBook] = useState(null);
  const [isAccessFlowOpen, setIsAccessFlowOpen] = useState(false);

  // Ask Question Modal State
  const [askQuestionOpen, setAskQuestionOpen] = useState(false);
  const [fatawaCategories, setFatawaCategories] = useState([]);
  const [createQuestionLoading, setCreateQuestionLoading] = useState(false);

  // Favorites Local Storage State
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("bookNest_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Recent Reads Local Storage State with live event sync
  useEffect(() => {
    const syncReads = () => {
      try {
        const saved = localStorage.getItem("bookNest_recent_reads");
        const parsed = saved ? JSON.parse(saved) : [];
        setRecentReads(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecentReads([]);
      }
    };
    syncReads();
    window.addEventListener("kil_reading_updated", syncReads);
    window.addEventListener("storage", syncReads);
    return () => {
      window.removeEventListener("kil_reading_updated", syncReads);
      window.removeEventListener("storage", syncReads);
    };
  }, []);

  // MASTER PARALLEL DATA LOADER
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [booksRes, catRes, settingsRes, aboutRes, fatawaRes, galleryRes, islamicUpdatesRes] = await Promise.allSettled([
        bookService.getAllBooks({ approved_only: true, sort_order: 'desc' }, 200),
        categoryService.getAllCategories(),
        settingsService.getHomepageSettings(),
        aboutService.getAboutSettings(),
        fatawaService.getQuestions({ status: 'answered', limit: 3 }),
        galleryService.getHomeFeaturedGallery(12),
        galleryService.getIslamicUpdates(),
      ]);

      // 1. Process Books - only approved books should appear on public homepage
      if (booksRes.status === 'fulfilled' && booksRes.value) {
        const rawList = Array.isArray(booksRes.value) ? booksRes.value : booksRes.value?.books || [];
        const list = rawList.filter(b => b.is_approved !== false);
        setBooks(list);
      } else {
        setBooks([]);
      }

      // 2. Process Categories
      if (catRes.status === 'fulfilled' && catRes.value) {
        const categoryList = Array.isArray(catRes.value) ? catRes.value : catRes.value?.categories || [];
        setDynamicCategories(categoryList);
      }

      // 3. Process Homepage Settings
      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setHomepageSettings(settingsRes.value || { theme: 'aurora', sections: {}, layout: {} });
      } else {
        setHomepageSettings({ theme: 'aurora', sections: {}, layout: {} });
      }

      // 4. Process About Content
      if (aboutRes.status === 'fulfilled' && aboutRes.value) {
        const aboutData = aboutRes.value;
        const gallery = Array.isArray(aboutData?.gallery) ? aboutData.gallery : [];
        setGalleryImages(gallery.filter((img) => img.image_url));
        setAboutContent({
          hero: aboutData?.hero || {},
          intro: aboutData?.intro || {},
          display: aboutData?.display || {},
          gallery,
        });
      }

      // 6. Process Recent Fatawa Highlights
      if (fatawaRes.status === 'fulfilled' && fatawaRes.value) {
        const qList = Array.isArray(fatawaRes.value) ? fatawaRes.value : fatawaRes.value?.questions || [];
        setRecentFatawa(qList);
      } else {
        setRecentFatawa([]);
      }

      // 7. Process Curated Homepage Gallery (Only photos marked show_on_home: true)
      if (galleryRes.status === 'fulfilled' && galleryRes.value) {
        const items = Array.isArray(galleryRes.value?.items) ? galleryRes.value.items : [];
        setHomeGallery(items);
      } else {
        setHomeGallery([]);
      }

      // 8. Process Islamic Updates (Latest Jumah & Moon Announcements)
      if (islamicUpdatesRes.status === 'fulfilled' && islamicUpdatesRes.value) {
        setIslamicUpdates(islamicUpdatesRes.value || { jumah: null, moon: null });
      } else {
        setIslamicUpdates({ jumah: null, moon: null });
      }
    } catch (error) {
      console.error("âŒ PublicHome Master Load Error:", error);
      toast.error("Could not load library catalog.");
    } finally {
      setLoading(false);
      setHomepageSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load Fatawa Categories
  useEffect(() => {
    const loadFatawaCategories = async () => {
      try {
        const categories = await fatawaService.getCategories();
        setFatawaCategories(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.error("Failed to load fatawa categories", error);
        setFatawaCategories([]);
      }
    };
    loadFatawaCategories();
  }, []);

  // Derived Book Collections
  const featuredBooks = useMemo(() => {
    if (!Array.isArray(books) || books.length === 0) return [];
    const featuredIds = homepageSettings?.sections?.featured?.featured_books || [];
    if (Array.isArray(featuredIds) && featuredIds.length) {
      const byId = new Map(books.map((b) => [b.id, b]));
      const list = featuredIds.map((id) => byId.get(id)).filter(Boolean);
      if (list.length) return deduplicateBooks(list);
    }
    return deduplicateBooks(books).slice(0, 6);
  }, [books, homepageSettings]);

  const recentReadBooks = useMemo(() => {
    if (!Array.isArray(recentReads) || recentReads.length === 0) return [];
    const byId = new Map(books.map((book) => [String(book.id), book]));
    return recentReads
      .map((entry) => ({ ...entry, book: byId.get(String(entry.book_id)) }))
      .filter((entry) => entry.book)
      .slice(0, 4);
  }, [books, recentReads]);

  const categories = useMemo(() => {
    if (dynamicCategories.length > 0) {
      return [
        { value: "all", label: "All Categories" },
        ...dynamicCategories.map((cat) => ({
          value: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '_'),
          label: cat.name || cat.category_name,
          id: cat.id,
        })),
      ];
    }
    return [
      { value: "all", label: "All Categories" },
      { value: "aqeedah_fiqh", label: "Aqeedah & Fiqh" },
      { value: "quran_sciences", label: "Quran & Sciences" },
      { value: "ahkam_masail", label: "Ahkam & Masail" },
      { value: "history_seerah", label: "History & Seerah" },
      { value: "literature", label: "Literature" },
      { value: "science_tech", label: "Science & Tech" },
    ];
  }, [dynamicCategories]);

  // Search Hook
  const {
    searchTerm,
    setSearchTerm,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategory,
    setSelectedCategory,
    filteredBooks,
  } = useBookSearch(books);

  // Auto-search navigation handler
  useEffect(() => {
    if (location.state?.preSearch) {
      setSearchTerm(location.state.preSearch);
      setTimeout(() => {
        const el = document.getElementById("book-grid");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [location.state, setSearchTerm]);

  // Action Handlers
  const toggleFavorite = (e, bookId) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const exists = prev.includes(bookId);
      const newFavs = exists ? prev.filter((id) => id !== bookId) : [...prev, bookId];
      try {
        localStorage.setItem("bookNest_favorites", JSON.stringify(newFavs));
      } catch {
        // storage fallback
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

  const handleCreateQuestion = async (payload) => {
    setCreateQuestionLoading(true);
    try {
      await fatawaService.createQuestion(payload);
      toast.success('Question submitted successfully!');
      setAskQuestionOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not submit question'));
    } finally {
      setCreateQuestionLoading(false);
    }
  };

  const navigateToTop = (path) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    navigate(path);
  };

  const handleResumeReading = (bookId) => {
    navigateToTop(`/read/${bookId}`);
  };

  // Sorting Logic
  const sortedBooks = useMemo(() => {
    const list = Array.isArray(filteredBooks) ? [...filteredBooks] : [];
    const safeTitle = (b) => String(b?.title || b?.name || "").toLowerCase();
    const safeId = (b) => Number(b?.id) || 0;

    if (sortBy === "az") {
      return list.sort((a, b) => safeTitle(a).localeCompare(safeTitle(b)));
    }
    if (sortBy === "oldest") {
      return list.sort((a, b) => safeId(a) - safeId(b));
    }
    // Default: "newest" -> Highest ID (Newest upload) first
    return list.sort((a, b) => safeId(b) - safeId(a));
  }, [filteredBooks, sortBy]);

  // Filter by Favorites
  const finalBooks = useMemo(() => {
    if (!showFavoritesOnly) return sortedBooks;
    return sortedBooks.filter((b) => favorites.includes(b.id));
  }, [sortedBooks, showFavoritesOnly, favorites]);

  // Theme & Styling Tokens
  const themeClasses = useMemo(() => {
    const theme = homepageSettings?.theme || 'aurora';
    const palette = homepageSettings?.theme_palette || 'indigo';
    const backgroundStyle = homepageSettings?.background_style || 'aurora';
    const headingStyle = homepageSettings?.heading_style || 'serif';
    const buttonStyle = homepageSettings?.button_style || 'solid';
    const spacingScale = homepageSettings?.spacing_scale || 'comfortable';

    const headingClasses = {
      serif: 'font-serif tracking-tight',
      sans: 'font-sans tracking-tight',
      display: 'font-black tracking-[-0.04em]',
    };

    const buttonClasses = {
      solid: 'shadow-lg shadow-cyan-500/20',
      outline: 'border border-current bg-transparent',
      glass: 'bg-white/10 backdrop-blur-xl border border-white/20',
    };

    const spacingClasses = {
      compact: 'space-y-4 sm:space-y-6',
      comfortable: 'space-y-6 sm:space-y-8',
      airy: 'space-y-8 sm:space-y-12',
    };

    const backgroundClasses = {
      aurora: 'bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_24%)]',
      soft: 'bg-gradient-to-b from-white via-slate-50 to-slate-100',
      midnight: 'bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950',
      glass: 'bg-white/70 backdrop-blur-xl',
    };

    return {
      shell: `bg-transparent text-slate-900`,
      card: 'bg-white text-slate-900 border-slate-200/90 shadow-xs',
      muted: 'text-slate-500',
      heading: headingClasses[headingStyle] || headingClasses.serif,
      button: buttonClasses[buttonStyle] || buttonClasses.solid,
      spacing: spacingClasses[spacingScale] || spacingClasses.comfortable,
      background: 'bg-transparent',
    };
  }, [homepageSettings?.theme, homepageSettings?.heading_style, homepageSettings?.button_style, homepageSettings?.spacing_scale, homepageSettings?.background_style]);

  const sectionVisibility = useMemo(() => homepageSettings?.sections || {}, [homepageSettings?.sections]);
  const getSectionConfig = useCallback((key, fallback) => {
    return sectionVisibility?.[key] || fallback || {};
  }, [sectionVisibility]);

  const language = homepageSettings?.language || 'en';
  const siteTitle = (typeof homepageSettings?.site_title === 'object' && homepageSettings?.site_title !== null)
    ? (homepageSettings.site_title[language] || homepageSettings.site_title.en || 'Kokan Library')
    : (homepageSettings?.site_title || 'Kokan Library');
  const layout = homepageSettings?.layout || {};
  const showSearchStripBlock = layout.show_search_strip !== false;
  const showFeaturedPanel = layout.show_featured_books !== false;
  const showDonationBlock = layout.show_donation_panel !== false;
  const posterSection = getSectionConfig('posters', { enabled: layout.show_posters !== false });
  const showPosterBlock = posterSection.enabled !== false;
  const accentColor = homepageSettings?.accent_color || '#002147';
  const sectionFrameClass = "rounded-[2.5rem] border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs transition-all duration-300 text-slate-900";

  const orderedHomepageSections = useMemo(() => {
    const defaults = {
      hero: 0,
      bento_hub: 1,
      islamic_updates: 2,
      stats_impact: 3,
      newspaper_clippings: 4,
      posters: 5,
      search: 6,
      featured: 7,
      gallery: 8,
      fatawa: 9,
      about: 10,
      catalog: 11,
      posts: 12,
      whatsapp_community: 13,
      donation: 14,
    };

    return Object.keys(defaults)
      .map((key) => {
        const sectionConfig = sectionVisibility?.[key];
        const isEnabled = sectionConfig?.enabled !== false;
        const order = Number.isFinite(Number(sectionConfig?.order)) ? Number(sectionConfig?.order) : defaults[key];
        return { key, order, isEnabled };
      })
      .filter((section) => section.isEnabled !== false)
      .sort((left, right) => left.order - right.order || defaults[left.key] - defaults[right.key]);
  }, [sectionVisibility]);

  useEffect(() => {
    document.title = siteTitle;
  }, [siteTitle]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--accent-hover', accentColor);
    return () => {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-hover');
    };
  }, [accentColor]);

  // Loading Screen State (Admin Configurable: Islamic Splash / Skeleton / Hybrid)
  if (authLoading || !homepageSettingsLoaded) {
    return <AppPageLoader config={homepageSettings?.loader_config} />;
  }

  return (
    <div className={`min-h-screen animate-in fade-in duration-500 bg-[#FAF8F5] text-slate-900 ${themeClasses.heading}`}>
      <Toaster position="top-right" />
      <div className="sr-only" aria-label="Current site language">{language}</div>

      <div className="app-shell-container py-5 space-y-6">
        {/* 1. TOP FULL-WIDTH AUTO-SCROLLING GALLERY (Click any image to view 1-by-1 in Lightbox) */}
        <LibraryHero config={getSectionConfig('hero', {})} />

        {/* 2. 3-COLUMN MARKAZ PORTAL + 4-CARD JADEED KUTUB ROW */}
        <KokanHubBento config={getSectionConfig('bento_hub', {})} />

        {/* 3. 4-CARD NEWSPAPER CLIPPINGS ROW */}
        <NewspaperClippingsHomeSection config={getSectionConfig('newspaper_clippings', {})} />
      </div>

      {/* MODALS */}
      {selectedAnnouncementPost && (
        <AnnouncementModal
          post={selectedAnnouncementPost}
          onClose={() => setSelectedAnnouncementPost(null)}
        />
      )}

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
        <SuccessScreen onClose={() => setShowSuccess(false)} />
      )}

      {/* ASK QUESTION MODAL */}
      {askQuestionOpen && (
        <Suspense fallback={null}>
          <AskQuestionModal
            open={askQuestionOpen}
            onClose={() => setAskQuestionOpen(false)}
            categories={fatawaCategories}
            user={user}
            loading={createQuestionLoading}
            onSubmit={handleCreateQuestion}
          />
        </Suspense>
      )}

      {/* GALLERY LIGHTBOX MODAL */}
      {activeLightboxImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{ zIndex: 100000 }}
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setActiveLightboxImage(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActiveLightboxImage(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

            {/* Media Content */}
            {activeLightboxImage.item_type === 'video' && activeLightboxImage.video_url ? (
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(activeLightboxImage.video_url)}
                  title={resolveMultilingualText(activeLightboxImage.title, 'Video Player')}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="max-h-[75vh] flex items-center justify-center bg-black">
                <img
                  src={resolveImageUrl(activeLightboxImage.image_url)}
                  alt="Enlarged gallery photo"
                  className="max-h-[75vh] w-auto max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {activeLightboxImage.item_type === 'jumah' && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                      🕌 Jumah: {formatDate(activeLightboxImage.event_date)}
                    </span>
                  )}
                  {activeLightboxImage.item_type === 'moon' && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                      🌙 Moon: {formatDate(activeLightboxImage.event_date)}
                    </span>
                  )}
                  {activeLightboxImage.item_type === 'video' && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-bold">
                      ▶ YouTube Video
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold">
                  {resolveMultilingualText(activeLightboxImage.title, 'Gallery Media')}
                </h4>
                {resolveMultilingualText(activeLightboxImage.caption, '') ? (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {resolveMultilingualText(activeLightboxImage.caption, '')}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const title = resolveMultilingualText(activeLightboxImage.title, 'Gallery Media');
                    const dateText = activeLightboxImage.event_date ? ` [${activeLightboxImage.event_date}]` : '';
                    const shareText = `📢 *${title}*${dateText}\n${activeLightboxImage.video_url || window.location.origin}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveLightboxImage(null);
                    navigateToTop('/gallery');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shrink-0 cursor-pointer shadow-md"
                >
                  View Full Gallery
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PublicHome;