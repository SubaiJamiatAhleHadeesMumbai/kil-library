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
  SparklesIcon,
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

// Services + Hooks
import { bookService } from "../api/bookService";
import { categoryService } from "../api/categoryService";
import { fatawaService } from "../api/fatawaService";
import aboutService from "../api/aboutService";
import socialWorkService from "../api/socialWorkService";
import galleryService from "../api/galleryService";
import SocialWorkCard from "../components/social_work/SocialWorkCard";
import SocialWorkItemDetailModal from "../components/social_work/SocialWorkItemDetailModal";
import { useBookSearch, deduplicateBooks } from "../hooks/useBookSearch";
import LandingPostsPreview from "../components/public/LandingPostsPreview";
import AnnouncementModal from "../components/public/AnnouncementModal";
import HomepagePostersCarousel from "../components/public/HomepagePostersCarousel";
import DonationPanel from "../components/donation/DonationPanel";
import { getErrorMessage } from "../utils/errorMessage";
import { cleanExcerpt, formatCategoryName } from "../utils/i18nFormatters";

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
  <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm animate-pulse flex flex-col justify-between">
    <div className="h-48 bg-slate-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
      <div className="h-3 bg-slate-150 rounded-md w-1/2" />
      <div className="h-3 bg-slate-100 rounded-md w-2/3" />
      <div className="pt-2 flex justify-between items-center">
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
        <div className="h-5 w-10 bg-slate-200 rounded-md" />
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
      className="group w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
    >
      <div className="flex gap-3.5">
        <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-xs relative border border-slate-200/60">
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
              <span className="inline-flex max-w-full rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                {label}
              </span>
              {meta ? <span className="text-[11px] text-slate-400 font-bold font-mono">{meta}</span> : null}
            </div>
            <h4 className="mt-1 line-clamp-1 text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
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
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [selectedAnnouncementPost, setSelectedAnnouncementPost] = useState(null);
  const [aboutContent, setAboutContent] = useState({ hero: {}, intro: {}, display: {} });
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [activitiesItems, setActivitiesItems] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
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
      const [booksRes, catRes, settingsRes, aboutRes, activitiesRes, fatawaRes, galleryRes] = await Promise.allSettled([
        bookService.getAllBooks({ approved_only: true, sort_order: 'desc' }, 200),
        categoryService.getAllCategories(),
        settingsService.getHomepageSettings(),
        aboutService.getAboutSettings(),
        socialWorkService.getPublicItems('', '', 6),
        fatawaService.getQuestions({ status: 'answered', limit: 3 }),
        galleryService.getHomeFeaturedGallery(8),
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

      // 5. Process Activities / Social Work
      if (activitiesRes.status === 'fulfilled' && activitiesRes.value) {
        const items = Array.isArray(activitiesRes.value) ? activitiesRes.value : [];
        setActivitiesItems(items);
      } else {
        setActivitiesItems([]);
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

    if (theme === 'night') {
      return {
        shell: `bg-slate-950 text-slate-100`,
        card: 'bg-slate-900/90 text-slate-100 border-slate-800',
        muted: 'text-slate-400',
        heading: headingClasses[headingStyle] || headingClasses.serif,
        button: buttonClasses[buttonStyle] || buttonClasses.solid,
        spacing: spacingClasses[spacingScale] || spacingClasses.comfortable,
        background: backgroundClasses[backgroundStyle] || backgroundClasses.aurora,
      };
    }
    return {
      shell: `bg-[#F8FAFC] text-slate-900`,
      card: 'bg-white text-slate-800 border-slate-200',
      muted: 'text-slate-500',
      heading: headingClasses[headingStyle] || headingClasses.serif,
      button: buttonClasses[buttonStyle] || buttonClasses.solid,
      spacing: spacingClasses[spacingScale] || spacingClasses.comfortable,
      background: backgroundClasses[backgroundStyle] || backgroundClasses.aurora,
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
  const sectionFrameClass = "rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 sm:p-8 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.12)] backdrop-blur-md transition-all duration-300";

  const orderedHomepageSections = useMemo(() => {
    const defaults = {
      hero: 0,
      posters: 1,
      search: 2,
      featured: 3,
      gallery: 4,
      fatawa: 5,
      about: 6,
      education_social_activity: 7,
      catalog: 8,
      posts: 9,
      donation: 10,
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
    <div className={`min-h-screen animate-in fade-in duration-500 ${themeClasses.shell} ${themeClasses.background} ${themeClasses.heading}`}>
      <Toaster position="top-right" />
      <div className="sr-only" aria-label="Current site language">{language}</div>

      {/* HERO SECTION */}
      {getSectionConfig('hero', { enabled: true }).enabled !== false && (
        <div className="app-shell-container py-3 sm:py-5">
          <LibraryHero config={getSectionConfig('hero', {})} />
        </div>
      )}

      {/* CONTINUE READING SECTION (Recent Reads) */}
      {recentReadBooks && recentReadBooks.length > 0 && (
        <div className="app-shell-container pb-4 sm:pb-6">
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 p-4 sm:p-6 shadow-xs">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{getLangText('پڑھائی جاری رکھیں', 'متابعة القراءة', 'Continue Reading')}</span>
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {getLangText('حالیہ مطالعہ', 'القراءة الأخيرة', 'Recent Activity')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {recentReadBooks.map((entry) => (
                <CompactBookCard
                  key={entry.book_id}
                  book={entry.book}
                  label={getLangText('جاری رکھیں', 'متابعة', 'Resume')}
                  meta={`Page ${entry.last_page_read || 1}`}
                  progress={entry.total_pages > 0 ? ((entry.last_page_read || 1) / entry.total_pages) * 100 : null}
                  onClick={() => navigateToTop(`/read/${entry.book_id}?page=${entry.last_page_read || 1}`)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC HOMEPAGE SECTIONS */}
      {orderedHomepageSections.map(({ key }) => {
        if (key === 'hero' || key === 'search' || key === 'featured' || key === 'catalog') return null;

        // 1. KOKAN HUB BENTO GRID
        if (key === 'bento_hub' && getSectionConfig('bento_hub', { enabled: true }).enabled !== false) {
          return (
            <div key="bento_hub" className="app-shell-container pb-4 sm:pb-8">
              <KokanHubBento config={getSectionConfig('bento_hub', {})} />
            </div>
          );
        }

        // 2. LIVE IMPACT STATS COUNTER
        if (key === 'stats_impact' && getSectionConfig('stats_impact', { enabled: true }).enabled !== false) {
          return (
            <div key="stats_impact" className="app-shell-container pb-4 sm:pb-8">
              <ImpactStatsCounter config={getSectionConfig('stats_impact', {})} />
            </div>
          );
        }

        // 3. NEWSPAPER PRESS CLIPPINGS
        if (key === 'newspaper_clippings' && getSectionConfig('newspaper_clippings', { enabled: true }).enabled !== false) {
          return (
            <div key="newspaper_clippings" className="app-shell-container pb-6 sm:pb-10">
              <div className={sectionFrameClass}>
                <NewspaperClippingsHomeSection config={getSectionConfig('newspaper_clippings', {})} />
              </div>
            </div>
          );
        }

        // 4. POSTERS STUDIO CAROUSEL
        if (key === 'posters' && showPosterBlock) {
          return (
            <div key="posters" className={`app-shell-container py-2 sm:py-4 lg:py-6 ${themeClasses.spacing}`}>
              <HomepagePostersCarousel />
            </div>
          );
        }

        // 5. WHATSAPP & SOCIAL COMMUNITY
        if (key === 'whatsapp_community' && getSectionConfig('whatsapp_community', { enabled: true }).enabled !== false) {
          return (
            <div key="whatsapp_community" className="app-shell-container pb-6 sm:pb-10">
              <WhatsAppCommunityBlock config={getSectionConfig('whatsapp_community', {})} />
            </div>
          );
        }

        // GALLERY SECTION (Live Dynamic Gallery - only photos marked show_on_home by admin)
        if (key === 'gallery' && getSectionConfig('gallery', { enabled: true }).enabled !== false) {
          const galleryConfig = getSectionConfig('gallery', {});
          if (!homeGallery || homeGallery.length === 0) return null;

          return (
            <div key="gallery" className="app-shell-container pb-6 sm:pb-12">
              <div className={sectionFrameClass}>
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                  <div className="flex-1">
                    <p className="eyebrow text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accentColor }}>
                      {galleryConfig.title || 'Gallery'}
                    </p>
                    <h3 className="section-title text-2xl font-black text-slate-900 mt-1">
                      {galleryConfig.subtitle || 'Photo & Event Gallery'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Gallery Prev/Next Navigation Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="swiper-prev-gallery w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition shadow-2xs cursor-pointer active:scale-95"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="swiper-next-gallery w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition shadow-2xs cursor-pointer active:scale-95"
                        aria-label="Next Slide"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => navigateToTop('/gallery')}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-md hover:shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap cursor-pointer"
                      style={{ backgroundColor: accentColor, outlineColor: accentColor }}
                    >
                      <span>View Gallery</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <Swiper
                  modules={[Autoplay, Navigation]}
                  spaceBetween={20}
                  loop={homeGallery.length > 3}
                  autoplay={{
                    delay: 4500,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }}
                  navigation={{
                    prevEl: '.swiper-prev-gallery',
                    nextEl: '.swiper-next-gallery',
                  }}
                  breakpoints={{
                    320: { slidesPerView: 1.1, spaceBetween: 12 },
                    640: { slidesPerView: 2.1, spaceBetween: 16 },
                    1024: { slidesPerView: 3, spaceBetween: 20 },
                  }}
                  className="rounded-2xl !pb-2"
                >
                  {homeGallery.map((item, idx) => {
                    const title = resolveMultilingualText(item.title, 'Gallery Photo');
                    const caption = resolveMultilingualText(item.caption, '');
                    const imageUrl = resolveImageUrl(item.image_url);

                    return (
                      <SwiperSlide key={item.id || idx}>
                        <div
                          onClick={() => setActiveLightboxImage(item)}
                          className="relative group overflow-hidden rounded-2xl bg-slate-900 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 h-64 sm:h-72 cursor-pointer"
                        >
                          <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-5 flex flex-col justify-end transition-opacity">
                            {item.year && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-amber-300 mb-1.5 w-fit border border-white/15 shadow-2xs">
                                {item.year}
                              </span>
                            )}
                            <p className="text-white font-bold text-sm sm:text-base line-clamp-2 leading-snug drop-shadow-sm">{title}</p>
                            {caption ? (
                              <p className="text-white/80 text-xs line-clamp-1 mt-1 font-normal">{caption}</p>
                            ) : null}
                          </div>
                        </div>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            </div>
          );
        }

        // FATAWA Q&A SECTION (Trilingual Authentic Dar-ul-Ifta Portal)
        if (key === 'fatawa' && getSectionConfig('fatawa', { enabled: false }).enabled !== false) {
          const fatawaConfig = getSectionConfig('fatawa', {});
          
          const getLangText = (urText, arText, enText) => {
            if (currentLang === 'ar') return arText;
            if (currentLang === 'en') return enText;
            return urText;
          };

          return (
            <div key="fatawa" className="app-shell-container pb-6 sm:pb-12" dir={isRTL ? "rtl" : "ltr"}>
              <div className={sectionFrameClass}>
                {/* Clean Scholarly Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
                  <div>
                    <h3
                      className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                      style={{ fontFamily: isRTL ? (currentLang === 'ar' ? "'Noto Naskh Arabic', serif" : "'Noto Nastaliq Urdu', 'JameelNoori', serif") : "inherit" }}
                    >
                      {fatawaConfig.title || getLangText('شرعی مسائل اور مستند رہنمائی', 'الفتاوى الشرعية والاستشارات', 'Authentic Islamic Rulings & Inquiries')}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {fatawaConfig.subtitle || getLangText(
                        'دینی، خاندانی اور فقہی مسائل پر دار الافتاء کے مستند مفتیانِ کرام سے قرآن و سنت کی روشنی میں رہنمائی حاصل کریں۔',
                        'احصل على إجابات موثقة لمسائلك الدينية والمعاملات اليومية من كبار العلماء والمفتين وفق الكتاب والسنة.',
                        'Receive authenticated religious guidance from verified scholars based on the Quran and authentic Sunnah.'
                      )}
                    </p>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
                    <button
                      onClick={() => setAskQuestionOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all shadow-sm hover:opacity-95 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: accentColor }}
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>{getLangText('سوال پوچھیں', 'اطرح سؤالك', 'Ask a Question')}</span>
                    </button>

                    <button
                      onClick={() => navigateToTop('/fatawa')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition shadow-2xs cursor-pointer"
                    >
                      <span>{getLangText('تمام فتاویٰ', 'كافة الفتاوى', 'Browse All')}</span>
                      <ArrowRightIcon className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Main Content Area: Recent Answered Cards or Dignified Notice */}
                {recentFatawa && recentFatawa.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentFatawa.map((item) => {
                      const displayCategory = formatCategoryName(item.category, currentLang);
                      const cleanAnswer = cleanExcerpt(item.answer_text, 140);

                      return (
                        <div
                          key={item.id}
                          onClick={() => navigateToTop(`/fatawa?id=${item.id}`)}
                          className="group flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              {displayCategory && (
                                <span className="text-[11px] font-medium text-slate-500">
                                  {displayCategory}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 line-clamp-2 transition leading-snug">
                              {item.question_text}
                            </h4>
                            {cleanAnswer && (
                              <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                                {cleanAnswer}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span className="font-medium text-slate-700 truncate max-w-[160px]">
                              {item.mufti_name ? `${getLangText('مفتی:', 'المفتي:', 'Mufti:')} ${item.mufti_name}` : getLangText('دار الافتاء', 'دار الإفتاء', 'Dar-ul-Ifta')}
                            </span>
                            <span className="text-emerald-700 group-hover:underline font-semibold flex items-center gap-1">
                              {getLangText('تفصیل دیکھیں', 'عرض الفتوى', 'Read More')}
                              <ArrowRightIcon className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="max-w-xl text-center md:text-start">
                      <p
                        className="text-lg sm:text-2xl font-bold text-emerald-300 mb-1.5"
                        style={{ fontFamily: isRTL ? "'Traditional Arabic', 'Amiri', serif" : "inherit" }}
                      >
                        فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ
                      </p>
                      <p className="text-xs text-emerald-200/80 mb-3 font-medium">
                        {getLangText('”پس اہل علم سے پوچھ لو اگر تم نہیں جانتے۔“ (سورۃ النحل: 43)', '«فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ» (النحل: 43)', '"So ask the people of knowledge if you do not know." (Surah An-Nahl: 43)')}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {getLangText(
                          'روزمرہ کے عبادات، معاملات اور فقہی سوالات پر مستند مفتیانِ کرام سے شرعی رہنمائی حاصل کریں۔ تمام استفسارات کو مکمل صیغۂ راز میں رکھا جاتا ہے۔',
                          'احصل على إجابات موثقة لمسائلك الشرعية من كبار العلماء والمفتين بكل سرية وأمانة علمية وفق الكتاب والسنة.',
                          'Submit your religious inquiries to certified scholars. All questions are handled with strict privacy and academic integrity.'
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => setAskQuestionOpen(true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition text-center cursor-pointer shadow-sm"
                      >
                        {getLangText('اپنا سوال ارسال کریں', 'طرح سؤال جديد', 'Submit a Question')}
                      </button>
                      <button
                        onClick={() => navigateToTop('/fatawa')}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm transition text-center cursor-pointer border border-white/20"
                      >
                        {getLangText('تمام فتاویٰ دیکھیں', 'أرشيف الفتاوى', 'View Fatawa Archive')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }


                        // ABOUT SECTION PREVIEW (Home page initial intro preview in Makhtota format)
        if (key === 'about' && getSectionConfig('about', { enabled: false }).enabled !== false) {
          const aboutConfig = getSectionConfig('about', {});
          const rawDesc = aboutContent?.hero?.description || aboutContent?.intro?.description || "";
          const fullDesc = resolveMultilingualText(rawDesc, '').trim();
          
          // Show initial intro on Home Page (up to first few sections / paragraphs)
          let homeIntroText = fullDesc;
          if (fullDesc) {
            const splitMatch = fullDesc.split(/\n(?=✺\s*قیامِ مرکز|✺\s*اغراض)/);
            homeIntroText = splitMatch[0] ? splitMatch[0].trim() : fullDesc;
          }

          return (
            <div key="about" className="app-shell-container pb-4 sm:pb-8">
              <div className={sectionFrameClass}>
                <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                  <div className="flex-1">
                    <p className="eyebrow text-xs font-extrabold uppercase tracking-widest" style={{ color: accentColor }}>
                      {resolveMultilingualText(aboutConfig.title, 'مرکز کا تعارف')}
                    </p>
                    <h3
                      className="section-title text-xl sm:text-2xl font-extrabold text-slate-900 mt-1"
                      style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}
                    >
                      {resolveMultilingualText(aboutContent?.hero?.title, 'مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)')}
                    </h3>
                  </div>
                  <button
                    onClick={() => navigateToTop('/about')}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all shadow-lg hover:shadow-xl hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap"
                    style={{ backgroundColor: accentColor, outlineColor: accentColor }}
                  >
                    مزید پڑھیں <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Full-Width Makhtota Manuscript Card with Read More Clamp */}
                <div className="w-full rounded-[2.5rem] border-2 border-[#E2D4BE] bg-[#FAF6EE] p-6 sm:p-10 shadow-[inset_0_0_40px_rgba(180,140,75,0.04),0_8px_24px_rgba(0,0,0,0.03)] ring-1 ring-[#D8C6A5] transition-all duration-300">
                  <div className="flex flex-col justify-between" dir="rtl">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2D4BE] pb-3 mb-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#8B6E32]/10 px-4 py-1 text-xs font-bold text-[#8B6E32] w-fit">
                          📜 تعارف و پس منظر
                        </div>
                        <span className="text-xs font-serif text-[#8B6E32] tracking-widest">
                          ✦ ✦ ✦
                        </span>
                      </div>

                      {/* Content with elegant clamp when collapsed */}
                      <div className={`relative transition-all duration-500 ${!isAboutExpanded ? 'max-h-[260px] sm:max-h-[300px] overflow-hidden' : ''}`}>
                        {homeIntroText ? (
                          <StandardFormattedText
                            text={homeIntroText}
                            makhtotaPaper={false}
                            showZoomControls={false}
                          />
                        ) : null}

                        {/* Bottom Gradient Fade when collapsed */}
                        {!isAboutExpanded && (
                          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#FAF6EE] via-[#FAF6EE]/90 to-transparent pointer-events-none" />
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse & Full About Link Controls */}
                    <div className="mt-6 pt-4 border-t border-[#E8DEC9] flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsAboutExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer"
                          style={{ backgroundColor: accentColor }}
                        >
                          <span>{isAboutExpanded ? 'مختصر کریں (Show Less)' : 'مزید پڑھیں (Read More)'}</span>
                          {isAboutExpanded ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateToTop('/about')}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#8B6E32]/40 bg-white/80 px-4 py-2 text-xs sm:text-sm font-bold text-[#8B6E32] hover:bg-white transition cursor-pointer"
                        >
                          <span>مکمل صفحہ کھولیں</span>
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <span
                        className="text-xs sm:text-sm font-semibold text-[#8B6E32]"
                        style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
                      >
                        مرکز کے تفصیلی اغراض و مقاصد اور شاخیں ←
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // ACTIVITIES, EDUCATION & SOCIAL WELFARE SECTION
        if (key === 'education_social_activity' && getSectionConfig('education_social_activity', { enabled: true }).enabled !== false) {
          const educationConfig = getSectionConfig('education_social_activity', {});
          const actionCards = [
            {
              title: 'Education & Guidance',
              urduTitle: 'تعلیم و رہنمائی',
              description: 'Knowledge-based learning programs, educational seminars, and academic support for students.',
              icon: AcademicCapIcon,
              to: '/education',
              color: 'from-blue-600 to-indigo-600',
              bgColor: 'bg-blue-50',
              textColor: 'text-blue-700',
              borderColor: 'border-blue-200'
            },
            {
              title: 'Social Work & Welfare',
              urduTitle: 'سماجی خدمات و ریلیف',
              description: 'Humanitarian relief drives, medical assistance, ration distribution, and welfare support.',
              icon: UserGroupIcon,
              to: '/social-work',
              color: 'from-emerald-600 to-teal-600',
              bgColor: 'bg-emerald-50',
              textColor: 'text-emerald-700',
              borderColor: 'border-emerald-200'
            },
            {
              title: 'Markaz Activities & Events',
              urduTitle: 'سرگرمیاں اور کانفرنسز',
              description: 'Annual conventions, book fairs, youth gatherings, and community educational events.',
              icon: SparklesIcon,
              to: '/activities',
              color: 'from-purple-600 to-pink-600',
              bgColor: 'bg-purple-50',
              textColor: 'text-purple-700',
              borderColor: 'border-purple-200'
            },
          ];

          return (
            <div key="education_social_activity" id="education_social_activity" className="app-shell-container pb-6 sm:pb-12 scroll-mt-24">
              <div className={sectionFrameClass}>
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
                      <SparklesIcon className="w-3.5 h-3.5" />
                      <span>{educationConfig.title || 'Activities, Education & Social Welfare'}</span>
                    </div>
                    <h3 className="section-title text-2xl sm:text-3xl font-black text-slate-900">
                      {educationConfig.subtitle || 'Community Services & Markaz Initiatives'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                      Empowering our community through educational seminars, humanitarian relief, book fairs, and youth conventions.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateToTop('/activities')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>View All Activities</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3 Main Action Hub Cards */}
                <div className="grid gap-5 md:grid-cols-3 mb-8">
                  {actionCards.map((card) => {
                    const CardIcon = card.icon;
                    return (
                      <div
                        key={card.title}
                        onClick={() => navigateToTop(card.to)}
                        className={`group relative rounded-3xl border ${card.borderColor} bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className={`h-12 w-12 rounded-2xl ${card.bgColor} ${card.textColor} flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform`}>
                              <CardIcon className="h-6 w-6 stroke-2" />
                            </div>
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${card.bgColor} ${card.textColor} border ${card.borderColor}`}>
                              Explore Hub
                            </span>
                          </div>

                          <h4 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {card.title}
                          </h4>
                          <p className="text-xs font-bold text-slate-400 mb-2 font-serif">
                            {card.urduTitle}
                          </p>
                          <p className="text-xs leading-relaxed text-slate-600">
                            {card.description}
                          </p>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-emerald-600">
                          <span>Open Section</span>
                          <ArrowRightIcon className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Recent Activities Grid */}
                {activitiesItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4 border-t border-slate-100 pt-6">
                      <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-amber-500" />
                        <span>Recent Activities & Happenings</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {activitiesItems.slice(0, 3).map((item) => (
                        <SocialWorkCard
                          key={item.id}
                          item={item}
                          onSelect={(selected) => setSelectedActivity(selected)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }





        // POSTS & DONATIONS
        if (key === 'posts' || key === 'donation') {
          const showPosts = getSectionConfig('posts', { enabled: true }).enabled !== false;
          const showDonation = getSectionConfig('donation', { enabled: true }).enabled !== false && showDonationBlock;

          if (!showPosts && !showDonation) return null;
          if (key === 'donation') return null;

          return (
            <div key="posts-donation" className="app-shell-container py-6 sm:py-10 lg:py-16 border-t border-slate-200">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-10">
                {showPosts && (
                  <div className="lg:col-span-2">
                    <LandingPostsPreview onSelectPost={setSelectedAnnouncementPost} />
                  </div>
                )}
                {showDonation && (
                  <div className="lg:col-span-1 lg:sticky lg:top-24 h-fit">
                    <DonationPanel />
                  </div>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}

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

      {/* ACTIVITY DETAIL MODAL */}
      {selectedActivity && (
        <SocialWorkItemDetailModal
          item={selectedActivity}
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
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

            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold">
                  {resolveMultilingualText(activeLightboxImage.title, 'Gallery Photo')}
                </h4>
                {resolveMultilingualText(activeLightboxImage.caption, '') ? (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {resolveMultilingualText(activeLightboxImage.caption, '')}
                  </p>
                ) : null}
              </div>

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
        </div>,
        document.body
      )}
    </div>
  );
};

export default PublicHome;