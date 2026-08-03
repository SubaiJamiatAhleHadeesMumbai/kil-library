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
import aboutService from "../api/aboutService";
import { useBookSearch } from "../hooks/useBookSearch";
import LandingPostsPreview from "../components/public/LandingPostsPreview";
import HomepagePostersCarousel from "../components/public/HomepagePostersCarousel";
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
  const [galleryImages, setGalleryImages] = useState([]);  // ✅ Gallery Images

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
  }, [books, homepageSettings]);

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
        const latestReadBookId = recentReadBooks[0]?.book?.id;
        if (recentReadBooks.length > 0 && latestReadBookId != null && book.id > latestReadBookId) {
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

  // ✅ NEW: Fetch gallery images from about settings
  useEffect(() => {
    const loadGallery = async () => {
      try {
        const aboutData = await aboutService.getAboutSettings();
        const gallery = Array.isArray(aboutData?.gallery) ? aboutData.gallery : [];
        setGalleryImages(gallery.filter(img => img.image_url));
      } catch (error) {
        console.warn('⚠️ Could not load gallery images:', error);
        setGalleryImages([]);
      }
    };

    loadGallery();
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
    const palette = homepageSettings?.theme_palette || 'indigo';
    const backgroundStyle = homepageSettings?.background_style || 'aurora';
    const uiFeel = homepageSettings?.ui_feel || 'premium';
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
      aurora: 'bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_24%)]',
      soft: 'bg-gradient-to-b from-white via-slate-50 to-slate-100',
      midnight: 'bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950',
      glass: 'bg-white/70 backdrop-blur-xl',
    };

    const paletteClasses = {
      indigo: 'accent-indigo-500 highlight-indigo-400',
      emerald: 'accent-emerald-500 highlight-emerald-400',
      amber: 'accent-amber-500 highlight-amber-400',
      rose: 'accent-rose-500 highlight-rose-400',
      slate: 'accent-slate-500 highlight-slate-400',
    };

    if (theme === 'night') {
      return {
        shell: `bg-slate-950 text-slate-100 ${paletteClasses[palette] || paletteClasses.indigo}`,
        card: 'bg-slate-900/90 text-slate-100 border-slate-800',
        muted: 'text-slate-400',
        hero: 'from-slate-950 via-slate-900 to-slate-800',
        heading: headingClasses[headingStyle] || headingClasses.serif,
        button: buttonClasses[buttonStyle] || buttonClasses.solid,
        spacing: spacingClasses[spacingScale] || spacingClasses.comfortable,
        background: backgroundClasses[backgroundStyle] || backgroundClasses.aurora,
        palette,
        backgroundStyle,
        uiFeel,
        headingStyle,
        buttonStyle,
        spacingScale,
      };
    }
    if (theme === 'day') {
      return {
        shell: `bg-[#F9FAFB] text-gray-800 ${paletteClasses[palette] || paletteClasses.indigo}`,
        card: 'bg-white text-slate-800 border-slate-200',
        muted: 'text-slate-500',
        hero: 'from-slate-950 via-slate-900 to-zinc-950',
        heading: headingClasses[headingStyle] || headingClasses.serif,
        button: buttonClasses[buttonStyle] || buttonClasses.solid,
        spacing: spacingClasses[spacingScale] || spacingClasses.comfortable,
        background: backgroundClasses[backgroundStyle] || backgroundClasses.aurora,
        palette,
        backgroundStyle,
        uiFeel,
        headingStyle,
        buttonStyle,
        spacingScale,
      };
    }
    return {
      shell: `bg-[#F9FAFB] text-gray-800 ${paletteClasses[palette] || paletteClasses.indigo}`,
      card: 'bg-slate-950/85 text-slate-100 border-slate-800',
      muted: 'text-slate-400',
      hero: 'from-slate-950 via-slate-900 to-zinc-950',
      heading: headingClasses[headingStyle] || headingClasses.serif,
      button: buttonClasses[buttonStyle] || buttonClasses.solid,
      spacing: spacingClasses[spacingScale] || spacingClasses.comfortable,
      background: backgroundClasses[backgroundStyle] || backgroundClasses.aurora,
      palette,
      backgroundStyle,
      uiFeel,
      headingStyle,
      buttonStyle,
      spacingScale,
    };
  }, [homepageSettings?.theme, homepageSettings?.theme_palette, homepageSettings?.background_style, homepageSettings?.ui_feel, homepageSettings?.heading_style, homepageSettings?.button_style, homepageSettings?.spacing_scale]);

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
  const posterSection = getSectionConfig('posters', { enabled: layout.show_posters !== false, title: 'Media Posters' });
  const showPosterBlock = posterSection.enabled !== false;
  const accentColor = homepageSettings?.accent_color || '#2D89C8';
  const sectionFrameClass = "rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:p-8";
  const orderedHomepageSections = useMemo(() => {
    const defaults = {
      hero: 0,
      posters: 1,
      search: 2,
      featured: 3,
      gallery: 4,
      fatawa: 5,
      about: 6,
      catalog: 7,
      posts: 8,
      donation: 9,
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
    const accentColor = homepageSettings?.accent_color || '#2D89C8';
    const root = document.documentElement;
    root.style.setProperty('--accent', accentColor);

    const hoverColor = accentColor;
    root.style.setProperty('--accent-hover', hoverColor);

    return () => {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-hover');
    };
  }, [homepageSettings?.accent_color]);

  // --- LOADING SCREEN FOR ADMIN REDIRECT ---
  if (authLoading) return null; // Or a spinner

  return (
    <div className={`min-h-screen animate-in fade-in duration-500 ${themeClasses.shell} ${themeClasses.background} ${themeClasses.heading}`}>
      <Toaster position="top-right" />
      <div className="sr-only" aria-label="Current site language">{language}</div>

      {getSectionConfig('hero', { enabled: true }).enabled !== false && (
        <div className="app-shell-container py-3 sm:py-5">
          <LibraryHero />
        </div>
      )}
          {orderedHomepageSections.map(({ key }) => {
            if (key === 'hero') return null;

            if (key === 'posters' && showPosterBlock) {
              return (
                <div key="posters" className={`app-shell-container py-2 sm:py-4 lg:py-6 ${themeClasses.spacing}`}>
                  <HomepagePostersCarousel />
                </div>
              );
            }

            if (key === 'search' && getSectionConfig('search', { enabled: true }).enabled !== false && showSearchStripBlock) {
              return (
                <div key="search" className="app-shell-container scroll-mt-24 pb-5 sm:pb-8" id="search">
                  <div className={`${sectionFrameClass} overflow-hidden`}>
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
                </div>
              );
            }

            if (key === 'continue_reading' && getSectionConfig('continue_reading', { enabled: true }).enabled !== false && recentReadBooks.length > 0) {
              return (
                <div key="continue_reading" className="app-shell-container pb-4 sm:pb-8">
                  <div className={`${sectionFrameClass}`}>
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
                </div>
              );
            }

            if (key === 'featured' && getSectionConfig('featured', { enabled: true }).enabled !== false && showFeaturedPanel) {
              return (
                <div key="featured" className="app-shell-container pb-5 sm:pb-12">
                  <div className={`${sectionFrameClass}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
                      <div>
                        <p className="eyebrow" style={{ color: accentColor }}>{getSectionConfig('featured', { title: 'Library Highlights' }).title || 'Library Highlights'}</p>
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
                </div>
              );
            }

            if (key === 'gallery' && getSectionConfig('gallery', { enabled: false }).enabled !== false) {
              const galleryConfig = getSectionConfig('gallery', {});
              const displayImages = galleryImages.length > 0 ? galleryImages : [
                { image_url: 'https://via.placeholder.com/600x400?text=Gallery+Image+1', title: 'Gallery Image 1' },
                { image_url: 'https://via.placeholder.com/600x400?text=Gallery+Image+2', title: 'Gallery Image 2' },
                { image_url: 'https://via.placeholder.com/600x400?text=Gallery+Image+3', title: 'Gallery Image 3' },
                { image_url: 'https://via.placeholder.com/600x400?text=Gallery+Image+4', title: 'Gallery Image 4' },
                { image_url: 'https://via.placeholder.com/600x400?text=Gallery+Image+5', title: 'Gallery Image 5' },
                { image_url: 'https://via.placeholder.com/600x400?text=Gallery+Image+6', title: 'Gallery Image 6' },
              ];
              
              return (
                <div key="gallery" className="app-shell-container pb-5 sm:pb-12">
                  <div className={`${sectionFrameClass}`}>
                    <div className="mb-6 flex items-end justify-between gap-3">
                      <div>
                        <p className="eyebrow" style={{ color: accentColor }}>{galleryConfig.title || 'Gallery'}</p>
                        <h3 className="section-title text-slate-900">{galleryConfig.subtitle || 'Visual collections'}</h3>
                      </div>
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
                          <div className="relative group overflow-hidden rounded-xl bg-slate-100 shadow-md hover:shadow-xl transition-shadow h-64 sm:h-72">
                            <img
                              src={image.image_url}
                              alt={image.title || `Gallery image ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                            {image.title && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                <p className="text-white font-semibold text-sm line-clamp-2">{image.title}</p>
                              </div>
                            )}
                            {image.caption && (
                              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent p-3">
                                <p className="text-white/80 text-xs line-clamp-2">{image.caption}</p>
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

            if (key === 'fatawa' && getSectionConfig('fatawa', { enabled: false }).enabled !== false) {
              const fatawaConfig = getSectionConfig('fatawa', {});
              return (
                <div key="fatawa" className="app-shell-container pb-5 sm:pb-12">
                  <div className={`${sectionFrameClass}`}>
                    <div className="mb-6 flex items-end justify-between gap-3">
                      <div>
                        <p className="eyebrow" style={{ color: accentColor }}>{fatawaConfig.title || 'Fatawa Q&A'}</p>
                        <h3 className="section-title text-slate-900">{fatawaConfig.subtitle || 'Islamic Q&A'}</h3>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 sm:p-12 text-center border border-blue-200">
                      <div className="text-6xl mb-4">❓</div>
                      <p className="text-slate-700 mb-6 text-lg">{fatawaConfig.description || 'Get answers to your Islamic questions from our fatawa database.'}</p>
                      <button
                        onClick={() => navigate('/fatawa')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
                        style={{ backgroundColor: accentColor }}
                      >
                        Explore Fatawa
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (key === 'about' && getSectionConfig('about', { enabled: false }).enabled !== false) {
              const aboutConfig = getSectionConfig('about', {});
              return (
                <div key="about" className="app-shell-container pb-5 sm:pb-12">
                  <div className={`${sectionFrameClass}`}>
                    <div className="mb-6 flex items-end justify-between gap-3">
                      <div>
                        <p className="eyebrow" style={{ color: accentColor }}>{aboutConfig.title || 'About Page'}</p>
                        <h3 className="section-title text-slate-900">{aboutConfig.subtitle || 'Learn about our library'}</h3>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 sm:p-12 text-center">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-slate-700 mb-6 text-lg">{aboutConfig.description || 'Learn more about our library and mission.'}</p>
                      <button
                        onClick={() => navigate('/about')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
                        style={{ backgroundColor: accentColor }}
                      >
                        Learn More
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (key === 'catalog' && getSectionConfig('catalog', { enabled: true }).enabled !== false) {
              return (
                <div key="catalog" className="app-shell-container py-5 sm:py-8" id="book-grid">
                  <div className={`${sectionFrameClass}`}>
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

                        <button
                          onClick={loadBooks}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold shadow-sm disabled:opacity-50"
                          title="Refresh Books"
                        >
                          <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                          Refresh
                        </button>

                        <div className="text-sm text-gray-500">
                          Showing{" "}
                          <span className="font-bold text-gray-700">{finalBooks.length}</span>{" "}
                          books
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <BookCardSkeleton key={i} />
                        ))}
                      </div>
                    ) : finalBooks.length > 0 ? (
                      <div className="mb-10">
                        {!searchTerm && !showFavoritesOnly && sortedBooks.length > 0 && (
                           <div className="mb-12">
                               <h3 className="text-lg font-bold uppercase tracking-widest mb-4" style={{ color: accentColor }}>
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
                          className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-white font-bold transition-colors shadow-sm"
                          style={{ backgroundColor: accentColor }}
                        >
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (key === 'posts' || key === 'donation') {
              const showPosts = getSectionConfig('posts', { enabled: true }).enabled !== false;
              const showDonation = getSectionConfig('donation', { enabled: true }).enabled !== false && showDonationBlock;

              if (!showPosts && !showDonation) return null;
              if (key === 'donation') return null;

              return (
                <div key="posts-donation" className="app-shell-container py-6 sm:py-10 lg:py-16 border-t border-gray-200">
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

    </div>
  );
};

export default PublicHome;