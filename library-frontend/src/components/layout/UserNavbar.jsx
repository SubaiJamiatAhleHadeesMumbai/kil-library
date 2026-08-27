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
  BookmarkIcon
} from "@heroicons/react/24/outline";

// --- COMPONENTS & HOOKS ---
import useAuth from "../../hooks/useAuth";
import NotificationBell from "../common/NotificationBell";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useLanguage } from "../../context/LanguageContext";
import DonationModal from "../donation/DonationModal";
import UniversalSearchModal from "../common/UniversalSearchModal";
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
  
  const profileRef = useRef(null);
  const socialDropdownRef = useRef(null);
  const socialTimeoutRef = useRef(null);

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
  const showAboutLink = sectionVisibility.about?.enabled !== false;
  const showFatawaLink = sectionVisibility.fatawa?.enabled !== false;

  const brandLogoUrl = homepageSettings?.site_logo_url
    ? (homepageSettings.site_logo_url.startsWith("http")
        ? homepageSettings.site_logo_url
        : `${API_BASE_URL}${homepageSettings.site_logo_url.startsWith("/") ? "" : "/"}${homepageSettings.site_logo_url}`)
    : MARKAZ_LOGO_URL;

  const brandTitle = homepageSettings?.site_title || t("markaz_title");
  const brandSub = homepageSettings?.site_subtitle || t("markaz_sub");

  return (
    <header className="sticky top-0 z-50 flex flex-col w-full font-sans shadow-xs">
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
                    className="relative z-10 w-9 h-9 sm:w-11 sm:h-11 object-contain bg-white rounded-full border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300"
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
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                    {brandSub}
                  </span>
                </div>
              </Link>
            </div>

            {/* DESKTOP NAV */}
            <div className="hidden md:flex items-center space-x-1">
              <NavItem to="/" label={t("home")} icon={HomeIcon} />
              <NavItem to="/books" label={t("library")} icon={BookOpenIcon} />
              {showAboutLink ? <NavItem to="/about" label={t("about")} icon={InformationCircleIcon} /> : null}
              {showFatawaLink ? <NavItem to="/fatawa" label={t("fatawa")} icon={BookOpenIcon} /> : null}

              {/* ACTIVITIES DROPDOWN (Smooth Hover) */}
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
                      ? "text-[#002147] bg-blue-50/80"
                      : "text-slate-600 hover:text-[#002147] hover:bg-slate-50"
                  }`}
                  aria-expanded={isSocialDropdownOpen}
                >
                  <SparklesIcon className={`h-4 w-4 transition-colors ${isSocialDropdownOpen ? "text-[#002147]" : "text-slate-400"}`} />
                  <span>{t("activities")}</span>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isSocialDropdownOpen ? "rotate-180 text-[#002147]" : ""
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
                      className="absolute left-0 mt-1.5 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100/90 p-2 z-50 overflow-hidden ring-1 ring-black/5"
                    >
                      <div className="space-y-1">
                        {/* 1. Education (taleem) */}
                        <Link
                          to="/education"
                          onClick={() => setIsSocialDropdownOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/80 transition-all duration-200 group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            <AcademicCapIcon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-900 transition-colors">
                              {t("education_taleem")}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Taleem & Guidance
                            </span>
                          </div>
                        </Link>

                        {/* 2. Social Work */}
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

                        {/* 3. Newspaper Clippings */}
                        <Link
                          to="/clippings"
                          onClick={() => setIsSocialDropdownOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50/80 transition-all duration-200 group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                            <NewspaperIcon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-amber-900 transition-colors">
                              Newspaper Clippings
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              اخباری تراشے و پریس کٹنگس
                            </span>
                          </div>
                        </Link>

                        {/* 4. Other */}
                        <Link
                          to="/activities"
                          onClick={() => setIsSocialDropdownOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50/80 transition-all duration-200 group"
                        >
                          <div className="h-9 w-9 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                            <EllipsisHorizontalCircleIcon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-purple-900 transition-colors">
                              {t("other")}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Other Activities & Events
                            </span>
                          </div>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <NavItem to="/posts" label={t("updates")} icon={MegaphoneIcon} />
            </div>

            {/* RIGHT ACTIONS */}
            <div className="hidden md:flex items-center justify-end gap-1.5 lg:gap-2 min-w-0 md:flex-1 lg:flex-none">
              
              {/* Universal Search Trigger (Desktop: Sleek Search Pill) */}
              <button
                type="button"
                onClick={() => setIsUniversalSearchOpen(true)}
                className="hidden xl:flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-white text-slate-500 hover:text-[#002147] border border-slate-200/80 hover:border-blue-300 text-xs transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer group w-36 2xl:w-44"
                title={t("search_placeholder")}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="font-medium text-slate-400 group-hover:text-slate-600 truncate text-[11px]">
                    {t("search_btn") || "Search"}
                  </span>
                </div>
                <kbd className="hidden 2xl:inline-flex items-center px-1 py-0.2 text-[8.5px] font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                  Ctrl K
                </kbd>
              </button>

              {/* Compact Search Trigger for Tablets / Smaller Desktops */}
              <button
                type="button"
                onClick={() => setIsUniversalSearchOpen(true)}
                className="xl:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-50/80 hover:bg-blue-100 text-[#002147] border border-blue-200/80 font-bold text-[11px] transition-all duration-200 shadow-2xs cursor-pointer group"
                title={t("search_placeholder")}
              >
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-blue-700 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[11px]">{t("search_btn")}</span>
              </button>

              {/* Language Switcher (Urdu, Arabic, English) */}
              <LanguageSwitcher />

              {/* Donate Button */}
              <button
                onClick={() => setIsDonationOpen(true)}
                className="group flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 rounded-full hover:from-rose-600 hover:to-pink-600 hover:text-white transition-all duration-300 border border-rose-200/80 hover:border-transparent shadow-2xs hover:shadow-xs cursor-pointer"
                title={t("donate")}
              >
                <HeartIcon className="w-3 h-3 text-rose-500 group-hover:text-white group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">{t("donate")}</span>
              </button>

              {/* Auth Logic (Logged-in vs Logged-out) */}
              {isAuth ? (
                <div className="flex items-center gap-2 ps-1.5 border-s border-slate-200">
                  <NotificationBell />

                  {/* Profile Dropdown */}
                  <div ref={profileRef} className="relative">
                    <button
                      onClick={() => setIsProfileOpen((p) => !p)}
                      className="flex items-center gap-1.5 p-0.5 rounded-full hover:bg-slate-100/80 border border-transparent hover:border-slate-200/80 transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      aria-expanded={isProfileOpen}
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#002147] to-blue-900 text-white flex items-center justify-center border border-white shadow-xs font-extrabold text-[11px]">
                        {user?.username?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="hidden lg:flex flex-col items-start leading-none pe-1">
                        <span className="text-[11px] font-bold text-[#002147] max-w-[80px] truncate">
                          {user?.username || "User"}
                        </span>
                        <span className="text-[8.5px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                          {user?.role === "Admin" || user?.role === "admin" || user?.role === "superadmin" ? "Admin" : "Member"}
                        </span>
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
                                user?.role === 'Admin' || user?.role === 'admin' || user?.role === 'superadmin'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {user?.role || "Member"}
                              </span>
                            </div>
                            <p className="text-sm font-extrabold text-[#002147] truncate">{user?.username}</p>
                            {user?.email && (
                              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
                            )}
                          </div>

                          {/* Navigation Items in Dropdown */}
                          <div className="space-y-0.5">
                            {user && (user.role === 'Admin' || user.role === 'admin' || user.role === 'superadmin') && (
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
                              to="/user-library"
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
                </div>
              ) : (
                <div className="flex items-center gap-2 ps-1.5 border-s border-slate-200">
                  <Link
                    to="/login"
                    className="flex items-center gap-1 bg-[#002147] hover:bg-[#003366] text-white px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5" />
                    <span>{t("login")}</span>
                  </Link>
                </div>
              )}
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
                                <p className="text-xs text-slate-500">{user?.role || "Active Member"}</p>
                            </div>
                            {user && (user.role === 'Admin' || user.role === 'admin' || user.role === 'superadmin') && (
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
  );
};

export default UserNavbar;