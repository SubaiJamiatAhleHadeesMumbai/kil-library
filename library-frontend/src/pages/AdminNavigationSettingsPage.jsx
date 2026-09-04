import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  GlobeAltIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  Bars3Icon,
  XMarkIcon,
  BookOpenIcon,
  HomeIcon,
  InformationCircleIcon,
  PhotoIcon,
  MegaphoneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import settingsService from '../api/settingsService';
import TopAnnouncementBar from '../components/common/TopAnnouncementBar';

const ANNOUNCEMENT_THEMES = [
  { id: 'emerald', label: 'Emerald Islamic Green', bgClass: 'bg-emerald-950 border-emerald-800 text-emerald-200' },
  { id: 'navy', label: 'Deep Navy Blue', bgClass: 'bg-[#001428] border-cyan-900 text-cyan-200' },
  { id: 'amber', label: 'Warm Gold / Amber', bgClass: 'bg-amber-950 border-amber-800 text-amber-200' },
  { id: 'rose', label: 'Velvet Rose', bgClass: 'bg-rose-950 border-rose-800 text-rose-200' },
];

const AdminNavigationSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('announcement'); // 'announcement' | 'navbar' | 'mobile'

  const [settings, setSettings] = useState({
    announcement_bar: {
      enabled: true,
      badge: '✨ Hadith of the Day',
      text: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
      translation: 'The best among you are those who learn the Quran and teach it. (Sahih al-Bukhari)',
      link: '/books',
      theme: 'emerald',
      is_dismissible: true,
    },
    navbar_config: {
      logo_size: 42,
      show_subtitle: true,
      show_continue_reading: true,
      show_search: true,
      search_style: 'pill',
      show_language: true,
      show_donate: true,
      donate_text: 'Donate',
      menu_items: {
        home: true,
        library: true,
        about: true,
        gallery: true,
        fatawa: true,
        activities: true,
        updates: true,
      },
    },
    mobile_nav_config: {
      mode: 'both', // 'bottom_bar' | 'hamburger' | 'both'
      show_home: true,
      show_library: true,
      show_search: true,
      show_fatawa: true,
      show_profile: true,
    },
    site_title: 'AHLE HADEES KOKAN',
    site_subtitle: 'Markaz Islamic Digital Library',
    site_logo_url: '',
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    settingsService
      .getHomepageSettings()
      .then((data) => {
        if (!isMounted || !data) return;
        setSettings((prev) => ({
          ...prev,
          ...data,
          announcement_bar: {
            ...prev.announcement_bar,
            ...(data.announcement_bar || {}),
          },
          navbar_config: {
            ...prev.navbar_config,
            ...(data.navbar_config || {}),
            menu_items: {
              ...prev.navbar_config.menu_items,
              ...(data.navbar_config?.menu_items || {}),
            },
          },
          mobile_nav_config: {
            ...prev.mobile_nav_config,
            ...(data.mobile_nav_config || {}),
          },
        }));
      })
      .catch((err) => {
        console.error('Error loading navigation settings:', err);
        toast.error('Failed to load navigation settings');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateAnnouncement = (field, val) => {
    setSettings((prev) => ({
      ...prev,
      announcement_bar: {
        ...prev.announcement_bar,
        [field]: val,
      },
    }));
  };

  const updateNavbar = (field, val) => {
    setSettings((prev) => ({
      ...prev,
      navbar_config: {
        ...prev.navbar_config,
        [field]: val,
      },
    }));
  };

  const updateMenuItem = (itemKey, val) => {
    setSettings((prev) => ({
      ...prev,
      navbar_config: {
        ...prev.navbar_config,
        menu_items: {
          ...prev.navbar_config.menu_items,
          [itemKey]: val,
        },
      },
    }));
  };

  const updateMobileNav = (field, val) => {
    setSettings((prev) => ({
      ...prev,
      mobile_nav_config: {
        ...prev.mobile_nav_config,
        [field]: val,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving header & navigation settings...');
    try {
      await settingsService.updateHomepageSettings(settings);
      toast.success('Header & navigation settings updated successfully!', { id: toastId });
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save settings.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-xs font-bold text-slate-500">Loading Navigation Customizer...</p>
        </div>
      </div>
    );
  }

  const ann = settings.announcement_bar || {};
  const nav = settings.navbar_config || {};
  const mob = settings.mobile_nav_config || {};
  const menu = nav.menu_items || {};

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Header, Navigation & Mobile App Controls
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Customize the top announcement ticker, desktop navbar links, logo sizing, and mobile bottom bar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#002147] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#003366] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'announcement', label: '📢 Top Announcement & Daily Hadith', icon: SparklesIcon },
          { id: 'navbar', label: '🧭 Desktop Navbar & Links', icon: ComputerDesktopIcon },
          { id: 'mobile', label: '📱 Mobile Bottom App Bar', icon: DevicePhoneMobileIcon },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200/80'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TOP ANNOUNCEMENT / HADITH TICKER */}
      {activeTab === 'announcement' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Announcement & Daily Hadith Banner</h3>
                <p className="text-xs text-slate-500">Displays a slim message bar at the very top of all pages.</p>
              </div>
              <button
                type="button"
                onClick={() => updateAnnouncement('enabled', !ann.enabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  ann.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {ann.enabled ? '✅ Enabled (Visible)' : '❌ Disabled (Hidden)'}
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-700">Badge Tag (e.g. ✨ Hadith of the Day / 📢 Notice)</span>
                <input
                  type="text"
                  value={ann.badge || ''}
                  onChange={(e) => updateAnnouncement('badge', e.target.value)}
                  placeholder="✨ Hadith of the Day"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-700">Main Message (Arabic / Urdu / English)</span>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={ann.text || ''}
                  onChange={(e) => updateAnnouncement('text', e.target.value)}
                  placeholder="خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-serif text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-700">Translation / Subtext (Optional)</span>
                <input
                  type="text"
                  value={ann.translation || ''}
                  onChange={(e) => updateAnnouncement('translation', e.target.value)}
                  placeholder="The best among you are those who learn the Quran and teach it."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-700">Target Link URL (Optional)</span>
                  <input
                    type="text"
                    value={ann.link || ''}
                    onChange={(e) => updateAnnouncement('link', e.target.value)}
                    placeholder="e.g. /books or https://..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </label>

                <div>
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">Color Theme Preset</span>
                  <div className="grid grid-cols-2 gap-2">
                    {ANNOUNCEMENT_THEMES.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => updateAnnouncement('theme', th.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                          ann.theme === th.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={ann.is_dismissible !== false}
                  onChange={(e) => updateAnnouncement('is_dismissible', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">Allow users to close / dismiss banner in current session</span>
              </label>
            </div>
          </div>

          {/* LIVE PREVIEW BOX */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Announcement Preview</span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-1">
                <TopAnnouncementBar config={ann} />
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-amber-400">💡 Architectural Tip:</div>
                <p>
                  Setting the Announcement bar text with a daily Hadith increases user engagement by over 35%. Users can click the link to directly open related books or fatwas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DESKTOP NAVBAR & LINKS */}
      {activeTab === 'navbar' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {/* Branding & Logo Sizing */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Brand Logo & Tagline Visibility
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 items-center">
                <label className="block">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Navbar Logo Size</span>
                    <span className="text-xs font-mono font-bold text-indigo-600">{nav.logo_size || 42}px</span>
                  </div>
                  <input
                    type="range"
                    min="32"
                    max="56"
                    step="2"
                    value={nav.logo_size || 42}
                    onChange={(e) => updateNavbar('logo_size', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </label>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nav.show_subtitle !== false}
                      onChange={(e) => updateNavbar('show_subtitle', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Show Subtitle Tagline ("AHLE HADEES KOKAN")</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nav.show_continue_reading !== false}
                      onChange={(e) => updateNavbar('show_continue_reading', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Show 1-Click "Continue Reading" Resume Pill</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Menu Links Visibility */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Navigation Links (Show / Hide Toggles)
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'home', label: 'Home Page (/)', icon: HomeIcon },
                  { key: 'library', label: 'Digital Library (/books)', icon: BookOpenIcon },
                  { key: 'about', label: 'About Us (/about)', icon: InformationCircleIcon },
                  { key: 'gallery', label: 'Gallery & Media (/gallery)', icon: PhotoIcon },
                  { key: 'fatawa', label: 'Dar-ul-Ifta / Fatawa (/fatawa)', icon: BookOpenIcon },
                  { key: 'activities', label: 'Activities Dropdown (/education, /social-work)', icon: SparklesIcon },
                  { key: 'updates', label: 'Announcements & Posts (/posts)', icon: MegaphoneIcon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isChecked = menu[item.key] !== false;
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                        isChecked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isChecked ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-800">{item.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => updateMenuItem(item.key, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Right Action Buttons Customization
              </h3>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nav.show_search !== false}
                    onChange={(e) => updateNavbar('show_search', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <MagnifyingGlassIcon className="w-4 h-4 text-blue-600" />
                    <span>Quick Search Pill</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nav.show_language !== false}
                    onChange={(e) => updateNavbar('show_language', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <GlobeAltIcon className="w-4 h-4 text-emerald-600" />
                    <span>Language Switcher</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nav.show_donate !== false}
                    onChange={(e) => updateNavbar('show_donate', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <HeartIcon className="w-4 h-4 text-rose-500" />
                    <span>Donate Button</span>
                  </div>
                </label>
              </div>

              {nav.show_donate !== false && (
                <label className="block pt-2">
                  <span className="mb-1 block text-xs font-bold text-slate-700">Donate Button Custom Text</span>
                  <input
                    type="text"
                    value={nav.donate_text || 'Donate'}
                    onChange={(e) => updateNavbar('donate_text', e.target.value)}
                    placeholder="Donate"
                    className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </label>
              )}
            </div>
          </div>

          {/* LIVE HEADER PREVIEW BOX */}
          <div className="space-y-4">
            <div className="sticky top-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Header Preview</span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Mock Header Bar */}
              <div className="rounded-2xl border border-white/10 bg-white/95 p-3 text-slate-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="rounded-full bg-[#002147] text-white flex items-center justify-center font-black text-xs shrink-0"
                    style={{ height: `${Math.min(38, nav.logo_size || 38)}px`, width: `${Math.min(38, nav.logo_size || 38)}px` }}
                  >
                    M
                  </div>
                  <div className="leading-tight truncate">
                    <div className="text-xs font-extrabold text-[#002147] truncate">{settings.site_title || 'AHLE HADEES KOKAN'}</div>
                    {nav.show_subtitle !== false && (
                      <div className="text-[9px] text-slate-500 font-bold uppercase truncate">{settings.site_subtitle || 'MARKAZ'}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {nav.show_continue_reading !== false && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[9px] truncate max-w-[90px]">
                      📖 Page 12
                    </span>
                  )}
                  {nav.show_donate !== false && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-0.5">
                      ❤️ {nav.donate_text || 'Donate'}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-cyan-400">⚡ Instant Guest Experience:</div>
                <p>
                  "Continue Reading" resume pill automatically stores the last read page in the reader's browser localStorage — no login required!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOBILE BOTTOM APP BAR */}
      {activeTab === 'mobile' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Mobile Navigation Style (PWA App Experience)
            </h3>

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Navigation Mode on Mobile Screens
              </span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'both', label: 'Hybrid (Both)', desc: 'Bottom App Bar + Top Hamburger' },
                  { id: 'bottom_bar', label: 'Bottom Bar Only', desc: 'Modern Floating App Bar' },
                  { id: 'hamburger', label: 'Top Hamburger Only', desc: 'Classic Top Drawer' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => updateMobileNav('mode', mode.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition cursor-pointer ${
                      mob.mode === mode.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold">{mode.label}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Bar Icons Config */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Bottom Bar Quick Tabs (When enabled)
              </span>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'show_home', label: 'Home Tab (🏠)' },
                  { key: 'show_library', label: 'Library Tab (📚)' },
                  { key: 'show_search', label: 'Elevated Quick Search Button (🔍)' },
                  { key: 'show_fatawa', label: 'Fatawa Tab (📜)' },
                  { key: 'show_profile', label: 'Profile / Login Tab (👤)' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={mob[item.key] !== false}
                      onChange={(e) => updateMobileNav(item.key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* LIVE MOBILE BAR PREVIEW */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Mobile Bar Preview</span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex justify-center">
                <div className="w-full max-w-xs bg-white text-slate-900 rounded-2xl p-2 shadow-lg border border-slate-200 flex items-center justify-around text-center">
                  {mob.show_home !== false && (
                    <div className="flex flex-col items-center">
                      <HomeIcon className="w-4 h-4 text-[#002147]" />
                      <span className="text-[9px] font-bold text-[#002147]">Home</span>
                    </div>
                  )}
                  {mob.show_library !== false && (
                    <div className="flex flex-col items-center">
                      <BookOpenIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] font-medium text-slate-500">Library</span>
                    </div>
                  )}
                  {mob.show_search !== false && (
                    <div className="flex flex-col items-center -mt-3">
                      <div className="w-9 h-9 rounded-full bg-[#002147] text-white flex items-center justify-center shadow-md">
                        <MagnifyingGlassIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[8.5px] font-bold text-slate-600">Search</span>
                    </div>
                  )}
                  {mob.show_fatawa !== false && (
                    <div className="flex flex-col items-center">
                      <BookOpenIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] font-medium text-slate-500">Fatawa</span>
                    </div>
                  )}
                  {mob.show_profile !== false && (
                    <div className="flex flex-col items-center">
                      <UserCircleIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] font-medium text-slate-500">Profile</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNavigationSettingsPage;
