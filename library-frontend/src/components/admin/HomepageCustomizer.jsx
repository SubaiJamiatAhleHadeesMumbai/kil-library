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
} from '@heroicons/react/24/outline';
import settingsService from '../../api/settingsService';
import useAuth from '../../hooks/useAuth';
import GlobalSearchModal from '../book/GlobalSearchModal';
import { bookService } from '../../api/bookService';

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
];

const defaultSections = [
  { key: 'hero', label: 'Hero / Welcome Banner', description: 'Main landing intro and spotlight area' },
  { key: 'search', label: 'Search Strip', description: 'Search, filters, and discovery tools' },
  { key: 'featured', label: 'Featured Books', description: 'Curated recommended titles' },
  { key: 'catalog', label: 'Library Catalog', description: 'Main book browsing grid' },
  { key: 'posts', label: 'Announcements', description: 'News and latest updates' },
  { key: 'donation', label: 'Donation Panel', description: 'Support and donation block' },
  { key: 'about', label: 'About Page', description: 'Public about page link visibility' },
  { key: 'education_social_activity', label: 'Education, Social & Activity', description: 'Community education and social service section visibility' },
  { key: 'fatawa', label: 'Fatawa Q&A', description: 'Public fatawa page link visibility' },
  { key: 'gallery', label: 'Gallery', description: 'Public gallery section visibility' },
  { key: 'posters', label: 'Media Posters', description: 'Rotating poster carousel and campaign visuals' },
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
    sections: {},
    layout: {},
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [origSettings, setOrigSettings] = useState(null);
  const [activePanel, setActivePanel] = useState('branding');

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

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const payload = JSON.parse(JSON.stringify(settings));
      if (!hasPermission('HOMEPAGE_SEARCH_MANAGE')) {
        if (origSettings && origSettings.sections && origSettings.sections.search) {
          payload.sections = payload.sections || {};
          payload.sections.search = origSettings.sections.search;
        } else {
          if (payload.sections) delete payload.sections.search;
        }
      }

      await settingsService.updateHomepageSettings(payload);
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
              </div>

              {/* Language & Identity Box */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <LanguageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Language & Identity</h3>
                    <p className="text-xs text-slate-500">Configure global website titles, languages, and spotlight badges.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Interface Language</span>
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

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Public Site Title</span>
                    <input
                      type="text"
                      value={settings.site_title || ''}
                      onChange={(e) => updateContentField('site_title', e.target.value)}
                      placeholder="e.g. Kokan Digital Library"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
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
                  {sectionEntries.map((section) => (
                    <div
                      key={section.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition-all hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{section.label}</span>
                            <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              Order: {section.order}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{section.description}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            section.enabled
                              ? 'bg-emerald-100/80 text-emerald-700'
                              : 'bg-slate-200/60 text-slate-600'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              section.enabled ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {section.enabled ? 'Visible' : 'Hidden'}
                        </span>
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

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-700">Display Order Index</span>
                          <input
                            type="number"
                            value={settings.sections?.[section.key]?.order ?? 0}
                            onChange={(e) => updateSectionField(section.key, 'order', Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                          />
                        </label>

                        {section.key === 'hero' && (
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-700">Primary Button Text</span>
                            <input
                              type="text"
                              value={settings.sections?.hero?.primary_cta_label || ''}
                              onChange={(e) => updateSectionField('hero', 'primary_cta_label', e.target.value)}
                              placeholder="Explore Library"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                          </label>
                        )}
                      </div>

                      {section.key === 'hero' && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-700">Primary Button URL</span>
                            <input
                              type="text"
                              value={settings.sections?.hero?.primary_cta_url || ''}
                              onChange={(e) => updateSectionField('hero', 'primary_cta_url', e.target.value)}
                              placeholder="/books"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-700">Secondary Button URL</span>
                            <input
                              type="text"
                              value={settings.sections?.hero?.secondary_cta_url || ''}
                              onChange={(e) => updateSectionField('hero', 'secondary_cta_url', e.target.value)}
                              placeholder="/contact"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                          </label>
                        </div>
                      )}

                      {/* Featured Books Special Manager */}
                      {section.key === 'featured' && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Curated Featured Books</span>
                              <p className="text-xs text-slate-500">Add titles directly to highlight on landing section.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSearchOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                              >
                                <PlusIcon className="h-4 w-4" />
                                Add Books
                              </button>
                              <button
                                onClick={() => {
                                  setFeaturedBooksList([]);
                                  updateSectionField('featured', 'featured_books', []);
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          <div className="mt-3">
                            {featuredBooksList.length === 0 ? (
                              <p className="py-4 text-center text-xs text-slate-400">No featured books selected yet.</p>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {featuredBooksList.map((book) => (
                                  <div
                                    key={book.id}
                                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 shadow-2xs hover:bg-slate-50"
                                  >
                                    <img
                                      src={book.cover_image_url || book.cover_image || 'https://via.placeholder.com/80x120?text=Book'}
                                      alt={book.title}
                                      className="h-16 w-12 rounded-lg object-cover shadow-2xs"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-bold text-slate-900">{book.title}</p>
                                      <p className="truncate text-[11px] text-slate-500">{book.author || 'Unknown Author'}</p>
                                    </div>
                                    <button
                                      onClick={() => removeFeaturedBook(book.id)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                      title="Remove book"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Search Strip Custom Options */}
                      {section.key === 'search' && (
                        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                          {!hasPermission('HOMEPAGE_SEARCH_MANAGE') && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                              You do not have permission to modify search options.
                            </div>
                          )}

                          <div className="grid gap-2 sm:grid-cols-2">
                            {[
                              { field: 'show_hint', label: 'Keyboard Search Hints' },
                              { field: 'enable_voice', label: 'Voice Search' },
                              { field: 'enable_deep', label: 'Deep Catalog Search' },
                              { field: 'show_suggestions', label: 'Search Auto-Suggestions' },
                            ].map((opt) => (
                              <label
                                key={opt.field}
                                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700"
                              >
                                <span>{opt.label}</span>
                                <input
                                  type="checkbox"
                                  disabled={!hasPermission('HOMEPAGE_SEARCH_MANAGE')}
                                  checked={Boolean(settings.sections?.search?.[opt.field] ?? true)}
                                  onChange={(e) => updateSectionField('search', opt.field, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </label>
                            ))}
                          </div>

                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-700">Search Placeholder</span>
                            <input
                              type="text"
                              disabled={!hasPermission('HOMEPAGE_SEARCH_MANAGE')}
                              value={settings.sections?.search?.placeholder || ''}
                              onChange={(e) => updateSectionField('search', 'placeholder', e.target.value)}
                              placeholder="Search books, authors..."
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                          </label>
                        </div>
                      )}

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
        </div>

        {/* Right Column: Sticky Interactive Live Preview Card */}
        <div className="relative">
          <div className="sticky top-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
            {/* Live Indicator Pill */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live Config Preview</span>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-400">
                {settings.theme.toUpperCase()} MODE
              </span>
            </div>

            {/* Simulated Hero Header */}
            <div className="mt-6 space-y-3">
              {settings.hero_badge && (
                <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-semibold text-indigo-300 border border-indigo-500/30">
                  {settings.hero_badge}
                </span>
              )}
              <h3 className="text-xl font-extrabold tracking-tight text-white leading-snug">
                {settings.sections?.hero?.title || 'Welcome to the Library Hub'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {settings.sections?.hero?.description || 'Curated digital catalog and research library.'}
              </p>
            </div>

            {/* Live Accent Swatch Bar */}
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-800/80 p-3 text-xs">
              <span className="text-slate-400">Accent Color:</span>
              <div className="flex items-center gap-2 font-mono font-semibold text-slate-200">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: settings.accent_color || '#007ACC' }}
                />
                <span>{settings.accent_color || '#007ACC'}</span>
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