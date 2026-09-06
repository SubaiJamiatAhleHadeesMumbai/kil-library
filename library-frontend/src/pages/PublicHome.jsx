import StandardFormattedText from "../components/common/StandardFormattedText";
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  CheckBadgeIcon,
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
import AskQuestionModal from "../components/fatawa/AskQuestionModal";
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
import SocialWorkCard from "../components/social_work/SocialWorkCard";
import SocialWorkItemDetailModal from "../components/social_work/SocialWorkItemDetailModal";
import { useBookSearch, deduplicateBooks } from "../hooks/useBookSearch";
import LandingPostsPreview from "../components/public/LandingPostsPreview";
import HomepagePostersCarousel from "../components/public/HomepagePostersCarousel";
import DonationPanel from "../components/donation/DonationPanel";
import { getErrorMessage } from "../utils/errorMessage";

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
const CompactBookCard = ({ book, label, meta, onClick, progress = null, chips = [] }) => (
  <button
    onClick={onClick}
    className="group w-full rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#002147]"
  >
    <div className="flex gap-3.5">
      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm relative">
        <img
          src={getBookImage(book)}
          alt={book?.title || "Book cover"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex max-w-full rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
              {label}
            </span>
            {meta ? <span className="text-[11px] text-slate-400 font-medium">{meta}</span> : null}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-[#002147]">
            {book?.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
            {getText(book?.author, "Unknown Author")}
          </p>
        </div>

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
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Reading progress</span>
              <span className="font-bold text-slate-700">{Math.min(100, Math.max(0, Math.round(progress)))}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  </button>
);

// --- MAIN COMPONENT ---
const PublicHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const { t, currentLang, isRTL } = useLanguage();

  // Data States
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [homepageSettings, setHomepageSettings] = useState(null);
  const [homepageSettingsLoaded, setHomepageSettingsLoaded] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [aboutContent, setAboutContent] = useState({ hero: {}, intro: {}, display: {} });
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [activitiesItems, setActivitiesItems] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [recentFatawa, setRecentFatawa] = useState([]);
  const [fatawaSearchInput, setFatawaSearchInput] = useState("");

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

  // Recent Reads Local Storage State
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bookNest_recent_reads");
      const parsed = saved ? JSON.parse(saved) : [];
      setRecentReads(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentReads([]);
    }
  }, []);

  // MASTER PARALLEL DATA LOADER
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [booksRes, catRes, settingsRes, aboutRes, activitiesRes, fatawaRes] = await Promise.allSettled([
        bookService.getAllBooks(0, 200),
        categoryService.getAllCategories(),
        settingsService.getHomepageSettings(),
        aboutService.getAboutSettings(),
        socialWorkService.getPublicItems('', '', 6),
        fatawaService.getQuestions({ status: 'answered', limit: 3 }),
      ]);

      // 1. Process Books
      if (booksRes.status === 'fulfilled' && booksRes.value) {
        const list = Array.isArray(booksRes.value) ? booksRes.value : booksRes.value?.books || [];
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

        // GALLERY SECTION
        if (key === 'gallery' && getSectionConfig('gallery', { enabled: false }).enabled !== false) {
          const galleryConfig = getSectionConfig('gallery', {});
          const displayImages =
            galleryImages.length > 0
              ? galleryImages
              : [
                  { image_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%230f172a'/><text x='50%' y='50%' font-family='sans-serif' font-size='20' font-weight='bold' fill='%2338bdf8' text-anchor='middle'>Markaz Islamic Library</text></svg>", title: 'Markaz Gallery 1' },
                  { image_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><text x='50%' y='50%' font-family='sans-serif' font-size='20' font-weight='bold' fill='%2310b981' text-anchor='middle'>Research & Manuscript Archives</text></svg>", title: 'Markaz Gallery 2' },
                ];

          return (
            <div key="gallery" className="app-shell-container pb-6 sm:pb-12">
              <div className={sectionFrameClass}>
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                  <div className="flex-1">
                    <p className="eyebrow text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accentColor }}>
                      {galleryConfig.title || 'Gallery'}
                    </p>
                    <h3 className="section-title text-2xl font-black text-slate-900 mt-1">
                      {galleryConfig.subtitle || 'Visual collections'}
                    </h3>
                  </div>
                  <button
                    onClick={() => navigateToTop('/about/gallery')}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all shadow-lg hover:shadow-xl hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap"
                    style={{ backgroundColor: accentColor, outlineColor: accentColor }}
                  >
                    View Gallery <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
                <Swiper
                  modules={[Autoplay, Navigation]}
                  spaceBetween={16}
                  loop={displayImages.length > 3}
                  autoplay={{
                    delay: 4000,
                    disableOnInteraction: false,
                  }}
                  navigation
                  breakpoints={{
                    320: { slidesPerView: 1 },
                    640: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                  }}
                  className="rounded-2xl overflow-hidden"
                >
                  {displayImages.map((image, idx) => (
                    <SwiperSlide key={idx}>
                      <div className="relative group overflow-hidden rounded-xl bg-slate-100 shadow-md hover:shadow-xl transition-all h-64 sm:h-72">
                        <img
                          src={resolveImageUrl(image.image_url)}
                          alt={image.title || `Gallery image ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {image.title && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
                            <p className="text-white font-bold text-sm line-clamp-2">{image.title}</p>
                          </div>
                        )}
                        {image.caption && (
                          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-3">
                            <p className="text-white/90 text-xs line-clamp-2">{image.caption}</p>
                          </div>
                        )}
                      </div>
                    </SwiperSlide>
                  ))}
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

          const handleFatawaSearch = (e) => {
            e.preventDefault();
            if (fatawaSearchInput.trim()) {
              navigateToTop(`/fatawa?search=${encodeURIComponent(fatawaSearchInput.trim())}`);
            } else {
              navigateToTop('/fatawa');
            }
          };

          const quickTopics = [
            { label: getLangText('نماز و طہارت', 'الصلاة والطهارة', 'Prayer & Purity'), icon: '🕌', query: 'نماز' },
            { label: getLangText('روزہ و زکوٰۃ', 'الصيام والزكاة', 'Fasting & Zakat'), icon: '🌙', query: 'زکوٰۃ' },
            { label: getLangText('نکاح و خاندان', 'النكاح والأسرة', 'Marriage & Family'), icon: '💍', query: 'نکاح' },
            { label: getLangText('معاملات و معیشت', 'المعاملات والتجارة', 'Business & Finance'), icon: '💼', query: 'تجارت' },
          ];

          return (
            <div key="fatawa" className="app-shell-container pb-6 sm:pb-12" dir={isRTL ? "rtl" : "ltr"}>
              <div className={sectionFrameClass}>
                {/* Header Strip */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 mb-2">
                      <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                      <span>{getLangText('دار الافتاء والارشاد • شرعی فتاویٰ', 'دار الإفتاء والإرشاد • أحكام شرعية', 'DAR-UL-IFTA & ISLAMIC GUIDANCE')}</span>
                    </div>
                    <h3
                      className="section-title text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                      style={{ fontFamily: isRTL ? (currentLang === 'ar' ? "'Noto Naskh Arabic', serif" : "'Noto Nastaliq Urdu', 'JameelNoori', serif") : "inherit" }}
                    >
                      {fatawaConfig.title || getLangText('قرآن و سنت کی روشنی میں مستند شرعی رہنمائی', 'فتاوى شرعية موثقة وفق الكتاب والسنة', 'Authentic Islamic Guidance Based on Quran & Sunnah')}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                      {fatawaConfig.subtitle || getLangText(
                        'دینی، خاندانی اور مالیاتی مسائل پر دار الافتاء کے مستند مفتیانِ کرام سے شرعی جواب حاصل کریں۔',
                        'احصل على إجابات موثقة لمسائلك الدينية والمعاملات اليومية من كبار العلماء والمفتين.',
                        'Submit religious, family, or financial inquiries and receive authenticated guidance from Dar-ul-Ifta scholars.'
                      )}
                    </p>
                  </div>

                  {/* Header Quick Buttons */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => setAskQuestionOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                      style={{ backgroundColor: accentColor }}
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>{getLangText('سوال پوچھیں', 'اطرح سؤالك', 'Ask a Question')}</span>
                    </button>

                    <button
                      onClick={() => navigateToTop('/fatawa')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/90 hover:bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition shadow-2xs cursor-pointer"
                    >
                      <span>{getLangText('تمام فتاویٰ', 'كافة الفتاوى', 'Browse All')}</span>
                      <ArrowRightIcon className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Main Interactive Dar-ul-Ifta Card */}
                <div className="rounded-[2.25rem] border-2 border-emerald-100 bg-gradient-to-br from-[#FAFDFC] via-white to-emerald-50/40 p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
                  {/* Decorative Islamic Star Outline Accent */}
                  <div aria-hidden="true" className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Search Form Box */}
                  <form onSubmit={handleFatawaSearch} className="relative z-10 mb-6">
                    <div className="relative flex items-center shadow-sm rounded-2xl overflow-hidden border border-emerald-200/90 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <MagnifyingGlassIcon className={`w-5 h-5 text-emerald-700 absolute ${isRTL ? 'right-4' : 'left-4'} pointer-events-none`} />
                      <input
                        type="text"
                        value={fatawaSearchInput}
                        onChange={(e) => setFatawaSearchInput(e.target.value)}
                        placeholder={getLangText(
                          'شرعی مسئلہ یا فتویٰ تلاش کریں... (مثال: نماز، روزہ، زکوٰۃ، تجارت)',
                          'ابحث في الفتاوى... (الصلاة، الصيام، الزكاة، المعاملات)',
                          'Search Fatawa by topic (Prayer, Fasting, Zakat, Finance)...'
                        )}
                        className={`w-full py-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none ${isRTL ? 'pr-12 pl-24 text-right' : 'pl-12 pr-24 text-left'}`}
                      />
                      <button
                        type="submit"
                        className={`absolute ${isRTL ? 'left-2' : 'right-2'} px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-2xs hover:opacity-95 cursor-pointer`}
                        style={{ backgroundColor: accentColor }}
                      >
                        {getLangText('تلاش کریں', 'بحث', 'Search')}
                      </button>
                    </div>
                  </form>

                  {/* Quick Topics Pills */}
                  <div className="relative z-10 flex flex-wrap items-center gap-2 mb-8">
                    <span className="text-xs font-bold text-slate-500 mr-1 ml-1">
                      {getLangText('اہم موضوعات:', 'أهم المواضيع:', 'Popular Topics:')}
                    </span>
                    {quickTopics.map((topic, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => navigateToTop(`/fatawa?search=${encodeURIComponent(topic.query)}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-emerald-200/80 text-emerald-950 hover:bg-emerald-50/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
                      >
                        <span>{topic.icon}</span>
                        <span>{topic.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Trust Highlights & Recent Answered Grid */}
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start relative z-10">
                    {/* Left: Recent Public Answered Fatawa Preview */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <CheckBadgeIcon className="w-4 h-4 text-emerald-600" />
                          {getLangText('حالیہ تصدیق شدہ فتاویٰ', 'أحدث الفتاوى المعتمدة', 'Recent Answered Fatawa')}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigateToTop('/fatawa')}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          {getLangText('سب دیکھیں ←', 'عرض الكل ←', 'View all →')}
                        </button>
                      </div>

                      {recentFatawa && recentFatawa.length > 0 ? (
                        <div className="space-y-2.5">
                          {recentFatawa.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => navigateToTop('/fatawa')}
                              className="group p-3.5 rounded-2xl bg-white border border-emerald-100 hover:border-emerald-300 shadow-2xs hover:shadow-sm transition-all cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 line-clamp-2 transition">
                                  {item.question_text}
                                </p>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 flex-shrink-0 border border-emerald-200/60">
                                  ✓ {getLangText('جواب دستیاب', 'تمت الإجابة', 'Answered')}
                                </span>
                              </div>
                              {item.mufti_name && (
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                  {getLangText('تصدیق شدہ از:', 'معتمد من:', 'Verified by:')} <strong className="font-semibold text-slate-700">{item.mufti_name}</strong>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-white border border-emerald-100 text-center text-xs text-slate-500">
                          {getLangText(
                            'دار الافتاء میں روزانہ شرعی سوالات کے تفصیلی جوابات دیے جاتے ہیں۔',
                            'يتم الرد على الاستفسارات الشرعية يومياً بإشراف دار الإفتاء.',
                            'Dar-ul-Ifta actively addresses daily questions with Quranic & Sunnah references.'
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: 3 Pillars of Trust (Authentic Badges) */}
                    <div className="grid gap-3">
                      <div className="p-4 rounded-2xl bg-white/90 border border-emerald-100 shadow-2xs flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                          <ShieldCheckIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {getLangText('مستند مفتیانِ کرام کی تصدیق', 'اعتماد من كبار العلماء', 'Verified by Muftis & Scholars')}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {getLangText(
                              'ہر فتویٰ قرآن و صحیح احادیث کے دلائل کے ساتھ مستند دار الافتاء سے جاری کیا جاتا ہے۔',
                              'تصدر جميع الفتاوى بأدلة من القرآن والسنة النبوية بإشراف هيئة علمية معتمدة.',
                              'Every ruling is verified with explicit evidence from Quran and authentic Sunnah.'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/90 border border-emerald-100 shadow-2xs flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                          <LockClosedIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {getLangText('مکمل پرائیویسی اور رازداری', 'خصوصية وسرية تامة', '100% Confidential Inquiries')}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {getLangText(
                              'آپ اپنا نام ظاہر کیے بغیر نجی طور پر بھی سوال پوچھ سکتے ہیں۔',
                              'يمكنك طرح سؤالك بشكل خاص وسري دون الكشف عن هويتك.',
                              'Option to submit questions privately without displaying your name publicly.'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/90 border border-emerald-100 shadow-2xs flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                          <BookOpenIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {getLangText('کتب و مآخذ کے حوالے', 'مراجع موثقة من أمهات الكتب', 'Linked to Library References')}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {getLangText(
                              'فتاویٰ کے ساتھ مرکز کی ڈیجیٹل لائبریری کی معتبر کتب منسلک کی جاتی ہیں۔',
                              'ربط مباشر مع أمهات الكتب والمراجع الفقهية في مكتبة المركز الرقمية.',
                              'Fatawa are directly referenced with authentic Islamic books in our digital library.'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

                        // ABOUT SECTION PREVIEW (Home page initial intro preview in Makhtota format)
        if (key === 'about' && getSectionConfig('about', { enabled: false }).enabled !== false) {
          const aboutConfig = getSectionConfig('about', {});
          const fullDesc = (aboutContent?.hero?.description || aboutContent?.intro?.description || "").trim();
          
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
                      {aboutConfig.title || 'مرکز کا تعارف'}
                    </p>
                    <h3
                      className="section-title text-xl sm:text-2xl font-extrabold text-slate-900 mt-1"
                      style={{ fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" }}
                    >
                      {aboutContent?.hero?.title || 'مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)'}
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
                    <LandingPostsPreview />
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
      <AskQuestionModal
        open={askQuestionOpen}
        onClose={() => setAskQuestionOpen(false)}
        categories={fatawaCategories}
        user={user}
        loading={createQuestionLoading}
        onSubmit={handleCreateQuestion}
      />

      {/* ACTIVITY DETAIL MODAL */}
      {selectedActivity && (
        <SocialWorkItemDetailModal
          item={selectedActivity}
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default PublicHome;