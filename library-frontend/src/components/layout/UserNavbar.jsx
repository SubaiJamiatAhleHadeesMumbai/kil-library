import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

// --- ICONS ---
import { HeartIcon } from "@heroicons/react/24/solid";
import {
  MegaphoneIcon,
  BookOpenIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  TableCellsIcon,
  UsersIcon,
  BuildingOfficeIcon,
  HomeIcon,
  ChevronDownIcon,
  ArrowLeftOnRectangleIcon, // Icon for Login
  AcademicCapIcon,
  Squares2X2Icon,
  UserGroupIcon,
  EllipsisHorizontalCircleIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  ShieldCheckIcon,
  BookmarkIcon,
  PhotoIcon,
  MoonIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

// --- COMPONENTS & HOOKS ---
import useAuth from "../../hooks/useAuth";
import NotificationBell from "../common/NotificationBell";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useLanguage } from "../../context/LanguageContext";
import DonationModal from "../donation/DonationModal";
import HandCoinIcon from "../common/HandCoinIcon";
import UniversalSearchModal from "../common/UniversalSearchModal";
import TopAnnouncementBar from "../common/TopAnnouncementBar";
import MobileBottomNav from "./MobileBottomNav";
import settingsService from "../../api/settingsService";
import { isAdminUser } from "../../config/accessControl";

// âœ… CONFIG
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const MARKAZ_LOGO_URL = `${API_BASE_URL}/static/images/MarkazLogo.png`;

// ==========================================
// 1. SUB-COMPONENTS
// ==========================================

