import React, { useEffect, useMemo, useState } from 'react';
import {
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  MoonIcon,
  SunIcon,
  PaintBrushIcon,
  LanguageIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import apiClient from '../../api/apiClient';
import settingsService from '../../api/settingsService';
import useAuth from '../../hooks/useAuth';
import GlobalSearchModal from '../book/GlobalSearchModal';
import { bookService } from '../../api/bookService';
import { FALLBACK_COVER } from '../../utils/cover';
import AppPageLoader from '../common/loaders/AppPageLoader';
import DeepSearchCustomizer from './DeepSearchCustomizer';

const controlPanels = [
  {
    key: 'branding',
    title: 'Theme + Branding',
    description: 'Visual style, palette, fonts, background & identity.',
    icon: PaintBrushIcon,
    requiredPermissions: ['HOMEPAGE_BRANDING_MANAGE'],
  },
  {
    key: 'content',
    title: 'Section Content',
    description: 'Headings, text copy, ordering & featured books.',
    icon: PencilSquareIcon,
    requiredPermissions: ['HOMEPAGE_CONTENT_MANAGE'],
  },
  {
    key: 'layout',
    title: 'Layout Extras',
    description: 'Toggle optional modules and auxiliary blocks.',
    icon: AdjustmentsHorizontalIcon,
    requiredPermissions: ['HOMEPAGE_LAYOUT_MANAGE'],
  },
  {
    key: 'visibility',
    title: 'Section Visibility',
    description: 'Show or hide sections from the public landing page.',
    icon: EyeIcon,
    requiredPermissions: ['HOMEPAGE_VISIBILITY_MANAGE'],
  },
  {
    key: 'loader',
    title: 'Splash & Loader',
    description: 'Islamic Splash, Skeleton Shimmer, Festive Modes & Live Test.',
    icon: SparklesIcon,
    requiredPermissions: ['HOMEPAGE_BRANDING_MANAGE', 'HOMEPAGE_LAYOUT_MANAGE'],
  },
  {
    key: 'deep_search',
    title: 'Deep Search Engine',
    description: 'Trilingual text indexing, caching, citations & search controls.',
    icon: MagnifyingGlassIcon,
    requiredPermissions: ['HOMEPAGE_LAYOUT_MANAGE', 'BOOK_MANAGE', 'HOMEPAGE_SEARCH_MANAGE'],
  },
];

const defaultSections = [
  { key: 'hero', label: 'Hero / Welcome Banner', description: 'Main landing intro and spotlight area' },
  { key: 'bento_hub', label: 'Kokan Hub (4-Bento Portals)', description: 'Quick access cards to Library, Press Clippings, Fatawa & Social Welfare' },
  { key: 'stats_impact', label: 'Live Impact Stats Counter', description: 'Real-time metrics for Books, Clippings, Fatawa and Active Readers' },
  { key: 'newspaper_clippings', label: 'Newspaper Press Clippings', description: 'Recent press releases and published news coverage from Roznama Inquilab, Urdu Times, etc.' },
  { key: 'posters', label: 'Media & Campaign Posters', description: 'Rotating poster carousel and campaign visuals' },
  { key: 'posts', label: 'Announcements & Updates', description: 'News, events and official announcements' },
  { key: 'education_social_activity', label: 'Education, Social & Activities', description: 'Community education, relief work and Markaz projects' },
  { key: 'fatawa', label: 'Darul Ifta & Fatawa Showcase', description: 'Public Islamic fatawa questions and answers highlight' },
  { key: 'gallery', label: 'Photo & Event Gallery', description: 'Event photos and activities showcase' },
  { key: 'whatsapp_community', label: 'WhatsApp & Social Community', description: '1-Click official WhatsApp and Telegram community connect card' },
  { key: 'donation', label: 'Donation & Support Module', description: 'Support, Sadaqah and Taawun block' },
  { key: 'about', label: 'About Markaz Section', description: 'Introduction to Markaz Jamiat Ahle Hadees Kokan' },
];

const buildOrderedSections = (sections = {}) => {
  return defaultSections
    .map((section) => ({
      ...section,
      enabled: Boolean(sections?.[section.key]?.enabled),
      title: sections?.[section.key]?.title || section.label,
      order: Number.isFinite(Number(sections?.[section.key]?.order)) ? Number(sections?.[section.key]?.order) : 0,
    }))
    .sort((left, right) => {
      const orderDifference = left.order - right.order;
      if (orderDifference !== 0) return orderDifference;
      return defaultSections.findIndex((section) => section.key === left.key) - defaultSections.findIndex((section) => section.key === right.key);
    });
};

const HomepageCustomizer = () => {
  const [settings, setSettings] = useState({
    theme: 'aurora',
    theme_palette: 'indigo',
    accent_color: '#007ACC',
    heading_style: 'serif',
    background_style: 'aurora',
    button_style: 'solid',
    spacing_scale: 'comfortable',
    ui_feel: 'premium',
    language: 'en',
    hero_badge: '',
    site_title: '',
    site_subtitle: '',
    show_site_subtitle: true,
    site_logo_url: '',
    sections: {},
    layout: {},
    loader_config: {
      loader_style: 'hybrid', // 'islamic_splash' | 'skeleton_shimmer' | 'hybrid'
      splash_theme: 'navy', // 'navy' | 'black' | 'ivory'
      occasion_theme: 'default', // 'default' | 'ramadan' | 'eid' | 'conference'
      show_quotes: true,
      splash_duration: 1800,
    },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [origSettings, setOrigSettings] = useState(null);
  const [activePanel, setActivePanel] = useState('branding');
  const [previewLoaderModalOpen, setPreviewLoaderModalOpen] = useState(false);
  const [previewLoaderStyle, setPreviewLoaderStyle] = useState('islamic_splash');
  const [previewLang, setPreviewLang] = useState('en');

  const updateLoaderConfig = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      loader_config: {
        ...(prev.loader_config || {}),
        [key]: value,
      },
    }));
  };

  const { user } = useAuth();

  const hasPermission = (permCode) => {
    if (!user) return false;
    const roleName = user.role?.name || user.role || '';
    const normalizedRole = String(roleName).toLowerCase();
    if (['admin', 'superadmin', 'administrator'].includes(normalizedRole)) return true;
    if (!permCode) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permCode);
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const [featuredBooksList, setFeaturedBooksList] = useState([]);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    const toastId = toast.loading('Uploading brand logo...');
    setLogoUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedUrl = res.data?.url;
      if (!uploadedUrl) throw new Error('Upload did not return a valid image URL');

      updateContentField('site_logo_url', uploadedUrl);
      toast.success('Brand logo uploaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to upload brand logo.', { id: toastId });
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const [bannerUploading, setBannerUploading] = useState(false);

  const handleBannerFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be less than 8MB.');
      return;
    }

    const toastId = toast.loading('Uploading hero banner image...');
    setBannerUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedUrl = res.data?.url;
      if (!uploadedUrl) throw new Error('Upload did not return a valid image URL');

      updateSectionField('hero', 'banner_image_url', uploadedUrl);
      toast.success('Hero banner uploaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Banner upload error:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to upload hero banner.', { id: toastId });
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  };

  const isAdminRole = useMemo(() => {
    const roleName = user?.role?.name || user?.role || '';
    const normalizedRole = String(roleName).toLowerCase();
    return ['admin', 'superadmin', 'administrator'].includes(normalizedRole);
  }, [user]);

  const visiblePanels = useMemo(() => {
    if (isAdminRole) return controlPanels;

    return controlPanels.filter((panel) => {
      const required = panel.requiredPermissions || [];
      if (required.length === 0) return true;
      return required.some((perm) => hasPermission(perm));
    });
  }, [isAdminRole, user]);

  const canViewActivePanel = useMemo(
    () => visiblePanels.some((panel) => panel.key === activePanel),
    [visiblePanels, activePanel]
  );

  useEffect(() => {
    if (!visiblePanels.length) return;
    if (!canViewActivePanel) {
      setActivePanel(visiblePanels[0].key);
    }
  }, [visiblePanels, canViewActivePanel]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await settingsService.getHomepageSettings();
        setSettings((prev) => ({ ...prev, ...data }));
        setOrigSettings(data || {});

        const featuredIds = data?.sections?.featured?.featured_books || [];
        if (Array.isArray(featuredIds) && featuredIds.length) {
          try {
            const details = await Promise.all(featuredIds.map((id) => bookService.getBookById(id).catch(() => null)));
            setFeaturedBooksList(details.filter(Boolean));
          } catch (err) {
            console.error('Failed to load featured book details', err);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  const sectionEntries = useMemo(() => {
    return buildOrderedSections(settings.sections);
  }, [settings.sections]);

  const toggleSection = (key) => {
    setSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [key]: {
          ...(prev.sections?.[key] || {}),
          enabled: !Boolean(prev.sections?.[key]?.enabled),
        },
      },
    }));
  };

  const updateTheme = (theme) => setSettings((prev) => ({ ...prev, theme }));
  const updateAccentColor = (accent_color) => setSettings((prev) => ({ ...prev, accent_color }));
  const updateLanguage = (language) => setSettings((prev) => ({ ...prev, language }));
  const updateContentField = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));

  const getSiteTitleValue = (lang) => {
    if (!settings.site_title) return '';
    if (typeof settings.site_title === 'object') {
      return settings.site_title[lang] || '';
    }
    return lang === 'en' ? String(settings.site_title) : '';
  };

  const updateSiteTitleField = (lang, value) => {
    setSettings((prev) => {
      const current = typeof prev.site_title === 'object' && prev.site_title !== null
        ? { ...prev.site_title }
        : { en: typeof prev.site_title === 'string' ? prev.site_title : '', ur: '', ar: '' };
      return {
        ...prev,
        site_title: {
          ...current,
          [lang]: value,
        },
      };
    });
  };
  
  const updateLayoutField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: value,
      },
    }));
  };

  const updateSectionField = (sectionKey, field, value) => {
    setSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...(prev.sections?.[sectionKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  const addFeaturedBook = async (bookId) => {
    try {
      const book = await bookService.getBookById(bookId);
      if (!book) return;
      setFeaturedBooksList((prev) => {
        if (prev.find((b) => b.id === book.id)) return prev;
        return [...prev, book];
      });
      setSettings((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          featured: {
            ...(prev.sections?.featured || {}),
            featured_books: Array.from(new Set([...(prev.sections?.featured?.featured_books || []), book.id])),
          },
        },
      }));
    } catch (err) {
      console.error('Add featured book failed', err);
    }
  };

  const removeFeaturedBook = (bookId) => {
    setFeaturedBooksList((prev) => prev.filter((b) => b.id !== bookId));
    setSettings((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        featured: {
          ...(prev.sections?.featured || {}),
          featured_books: (prev.sections?.featured?.featured_books || []).filter((id) => id !== bookId),
        },
      },
    }));
  };

  const moveSection = (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sectionEntries.length) return;

    const currentSec = sectionEntries[currentIndex];
    const targetSec = sectionEntries[targetIndex];

    setSettings((prev) => {
      const updatedSections = { ...(prev.sections || {}) };
      updatedSections[currentSec.key] = {
        ...(updatedSections[currentSec.key] || {}),
        order: targetIndex,
      };
      updatedSections[targetSec.key] = {
        ...(updatedSections[targetSec.key] || {}),
        order: currentIndex,
      };
      return {
        ...prev,
        sections: updatedSections,
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const payload = JSON.parse(JSON.stringify(settings));

      // Validation for site title
      const titleObj = typeof payload.site_title === 'object' && payload.site_title !== null
        ? payload.site_title
        : { en: payload.site_title || '' };
      
      if (!titleObj.en || !titleObj.en.trim()) {
        setMessage('English Site Title is required.');
        setIsError(true);
        setSaving(false);
        return;
      }

      if ((titleObj.en && titleObj.en.length > 50) || (titleObj.ur && titleObj.ur.length > 50) || (titleObj.ar && titleObj.ar.length > 50)) {
        setMessage('Site Title for any language cannot exceed 50 characters.');
        setIsError(true);
        setSaving(false);
        return;
      }

      if (!hasPermission('HOMEPAGE_SEARCH_MANAGE')) {
        if (origSettings && origSettings.sections && origSettings.sections.search) {
          payload.sections = payload.sections || {};
          payload.sections.search = origSettings.sections.search;
        } else {
          if (payload.sections) delete payload.sections.search;
        }
      }

      await settingsService.updateHomepageSettings(payload);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('homepage-settings-updated', { detail: payload }));
      }
      setMessage('Homepage configuration saved successfully!');
      setIsError(false);
    } catch (error) {
      setMessage('Unable to save settings right now. Please try again.');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
            <Squares2X2Icon className="h-4 w-4" />
            Homepage Studio
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Landing Page Customizer</h2>
          <p className="text-sm text-slate-500">Configure visual themes, brand identity, section order, and module visibility.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <SparklesIcon className="h-5 w-5" />
            )}
            {saving ? 'Publishing Changes...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Save Notification Feedback Banner */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium transition-all ${
            isError
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {isError ? (
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Tab Control Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visiblePanels.map((panel) => {
          const isActive = activePanel === panel.key;
          const Icon = panel.icon;
          return (
            <button
              key={panel.key}
              onClick={() => setActivePanel(panel.key)}
              className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-200 ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    isActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">{panel.title}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{panel.description}</p>
              </div>

              {isActive && (
                <span className="mt-3 inline-flex items-center text-xs font-semibold text-indigo-700">
                  Active Panel &rarr;
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!visiblePanels.length && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You do not have permission to edit homepage configuration settings.
        </div>
      )}

      {/* Main Form & Interactive Live Preview */}
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left Column: Form Controls */}
        <div className="space-y-6">
          {activePanel === 'branding' && (
            <div className="space-y-6">
              {/* Visual Style Box */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <PaintBrushIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Visual Theme & Aesthetics</h3>
                    <p className="text-xs text-slate-500">Customize color modes, fonts, background effects and button styling.</p>
                  </div>
                </div>

                {/* Theme Switcher */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Theme Mode</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'day', label: 'Day Mode', icon: SunIcon },
                      { id: 'night', label: 'Night Mode', icon: MoonIcon },
                      { id: 'aurora', label: 'Aurora Mode', icon: SparklesIcon },
                    ].map((mode) => {
                      const isActive = settings.theme === mode.id;
                      const ModeIcon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => updateTheme(mode.id)}
                          className={`flex items-center justify-center gap-2 rounded-2xl border py-3 px-4 text-sm font-semibold transition-all ${
                            isActive
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <ModeIcon className="h-4 w-4" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Controls Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Palette Theme</span>
                    <select
                      value={settings.theme_palette || 'indigo'}
                      onChange={(e) => updateContentField('theme_palette', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="indigo">Indigo Modern</option>
                      <option value="emerald">Emerald Nature</option>
                      <option value="amber">Warm Amber</option>
                      <option value="rose">Velvet Rose</option>
                      <option value="slate">Sleek Slate</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Accent Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.accent_color || '#007ACC'}
                        onChange={(e) => updateAccentColor(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 p-1"
                      />
                      <input
                        type="text"
                        value={settings.accent_color || '#007ACC'}
                        onChange={(e) => updateAccentColor(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-mono text-slate-800 uppercase focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Heading Font Style</span>
                    <select
                      value={settings.heading_style || 'serif'}
                      onChange={(e) => updateContentField('heading_style', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="serif">Elegant Serif</option>
                      <option value="sans">Clean Modern Sans</option>
                      <option value="display">Bold Display</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Background Backdrop</span>
                    <select
                      value={settings.background_style || 'aurora'}
                      onChange={(e) => updateContentField('background_style', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="aurora">Aurora Gradient Glow</option>
                      <option value="soft">Soft Minimal White</option>
                      <option value="midnight">Midnight Dark</option>
                      <option value="glass">Frosted Glass</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Button Variant</span>
                    <select
                      value={settings.button_style || 'solid'}
                      onChange={(e) => updateContentField('button_style', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="solid">Solid Pill</option>
                      <option value="outline">Subtle Outline</option>
                      <option value="glass">Glass Backdrop</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">UI Spacing Scale</span>
                    <select
                      value={settings.spacing_scale || 'comfortable'}
                      onChange={(e) => updateContentField('spacing_scale', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                      <option value="airy">Airy / Spacious</option>
                    </select>
                  </label>
                </div>

                {/* ✦ INTERACTIVE LIVE VISUAL THEME PREVIEW BOX ✦ */}
                <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">Live Visual Theme Preview</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      {settings.theme?.toUpperCase() || 'DAY'} • {settings.theme_palette?.toUpperCase() || 'INDIGO'}
                    </span>
                  </div>

                  {/* Simulated App Mockup Canvas */}
                  <div 
                    className={`rounded-2xl transition-all duration-300 border overflow-hidden shadow-sm ${
                      settings.theme === 'night'
                        ? 'bg-[#0B0F19] text-slate-100 border-slate-800'
                        : settings.theme === 'aurora'
                        ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white border-indigo-900/50'
                        : 'bg-white text-slate-900 border-slate-200'
                    } ${
                      settings.spacing_scale === 'compact'
                        ? 'p-3.5 space-y-3'
                        : settings.spacing_scale === 'airy'
                        ? 'p-6 space-y-5'
                        : 'p-4.5 space-y-4'
                    }`}
                  >
                    {/* Mock Header / Navbar */}
                    <div className="flex items-center justify-between border-b pb-3 border-current/10">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-xs"
                          style={{ backgroundColor: settings.accent_color || '#007ACC' }}
                        >
                          M
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-none">{getSiteTitleValue('en') || 'Markaz Islamic Library'}</div>
                          <div className="text-[9px] opacity-60 font-semibold">{settings.site_subtitle || 'AHLE HADEES KOKAN'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                        <span className="px-2 py-0.5 rounded-md bg-current/10">Books</span>
                        <span className="px-2 py-0.5 rounded-md bg-current/10">Fatawa</span>
                        <span 
                          className="px-2 py-0.5 rounded-md text-white font-bold shadow-2xs"
                          style={{ backgroundColor: settings.accent_color || '#007ACC' }}
                        >
                          Search
                        </span>
                      </div>
                    </div>

                    {/* Mock Hero Heading with Selected Font */}
                    <div className="space-y-1.5">
                      <span 
                        className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${settings.accent_color || '#007ACC'}20`,
                          color: settings.accent_color || '#007ACC',
                          border: `1px solid ${settings.accent_color || '#007ACC'}40`
                        }}
                      >
                        ✦ Featured Discovery
                      </span>
                      <h4 
                        className={`text-base sm:text-lg font-bold leading-tight ${
                          settings.heading_style === 'serif'
                            ? 'font-serif'
                            : settings.heading_style === 'display'
                            ? 'font-mono uppercase tracking-wider font-black'
                            : 'font-sans font-extrabold'
                        }`}
                      >
                        {settings.sections?.hero?.title || 'Islamic Digital Library & Research Hub'}
                      </h4>
                      <p className="text-[11px] opacity-70 leading-relaxed max-w-md">
                        {settings.sections?.hero?.description || 'Browse thousands of authentic Islamic books, fatwas, audio, and historical archives.'}
                      </p>
                    </div>

                    {/* Mock Button Variants */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        className={`text-xs font-bold transition shadow-xs cursor-default ${
                          settings.button_style === 'solid'
                            ? 'rounded-full px-4 py-1.5 text-white shadow-md'
                            : settings.button_style === 'outline'
                            ? 'rounded-lg px-3.5 py-1.5 border-2 bg-transparent'
                            : 'rounded-xl px-4 py-1.5 backdrop-blur-md bg-white/20 border border-white/30 text-white shadow-lg'
                        }`}
                        style={{
                          backgroundColor: settings.button_style === 'solid' ? (settings.accent_color || '#007ACC') : undefined,
                          borderColor: settings.button_style === 'outline' ? (settings.accent_color || '#007ACC') : undefined,
                          color: settings.button_style === 'outline' ? (settings.accent_color || '#007ACC') : undefined,
                        }}
                      >
                        Explore Catalog
                      </button>

                      <span className="text-[10px] opacity-60 font-mono">
                        Style: {settings.button_style || 'solid'} • Backdrop: {settings.background_style || 'aurora'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Language & Identity Box */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <LanguageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Brand Header & Identity</h3>
                    <p className="text-xs text-slate-500">Configure public website logo, brand titles, navbar subtitle, and language.</p>
                  </div>
                </div>

                {/* Live Brand Header Preview Box */}
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">
                      Live Navbar Header Preview
                    </span>
                    {/* Language Switcher for Preview */}
                    <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-lg border border-blue-100 shadow-2xs">
                      {[
                        { code: 'en', label: 'English' },
                        { code: 'ur', label: 'اردو' },
                        { code: 'ar', label: 'العربية' },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setPreviewLang(lang.code)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${
                            previewLang === lang.code
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs max-w-md">
                    <img
                      src={
                        settings.site_logo_url
                          ? (settings.site_logo_url.startsWith('http')
                              ? settings.site_logo_url
                              : `${import.meta.env.VITE_API_BASE_URL || ''}${settings.site_logo_url.startsWith('/') ? '' : '/'}${settings.site_logo_url}`)
                          : `${import.meta.env.VITE_API_BASE_URL || ''}/static/images/MarkazLogo.png`
                      }
                      alt="Logo Preview"
                      className="w-10 h-10 object-contain rounded-full border border-slate-100 bg-white p-0.5 shadow-xs shrink-0"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `${import.meta.env.VITE_API_BASE_URL || ''}/static/images/MarkazLogo.png`;
                      }}
                    />
                    <div className="flex flex-col justify-center leading-tight min-w-0 flex-1">
                      <span
                        style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)' }}
                        className="font-extrabold text-[#002147] tracking-tight leading-tight line-clamp-2 break-words"
                      >
                        {getSiteTitleValue(previewLang) || getSiteTitleValue('en') || 'MARKAZ AHLE HADEES KOKAN'}
                      </span>
                      {settings.show_site_subtitle !== false && (
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider line-clamp-1 break-words">
                          {settings.site_subtitle || 'AHLE HADEES KOKAN'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Multilingual Site Title Inputs */}
                <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Public Site Title (Multilingual)</span>
                      <span className="text-[11px] text-slate-500">Provide the title for each supported language. Maximum 50 characters each.</span>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                      Multi-Language
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* English */}
                    <div className="block">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>English Title</span>
                          <span className="text-rose-500 font-bold">*</span>
                        </span>
                        <span className={`text-[10px] font-mono font-medium ${
                          (getSiteTitleValue('en')?.length || 0) > 45 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {getSiteTitleValue('en')?.length || 0}/50
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={50}
                        required
                        value={getSiteTitleValue('en')}
                        onChange={(e) => updateSiteTitleField('en', e.target.value)}
                        placeholder="e.g. MARKAZ AHLE HADEES KOKAN"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none shadow-2xs"
                      />
                    </div>

                    {/* Urdu */}
                    <div className="block">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>Urdu Title (اردو)</span>
                        </span>
                        <span className={`text-[10px] font-mono font-medium ${
                          (getSiteTitleValue('ur')?.length || 0) > 45 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {getSiteTitleValue('ur')?.length || 0}/50
                        </span>
                      </div>
                      <input
                        type="text"
                        dir="rtl"
                        maxLength={50}
                        value={getSiteTitleValue('ur')}
                        onChange={(e) => updateSiteTitleField('ur', e.target.value)}
                        placeholder="مثلاً: مرکز اہل حدیث کوکن"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none shadow-2xs font-urdu"
                      />
                    </div>

                    {/* Arabic */}
                    <div className="block">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>Arabic Title (العربية)</span>
                        </span>
                        <span className={`text-[10px] font-mono font-medium ${
                          (getSiteTitleValue('ar')?.length || 0) > 45 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {getSiteTitleValue('ar')?.length || 0}/50
                        </span>
                      </div>
                      <input
                        type="text"
                        dir="rtl"
                        maxLength={50}
                        value={getSiteTitleValue('ar')}
                        onChange={(e) => updateSiteTitleField('ar', e.target.value)}
                        placeholder="مثلاً: مركز أهل الحديث كوكان"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none shadow-2xs font-arabic"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="block">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Public Site Subtitle (Navbar Tagline)</span>
                      <button
                        type="button"
                        onClick={() => updateContentField('show_site_subtitle', settings.show_site_subtitle === false ? true : false)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold transition cursor-pointer border shadow-2xs ${
                          settings.show_site_subtitle !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Toggle Subtitle ON/OFF"
                      >
                        <span className={`w-2 h-2 rounded-full ${settings.show_site_subtitle !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{settings.show_site_subtitle !== false ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      disabled={settings.show_site_subtitle === false}
                      value={settings.site_subtitle || ''}
                      onChange={(e) => updateContentField('site_subtitle', e.target.value)}
                      placeholder="e.g. AHLE HADEES KOKAN"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed transition"
                    />
                  </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Brand Logo</span>
                    <div className="flex flex-col gap-2.5">
                      {/* Logo Preview & Upload Action */}
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/70 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                          {settings.site_logo_url ? (
                            <img
                              src={settings.site_logo_url}
                              alt="Brand Logo Preview"
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/static/images/MarkazLogo.png';
                              }}
                            />
                          ) : (
                            <img
                              src="/static/images/MarkazLogo.png"
                              alt="Default Markaz Logo"
                              className="w-full h-full object-contain p-1 opacity-60"
                            />
                          )}
                        </div>

                        <div className="flex-1 flex flex-wrap items-center gap-2">
                          <label className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                            logoUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-[#002147] hover:bg-[#003166] active:scale-95'
                          }`}>
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            <span>{logoUploading ? 'Uploading...' : 'Upload Logo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={logoUploading}
                              onChange={handleLogoFileUpload}
                              className="hidden"
                            />
                          </label>

                          {settings.site_logo_url && (
                            <button
                              type="button"
                              onClick={() => updateContentField('site_logo_url', '')}
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 font-semibold transition cursor-pointer"
                              title="Reset to default Markaz logo"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Direct URL Input fallback */}
                      <div className="relative">
                        <input
                          type="text"
                          value={settings.site_logo_url || ''}
                          onChange={(e) => updateContentField('site_logo_url', e.target.value)}
                          placeholder="Or enter image URL (e.g. https://... or /static/images/...)"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        PNG or SVG with transparent background recommended. Uploads directly to storage.
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Default Interface Language</span>
                    <select
                      value={settings.language || 'en'}
                      onChange={(e) => updateLanguage(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none"
                    >
                      <option value="en">English (US)</option>
                      <option value="ur">Urdu (اردو)</option>
                      <option value="ar">Arabic (العربية)</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">Hero Spotlight Tagline / Badge</span>
                  <input
                    type="text"
                    value={settings.hero_badge || ''}
                    onChange={(e) => updateContentField('hero_badge', e.target.value)}
                    placeholder="e.g. Next-Generation Islamic Knowledge Hub"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </label>
              </div>
            </div>
          )}

          {activePanel === 'content' && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <PencilSquareIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Section Content & Order</h3>
                    <p className="text-xs text-slate-500">Edit titles, descriptions, CTA buttons, and featured books.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {sectionEntries.map((section, idx) => (
                    <div
                      key={section.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition-all hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center gap-3">
                          {/* 1-Click Reorder Buttons */}
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, 'up')}
                              className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === sectionEntries.length - 1}
                              onClick={() => moveSection(idx, 'down')}
                              className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{section.label}</span>
                              <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                Position: {idx + 1}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{section.description}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSection(section.key)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            section.enabled
                              ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title={`Click to ${section.enabled ? 'Hide' : 'Show'} this section`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              section.enabled ? 'bg-white' : 'bg-slate-400'
                            }`}
                          />
                          {section.enabled ? 'Visible (ON)' : 'Hidden (OFF)'}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-700">Section Heading</span>
                          <input
                            type="text"
                            value={settings.sections?.[section.key]?.title || ''}
                            onChange={(e) => updateSectionField(section.key, 'title', e.target.value)}
                            placeholder={section.label}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-700">Subheading</span>
                          <input
                            type="text"
                            value={settings.sections?.[section.key]?.subtitle || ''}
                            onChange={(e) => updateSectionField(section.key, 'subtitle', e.target.value)}
                            placeholder="Optional subtitle"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                          />
                        </label>
                      </div>

                      {section.key === 'hero' ? (
                        <div className="mt-4 space-y-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-indigo-900 block">
                                ✨ Welcome Banner, Intro & Spotlight Area
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Configure main landing title, description paragraph, spotlight badge, and CTA buttons.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleSection('hero')}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                settings.sections?.hero?.enabled !== false
                                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {settings.sections?.hero?.enabled !== false ? '✅ Hero is ON (Visible)' : '❌ Hero is OFF (Hidden)'}
                            </button>
                          </div>

                          {/* Hero Live Visual Preview */}
                          <div className="overflow-hidden rounded-2xl bg-[#000814] border border-white/10 p-6 text-center relative shadow-md">
                            {settings.sections?.hero?.banner_image_url && (
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                  backgroundImage: `url(${settings.sections.hero.banner_image_url})`,
                                  opacity: 1 - ((settings.sections.hero.banner_overlay_opacity || 70) / 100) * 0.7,
                                }}
                              />
                            )}
                            <div className="relative z-10 space-y-3">
                              {/* Spotlight Glowing Center Accent */}
                              <div
                                className="absolute left-1/2 top-0 -translate-x-1/2 h-28 w-28 rounded-full blur-2xl opacity-30 animate-pulse pointer-events-none"
                                style={{
                                  background: `radial-gradient(circle, ${settings.sections?.hero?.spotlight_color || '#f5d9a6'}, transparent 70%)`,
                                }}
                              />

                              {settings.sections?.hero?.show_badge !== false && (
                                <span className="inline-block px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 text-cyan-200 border border-white/10 shadow-xs backdrop-blur-xs">
                                  🏛️ {settings.sections?.hero?.badge || 'MARKAZ AHLE HADEES KOKAN'}
                                </span>
                              )}

                              {settings.sections?.hero?.show_ayah !== false && (
                                <p dir="rtl" className="text-sm sm:text-base font-serif text-[#F4A261]">
                                  {settings.sections?.hero?.ayah_arabic || 'يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ'}
                                </p>
                              )}

                              {settings.sections?.hero?.ayah_translation && (
                                <p className="text-[11px] text-cyan-200/80 italic font-sans max-w-lg mx-auto">
                                  "{settings.sections.hero.ayah_translation}"
                                </p>
                              )}

                              <h4 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight">
                                {settings.sections?.hero?.title || 'Welcome to the future of the library'}
                              </h4>

                              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                                {settings.sections?.hero?.description || 'Curated digital catalog, authentic fatwas, historical manuscripts, and scholarly resources.'}
                              </p>

                              {settings.sections?.hero?.show_cta && (
                                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                                  <span className="rounded-full bg-emerald-500 text-white text-[11px] font-bold px-4 py-1.5 shadow-sm">
                                    {settings.sections?.hero?.cta_text || 'Explore Catalog'}
                                  </span>
                                  {settings.sections?.hero?.secondary_cta_text && (
                                    <span className="rounded-full bg-white/10 text-white text-[11px] font-semibold px-4 py-1.5 border border-white/20">
                                      {settings.sections?.hero?.secondary_cta_text}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 1. Main Heading & Intro Description */}
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                              1. Main Headline & Intro Paragraph
                            </span>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-700">Hero Main Title</span>
                                <input
                                  type="text"
                                  value={settings.sections?.hero?.title || ''}
                                  onChange={(e) => updateSectionField('hero', 'title', e.target.value)}
                                  placeholder="e.g. Welcome to the future of the library"
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-700">Hero Subtitle</span>
                                <input
                                  type="text"
                                  value={settings.sections?.hero?.subtitle || ''}
                                  onChange={(e) => updateSectionField('hero', 'subtitle', e.target.value)}
                                  placeholder="e.g. Kokan Digital Islamic Library"
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                                />
                              </label>
                            </div>

                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-slate-700">Main Landing Intro / Description Paragraph</span>
                              <textarea
                                rows={2}
                                value={settings.sections?.hero?.description || ''}
                                onChange={(e) => updateSectionField('hero', 'description', e.target.value)}
                                placeholder="Explore curated Islamic knowledge with a calm, modern reading experience..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                              />
                            </label>
                          </div>

                          {/* 2. Spotlight Badge & Glow Controls */}
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                              2. Spotlight Badge & Glow Aura
                            </span>
                            <div className="grid gap-3 sm:grid-cols-3 items-end">
                              <label className="sm:col-span-2 block">
                                <span className="mb-1 block text-xs font-semibold text-slate-700">Top Spotlight Badge Text</span>
                                <input
                                  type="text"
                                  value={settings.sections?.hero?.badge ?? 'MARKAZ AHLE HADEES KOKAN'}
                                  onChange={(e) => updateSectionField('hero', 'badge', e.target.value)}
                                  placeholder="MARKAZ AHLE HADEES KOKAN"
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                                />
                              </label>
                              <label className="flex items-center gap-2 pb-2.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.sections?.hero?.show_badge !== false}
                                  onChange={(e) => updateSectionField('hero', 'show_badge', e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">Show Spotlight Badge</span>
                              </label>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                              <span className="text-xs font-semibold text-slate-700">Spotlight Glow Color:</span>
                              <input
                                type="color"
                                value={settings.sections?.hero?.spotlight_color || '#f5d9a6'}
                                onChange={(e) => updateSectionField('hero', 'spotlight_color', e.target.value)}
                                className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 p-0.5"
                              />
                              <span className="text-xs font-mono text-slate-500">{settings.sections?.hero?.spotlight_color || '#f5d9a6'}</span>
                            </div>
                          </div>

                          {/* 3. Quranic Ayah Controls */}
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                3. Arabic Quranic Ayah / Quote
                              </span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.sections?.hero?.show_ayah !== false}
                                  onChange={(e) => updateSectionField('hero', 'show_ayah', e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">Show Ayah</span>
                              </label>
                            </div>
                            <textarea
                              rows={2}
                              dir="rtl"
                              value={settings.sections?.hero?.ayah_arabic ?? 'يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ'}
                              onChange={(e) => updateSectionField('hero', 'ayah_arabic', e.target.value)}
                              placeholder="يَا أَيُّهَا الَّذِينَ آمَنُوا..."
                              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-serif text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                            />
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-slate-700">Ayah Translation (Optional - Urdu / English)</span>
                              <input
                                type="text"
                                value={settings.sections?.hero?.ayah_translation || ''}
                                onChange={(e) => updateSectionField('hero', 'ayah_translation', e.target.value)}
                                placeholder="e.g. O you who have believed, obey Allah and obey the Messenger..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                              />
                            </label>
                          </div>

                          {/* 4. Action Buttons (CTA) */}
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                4. Call To Action Buttons (CTA)
                              </span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.sections?.hero?.show_cta === true}
                                  onChange={(e) => updateSectionField('hero', 'show_cta', e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">Show CTA Buttons</span>
                              </label>
                            </div>

                            {settings.sections?.hero?.show_cta && (
                              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                                <div className="space-y-2">
                                  <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-700">Primary Button Text</span>
                                    <input
                                      type="text"
                                      value={settings.sections?.hero?.cta_text || 'Explore Catalog'}
                                      onChange={(e) => updateSectionField('hero', 'cta_text', e.target.value)}
                                      placeholder="Explore Catalog"
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                                    />
                                  </label>
                                  <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-700">Primary Button Link URL</span>
                                    <input
                                      type="text"
                                      value={settings.sections?.hero?.cta_link || '/library'}
                                      onChange={(e) => updateSectionField('hero', 'cta_link', e.target.value)}
                                      placeholder="/library"
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                                    />
                                  </label>
                                </div>

                                <div className="space-y-2">
                                  <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-700">Secondary Button Text (Optional)</span>
                                    <input
                                      type="text"
                                      value={settings.sections?.hero?.secondary_cta_text || 'Ask a Question'}
                                      onChange={(e) => updateSectionField('hero', 'secondary_cta_text', e.target.value)}
                                      placeholder="Ask a Question"
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                                    />
                                  </label>
                                  <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-700">Secondary Button Link URL</span>
                                    <input
                                      type="text"
                                      value={settings.sections?.hero?.secondary_cta_link || '/fatawa'}
                                      onChange={(e) => updateSectionField('hero', 'secondary_cta_link', e.target.value)}
                                      placeholder="/fatawa"
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                                    />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 5. Banner Image Upload & Overlay Controls */}
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                              5. Background Banner & Particle Ambience
                            </span>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Hero Background Banner</span>
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                                      bannerUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-[#002147] hover:bg-[#003166]'
                                    }`}>
                                      <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                                      <span>{bannerUploading ? 'Uploading...' : 'Upload Banner'}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        disabled={bannerUploading}
                                        onChange={handleBannerFileUpload}
                                        className="hidden"
                                      />
                                    </label>
                                    {settings.sections?.hero?.banner_image_url && (
                                      <button
                                        type="button"
                                        onClick={() => updateSectionField('hero', 'banner_image_url', '')}
                                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 font-semibold transition cursor-pointer"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={settings.sections?.hero?.banner_image_url || ''}
                                    onChange={(e) => updateSectionField('hero', 'banner_image_url', e.target.value)}
                                    placeholder="or paste URL https://..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                                  />
                                </div>
                              </label>

                              <label className="block">
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs font-semibold text-slate-700">Dark Overlay Opacity</span>
                                  <span className="text-xs font-bold text-indigo-600">
                                    {settings.sections?.hero?.banner_overlay_opacity || 70}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="20"
                                  max="95"
                                  step="5"
                                  value={settings.sections?.hero?.banner_overlay_opacity || 70}
                                  onChange={(e) => updateSectionField('hero', 'banner_overlay_opacity', Number(e.target.value))}
                                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Higher opacity makes text easier to read over bright images.</p>
                              </label>
                            </div>

                            {/* Star Animation Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={settings.sections?.hero?.show_stars !== false}
                                onChange={(e) => updateSectionField('hero', 'show_stars', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-xs font-semibold text-slate-700">Enable Ambient Star / Particle Animation</span>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="mt-3 block">
                          <span className="mb-1 block text-xs font-medium text-slate-700">Section Description / Paragraph</span>
                          <textarea
                            rows={2}
                            value={settings.sections?.[section.key]?.description || ''}
                            onChange={(e) => updateSectionField(section.key, 'description', e.target.value)}
                            placeholder="Section description paragraph..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activePanel === 'layout' && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Layout Extras & Modules</h3>
                  <p className="text-xs text-slate-500">Toggle auxiliary display blocks for cleaner layout control.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'show_stats', label: 'Hero Stats Counter Cards' },
                  { key: 'show_search_strip', label: 'Main Search Strip' },
                  { key: 'show_featured_books', label: 'Featured Books Showcase' },
                  { key: 'show_donation_panel', label: 'Donation & Support Module' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.layout?.[item.key])}
                      onChange={(e) => updateLayoutField(item.key, e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'visibility' && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <EyeIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Landing Page Section Visibility</h3>
                  <p className="text-xs text-slate-500">Toggle section visibility to instantly show or hide modules.</p>
                </div>
              </div>

              <div className="space-y-3">
                {sectionEntries.map((section) => (
                  <div
                    key={section.key}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{section.label}</h4>
                      <p className="text-xs text-slate-500">{section.description}</p>
                    </div>

                    <button
                      onClick={() => toggleSection(section.key)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                        section.enabled
                          ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {section.enabled ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                      <span>{section.enabled ? 'Visible' : 'Hidden'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'loader' && (
            <div className="space-y-6">
              {/* Main Banner */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-2xs">
                      <SparklesIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Splash & Page Loader Experience</h3>
                      <p className="text-xs text-slate-500">Configure branded Islamic splash, instant skeleton shimmers, festive modes, and live testing.</p>
                    </div>
                  </div>

                  {/* Live Preview Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewLoaderStyle(settings.loader_config?.loader_style || 'hybrid');
                      setPreviewLoaderModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#002147] text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-102 transition-all cursor-pointer shrink-0"
                  >
                    <SparklesIcon className="w-4 h-4 text-amber-300" />
                    <span>👁️ Live Preview / Test Loader</span>
                  </button>
                </div>

                {/* 1. Loader Style Selector (3 Cards) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    1. Select Loader Architecture (لوڈر کا انداز منتخب کریں)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'hybrid',
                        title: 'Option 3: Hybrid (Recommended)',
                        badge: '👑 BEST UX',
                        desc: 'Islamic Splash on 1st visit, instant Skeleton Shimmer on subsequent page clicks.',
                        icon: '🌟'
                      },
                      {
                        key: 'islamic_splash',
                        title: 'Option 1: Islamic Luxury Splash',
                        badge: '🏛️ BRANDED',
                        desc: 'Markaz Logo + Glowing Halo + Rabbi Zidni Ilma + Hadith Quotes + Progress Line.',
                        icon: '✨'
                      },
                      {
                        key: 'skeleton_shimmer',
                        title: 'Option 2: Fast Skeleton Shimmer',
                        badge: '⚡ ULTRA-FAST',
                        desc: 'Instant YouTube/Linear style layout shimmer with zero waiting perception.',
                        icon: '⚡'
                      }
                    ].map((item) => {
                      const isSelected = (settings.loader_config?.loader_style || 'hybrid') === item.key;
                      return (
                        <div
                          key={item.key}
                          onClick={() => updateLoaderConfig('loader_style', item.key)}
                          className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xl">{item.icon}</span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {item.badge}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-900">{item.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className={`font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {isSelected ? '✓ Selected Active' : 'Click to Select'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewLoaderStyle(item.key);
                                setPreviewLoaderModalOpen(true);
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Test Style →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Occasion & Festive Modes */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    2. Occasion & Festive Modes (خصوصی مناسبت و تھیم)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'default', title: 'Default Islamic', emoji: '🌟', desc: 'Standard Royal Gold & Emerald' },
                      { key: 'ramadan', title: 'Ramadan Mubarak', emoji: '🌙', desc: 'Crescent Moon & Quranic Dua' },
                      { key: 'eid', title: 'Eid Mubarak', emoji: '🕌', desc: 'Festive Celebration Greetings' },
                      { key: 'conference', title: 'Markaz Conference', emoji: '🏛️', desc: 'Annual Educational Conference' }
                    ].map((occ) => {
                      const isSelected = (settings.loader_config?.occasion_theme || 'default') === occ.key;
                      return (
                        <div
                          key={occ.key}
                          onClick={() => updateLoaderConfig('occasion_theme', occ.key)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer text-center space-y-1.5 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs font-black'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-2xl">{occ.emoji}</span>
                          <p className="text-xs font-bold text-slate-800">{occ.title}</p>
                          <p className="text-[10px] text-slate-400 leading-tight">{occ.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Splash Color Moods */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    3. Splash Background Color Theme (بیک گراؤنڈ تھیم)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'navy', title: 'Deep Midnight & Emerald', bg: 'bg-[#070D18] text-emerald-300', desc: 'Markaz Kokan Signature' },
                      { key: 'black', title: 'Imperial Black & Gold', bg: 'bg-[#0A0A0A] text-amber-300', desc: 'Kiswa Luxury Aesthetic' },
                      { key: 'ivory', title: 'Minimal Ivory White', bg: 'bg-slate-100 text-slate-800', desc: 'Daylight Clean & Soft' }
                    ].map((mood) => {
                      const isSelected = (settings.loader_config?.splash_theme || 'navy') === mood.key;
                      return (
                        <div
                          key={mood.key}
                          onClick={() => updateLoaderConfig('splash_theme', mood.key)}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected ? 'border-emerald-600 bg-emerald-50/40 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs shadow-xs ${mood.bg}`}>
                            ✦
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{mood.title}</p>
                            <p className="text-[10px] text-slate-400">{mood.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Controls & Quotes Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Show Hadith & Quranic Quotes</span>
                      <span className="text-[11px] text-slate-500">Rotate inspirational Islamic quotes while loading</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.loader_config?.show_quotes !== false}
                      onChange={(e) => updateLoaderConfig('show_quotes', e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Splash Minimum Duration</span>
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        {((settings.loader_config?.splash_duration || 1800) / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="3000"
                      step="200"
                      value={settings.loader_config?.splash_duration || 1800}
                      onChange={(e) => updateLoaderConfig('splash_duration', Number(e.target.value))}
                      className="w-full mt-2 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'deep_search' && (
            <DeepSearchCustomizer />
          )}
        </div>

        {/* Right Column: Sticky Interactive Live Preview Card */}
        <div className="relative">
          <div 
            className={`sticky top-6 overflow-hidden rounded-3xl border p-6 transition-all duration-300 shadow-xl ${
              settings.theme === 'night'
                ? 'bg-[#0B0F19] text-white border-slate-800'
                : settings.theme === 'aurora'
                ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white border-indigo-900/50'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {/* Live Indicator Pill */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live Config Preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-300">
                  {settings.theme?.toUpperCase() || 'DAY'}
                </span>
                <span 
                  className="rounded-full px-2 py-0.5 text-[10px] font-mono font-bold text-white shadow-2xs"
                  style={{ backgroundColor: settings.accent_color || '#007ACC' }}
                >
                  {settings.theme_palette?.toUpperCase() || 'INDIGO'}
                </span>
              </div>
            </div>

            {/* Simulated Hero Header */}
            <div className="mt-5 space-y-2.5">
              {settings.hero_badge && (
                <span 
                  className="inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold"
                  style={{ 
                    backgroundColor: `${settings.accent_color || '#007ACC'}25`,
                    color: settings.accent_color || '#38BDF8',
                    border: `1px solid ${settings.accent_color || '#007ACC'}50`
                  }}
                >
                  {settings.hero_badge}
                </span>
              )}
              <h3 
                className={`text-lg font-bold tracking-tight text-white leading-snug ${
                  settings.heading_style === 'serif'
                    ? 'font-serif'
                    : settings.heading_style === 'display'
                    ? 'font-mono uppercase tracking-wider font-black'
                    : 'font-sans font-extrabold'
                }`}
              >
                {settings.sections?.hero?.title || 'Welcome to the Library Hub'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {settings.sections?.hero?.description || 'Curated digital catalog and research library.'}
              </p>

              {/* Sample Interactive Button Preview */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  className={`text-xs font-bold transition shadow-xs ${
                    settings.button_style === 'solid'
                      ? 'rounded-full px-4 py-1.5 text-white shadow-md'
                      : settings.button_style === 'outline'
                      ? 'rounded-lg px-3.5 py-1.5 border-2 bg-transparent'
                      : 'rounded-xl px-4 py-1.5 backdrop-blur-md bg-white/20 border border-white/30 text-white shadow-lg'
                  }`}
                  style={{
                    backgroundColor: settings.button_style === 'solid' ? (settings.accent_color || '#007ACC') : undefined,
                    borderColor: settings.button_style === 'outline' ? (settings.accent_color || '#007ACC') : undefined,
                    color: settings.button_style === 'outline' ? (settings.accent_color || '#007ACC') : undefined,
                  }}
                >
                  Action Button
                </button>
              </div>
            </div>

            {/* Live Accent Swatch Bar */}
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/5 p-3 text-xs border border-white/10">
              <span className="text-slate-400">Accent & Backdrop:</span>
              <div className="flex items-center gap-2 font-mono font-semibold text-slate-200">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs"
                  style={{ backgroundColor: settings.accent_color || '#007ACC' }}
                />
                <span>{settings.accent_color || '#007ACC'}</span>
                <span className="text-slate-500 font-sans">({settings.background_style || 'aurora'})</span>
              </div>
            </div>

            {/* Active Sections Summary List */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Enabled Homepage Modules</span>
                <span>Order</span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {sectionEntries
                  .filter((sec) => sec.enabled)
                  .map((sec) => (
                    <div
                      key={sec.key}
                      className="flex items-center justify-between rounded-xl bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-200 border border-slate-800"
                    >
                      <span className="truncate">{sec.title || sec.label}</span>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">{sec.order}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= INTERACTIVE LOADER LIVE PREVIEW MODAL ================= */}
      {previewLoaderModalOpen && (
        <div className="fixed inset-0 z-[999999] flex flex-col bg-black/90">
          {/* Top Control Strip */}
          <div className="relative z-[1000000] flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/95 border-b border-slate-800 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-xs">
                ✦ LIVE PREVIEW MODE
              </span>
              <span className="text-xs text-slate-300 font-bold hidden sm:inline">
                Viewing: <span className="text-amber-400 font-mono">{previewLoaderStyle}</span>
              </span>
            </div>

            {/* Switchers on the fly */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewLoaderStyle('islamic_splash')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  previewLoaderStyle === 'islamic_splash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Option 1: Islamic Splash
              </button>
              <button
                type="button"
                onClick={() => setPreviewLoaderStyle('skeleton_shimmer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  previewLoaderStyle === 'skeleton_shimmer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Option 2: Skeleton
              </button>
              <button
                type="button"
                onClick={() => setPreviewLoaderStyle('hybrid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  previewLoaderStyle === 'hybrid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Option 3: Hybrid
              </button>
            </div>

            {/* Exit Preview Button */}
            <button
              type="button"
              onClick={() => setPreviewLoaderModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>✕ Exit Preview</span>
            </button>
          </div>

          {/* Loader Canvas */}
          <div className="relative flex-1">
            <AppPageLoader
              key={previewLoaderStyle + JSON.stringify(settings.loader_config)}
              config={settings.loader_config}
              isPreview={true}
              previewStyle={previewLoaderStyle}
            />
          </div>
        </div>
      )}

      {/* Global Book Search Modal Component */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onResultClick={(bookId) => {
          addFeaturedBook(bookId);
          setSearchOpen(false);
        }}
      />
    </div>
  );
};

export default HomepageCustomizer;