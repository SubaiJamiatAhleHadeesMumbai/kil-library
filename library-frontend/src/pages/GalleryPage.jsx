import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import galleryService from '../api/galleryService';
import {
  PhotoIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  Squares2X2Icon,
  MoonIcon,
  FilmIcon,
  CalendarIcon,
  CalendarDaysIcon,
  PlayIcon,
  FolderIcon,
  ViewColumnsIcon,
  ArrowsPointingOutIcon,
  EyeIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const toAbsoluteUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const clean = value.startsWith('/') ? value : `/${value}`;
  return `${API_BASE_URL}${clean}`;
};

const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return '';
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : url;
};

// Trilingual Helper
const getLocalized = (val, lang) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[lang] || val['ur'] || val['ar'] || val['en'] || Object.values(val)[0] || '';
};

// Sanitize AI-generated dummy text (e.g. "Gemini Generated Image Hsd5twhsd5twhsd5")
const sanitizeDisplayTitle = (rawTitle, fallbackDate, lang = 'en') => {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return fallbackDate || (lang === 'ur' ? 'مرکز اہل حدیث کوکن' : 'Markaz Ahle Hadees Kokan');
  }
  if (/gemini|ai\s*generated|hsd5|placeholder|untitled|screenshot|dall-e/i.test(rawTitle)) {
    return fallbackDate || (lang === 'ur' ? 'مرکز اہل حدیث کوکن - تصویری دستاویز' : 'Markaz Official Document');
  }
  return rawTitle;
};