const NavItem = ({ to, label, icon: Icon, onClick }) => {
  const displayLabel = typeof label === 'object' && label !== null
    ? (label.en || label.ur || label.ar || '')
    : String(label || '');
  const isUrdu = /[\u0600-\u06FF]/.test(displayLabel);

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        relative flex items-center gap-2 px-3 py-2 text-sm font-bold transition-all duration-300
        ${
          isActive
            ? "text-emerald-900 font-extrabold"
            : "text-slate-600 hover:text-emerald-800"
        }
      `}
    >
      {({ isActive }) => (
        <>
          {Icon && (
            <Icon
              className={`h-4 w-4 transition-colors ${
                isActive ? "text-emerald-700" : "text-slate-400 group-hover:text-emerald-700"
              }`}
            />
          )}
          <span 
            style={isUrdu ? { 
              fontFamily: "'Noto Naskh Arabic', system-ui, sans-serif", 
              fontSize: "0.95rem", 
              lineHeight: 1.6 
            } : undefined}
          >
            {displayLabel}
          </span>
          {isActive && (
            <motion.div
              layoutId="active-nav-underline"
              className="absolute bottom-0 inset-x-2 h-[2.5px] bg-gradient-to-r from-emerald-600 via-emerald-800 to-emerald-600 rounded-full shadow-xs"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
};

// Safe helper to extract role name whether user.role is a string or an object { name, description, id, permissions, created_at }
const getRoleDisplayName = (u) => {
  if (!u || !u.role) return "Member";
  if (typeof u.role === "object") {
    return u.role.name || u.role.title || "Member";
  }
  return String(u.role);
};

const isUserAdmin = (u) => {
  if (!u) return false;
  return isAdminUser(u);
};

// ==========================================
// 2. MAIN NAVBAR COMPONENT
// ==========================================

const UserNavbar = () => {
  const { user, isAuth, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isReaderPage = location.pathname.startsWith('/read');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  const [isMobileAboutOpen, setIsMobileAboutOpen] = useState(false);
  const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false);
  const [isMobileSocialOpen, setIsMobileSocialOpen] = useState(false);
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);
  const [homepageSettings, setHomepageSettings] = useState(null);
  const [lastReadBook, setLastReadBook] = useState(null);
  const [isContinueReadingDismissed, setIsContinueReadingDismissed] = useState(false);
  
  const profileRef = useRef(null);
  const aboutDropdownRef = useRef(null);
  const aboutTimeoutRef = useRef(null);
  const socialDropdownRef = useRef(null);
  const socialTimeoutRef = useRef(null);

  // Load last read book from localStorage with Live Event Sync
  useEffect(() => {
    const syncLastRead = () => {
      try {
        const stored = localStorage.getItem('kil_last_read_book');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.bookId && parsed.bookId !== 'null' && parsed.bookId !== 'undefined') {
            setLastReadBook(parsed);
          } else {
            localStorage.removeItem('kil_last_read_book');
            setLastReadBook(null);
          }
        } else {
          setLastReadBook(null);
        }
      } catch (e) {
        console.warn('Error reading last read book from localStorage:', e);
      }
    };

    syncLastRead();
    window.addEventListener('kil_reading_updated', syncLastRead);
    window.addEventListener('storage', syncLastRead);

    return () => {
      window.removeEventListener('kil_reading_updated', syncLastRead);
      window.removeEventListener('storage', syncLastRead);
    };
  }, []);

  const handleAboutMouseEnter = () => {
    if (aboutTimeoutRef.current) clearTimeout(aboutTimeoutRef.current);
    setIsAboutDropdownOpen(true);
  };

  const handleAboutMouseLeave = () => {
    aboutTimeoutRef.current = setTimeout(() => {
      setIsAboutDropdownOpen(false);
    }, 180);
  };

  const handleSocialMouseEnter = () => {
    if (socialTimeoutRef.current) clearTimeout(socialTimeoutRef.current);
    setIsSocialDropdownOpen(true);
  };

  const handleSocialMouseLeave = () => {
    socialTimeoutRef.current = setTimeout(() => {
      setIsSocialDropdownOpen(false);
    }, 180);
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    setIsAboutDropdownOpen(false);
    setIsSocialDropdownOpen(false);
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (aboutDropdownRef.current && !aboutDropdownRef.current.contains(e.target)) {
        setIsAboutDropdownOpen(false);
      }
      if (socialDropdownRef.current && !socialDropdownRef.current.contains(e.target)) {
        setIsSocialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      if (aboutTimeoutRef.current) clearTimeout(aboutTimeoutRef.current);
      if (socialTimeoutRef.current) clearTimeout(socialTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchSettings = () => {
      settingsService.getHomepageSettings().then((data) => {
        if (mounted) setHomepageSettings(data || {});
      }).catch(() => {
        if (mounted) setHomepageSettings({});
      });
    };

    fetchSettings();

    const handleSettingsUpdated = (e) => {
      if (e?.detail) {
        setHomepageSettings(e.detail);
      } else {
        fetchSettings();
      }
    };

    window.addEventListener('homepage-settings-updated', handleSettingsUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('homepage-settings-updated', handleSettingsUpdated);
    };
  }, []);

  const sectionVisibility = homepageSettings?.sections || {};
  const navbarConfig = homepageSettings?.navbar_config || {};
  const announcementConfig = homepageSettings?.announcement_bar || null;
  const mobileNavConfig = homepageSettings?.mobile_nav_config || null;

  const menuItems = navbarConfig.menu_items || {
    home: true,
    library: true,
    about: true,
    gallery: true,
    fatawa: true,
    activities: true,
    updates: true,
  };

  const showHomeLink = menuItems.home !== false;
  const showLibraryLink = menuItems.library !== false;
  const showAboutLink = menuItems.about !== false && sectionVisibility.about?.enabled !== false;
  const showGalleryLink = menuItems.gallery !== false && sectionVisibility.gallery?.enabled !== false;
  const showFatawaLink = menuItems.fatawa !== false && sectionVisibility.fatawa?.enabled !== false;
  const showActivitiesLink = menuItems.activities !== false;
  const showUpdatesLink = menuItems.updates !== false;

  const showContinueReading = navbarConfig.show_continue_reading !== false;
  const showSearchPill = navbarConfig.show_search !== false;
  const showLanguageSwitcher = navbarConfig.show_language !== false;
  const showDonateButton = navbarConfig.show_donate !== false;
  const donateButtonText = (() => {
    const d = navbarConfig.donate_text;
    if (d && typeof d === "object") {
      return d[language] || d.en || d.ur || d.ar || t("donate_btn") || "Donate";
    }
    if (typeof d === "string" && d.trim()) return d.trim();
    return t("donate_btn") || "Donate";
  })();
  const logoSizePx = Number(navbarConfig.logo_size) || 42;

  const brandLogoUrl = homepageSettings?.site_logo_url
    ? (homepageSettings.site_logo_url.startsWith("http")
        ? homepageSettings.site_logo_url
        : `${API_BASE_URL}${homepageSettings.site_logo_url.startsWith("/") ? "" : "/"}${homepageSettings.site_logo_url}`)
    : MARKAZ_LOGO_URL;

  const brandTitle = (() => {
    const raw = homepageSettings?.site_title;
    if (raw && typeof raw === "object") {
      return raw[language] || raw.en || raw.ur || raw.ar || t("markaz_title") || "Markaz Ahle Hadees Kokan";
    }
    if (typeof raw === "string" && raw.trim()) {
      return raw;
    }
    return t("markaz_title") || "Markaz Ahle Hadees Kokan";
  })();
  const brandSub = (() => {
    const raw = homepageSettings?.site_subtitle;
    if (raw && typeof raw === "object") {
      return raw[language] || raw.en || raw.ur || raw.ar || t("markaz_sub") || "";
    }
    if (typeof raw === "string" && raw.trim()) {
      return raw;
    }
    return t("markaz_sub") || "";
  })();
  const showSiteSubtitle = navbarConfig.show_subtitle !== false && homepageSettings?.show_site_subtitle !== false;

  return (
    <>
      <header className="sticky top-0 z-[100] flex flex-col w-full font-sans shadow-xs">
        {/* THIN STICKY READING PROGRESS BAR (YouTube Style) */}
        {lastReadBook && showContinueReading && (
          <div 
            className="h-[2.5px] w-full bg-slate-200/60 overflow-hidden relative z-[100]" 
            title={`Reading progress: ${lastReadBook.title} (Page ${lastReadBook.page})`}
          >
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(8, ((lastReadBook.page || 1) / (lastReadBook.total_pages || 50)) * 100))}%` }} 
            />
          </div>
        )}

        {/* TOP ANNOUNCEMENT / HADITH TICKER BAR */}
        <TopAnnouncementBar config={announcementConfig} />

        {/* MAIN NAVBAR */}
        <nav className="bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-2xs transition-all duration-300 text-slate-800">
          <div className="app-shell-container">
            <div className="flex items-center justify-between min-h-[4.25rem] py-2 gap-2">
              
              {/* LOGO & BRAND */}
              <div className="flex items-center min-w-0 flex-1 lg:flex-none">
                <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 flex-1 lg:flex-none" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="relative shrink-0 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img
                      src={brandLogoUrl}
                      alt="Logo"
                      style={{
                        height: `clamp(32px, 8vw, ${logoSizePx}px)`,
                        width: `clamp(32px, 8vw, ${logoSizePx}px)`,
                      }}
                      className="relative z-10 object-contain bg-white rounded-full border border-slate-200 shadow-xs group-hover:scale-105 transition-transform duration-300 shrink-0"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = MARKAZ_LOGO_URL;
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1 py-0.5 overflow-visible">
                    <span
                      style={{ 
                        fontSize: "clamp(0.75rem, 3.2vw, 1.18rem)",
                        fontFamily: language === 'ur' ? "'Gulzar', 'Noto Nastaliq Urdu', serif" : undefined,
                        lineHeight: language === 'ur' ? 2.0 : 1.25,
                        paddingTop: language === 'ur' ? "2px" : "0px",
                        paddingBottom: language === 'ur' ? "2px" : "0px",
                      }}
                      className="font-extrabold text-emerald-950 line-clamp-2 break-words overflow-visible"
                      title={brandTitle}
                    >
                      {brandTitle}
                    </span>
                    {showSiteSubtitle && brandSub && (
                      <span 
                        style={{
                          fontFamily: language === 'ur' ? "'Gulzar', 'Noto Nastaliq Urdu', serif" : undefined
                        }}
                        className="text-[9px] sm:text-[10px] text-emerald-700/80 font-bold uppercase tracking-wider line-clamp-1 break-words"
                      >
                        {brandSub}
                      </span>
                    )}
                  </div>
                </Link>
              </div>

              {/* DESKTOP NAV */}
              <div className="hidden lg:flex items-center gap-1">
                {showHomeLink && (
                  <NavItem
                    to="/"
                    label={t("nav.home") || (language === 'ur' ? 'صفحہ اول' : language === 'ar' ? 'الرئيسية' : 'Home')}
                    icon={HomeIcon}
                  />
                )}

                {/* ABOUT & ISLAMIC PORTALS DROPDOWN */}
                <div
                  ref={aboutDropdownRef}
                  className="relative"
                  onMouseEnter={handleAboutMouseEnter}
                  onMouseLeave={handleAboutMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => setIsAboutDropdownOpen((prev) => !prev)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                      isAboutDropdownOpen ||
                      location.pathname === '/about' ||
                      location.pathname === '/calendar' ||
                      location.pathname === '/moon' ||
                      location.pathname === '/juma-list'
                        ? "text-emerald-900 font-extrabold"
                        : "text-slate-600 hover:text-emerald-800"
                    }`}
                    aria-expanded={isAboutDropdownOpen}
                  >
                    <InformationCircleIcon className={`h-4 w-4 transition-colors ${isAboutDropdownOpen ? "text-emerald-700" : "text-slate-400"}`} />
                    <span>{t("about") || "About"}</span>
                    <ChevronDownIcon
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isAboutDropdownOpen ? "rotate-180 text-emerald-700" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isAboutDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute start-0 mt-1.5 w-64 bg-white/98 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200/90 p-2 z-[110] overflow-hidden text-slate-800"
                      >
                        <div className="space-y-1">
                          {/* 1. About Markaz */}
                          <Link
                            to="/about"
                            onClick={() => setIsAboutDropdownOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all duration-200 group"
                          >
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-800 group-hover:text-white transition-all shadow-2xs">
                              <InformationCircleIcon className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col text-start">
                              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                {language === 'ur' ? 'تعارف مرکز' : (language === 'ar' ? 'عن المركز' : 'About Markaz')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Mission, History & Aims
                              </span>
                            </div>
                          </Link>

                          {/* 2. Jumah Schedule */}
                          <Link
                            to="/juma-list"
                            onClick={() => setIsAboutDropdownOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all duration-200 group"
                          >
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-800 group-hover:text-white transition-all shadow-2xs">
                              <CalendarDaysIcon className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col text-start">
                              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                {language === 'ur' ? 'خطباتِ جمعہ' : (language === 'ar' ? 'جدول خطب الجمعة' : 'Jumah Schedule')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {language === 'ur' ? 'اوقاتِ خطبہ و مساجد' : (language === 'ar' ? 'مواعيد الخطب والأئمة' : 'Khutbah timings & Imams')}
                              </span>
                            </div>
                          </Link>

                          {/* 3. Moon Announcements */}
                          <Link
                            to="/moon"
                            onClick={() => setIsAboutDropdownOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all duration-200 group"
                          >
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-800 group-hover:text-white transition-all shadow-2xs">
                              <MoonIcon className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col text-start">
                              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                {language === 'ur' ? 'رؤیتِ ہلال' : (language === 'ar' ? 'إعلانات رؤية الهلال' : 'Moon Announcements')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {language === 'ur' ? 'ہلال کمیٹی کے سرکاری اعلانات' : (language === 'ar' ? 'البيانات الرسمية للأهلة' : 'Official Hijri declarations')}
                              </span>
                            </div>
                          </Link>

                          {/* 4. Islamic Calendar */}
                          <Link
                            to="/calendar"
                            onClick={() => setIsAboutDropdownOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all duration-200 group"
                          >
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-800 group-hover:text-white transition-all shadow-2xs">
                              <CalendarDaysIcon className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col text-start">
                              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                {language === 'ur' ? 'اسلامی تقویم (کیلنڈر)' : (language === 'ar' ? 'التقويم الهجري' : 'Islamic Calendar')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {language === 'ur' ? 'سال کے ۱۲ مہینوں کے پوسٹرز' : (language === 'ar' ? 'ملصقات التقويم لـ ١٢ شهراً' : '12 Months Calendar Posters')}
                              </span>
                            </div>
                          </Link>

                          {/* 5. Ulama Opinions */}
                          <Link
                            to="/about?tab=ulama"
                            onClick={() => setIsAboutDropdownOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-900/60 hover:border-amber-500/30 border border-transparent transition-all duration-200 group"
                          >
                            <div className="h-9 w-9 rounded-xl bg-emerald-950/80 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-sm">
                              <ChatBubbleLeftRightIcon className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col text-start">
                              <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                {language === 'ur' ? 'علماء کی آراء' : (language === 'ar' ? 'آراء العلماء' : 'Scholarly Opinions')}
                              </span>
                              <span className="text-[10px] text-amber-200/70 font-medium">
                                {language === 'ur' ? 'مرکز کے بارے میں تاثرات' : (language === 'ar' ? 'شهادات وانطباعات' : 'Scholarly Testimonials')}
                              </span>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {showLibraryLink && (
                  <NavItem
                    to="/books"
                    label={t("nav.library") || (language === 'ur' ? 'کتب خانہ' : language === 'ar' ? 'المكتبة' : 'Library')}
                    icon={BookOpenIcon}
                  />
                )}
                {showFatawaLink && (
                  <NavItem
                    to="/fatawa"
                    label={t("nav.fatawa") || (language === 'ur' ? 'فتاویٰ' : language === 'ar' ? 'الفتاوى' : 'Fatawa')}
                    icon={BookOpenIcon}
                  />
                )}
                {showGalleryLink && (
                  <NavItem
                    to="/gallery"
                    label={t("nav.gallery") || (language === 'ur' ? 'نگارخانہ' : language === 'ar' ? 'المعرض' : 'Gallery')}
                    icon={PhotoIcon}
                  />
                )}

                {/* MORE DROPDOWN (Contains Activities, Welfare, Clippings, Updates) */}
                {(showActivitiesLink || showUpdatesLink) && (
                  <div
                    ref={socialDropdownRef}
                    className="relative"
                    onMouseEnter={handleSocialMouseEnter}
                    onMouseLeave={handleSocialMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => setIsSocialDropdownOpen((prev) => !prev)}
                      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        isSocialDropdownOpen
                          ? "text-emerald-900 font-extrabold"
                          : "text-slate-600 hover:text-emerald-800"
                      }`}
                      aria-expanded={isSocialDropdownOpen}
                    >
                      <Squares2X2Icon className={`h-4 w-4 transition-colors ${isSocialDropdownOpen ? "text-emerald-700" : "text-slate-400"}`} />
                      <span>{t("more") || "More"}</span>
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isSocialDropdownOpen ? "rotate-180 text-emerald-700" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isSocialDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute start-0 mt-1.5 w-64 bg-white/98 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200/90 p-2 z-[110] overflow-hidden text-slate-800"
                        >
                          <div className="space-y-1">

                            {/* 2. Education (taleem) */}
                            <Link
                              to="/education"
                              onClick={() => setIsSocialDropdownOpen(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all duration-200 group"
                            >
                              <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-800 group-hover:text-white transition-all shadow-2xs">
                                <AcademicCapIcon className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col text-start">
                                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                  {t("education_taleem") || (language === 'ur' ? 'تعلیم و رہنمائی' : language === 'ar' ? 'التعليم والإرشاد' : 'Education & Guidance')}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Taleem & Guidance
                                </span>
                              </div>
                            </Link>

                            {/* 3. Social Work */}
                            <Link
                              to="/social-work"
                              onClick={() => setIsSocialDropdownOpen(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all duration-200 group"
                            >
                              <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-800 group-hover:text-white transition-all shadow-2xs p-1.5">
                                <img src="/icons/social-work.png" alt="Social Work" className="w-full h-full object-contain" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                  {t("social_work")}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Welfare & Relief Drives
                                </span>
                              </div>
                            </Link>

                            {/* 4. Newspaper Clippings */}
                            <Link
                              to="/clippings"
                              onClick={() => setIsSocialDropdownOpen(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-200 border border-transparent transition-all duration-200 group"
                            >
                              <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-800 group-hover:text-white transition-all shadow-2xs">
                                <NewspaperIcon className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col text-start">
                                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                  Newspaper Clippings
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  اخباری تراشے و پریس کٹنگس
                                </span>
                              </div>
                            </Link>

                            {/* 5. Activities / Other */}
                            {showActivitiesLink && (
                              <Link
                                to="/activities"
                                onClick={() => setIsSocialDropdownOpen(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-900/60 hover:border-amber-500/30 border border-transparent transition-all duration-200 group"
                              >
                                <div className="h-9 w-9 rounded-xl bg-emerald-950/80 border border-amber-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-sm">
                                  <EllipsisHorizontalCircleIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col text-start">
                                  <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                    {t("activities")}
                                  </span>
                                  <span className="text-[10px] text-amber-200/70 font-medium">
                                    Events & Gatherings
                                  </span>
                                </div>
                              </Link>
                            )}

                            {/* 6. Updates & Announcements */}
                            {showUpdatesLink && (
                              <Link
                                to="/posts"
                                onClick={() => setIsSocialDropdownOpen(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-900/60 hover:border-amber-500/30 border border-transparent transition-all duration-200 group"
                              >
                                <div className="h-9 w-9 rounded-xl bg-emerald-950/80 border border-amber-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-sm">
                                  <MegaphoneIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col text-start">
                                  <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                    {t("updates")}
                                  </span>
                                  <span className="text-[10px] text-amber-200/70 font-medium">
                                    News & Circulars
                                  </span>
                                </div>
                              </Link>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* RIGHT ACTIONS: CONSOLIDATED CLUSTER */}
              <div className="hidden lg:flex items-center justify-end gap-2 min-w-0 lg:flex-none">
                
                {/* Compact Icon-Only Search Trigger (Expand-on-click via modal) */}
                {showSearchPill && (
                  <button
                    type="button"
                    onClick={() => setIsUniversalSearchOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 text-xs transition-all duration-200 shadow-2xs cursor-pointer group"
                    title={t("search_placeholder") + " (Ctrl+K)"}
                  >
                    <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-500 group-hover:scale-110 transition-transform" />
                    <span className="hidden xl:inline text-[11px] text-slate-600 font-semibold group-hover:text-slate-900">
                      Search
                    </span>
                    <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-slate-500 bg-white border border-slate-200 rounded">
                      ⌘K
                    </kbd>
                  </button>
                )}

                {/* Donate Button */}
                {showDonateButton && (
                  <button
                    onClick={() => setIsDonationOpen(true)}
                    className="group flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-full transition-all duration-300 border border-emerald-200/90 shadow-2xs cursor-pointer"
                    title={donateButtonText}
                  >
                    <HandCoinIcon className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
                    <span 
                      className="text-[11px] font-bold text-emerald-900"
                      style={language === 'ur' ? { fontFamily: "'Gulzar', 'Noto Nastaliq Urdu', serif", fontSize: "0.95rem", lineHeight: 1.4 } : undefined}
                    >
                      {donateButtonText}
                    </span>
                  </button>
                )}

                {/* VISUALLY UNIFIED ACCOUNT & CONTROLS CLUSTER */}
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-50 border border-slate-200 shadow-2xs">
                  {/* Language Switcher */}
                  {showLanguageSwitcher && <LanguageSwitcher />}

                  {/* Auth Logic (Logged-in vs Logged-out) */}
                  {isAuth ? (
                    <>
                      <NotificationBell />

                      {/* Profile Dropdown */}
                      <div ref={profileRef} className="relative">
                        <button
                          onClick={() => setIsProfileOpen((p) => !p)}
                          className="flex items-center gap-1 p-0.5 rounded-full hover:bg-emerald-900/60 transition-all group cursor-pointer focus:outline-none"
                          aria-expanded={isProfileOpen}
                        >
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center border border-amber-400/50 shadow-xs font-extrabold text-[11px]">
                            {user?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                          <ChevronDownIcon className={`w-3 h-3 text-amber-200/60 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-amber-300' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isProfileOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.96 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute end-0 mt-2 w-60 bg-[#051c14]/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-amber-500/30 p-1.5 z-[110] overflow-hidden ring-1 ring-amber-400/20 text-white"
                            >
                              {/* User Header Info Card */}
                              <div className="px-3.5 py-3 bg-[#07241b] rounded-xl border border-amber-500/25 mb-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[10px] uppercase font-bold text-amber-200/60 tracking-wider">Signed in as</span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    isUserAdmin(user)
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                  }`}>
                                    {getRoleDisplayName(user)}
                                  </span>
                                </div>
                                <p className="text-sm font-extrabold text-amber-200 truncate">{user?.username}</p>
                                {user?.email && (
                                  <p className="text-xs text-slate-300 font-medium truncate mt-0.5">{user.email}</p>
                                )}
                              </div>

                              {/* Navigation Items in Dropdown */}
                              <div className="space-y-0.5">
                            {user && isUserAdmin(user) && (
                              <Link
                                to="/admin/dashboard"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded-xl hover:bg-amber-500/25 transition-colors"
                              >
                                <ShieldCheckIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <span>Admin Dashboard</span>
                              </Link>
                            )}
                            <Link
                              to="/profile"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-200 rounded-xl hover:bg-emerald-900/60 hover:text-amber-300 transition-colors"
                            >
                              <UserCircleIcon className="w-4 h-4 text-amber-200/60 flex-shrink-0" />
                              <span>{t("profile") || "My Profile"}</span>
                            </Link>
                            <Link
                              to="/books"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-200 rounded-xl hover:bg-emerald-900/60 hover:text-amber-300 transition-colors"
                            >
                              <BookmarkIcon className="w-4 h-4 text-amber-200/60 flex-shrink-0" />
                              <span>My Saved / History</span>
                            </Link>
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-400 rounded-xl hover:bg-rose-950/40 transition-colors text-start cursor-pointer mt-1 border-t border-amber-500/20"
                            >
                              <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
                              <span>{t("logout") || "Log Out"}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-emerald-700 shadow-xs transition-all duration-200 cursor-pointer"
                >
                  <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5 text-emerald-100 stroke-2" />
                  <span>{t("login")}</span>
                </Link>
              )}
            </div>
          </div>

            {/* MOBILE TOGGLE, SEARCH & LANGUAGE */}
            <div className="flex items-center gap-1 sm:gap-1.5 lg:hidden shrink-0">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => setIsUniversalSearchOpen(true)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-emerald-800 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                title="Universal Search"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
              {isAuth && <NotificationBell />}
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 sm:p-2 rounded-xl text-amber-200 hover:text-amber-300 hover:bg-emerald-900/60 active:bg-emerald-950 transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            MOBILE MENU
        ---------------------------------------------------- */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#051c14] border-t border-amber-500/25 overflow-hidden shadow-2xl text-white"
            >
              <div className="px-4 py-6 space-y-1">
                
                {/* User Info / Login Mobile */}
                <div className="mb-6 pb-6 border-b border-amber-500/20">
                    {isAuth ? (
                        <div className="flex items-center gap-3 bg-[#07241b] border border-amber-500/25 p-3 rounded-2xl">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{user?.username}</p>
                                <p className="text-xs text-amber-300/80">{getRoleDisplayName(user)}</p>
                            </div>
                            {user && isUserAdmin(user) && (
                              <Link
                                to="/admin/dashboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 bg-amber-500/20 text-amber-300 rounded-lg shadow-xs border border-amber-400/30"
                                title="Admin Dashboard"
                              >
                                <ShieldCheckIcon className="w-5 h-5" />
                              </Link>
                            )}
                            <Link
                              to="/profile"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="p-2 bg-[#041610] text-amber-300 rounded-lg shadow-xs border border-amber-500/30"
                              title="My Profile"
                            >
                                <UserCircleIcon className="w-5 h-5" />
                            </Link>
                        </div>
                    ) : (
                        // ONLY LOGIN BUTTON MOBILE
                        <Link
                            to="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 rounded-xl font-bold shadow-md active:scale-95 transition-transform"
                        >
                            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                            Log In to Portal
                        </Link>
                    )}
                </div>

                {/* Mobile Links */}
                <div className="space-y-1">
                  <NavItem
                    to="/"
                    label={t("nav.home") || (language === 'ur' ? 'صفحہ اول' : language === 'ar' ? 'الرئيسية' : 'Home')}
                    icon={HomeIcon}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  
                  {/* Mobile About & Portals Accordion */}
                  <div className="rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsMobileAboutOpen((p) => !p)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <InformationCircleIcon className="h-4 w-4 text-amber-400" />
                        <span>{t("about") || "About & Portals"}</span>
                      </div>
                      <ChevronDownIcon className={`w-3.5 h-3.5 text-amber-200/60 transition-transform duration-200 ${isMobileAboutOpen ? 'rotate-180 text-amber-300' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isMobileAboutOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-6 pr-2 py-1 space-y-1 bg-[#041610]/80 border border-amber-500/20 rounded-xl mt-1 overflow-hidden text-white"
                        >
                          <Link
                            to="/about"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <InformationCircleIcon className="w-4 h-4 text-amber-400" />
                            <span>{language === 'ur' ? 'تعارف مرکز' : 'About Markaz'}</span>
                          </Link>
                          <Link
                            to="/juma-list"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <CalendarDaysIcon className="w-4 h-4 text-emerald-400" />
                            <span>{language === 'ur' ? 'خطباتِ جمعہ' : (language === 'ar' ? 'جدول خطب الجمعة' : 'Jumah Schedule')}</span>
                          </Link>
                          <Link
                            to="/moon"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <MoonIcon className="w-4 h-4 text-amber-400" />
                            <span>{language === 'ur' ? 'رؤیتِ ہلال' : (language === 'ar' ? 'إعلانات رؤية الهلال' : 'Moon Announcements')}</span>
                          </Link>
                          <Link
                            to="/calendar"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <CalendarDaysIcon className="w-4 h-4 text-teal-400" />
                            <span>{language === 'ur' ? 'اسلامی تقویم (کیلنڈر)' : (language === 'ar' ? 'التقويم الهجري' : 'Islamic Calendar')}</span>
                          </Link>
                          <Link
                            to="/about?tab=ulama"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-amber-400" />
                            <span>{language === 'ur' ? 'علماء کی آراء' : (language === 'ar' ? 'آراء العلماء' : 'Scholarly Opinions')}</span>
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <NavItem
                    to="/books"
                    label={t("nav.library") || (language === 'ur' ? 'کتب خانہ' : language === 'ar' ? 'المكتبة' : 'Library')}
                    icon={BookOpenIcon}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <NavItem
                    to="/gallery"
                    label={t("nav.gallery") || (language === 'ur' ? 'نگارخانہ' : language === 'ar' ? 'المعرض' : 'Gallery')}
                    icon={PhotoIcon}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  {showFatawaLink ? (
                    <NavItem
                      to="/fatawa"
                      label={t("nav.fatawa") || (language === 'ur' ? 'فتاویٰ' : language === 'ar' ? 'الفتاوى' : 'Fatawa')}
                      icon={BookOpenIcon}
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  ) : null}
                  
                  {/* Mobile Activities Accordion */}
                  <div className="rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsMobileSocialOpen((p) => !p)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Squares2X2Icon className="h-4 w-4 text-amber-200/60" />
                        <span>{t("activities")}</span>
                      </div>
                      <ChevronDownIcon className={`w-3.5 h-3.5 text-amber-200/60 transition-transform duration-200 ${isMobileSocialOpen ? 'rotate-180 text-amber-300' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isMobileSocialOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-6 pr-2 py-1 space-y-1 bg-[#041610]/80 border border-amber-500/20 rounded-xl mt-1 overflow-hidden text-white"
                        >
                          <Link
                            to="/education"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <AcademicCapIcon className="w-4 h-4 text-blue-400" />
                            <span>{t("education_taleem") || (language === 'ur' ? 'تعلیم و رہنمائی' : language === 'ar' ? 'التعليم والإرشاد' : 'Education & Guidance')}</span>
                          </Link>
                          <Link
                            to="/social-work"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <img src="/icons/social-work.png" alt="Social Work" className="w-4 h-4 object-contain brightness-0 invert" />
                            <span>{t("social_work")}</span>
                          </Link>
                          <Link
                            to="/clippings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <NewspaperIcon className="w-4 h-4 text-amber-400" />
                            <span>Newspaper Clippings (اخباری تراشے)</span>
                          </Link>
                          <Link
                            to="/activities"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-emerald-900/50 transition-colors"
                          >
                            <EllipsisHorizontalCircleIcon className="w-4 h-4 text-purple-400" />
                            <span>{t("other")}</span>
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <NavItem to="/posts" label={t("updates")} icon={MegaphoneIcon} onClick={() => setIsMobileMenuOpen(false)} />
                  {isAuth && (
                      <NavItem to="/history" label={t("history")} icon={ClockIcon} onClick={() => setIsMobileMenuOpen(false)} />
                  )}
                </div>

                {/* Mobile Actions */}
                <div className="mt-6 pt-6 border-t border-amber-500/20 space-y-3">
                    {/* Inline Segmented Language Selector (English / اردو / العربية) */}
                    <div className="pb-1">
                      <LanguageSwitcher variant="segmented" />
                    </div>
                    <button
                        onClick={() => {
                            setIsDonationOpen(true);
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-900/40 to-pink-900/40 text-rose-200 font-bold text-sm border border-rose-500/40 shadow-xs"
                    >
                        <HandCoinIcon className="w-5 h-5 text-rose-400" />
                        <span style={language === 'ur' ? { fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq Web', 'Mehr', serif", fontSize: "1.05rem" } : undefined}>
                          {donateButtonText}
                        </span>
                    </button>
                    
                    {isAuth && (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 font-bold text-sm transition-colors border border-rose-500/30"
                        >
                            <ArrowRightOnRectangleIcon className="w-4 h-4" />
                            Log Out
                        </button>
                    )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* DONATION MODAL */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />
      {/* UNIVERSAL SEARCH MODAL (Ctrl + K) */}
      <UniversalSearchModal
        isOpen={isUniversalSearchOpen}
        onClose={() => setIsUniversalSearchOpen(false)}
      />
    </header>

    {/* MOBILE APP-STYLE FLOATING BOTTOM BAR */}
    <MobileBottomNav 
      config={mobileNavConfig} 
      onOpenSearch={() => setIsUniversalSearchOpen(true)} 
    />

    {/* FLOATING BOTTOM-RIGHT CONTINUE READING WIDGET */}
    {lastReadBook && showContinueReading && !isContinueReadingDismissed && !isReaderPage && (
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-20 md:bottom-6 end-4 sm:end-6 z-[60] flex items-center shadow-2xl rounded-full bg-slate-900/95 backdrop-blur-xl text-white border border-slate-700/80 p-1.5 pe-3 hover:scale-102 transition-transform group"
      >
        <Link
          to={`/read/${lastReadBook.bookId}?page=${lastReadBook.page || 1}`}
          className="flex items-center gap-2.5 min-w-0"
          title={`Resume reading ${lastReadBook.title} on page ${lastReadBook.page}`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
            <BookOpenIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col text-start min-w-0 max-w-[150px] sm:max-w-[210px]">
            <span className="text-[9.5px] uppercase font-extrabold text-emerald-400 tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Continue Reading
            </span>
            <span className="text-xs font-bold text-white truncate">
              {lastReadBook.title}
            </span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-700 shrink-0">
            p.{lastReadBook.page}
          </span>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsContinueReadingDismissed(true);
          }}
          className="ml-2 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Dismiss"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    )}
  </>
  );
};

export default UserNavbar;