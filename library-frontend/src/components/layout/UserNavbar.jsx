import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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
  SparklesIcon,
  UserGroupIcon,
  EllipsisHorizontalCircleIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  ShieldCheckIcon,
  BookmarkIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";

// --- COMPONENTS & HOOKS ---
import useAuth from "../../hooks/useAuth";
import NotificationBell from "../common/NotificationBell";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useLanguage } from "../../context/LanguageContext";
import DonationModal from "../donation/DonationModal";
import UniversalSearchModal from "../common/UniversalSearchModal";
import TopAnnouncementBar from "../common/TopAnnouncementBar";
import MobileBottomNav from "./MobileBottomNav";
import settingsService from "../../api/settingsService";

// âœ… CONFIG
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const MARKAZ_LOGO_URL = `${API_BASE_URL}/static/images/MarkazLogo.png`;

// ==========================================
// 1. SUB-COMPONENTS
// ==========================================

const NavItem = ({ to, label, icon: Icon, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => `
      relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-300
      ${
        isActive
          ? "text-[#002147] bg-blue-50/80"
          : "text-slate-500 hover:text-[#002147] hover:bg-slate-50"
      }
    `}
  >
    {({ isActive }) => (
      <>
        {Icon && (
          <Icon
            className={`h-4 w-4 transition-colors ${
              isActive ? "text-[#002147]" : "text-slate-400"
            }`}
          />
        )}
        <span>{label}</span>
        {isActive && (
          <motion.div
            layoutId="active-nav-pill"
            className="absolute inset-0 rounded-xl bg-blue-50/50 -z-10 border border-blue-100/50"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </>
    )}
  </NavLink>
);

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
  const roleName = typeof u.role === "object" ? (u.role.name || "") : String(u.role || "");
  const normalized = roleName.toLowerCase().trim();
  return ["admin", "superadmin", "super admin", "administrator"].includes(normalized);
};

// ==========================================
// 2. MAIN NAVBAR COMPONENT
// ==========================================

const UserNavbar = () => {
  const { user, isAuth, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false);
  const [isMobileSocialOpen, setIsMobileSocialOpen] = useState(false);
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);
  const [homepageSettings, setHomepageSettings] = useState(null);
  const [lastReadBook, setLastReadBook] = useState(null);
  const [isContinueReadingDismissed, setIsContinueReadingDismissed] = useState(false);
  
  const profileRef = useRef(null);
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
    setIsSocialDropdownOpen(false);
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (socialDropdownRef.current && !socialDropdownRef.current.contains(e.target)) {
        setIsSocialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      if (socialTimeoutRef.current) clearTimeout(socialTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    settingsService.getHomepageSettings().then((data) => {
      if (mounted) setHomepageSettings(data || {});
    }).catch(() => {
      if (mounted) setHomepageSettings({});
    });
    return () => {
      mounted = false;
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
  const donateButtonText = navbarConfig.donate_text || t("donate_btn") || "Donate";
  const logoSizePx = Number(navbarConfig.logo_size) || 42;

  const brandLogoUrl = homepageSettings?.site_logo_url
    ? (homepageSettings.site_logo_url.startsWith("http")
        ? homepageSettings.site_logo_url
        : `${API_BASE_URL}${homepageSettings.site_logo_url.startsWith("/") ? "" : "/"}${homepageSettings.site_logo_url}`)
    : MARKAZ_LOGO_URL;

  const brandTitle = homepageSettings?.site_title || t("markaz_title");
  const brandSub = homepageSettings?.site_subtitle || t("markaz_sub");
  const showSiteSubtitle = navbarConfig.show_subtitle !== false && homepageSettings?.show_site_subtitle !== false;

  return (
    <>
      <header className="sticky top-0 z-50 flex flex-col w-full font-sans shadow-xs">
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
        <nav className="bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-xs transition-all duration-300">
          <div className="app-shell-container">
            <div className="flex items-center justify-between min-h-[4.25rem] py-2 gap-2">
              
              {/* LOGO */}
              <div className="flex items-center min-w-0 flex-1 md:flex-none">
                <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img
                      src={brandLogoUrl}
                      alt="Logo"
                      style={{ height: `${logoSizePx}px`, width: `${logoSizePx}px` }}
                      className="relative z-10 object-contain bg-white rounded-full border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = MARKAZ_LOGO_URL;
                      }}
                    />
                  </div>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="font-extrabold text-sm sm:text-lg text-[#002147] tracking-tight truncate">
                      {brandTitle}
                    </span>
                    {showSiteSubtitle && brandSub && (
                      <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                        {brandSub}
                      </span>
                    )}
                  </div>
                </Link>
              </div>

              {/* DESKTOP NAV */}
              <div className="hidden md:flex items-center gap-1">
                {showHomeLink && <NavItem to="/" label={t("home")} icon={HomeIcon} />}
                {showLibraryLink && <NavItem to="/books" label={t("library")} icon={BookOpenIcon} />}
                {showFatawaLink && <NavItem to="/fatawa" label={t("fatawa")} icon={BookOpenIcon} />}
                {showGalleryLink && <NavItem to="/gallery" label={t("gallery")} icon={PhotoIcon} />}

                {/* MORE DROPDOWN (Contains About, Activities, Welfare, Clippings, Updates) */}
                {(showAboutLink || showActivitiesLink || showUpdatesLink) && (
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
                          ? "text-[var(--primary,#002147)] bg-blue-50/80"
                          : "text-slate-600 hover:text-[var(--primary,#002147)] hover:bg-slate-50"
                      }`}
                      aria-expanded={isSocialDropdownOpen}
                    >
                      <SparklesIcon className={`h-4 w-4 transition-colors ${isSocialDropdownOpen ? "text-[var(--primary,#002147)]" : "text-slate-400"}`} />
                      <span>{t("more") || "More"}</span>
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isSocialDropdownOpen ? "rotate-180 text-[var(--primary,#002147)]" : ""
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
                          className="absolute start-0 mt-1.5 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100/90 p-2 z-50 overflow-hidden ring-1 ring-black/5"
                        >
                          <div className="space-y-1">
                            {/* 1. About Us */}
                            {showAboutLink && (
                              <Link
                                to="/about"
                                onClick={() => setIsSocialDropdownOpen(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
                              >
                                <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-[#002147] group-hover:text-white transition-all shadow-sm">
                                  <InformationCircleIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col text-start">
                                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors">
                                    {t("about")}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    History & Mission
                                  </span>
                                </div>
                              </Link>
                            )}

                            {/* 2. Education (taleem) */}
                            <Link
                              to="/education"
                              onClick={() => setIsSocialDropdownOpen(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/80 transition-all duration-200 group"
                            >
                              <div className="h-9 w-9 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                <AcademicCapIcon className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col text-start">
                                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-900 transition-colors">
                                  {t("education_taleem")}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Taleem & Guidance
                                </span>
                              </div>
                            </Link>

                            {/* 3. Social Work */}
                            <Link
                              to="/social-work"
                              onClick={() => setIsSocialDropdownOpen(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-50/80 transition-all duration-200 group"
                            >
                              <div className="h-9 w-9 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 transition-all shadow-sm p-1.5">
                                <img src="/icons/social-work.png" alt="Social Work" className="w-full h-full object-contain group-hover:brightness-0 group-hover:invert transition-all" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">
                                  {t("social_work")}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Welfare & Relief Drives
                                </span>
                              </div>
                            </Link>

                            {/* 4. Newspaper Clippings */}
                            <Link
                              to="/clippings"
                              onClick={() => setIsSocialDropdownOpen(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50/80 transition-all duration-200 group"
                            >
                              <div className="h-9 w-9 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                                <NewspaperIcon className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col text-start">
                                <span className="text-xs font-bold text-slate-800 group-hover:text-amber-900 transition-colors">
                                  Newspaper Clippings
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  اخباری تراشے و پریس کٹنگس
                                </span>
                              </div>
                            </Link>

                            {/* 5. Activities / Other */}
                            {showActivitiesLink && (
                              <Link
                                to="/activities"
                                onClick={() => setIsSocialDropdownOpen(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50/80 transition-all duration-200 group"
                              >
                                <div className="h-9 w-9 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                                  <EllipsisHorizontalCircleIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col text-start">
                                  <span className="text-xs font-bold text-slate-800 group-hover:text-purple-900 transition-colors">
                                    {t("activities")}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
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
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50/80 transition-all duration-200 group"
                              >
                                <div className="h-9 w-9 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm">
                                  <MegaphoneIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col text-start">
                                  <span className="text-xs font-bold text-slate-800 group-hover:text-rose-900 transition-colors">
                                    {t("updates")}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
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
              <div className="hidden md:flex items-center justify-end gap-2 min-w-0 md:flex-1 lg:flex-none">
                
                {/* Compact Icon-Only Search Trigger (Expand-on-click via modal) */}
                {showSearchPill && (
                  <button
                    type="button"
                    onClick={() => setIsUniversalSearchOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100/80 hover:bg-white text-slate-600 hover:text-[#002147] border border-slate-200/80 hover:border-blue-300 text-xs transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer group"
                    title={t("search_placeholder") + " (Ctrl+K)"}
                  >
                    <MagnifyingGlassIcon className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="hidden xl:inline text-[11px] text-slate-400 font-semibold group-hover:text-slate-600">
                      Search
                    </span>
                    <kbd className="hidden xl:inline-flex items-center px-1 py-0.2 text-[8px] font-bold text-slate-400 bg-white border border-slate-200 rounded">
                      ⌘K
                    </kbd>
                  </button>
                )}

                {/* Donate Button */}
                {showDonateButton && (
                  <button
                    onClick={() => setIsDonationOpen(true)}
                    className="group flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 rounded-full hover:from-rose-600 hover:to-pink-600 hover:text-white transition-all duration-300 border border-rose-200/80 hover:border-transparent shadow-2xs hover:shadow-xs cursor-pointer"
                    title={donateButtonText}
                  >
                    <HeartIcon className="w-3 h-3 text-rose-500 group-hover:text-white group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold">{donateButtonText}</span>
                  </button>
                )}

                {/* VISUALLY UNIFIED ACCOUNT & CONTROLS CLUSTER */}
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-100/70 border border-slate-200/80 shadow-2xs">
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
                          className="flex items-center gap-1 p-0.5 rounded-full hover:bg-white transition-all group cursor-pointer focus:outline-none"
                          aria-expanded={isProfileOpen}
                        >
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#002147] to-blue-900 text-white flex items-center justify-center border border-white shadow-xs font-extrabold text-[11px]">
                            {user?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                          <ChevronDownIcon className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-[#002147]' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isProfileOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.96 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute end-0 mt-2 w-60 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/90 p-1.5 z-[100] overflow-hidden ring-1 ring-black/5"
                            >
                              {/* User Header Info Card */}
                              <div className="px-3.5 py-3 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-100 mb-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Signed in as</span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    isUserAdmin(user)
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {getRoleDisplayName(user)}
                                  </span>
                                </div>
                                <p className="text-sm font-extrabold text-[#002147] truncate">{user?.username}</p>
                                {user?.email && (
                                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
                                )}
                              </div>

                              {/* Navigation Items in Dropdown */}
                              <div className="space-y-0.5">
                            {user && isUserAdmin(user) && (
                              <Link
                                to="/admin/dashboard"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/60 rounded-xl hover:bg-indigo-100 transition-colors"
                              >
                                <ShieldCheckIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span>Admin Dashboard</span>
                              </Link>
                            )}
                            <Link
                              to="/profile"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-900 transition-colors"
                            >
                              <UserCircleIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span>{t("profile") || "My Profile"}</span>
                            </Link>
                            <Link
                              to="/books"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-900 transition-colors"
                            >
                              <BookmarkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span>My Saved / History</span>
                            </Link>
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 rounded-xl hover:bg-rose-50 transition-colors text-start cursor-pointer mt-1 border-t border-slate-100"
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
                  className="flex items-center gap-1 bg-[#002147] hover:bg-[#003366] text-white px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200"
                >
                  <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5" />
                  <span>{t("login")}</span>
                </Link>
              )}
            </div>
          </div>

            {/* MOBILE TOGGLE, SEARCH & LANGUAGE */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:hidden">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => setIsUniversalSearchOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                title="Universal Search"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
              {isAuth && <NotificationBell />}
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
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
              className="md:hidden bg-white border-t border-slate-100 overflow-hidden shadow-2xl"
            >
              <div className="px-4 py-6 space-y-1">
                
                {/* User Info / Login Mobile */}
                <div className="mb-6 pb-6 border-b border-slate-100">
                    {isAuth ? (
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                            <div className="h-10 w-10 rounded-full bg-[#002147] text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{user?.username}</p>
                                <p className="text-xs text-slate-500">{getRoleDisplayName(user)}</p>
                            </div>
                            {user && isUserAdmin(user) && (
                              <Link
                                to="/admin/dashboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shadow-xs border border-indigo-100"
                                title="Admin Dashboard"
                              >
                                <ShieldCheckIcon className="w-5 h-5" />
                              </Link>
                            )}
                            <Link
                              to="/profile"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="p-2 bg-white text-blue-600 rounded-lg shadow-xs border border-slate-100"
                              title="My Profile"
                            >
                                <UserCircleIcon className="w-5 h-5" />
                            </Link>
                        </div>
                    ) : (
                        // âœ… ONLY LOGIN BUTTON MOBILE (Register Removed)
                        <Link
                            to="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-[#002147] text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform"
                        >
                            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                            Log In to Portal
                        </Link>
                    )}
                </div>

                {/* Mobile Links */}
                <div className="space-y-1">
                  <NavItem to="/" label={t("home")} icon={HomeIcon} onClick={() => setIsMobileMenuOpen(false)} />
                  <NavItem to="/books" label={t("library")} icon={BookOpenIcon} onClick={() => setIsMobileMenuOpen(false)} />
                  {showAboutLink ? <NavItem to="/about" label={t("about")} icon={InformationCircleIcon} onClick={() => setIsMobileMenuOpen(false)} /> : null}
                  <NavItem to="/gallery" label={t("gallery")} icon={PhotoIcon} onClick={() => setIsMobileMenuOpen(false)} />
                  {showFatawaLink ? <NavItem to="/fatawa" label={t("fatawa")} icon={BookOpenIcon} onClick={() => setIsMobileMenuOpen(false)} /> : null}
                  
                  {/* Mobile Activities Accordion */}
                  <div className="rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsMobileSocialOpen((p) => !p)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold text-slate-600 hover:text-[#002147] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4 text-slate-400" />
                        <span>{t("activities")}</span>
                      </div>
                      <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMobileSocialOpen ? 'rotate-180 text-[#002147]' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isMobileSocialOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-6 pr-2 py-1 space-y-1 bg-slate-50/70 rounded-xl mt-1 overflow-hidden"
                        >
                          <Link
                            to="/education"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-900 hover:bg-white transition-colors"
                          >
                            <AcademicCapIcon className="w-4 h-4 text-blue-600" />
                            <span>{t("education_taleem")}</span>
                          </Link>
                          <Link
                            to="/social-work"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-900 hover:bg-white transition-colors"
                          >
                            <img src="/icons/social-work.png" alt="Social Work" className="w-4 h-4 object-contain" />
                            <span>{t("social_work")}</span>
                          </Link>
                          <Link
                            to="/clippings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-amber-900 hover:bg-white transition-colors"
                          >
                            <NewspaperIcon className="w-4 h-4 text-amber-600" />
                            <span>Newspaper Clippings (اخباری تراشے)</span>
                          </Link>
                          <Link
                            to="/activities"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-purple-900 hover:bg-white transition-colors"
                          >
                            <EllipsisHorizontalCircleIcon className="w-4 h-4 text-purple-600" />
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
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    {/* Inline Segmented Language Selector (English / اردو / العربية) */}
                    <div className="pb-1">
                      <LanguageSwitcher variant="segmented" />
                    </div>
                    <button
                        onClick={() => {
                            setIsDonationOpen(true);
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100"
                    >
                        <HeartIcon className="w-4 h-4" />
                        Donate
                    </button>
                    
                    {isAuth && (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-bold text-sm transition-colors"
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
    {lastReadBook && showContinueReading && !isContinueReadingDismissed && (
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