const GalleryPage = () => {
  const { currentLanguage, t, isRtl, fontClass } = useLanguage();
  const [searchParams] = useSearchParams();

  const [albums, setAlbums] = useState([]);
  const [items, setItems] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active filters
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'photo' | 'video' | 'jumah' | 'moon'
  const [selectedAlbum, setSelectedAlbum] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Adjustable View State
  const [viewMode, setViewMode] = useState('masonry'); // 'masonry' | 'grid'
  const [density, setDensity] = useState('standard'); // 'compact' | 'standard' | 'large'
  const [fitMode, setFitMode] = useState('fit'); // 'fit' (full uncropped) | 'fill' (square cover)

  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxMode, setLightboxMode] = useState('fit'); // 'fit' (zero crop) | 'scroll' (vertical reading) | 'zoom'
  const [zoom, setZoom] = useState(1);
  const [visibleCount, setVisibleCount] = useState(30);

  // Reset pagination when album/year/type/search changes
  useEffect(() => {
    setVisibleCount(30);
  }, [selectedAlbum, selectedYear, selectedType, searchQuery]);

  // Reset zoom and mode on image switch
  useEffect(() => {
    setZoom(1);
    setLightboxMode('fit');
  }, [lightboxIndex]);

  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      const res = await galleryService.getPublicGallery();
      setAlbums(res.albums || []);
      setItems(res.items || []);
      setAvailableYears(res.available_years || []);
    } catch (err) {
      console.error('Error fetching gallery:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // Sync with URL params if ?album=... or ?image=... is provided
  useEffect(() => {
    const urlAlbum = searchParams.get('album');
    if (urlAlbum) setSelectedAlbum(urlAlbum);

    const urlType = searchParams.get('type');
    if (urlType) setSelectedType(urlType);

    const urlImage = searchParams.get('image');
    if (urlImage && items.length > 0) {
      const idx = items.findIndex((i) => i.id === urlImage);
      if (idx !== -1) setLightboxIndex(idx);
    }
  }, [searchParams, items]);

  // Counts for Category Tabs
  const counts = useMemo(() => {
    return {
      all: items.length,
      photo: items.filter((i) => (!i.item_type || i.item_type === 'photo') && !i.video_url).length,
      video: items.filter((i) => i.item_type === 'video' || Boolean(i.video_url)).length,
      jumah: items.filter((i) => i.item_type === 'jumah').length,
      moon: items.filter((i) => i.item_type === 'moon').length,
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type / Category filter
      if (selectedType !== 'all') {
        if (selectedType === 'video') {
          if (item.item_type !== 'video' && !item.video_url) return false;
        } else if (selectedType === 'photo') {
          if (item.item_type && item.item_type !== 'photo') return false;
          if (item.video_url) return false;
        } else {
          if (item.item_type !== selectedType) return false;
        }
      }

      // Album filter
      if (selectedAlbum !== 'all' && item.album_id !== selectedAlbum) {
        return false;
      }
      // Year filter
      if (selectedYear !== 'all' && String(item.year) !== String(selectedYear)) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tEn = (item.title?.en || item.title || '').toLowerCase();
        const tUr = (item.title?.ur || '').toLowerCase();
        const tAr = (item.title?.ar || '').toLowerCase();
        const cap = (item.caption?.en || item.caption?.ur || item.caption || '').toLowerCase();
        const yr = String(item.year || '');
        if (!tEn.includes(q) && !tUr.includes(q) && !tAr.includes(q) && !cap.includes(q) && !yr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedType, selectedAlbum, selectedYear, searchQuery]);

  const activeLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  const handleNextImage = useCallback(() => {
    if (lightboxIndex !== null && lightboxIndex < filteredItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0); // loop
    }
  }, [lightboxIndex, filteredItems.length]);

  const handlePrevImage = useCallback(() => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(filteredItems.length - 1); // loop
    }
  }, [lightboxIndex, filteredItems.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        setZoom(1);
        setLightboxMode('fit');
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) handleNextImage();
        else handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        if (isRtl) handlePrevImage();
        else handleNextImage();
      } else if (e.key === '+' || e.key === '=') {
        setLightboxMode('zoom');
        setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        setLightboxMode('zoom');
        setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)));
      } else if (e.key === '0') {
        setLightboxMode('fit');
        setZoom(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, isRtl, handleNextImage, handlePrevImage]);

  // WhatsApp Share Helper
  const shareWhatsApp = (item) => {
    const rawTitle = getLocalized(item.title, currentLanguage);
    const cleanTitle = sanitizeDisplayTitle(rawTitle, item.event_date, currentLanguage);
    const dateText = item.event_date ? ` (${item.event_date})` : '';
    const link = item.video_url || `${window.location.origin}/gallery?image=${item.id}`;
    const text = encodeURIComponent(`*${cleanTitle}${dateText}*\n${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Download Image Helper
  const downloadImage = (item) => {
    const imgUrl = toAbsoluteUrl(item.image_url);
    const rawTitle = getLocalized(item.title, currentLanguage);
    const cleanTitle = sanitizeDisplayTitle(rawTitle, 'poster', currentLanguage);
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `${cleanTitle.replace(/\s+/g, '_')}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grid / Masonry container classes
  const masonryContainerClass = useMemo(() => {
    switch (density) {
      case 'compact':
        return 'columns-2 sm:columns-3 md:columns-4 lg:columns-6 gap-3.5 space-y-3.5';
      case 'large':
        return 'columns-1 sm:columns-2 md:columns-2 lg:columns-3 gap-5 space-y-5';
      case 'standard':
      default:
        return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4';
    }
  }, [density]);

  const gridContainerClass = useMemo(() => {
    switch (density) {
      case 'compact':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3';
      case 'large':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5';
      case 'standard':
      default:
        return 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    }
  }, [density]);

  const activeRawTitle = activeLightboxItem ? getLocalized(activeLightboxItem.title, currentLanguage) : '';
  const activeDisplayTitle = activeLightboxItem
    ? sanitizeDisplayTitle(activeRawTitle, activeLightboxItem.event_date, currentLanguage)
    : '';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-50/50 pb-24 pt-6 sm:pt-10 ${fontClass}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 🌟 HERO HEADER */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#002147]/5 border border-[#002147]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#002147]">
            <PhotoIcon className="w-4 h-4 text-emerald-600" />
            <span>{t('gallery') || 'Photo Gallery'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            {t('gallery') || 'Markaz Gallery'}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {t('gallery_subtitle') ||
              'Events, Conferences, Library & Programs Showcase'}
          </p>

          {/* Search Input */}
          <div className="pt-2 max-w-md mx-auto relative">
            <MagnifyingGlassIcon className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_gallery') || 'Search photos or events...'}
              className={`w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
            />
          </div>
        </div>

        {/* 📂 MEDIA CATEGORIES & ALBUMS FILTER BAR */}
        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          {/* Category Tabs: All | Photos | Videos | Jumah List | Moon Date */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4 text-amber-400" />
              <span>All Media ({counts.all})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('photo')}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedType === 'photo'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <PhotoIcon className="w-4 h-4" />
              <span>Photos ({counts.photo})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('video')}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedType === 'video'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FilmIcon className="w-4 h-4" />
              <span>Videos ({counts.video})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('jumah')}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedType === 'jumah'
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4 text-emerald-300" />
              <span>Jumah List ({counts.jumah})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('moon')}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedType === 'moon'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <MoonIcon className="w-4 h-4 text-amber-300" />
              <span>Moon Date ({counts.moon})</span>
            </button>
          </div>

          {/* Albums Scrollable Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedAlbum('all')}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedAlbum === 'all'
                  ? 'bg-[#002147] text-white shadow-md shadow-[#002147]/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FolderIcon className="w-4 h-4" />
              <span>{t('all_albums') || 'All Albums'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedAlbum === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {items.length}
              </span>
            </button>

            {albums.map((album) => {
              const albumTitle = getLocalized(album.title, currentLanguage);
              const count = items.filter((i) => i.album_id === album.id).length;
              const isSelected = selectedAlbum === album.id;

              return (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => setSelectedAlbum(album.id)}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#002147] text-white shadow-md shadow-[#002147]/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{albumTitle}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Year Filter Pills (if multiple years exist) */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{t('filter_by_year') || 'Year'}:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedYear === 'all'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t('all_years') || 'All'}
              </button>

              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedYear === year
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* 🎛️ ADJUSTABLE VIEW CONTROLS (Layout Mode, Size & Fit) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* View Mode (Masonry vs Grid) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                {currentLanguage === 'ur' ? 'طرزِ نمائش:' : 'Layout:'}
              </span>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setViewMode('masonry')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'masonry'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show full posters without cropping"
                >
                  <ViewColumnsIcon className="w-4 h-4" />
                  <span>{currentLanguage === 'ur' ? 'مکمل پوسٹرز (بغیر کٹ)' : 'Full Posters (No Crop)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Uniform card grid"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  <span>{currentLanguage === 'ur' ? 'گرڈ' : 'Grid'}</span>
                </button>
              </div>

              {/* Fit vs Fill when Grid is active */}
              {viewMode === 'grid' && (
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setFitMode('fit')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      fitMode === 'fit'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {currentLanguage === 'ur' ? 'پورا دکھائیں' : 'Fit (Full)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFitMode('fill')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      fitMode === 'fill'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {currentLanguage === 'ur' ? 'فٹ (کراپ)' : 'Fill (Crop)'}
                  </button>
                </div>
              )}
            </div>

            {/* Density / Columns Size */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                {currentLanguage === 'ur' ? 'سائز:' : 'Size:'}
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    density === 'compact'
                      ? 'bg-white text-[#002147] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {currentLanguage === 'ur' ? 'چھوٹا' : 'Compact'}
                </button>

                <button
                  type="button"
                  onClick={() => setDensity('standard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    density === 'standard'
                      ? 'bg-white text-[#002147] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {currentLanguage === 'ur' ? 'درمیانہ' : 'Medium'}
                </button>

                <button
                  type="button"
                  onClick={() => setDensity('large')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    density === 'large'
                      ? 'bg-white text-[#002147] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {currentLanguage === 'ur' ? 'بڑا' : 'Large'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🖼️ PHOTO GRID & MASONRY DISPLAY */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-emerald-600 rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">Loading Gallery...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center space-y-3">
            <PhotoIcon className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">
              {t('no_photos_found') || 'No photos found in this category.'}
            </h3>
            {(selectedAlbum !== 'all' || selectedYear !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAlbum('all');
                  setSelectedYear('all');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-emerald-700 underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* MASONRY VIEW (Full Unclipped Posters) */}
            {viewMode === 'masonry' ? (
              <div className={masonryContainerClass}>
                {filteredItems.slice(0, visibleCount).map((item, index) => {
                  const rawTitle = getLocalized(item.title, currentLanguage);
                  const displayTitle = sanitizeDisplayTitle(rawTitle, item.event_date, currentLanguage);
                  const imgUrl = toAbsoluteUrl(item.image_url);

                  return (
                    <div
                      key={item.id}
                      className="break-inside-avoid mb-4 group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300"
                    >
                      <div
                        className="relative overflow-hidden cursor-pointer bg-slate-100"
                        onClick={() => setLightboxIndex(index)}
                      >
                        {/* Foreground Natural Proportion Image */}
                        <img
                          src={imgUrl}
                          alt={displayTitle || 'Gallery image'}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-contain block transition duration-500 group-hover:scale-[1.01]"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
                        />

                        {/* Top Badges */}
                        <div className={`absolute top-2.5 ${isRtl ? 'right-2.5' : 'left-2.5'} z-10 flex flex-wrap items-center gap-1.5`}>
                          {item.year && (
                            <span className="rounded-full bg-slate-900/85 text-white px-2 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-xs">
                              {item.year}
                            </span>
                          )}
                          {(item.item_type === 'video' || item.video_url) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
                              <PlayIcon className="w-3 h-3" />
                            </span>
                          )}
                          {item.item_type === 'jumah' && (
                            <span className="rounded-full bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
                              Jumah
                            </span>
                          )}
                          {item.item_type === 'moon' && (
                            <span className="rounded-full bg-amber-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
                              🌙 Moon
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay with Quick Actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 sm:p-4">
                          <div className="space-y-2">
                            <p className="text-white font-bold text-xs sm:text-sm line-clamp-2 leading-snug drop-shadow-sm">
                              {displayTitle}
                            </p>

                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxIndex(index);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/25 hover:bg-white text-white hover:text-slate-900 px-2.5 py-1 text-[11px] font-bold transition shadow-xs cursor-pointer backdrop-blur-xs"
                              >
                                <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                                <span>{currentLanguage === 'ur' ? 'دیکھیں' : 'Zoom'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  shareWhatsApp(item);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-bold transition shadow-xs cursor-pointer"
                              >
                                <ShareIcon className="w-3.5 h-3.5" />
                                <span>{currentLanguage === 'ur' ? 'شیئر' : 'Share'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(item);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/20 hover:bg-white/40 text-white px-2.5 py-1 text-[11px] font-bold transition shadow-xs cursor-pointer"
                              >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                <span>{currentLanguage === 'ur' ? 'محفوظ' : 'Save'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Caption Bar for Instant Readability */}
                      <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                            {displayTitle}
                          </h4>
                          {item.event_date && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.event_date}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer shrink-0"
                          title="View Full"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* GRID VIEW (Uniform Cards) */
              <div className={gridContainerClass}>
                {filteredItems.slice(0, visibleCount).map((item, index) => {
                  const rawTitle = getLocalized(item.title, currentLanguage);
                  const displayTitle = sanitizeDisplayTitle(rawTitle, item.event_date, currentLanguage);
                  const imgUrl = toAbsoluteUrl(item.image_url);

                  return (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col"
                    >
                      <div
                        onClick={() => setLightboxIndex(index)}
                        className={`relative w-full cursor-pointer bg-slate-100 overflow-hidden ${
                          density === 'compact' ? 'aspect-square' : 'aspect-[4/5]'
                        }`}
                      >
                        {/* Foreground Image */}
                        <img
                          src={imgUrl}
                          alt={displayTitle || 'Gallery image'}
                          loading="lazy"
                          decoding="async"
                          className={`w-full h-full transition duration-500 group-hover:scale-[1.03] ${
                            fitMode === 'fit' ? 'object-contain p-1.5' : 'object-cover'
                          }`}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
                        />

                        {/* Top Badges */}
                        <div className={`absolute top-2 ${isRtl ? 'right-2' : 'left-2'} z-10 flex flex-wrap items-center gap-1`}>
                          {item.year && (
                            <span className="rounded-full bg-slate-900/80 text-white px-2 py-0.5 text-[9px] font-bold backdrop-blur-md shadow-xs">
                              {item.year}
                            </span>
                          )}
                          {(item.item_type === 'video' || item.video_url) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 text-white px-1.5 py-0.5 text-[9px] font-bold">
                              <PlayIcon className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                          <p className="text-white font-bold text-xs line-clamp-2 leading-snug">
                            {displayTitle}
                          </p>

                          <div className="flex items-center gap-1.5 pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex(index);
                              }}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-slate-900 transition"
                              title="Zoom"
                            >
                              <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                shareWhatsApp(item);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                              title="Share"
                            >
                              <ShareIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(item);
                              }}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                          {displayTitle}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          className="text-slate-400 hover:text-emerald-700 transition"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More Button */}
            {visibleCount < filteredItems.length && (
              <div className="flex flex-col items-center justify-center pt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                  className="px-6 py-3 rounded-2xl bg-[#002147] text-white text-xs font-bold shadow-md hover:bg-[#003166] active:scale-95 transition cursor-pointer"
                >
                  Load More Photos ({visibleCount} of {filteredItems.length})
                </button>
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {Math.min(visibleCount, filteredItems.length)} of {filteredItems.length} items
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🔍 MODERN IMMERSIVE FULLSCREEN LIGHTBOX (Adaptive Zero-Crop Fit + Scroll Mode + Zoom) */}
      {activeLightboxItem && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-2xl animate-in fade-in duration-200 select-none overflow-hidden"
          onClick={() => {
            setLightboxIndex(null);
            setZoom(1);
            setLightboxMode('fit');
          }}
        >
          {/* Ambient Blurred Color Glow Backdrop */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <img
              src={toAbsoluteUrl(activeLightboxItem.image_url)}
              alt=""
              className="w-full h-full object-cover blur-3xl scale-125 transition-all duration-700"
            />
          </div>

          {/* 1. TOP FLOATING TOOLBAR */}
          <header
            className="relative z-30 flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-white/10 bg-slate-950/70 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Counter & Type */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-mono font-bold tracking-wider">
                {lightboxIndex + 1} / {filteredItems.length}
              </span>
              {activeLightboxItem.item_type && (
                <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-emerald-700/80 text-white text-[11px] font-bold capitalize">
                  {activeLightboxItem.item_type}
                </span>
              )}
            </div>

            {/* Center: View Mode Adjuster (Fit to Screen vs Scroll Document vs Zoom) */}
            {!activeLightboxItem.video_url && (
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/10 text-white text-xs font-bold">
                {/* Mode: Fit to screen without any cut */}
                <button
                  type="button"
                  onClick={() => {
                    setLightboxMode('fit');
                    setZoom(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    lightboxMode === 'fit'
                      ? 'bg-white text-emerald-950 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title="Fit whole image on screen (no crop)"
                >
                  <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                  <span>{currentLanguage === 'ur' ? 'مکمل اسکرین (Fit)' : 'Fit Screen'}</span>
                </button>

                {/* Mode: Scrollable document for tall posters */}
                <button
                  type="button"
                  onClick={() => {
                    setLightboxMode('scroll');
                    setZoom(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    lightboxMode === 'scroll'
                      ? 'bg-white text-emerald-950 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title="Vertical scrollable reading mode for tall timetables and documents"
                >
                  <ArrowsUpDownIcon className="w-3.5 h-3.5" />
                  <span>{currentLanguage === 'ur' ? 'سکرول موڈ (Scroll)' : 'Scroll Mode'}</span>
                </button>

                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center gap-0.5 border-l border-white/15 pl-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxMode('zoom');
                      setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)));
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <MagnifyingGlassMinusIcon className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLightboxMode('zoom');
                      setZoom(1);
                    }}
                    className="px-2 py-0.5 font-mono text-[11px] hover:bg-white/20 rounded-lg transition cursor-pointer"
                    title="Reset Zoom"
                  >
                    {lightboxMode === 'zoom' ? `${Math.round(zoom * 100)}%` : 'Zoom'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLightboxMode('zoom');
                      setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer"
                    title="Zoom In"
                  >
                    <MagnifyingGlassPlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Right: Actions & Close */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* WhatsApp Share */}
              <button
                type="button"
                onClick={() => shareWhatsApp(activeLightboxItem)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-md"
                title="Share on WhatsApp"
              >
                <ShareIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('share_whatsapp') || 'WhatsApp'}</span>
              </button>

              {/* Direct Download */}
              <button
                type="button"
                onClick={() => downloadImage(activeLightboxItem)}
                className="inline-flex items-center gap-1 rounded-xl bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-md border border-white/10"
                title="Download High-Res"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('download_photo') || 'Download'}</span>
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(null);
                  setZoom(1);
                  setLightboxMode('fit');
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Close (Esc)"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* 2. MAIN STAGE: ADAPTIVE PROPORTIONS (No Cut at Top or Bottom!) */}
          <main
            className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nav Arrows */}
            {filteredItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className={`absolute ${isRtl ? 'right-2 sm:right-5' : 'left-2 sm:left-5'} z-40 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95`}
                  title="Previous (Left Arrow)"
                >
                  {isRtl ? <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  className={`absolute ${isRtl ? 'left-2 sm:left-5' : 'right-2 sm:right-5'} z-40 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/15 shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95`}
                  title="Next (Right Arrow)"
                >
                  {isRtl ? <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>
              </>
            )}

            {/* Video or Image Presentation */}
            {activeLightboxItem.video_url ? (
              <div className="w-full max-w-4xl aspect-video max-h-[75vh] flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-2">
                <iframe
                  src={getYouTubeEmbedUrl(activeLightboxItem.video_url)}
                  title="YouTube Video Player"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : lightboxMode === 'fit' ? (
              /* FIT TO SCREEN: 100% UNCLIPPED (Neither top nor bottom is cut) */
              <div
                className="w-full h-full flex items-center justify-center p-2 sm:p-4"
                onDoubleClick={() => setLightboxMode('scroll')}
                title="Double-click to switch to Scroll Mode"
              >
                <img
                  src={toAbsoluteUrl(activeLightboxItem.image_url)}
                  alt={activeDisplayTitle}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl transition-all select-none"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : lightboxMode === 'scroll' ? (
              /* SCROLL DOCUMENT MODE: Perfect for tall flyers, Jumah lists, schedules */
              <div className="w-full h-full overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex flex-col items-center">
                <div className="w-full max-w-2xl my-auto">
                  <img
                    src={toAbsoluteUrl(activeLightboxItem.image_url)}
                    alt={activeDisplayTitle}
                    className="w-full h-auto object-contain rounded-2xl shadow-2xl block mx-auto transition-all"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            ) : (
              /* CUSTOM ZOOM & PAN MODE */
              <div className="w-full h-full overflow-auto p-4 flex items-center justify-center cursor-grab active:cursor-grabbing">
                <img
                  src={toAbsoluteUrl(activeLightboxItem.image_url)}
                  alt={activeDisplayTitle}
                  className="object-contain rounded-xl shadow-2xl transition-transform duration-150 select-none"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxHeight: zoom <= 1 ? '100%' : 'none',
                    maxWidth: zoom <= 1 ? '100%' : 'none',
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </main>

          {/* 3. BOTTOM CAPTION & THUMBNAILS FILMSTRIP */}
          <footer
            className="relative z-30 flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2 border-t border-white/10 bg-slate-950/70 backdrop-blur-md text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title & Metadata */}
            <div className="text-center max-w-2xl px-2">
              <h3 className={`text-xs sm:text-sm font-bold text-white tracking-wide ${currentLanguage === 'ur' ? 'font-urdu text-base' : ''}`}>
                {activeDisplayTitle}
              </h3>
              {activeLightboxItem.event_date && (
                <p className="text-[10px] font-mono text-emerald-400">
                  {activeLightboxItem.event_date}
                </p>
              )}
            </div>

            {/* Mini Thumbnails Filmstrip */}
            {filteredItems.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-3xl py-0.5 px-2 no-scrollbar">
                {filteredItems.map((thumb, idx) => {
                  const isActive = idx === lightboxIndex;
                  return (
                    <button
                      key={thumb.id}
                      type="button"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setZoom(1);
                        setLightboxMode('fit');
                      }}
                      className={`relative shrink-0 w-10 h-10 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        isActive
                          ? 'border-emerald-400 ring-2 ring-emerald-500/80 scale-105 opacity-100'
                          : 'border-white/20 opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img
                        src={toAbsoluteUrl(thumb.image_url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </footer>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
