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
  SparklesIcon,
  FilmIcon,
  CalendarIcon,
  FolderIcon,
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

// Trilingual Helper
const getLocalized = (val, lang) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[lang] || val['ur'] || val['ar'] || val['en'] || Object.values(val)[0] || '';
};

const GalleryPage = () => {
  const { currentLanguage, t, isRtl, fontClass } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [albums, setAlbums] = useState([]);
  const [items, setItems] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active filters
  const [selectedAlbum, setSelectedAlbum] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [visibleCount, setVisibleCount] = useState(24);

  // Reset pagination when album/year/search changes
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedAlbum, selectedYear, searchQuery]);

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

    const urlImage = searchParams.get('image');
    if (urlImage && items.length > 0) {
      const idx = items.findIndex((i) => i.id === urlImage);
      if (idx !== -1) setLightboxIndex(idx);
    }
  }, [searchParams, items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Album filter
      if (selectedAlbum !== 'all' && item.album_id !== selectedAlbum) {
        return false;
      }
      // Year filter
      if (selectedYear !== 'all' && String(item.year) !== String(selectedYear)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (
          getLocalized(item.title, currentLanguage) +
          ' ' +
          (item.title?.en || '') +
          ' ' +
          (item.title?.ur || '')
        ).toLowerCase();
        const caption = (
          getLocalized(item.caption, currentLanguage) +
          ' ' +
          (item.caption?.en || '') +
          ' ' +
          (item.caption?.ur || '')
        ).toLowerCase();
        if (!title.includes(q) && !caption.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedAlbum, selectedYear, searchQuery, currentLanguage]);

  // Active Lightbox Item
  const activeLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        if (isRtl) handlePrevImage();
        else handleNextImage();
      }
      if (e.key === 'ArrowLeft') {
        if (isRtl) handleNextImage();
        else handlePrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredItems.length, isRtl]);

  const handleNextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0); // loop
    }
  };

  const handlePrevImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(filteredItems.length - 1); // loop
    }
  };

  // WhatsApp Share Helper
  const shareWhatsApp = (item) => {
    const title = getLocalized(item.title, currentLanguage) || 'Markaz Gallery Photo';
    const link = `${window.location.origin}/gallery?image=${item.id}`;
    const text = encodeURIComponent(`*${title}*\n${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Download Image Helper
  const downloadImage = (item) => {
    const imgUrl = toAbsoluteUrl(item.image_url);
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `${getLocalized(item.title, currentLanguage) || 'gallery-photo'}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-50/50 pb-20 pt-6 sm:pt-10 ${fontClass}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 🌟 HERO HEADER */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#002147]/5 border border-[#002147]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#002147]">
            <SparklesIcon className="w-4 h-4 text-emerald-600" />
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
              className={`w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
            />
          </div>
        </div>

        {/* 📂 ALBUMS & YEAR FILTER BAR */}
        <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs">
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
        </div>

        {/* 🖼️ PHOTO GRID */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-3" />
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
                className="text-xs font-bold text-indigo-600 underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredItems.slice(0, visibleCount).map((item, index) => {
                const title = getLocalized(item.title, currentLanguage);
                const caption = getLocalized(item.caption, currentLanguage);
                const imgUrl = toAbsoluteUrl(item.image_url);

                return (
                  <div
                    key={item.id}
                    onClick={() => setLightboxIndex(index)}
                    className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-end aspect-4/3 sm:aspect-square"
                  >
                    {/* Ambient Glow */}
                    <div
                      className="absolute inset-0 bg-cover bg-center blur-lg opacity-40 scale-125 transition duration-500 group-hover:scale-135"
                      style={{ backgroundImage: `url(${imgUrl})` }}
                    />

                    {/* Foreground Image */}
                    <img
                      src={imgUrl}
                      alt={title || 'Gallery image'}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    {/* Dark Gradient Overlay for text contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition" />

                    {/* Video Icon Badge if video exists */}
                    {item.video_url && (
                      <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'} z-10 flex items-center gap-1 rounded-full bg-rose-600/90 text-white px-2.5 py-1 text-[10px] font-bold backdrop-blur-md`}>
                        <FilmIcon className="w-3.5 h-3.5" />
                        <span>Video</span>
                      </div>
                    )}

                    {/* Year Chip Badge */}
                    {item.year && (
                      <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} z-10 rounded-full bg-slate-900/70 text-slate-200 px-2 py-0.5 text-[10px] font-mono backdrop-blur-md`}>
                        {item.year}
                      </div>
                    )}

                    {/* Bottom Captions */}
                    <div className="relative z-10 p-4 space-y-1 text-white">
                      <h3 className="text-sm font-bold truncate group-hover:text-amber-300 transition-colors">
                        {title || 'Gallery Image'}
                      </h3>
                      {caption && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed opacity-90">
                          {caption}
                        </p>
                      )}
                      <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span className="text-amber-400 group-hover:underline">
                          {t('view_in_hd') || 'View HD'} →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {visibleCount < filteredItems.length && (
              <div className="flex flex-col items-center justify-center pt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 24)}
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

      {/* 🔍 FULLSCREEN LIGHTBOX MODAL */}
      {activeLightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[95vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between py-2 text-white px-2">
              <span className="text-xs font-mono text-slate-400">
                {lightboxIndex + 1} / {filteredItems.length}
              </span>

              <div className="flex items-center gap-2">
                {/* WhatsApp Share */}
                <button
                  type="button"
                  onClick={() => shareWhatsApp(activeLightboxItem)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-md"
                  title="Share on WhatsApp"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('share_whatsapp') || 'WhatsApp'}</span>
                </button>

                {/* Direct Download */}
                <button
                  type="button"
                  onClick={() => downloadImage(activeLightboxItem)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-md"
                  title="Download High-Res"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('download_photo') || 'Download'}</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Stage: Image or Video */}
            <div className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-slate-800 min-h-[300px] max-h-[75vh]">
              {/* Previous Button */}
              <button
                type="button"
                onClick={handlePrevImage}
                className={`absolute ${isRtl ? 'right-2 sm:right-4' : 'left-2 sm:left-4'} z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition cursor-pointer border border-slate-700 shadow-xl`}
              >
                {isRtl ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNextImage}
                className={`absolute ${isRtl ? 'left-2 sm:left-4' : 'right-2 sm:right-4'} z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition cursor-pointer border border-slate-700 shadow-xl`}
              >
                {isRtl ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
              </button>

              {activeLightboxItem.video_url ? (
                <div className="w-full h-full aspect-video">
                  <iframe
                    src={activeLightboxItem.video_url}
                    title="Video Player"
                    className="w-full h-full rounded-2xl"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={toAbsoluteUrl(activeLightboxItem.image_url)}
                  alt={getLocalized(activeLightboxItem.title, currentLanguage)}
                  className="max-h-[72vh] max-w-full object-contain p-1 rounded-xl"
                />
              )}
            </div>

            {/* Bottom Caption Bar */}
            <div className="w-full mt-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-white text-center space-y-1">
              <h3 className="text-base font-black text-amber-300">
                {getLocalized(activeLightboxItem.title, currentLanguage)}
              </h3>
              {activeLightboxItem.caption && (
                <p className="text-xs text-slate-300 max-w-3xl mx-auto leading-relaxed">
                  {getLocalized(activeLightboxItem.caption, currentLanguage)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
