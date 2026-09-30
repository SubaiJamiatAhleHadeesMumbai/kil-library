import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EyeIcon,
  XMarkIcon,
  SparklesIcon,
  MagnifyingGlassPlusIcon,
  Squares2X2Icon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import galleryService from '../api/galleryService';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const resolveImageUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const path = String(value);
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return API_BASE_URL + cleanPath;
};

const MONTH_METADATA = {
  january: { en: 'January', ur: 'جنوری', num: 1 },
  february: { en: 'February', ur: 'فروری', num: 2 },
  march: { en: 'March', ur: 'مارچ', num: 3 },
  april: { en: 'April', ur: 'اپریل', num: 4 },
  may: { en: 'May', ur: 'مئی', num: 5 },
  june: { en: 'June', ur: 'جون', num: 6 },
  july: { en: 'July', ur: 'جولائی', num: 7 },
  august: { en: 'August', ur: 'اگست', num: 8 },
  september: { en: 'September', ur: 'ستمبر', num: 9 },
  october: { en: 'October', ur: 'اکتوبر', num: 10 },
  november: { en: 'November', ur: 'نومبر', num: 11 },
  december: { en: 'December', ur: 'دسمبر', num: 12 },
  muharram: { en: 'Muharram', ur: 'محرم الحرام', num: 1 },
  safar: { en: 'Safar', ur: 'صفر المظفر', num: 2 },
  rabi_al_awwal: { en: 'Rabi-ul-Awwal', ur: 'ربيع الأول', num: 3 },
  rabi_al_thani: { en: 'Rabi-us-Sani', ur: 'ربيع الثاني', num: 4 },
  jumada_al_awwal: { en: 'Jumada al-Ula', ur: 'جمادى الأولى', num: 5 },
  jumada_al_thani: { en: 'Jumada al-Thani', ur: 'جمادى الثانية', num: 6 },
  rajab: { en: 'Rajab', ur: 'رجب المرجب', num: 7 },
  shaban: { en: "Sha'ban", ur: 'شعبان المعظم', num: 8 },
  ramadan: { en: 'Ramadan', ur: 'رمضان المبارک', num: 9 },
  shawwal: { en: 'Shawwal', ur: 'شوال المکرم', num: 10 },
  dhul_qadah: { en: "Dhul Qi'dah", ur: 'ذو القعدة', num: 11 },
  dhul_hijjah: { en: 'Dhul Hijjah', ur: 'ذو الحجة', num: 12 },
};

const getMonthNumber = (item) => {
  if (!item) return 99;
  const key = String(item.hijri_month || '').toLowerCase().trim();
  if (MONTH_METADATA[key]?.num) return MONTH_METADATA[key].num;
  return 99;
};

export default function IslamicCalendarPage() {
  const { currentLang, isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState({
    current_calendar: null,
    items: [],
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'grid'

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const res = await galleryService.getCalendarArchive();
      setCalendarData(res || { items: [] });

      const uploaded = (res?.items || []).filter((it) => Boolean(it.image_url));
      if (res?.current_calendar) {
        setSelectedItem(res.current_calendar);
      } else if (uploaded.length > 0) {
        setSelectedItem(uploaded[0]);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveText = (val, lang = 'en', fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'object') {
      const preferred =
        lang === 'ar'
          ? val.ar || val.ur || val.en
          : lang === 'ur'
          ? val.ur || val.en || val.ar
          : val.en || val.ur || val.ar;
      if (typeof preferred === 'string' && preferred.trim()) return preferred.trim();
      for (const k of ['ur', 'en', 'ar', ...Object.keys(val)]) {
        if (typeof val[k] === 'string' && val[k].trim()) return val[k].trim();
      }
      return fallback;
    }
    return String(val);
  };

  // Only consider items that actually have an uploaded image, sorted in sequence 1 to 12
  const sortedUploadedItems = useMemo(() => {
    const items = (calendarData.items || []).filter((item) => Boolean(item.image_url));
    return [...items].sort((a, b) => {
      const numA = getMonthNumber(a);
      const numB = getMonthNumber(b);
      if (numA !== numB) return numA - numB;
      return (a.year || 0) - (b.year || 0);
    });
  }, [calendarData.items]);

  const activePoster = selectedItem || calendarData.current_calendar || (sortedUploadedItems.length > 0 ? sortedUploadedItems[0] : null);
  const isLiveActive = activePoster?.id === calendarData.current_calendar?.id;

  const getMonthDisplayName = (item) => {
    if (!item) return '';
    const key = String(item.hijri_month || '').toLowerCase().trim();
    const meta = MONTH_METADATA[key];
    if (meta) {
      return currentLang === 'ur'
        ? `${meta.ur} (${meta.en})`
        : `${meta.en} (${meta.ur})`;
    }
    return resolveText(item.title, currentLang) || item.title_ur || item.title_en || item.hijri_month || 'Calendar';
  };

  const handleShare = (e, item) => {
    if (e) e.stopPropagation();
    const title = getMonthDisplayName(item);
    const text = encodeURIComponent(`*${title}*\nMarkaz Ahle Hadees Kokan — Calendar\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleDownload = (e, item) => {
    if (e) e.stopPropagation();
    const title = item?.title_en || item?.hijri_month || 'calendar';
    const link = document.createElement('a');
    link.href = resolveImageUrl(item.image_url);
    link.download = `${title}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openLightbox = (item) => {
    setLightboxItem(item || activePoster);
  };

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 py-4 sm:py-6 font-sans transition-colors min-h-[80vh]" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-6xl px-3 sm:px-6 space-y-4 sm:space-y-6">
        
        {/* Compact Header */}
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
            <CalendarDaysIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              {currentLang === 'ur'
                ? 'مرکز اہل حدیث کوکن • ماہانہ و سالانہ تقویم'
                : 'Markaz Ahle Hadees Kokan • Monthly Calendar'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentLang === 'ur' ? 'مرکز اہل حدیث کوکن — ماہانہ کیلنڈر' : 'Markaz Ahle Hadees Kokan — Monthly Calendar'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {currentLang === 'ur'
              ? 'سرکاری ماہانہ تقویم و کیلنڈر۔ تمام 12 مہینوں کے پوسٹر دیکھیں، محفوظ کریں اور شیئر کریں۔'
              : 'Official monthly Islamic calendar declarations and prayer schedules.'}
          </p>
        </div>

        {/* View Mode & Month Controls Toolbar */}
        {sortedUploadedItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <PhotoIcon className="w-4 h-4" />
                <span>{currentLang === 'ur' ? 'نمایاں پوسٹر ویو' : 'Featured Poster'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Squares2X2Icon className="w-4 h-4" />
                <span>{currentLang === 'ur' ? 'تمام مہینے گرڈ' : '12-Month Grid'}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  viewMode === 'grid' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {sortedUploadedItems.length}
                </span>
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {currentLang === 'ur'
                ? `کل ${sortedUploadedItems.length} مہینوں کے کیلنڈر دستیاب ہیں`
                : `${sortedUploadedItems.length} month calendars available`}
            </div>
          </div>
        )}

        {/* ================= SMOOTH SCROLLABLE MONTH STRIP ================= */}
        {sortedUploadedItems.length > 1 && (
          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
              {sortedUploadedItems.map((item) => {
                const isSelected = activePoster?.id === item.id;
                const isLive = item.id === calendarData.current_calendar?.id;
                const meta = MONTH_METADATA[String(item.hijri_month || '').toLowerCase().trim()];
                const monthNum = meta?.num;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      if (viewMode === 'grid') setViewMode('single');
                    }}
                    className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                      isSelected && viewMode === 'single'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-emerald-300'
                    }`}
                  >
                    {monthNum && (
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          isSelected && viewMode === 'single'
                            ? 'bg-emerald-800 text-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {monthNum}
                      </span>
                    )}
                    <span>{getMonthDisplayName(item)}</span>
                    {item.year && <span className="opacity-70 text-[10px]">({item.year})</span>}
                    {isLive && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                        LIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-3 border-slate-300 border-t-emerald-600 rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold">Loading Calendar...</p>
          </div>
        ) : sortedUploadedItems.length === 0 ? (
          /* Empty State if NO posters uploaded at all */
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-14 text-center space-y-3 max-w-lg mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
              <CalendarDaysIcon className="w-7 h-7" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
              {currentLang === 'ur' ? 'ابھی کوئی کیلنڈر پوسٹر دستیاب نہیں ہے' : 'No Calendar Posters Published Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {currentLang === 'ur'
                ? 'انتظامیہ کی جانب سے ماہانہ و اسلامی تقویم کا پوسٹر جلد جاری کیا جائے گا۔'
                : 'The administration will publish the official calendar poster soon. Please check back later.'}
            </p>
          </div>
        ) : viewMode === 'single' ? (
          /* ================= FEATURED SINGLE POSTER VIEW ================= */
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden transition-all">
            
            {/* Top Info & Action Toolbar */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 min-w-0">
                {isLiveActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-700 text-white shadow-2xs">
                    <SparklesIcon className="w-3 h-3" />
                    <span>{currentLang === 'ur' ? 'جاری ماہ • Live' : 'Live Month'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <CalendarDaysIcon className="w-3 h-3 text-slate-500" />
                    <span>{activePoster?.year || ''}</span>
                  </span>
                )}
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {getMonthDisplayName(activePoster)}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => openLightbox(activePoster)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Full View (HD)"
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Zoom HD</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownload(e, activePoster)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  title="Download Poster"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleShare(e, activePoster)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Poster Canvas — Clean theme-matching backdrop with soft shadow frame (No black void!) */}
            <div
              onClick={() => openLightbox(activePoster)}
              className="group relative bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-3 sm:p-6 cursor-pointer overflow-hidden select-none border-t border-slate-100 dark:border-slate-800/80"
              style={{ minHeight: '380px', maxHeight: 'calc(68vh)' }}
            >
              <img
                src={resolveImageUrl(activePoster?.image_url)}
                alt={activePoster?.title_en || 'Calendar Poster'}
                className="w-auto h-auto max-w-full max-h-[62vh] object-contain rounded-xl shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 transition-transform duration-300 group-hover:scale-[1.01]"
                loading="eager"
              />

              <div className="absolute bottom-3 end-3 bg-slate-900/85 dark:bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition shadow-md pointer-events-none">
                <MagnifyingGlassPlusIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentLang === 'ur' ? 'مکمل اسکرین دیکھنے کے لیے کلک کریں' : 'Click to Zoom & View Fullscreen'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= ALL 12 MONTHS GRID VIEW ================= */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {sortedUploadedItems.map((item) => {
                const isLive = item.id === calendarData.current_calendar?.id;
                const isSelected = activePoster?.id === item.id;
                const meta = MONTH_METADATA[String(item.hijri_month || '').toLowerCase().trim()];
                const monthNum = meta?.num;
                const label = getMonthDisplayName(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all duration-300 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                      isLive
                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/20'
                        : isSelected
                        ? 'border-slate-300 dark:border-slate-600'
                        : 'border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    {/* Month Card Header */}
                    <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2 min-w-0">
                        {monthNum && (
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            isLive
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {monthNum}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {label}
                          </h3>
                          {item.year && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {item.year}
                            </span>
                          )}
                        </div>
                      </div>

                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-700 text-white shadow-2xs animate-pulse flex-shrink-0">
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Image Preview Thumbnail */}
                    <div
                      onClick={() => openLightbox(item)}
                      className="group relative bg-slate-100/70 dark:bg-slate-800/60 aspect-[3/4] flex items-center justify-center p-2.5 cursor-pointer overflow-hidden select-none"
                    >
                      <img
                        src={resolveImageUrl(item.image_url)}
                        alt={label}
                        className="w-full h-full object-contain rounded-lg shadow-xs transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md">
                          <MagnifyingGlassPlusIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{currentLang === 'ur' ? 'دیکھیں' : 'View'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 bg-slate-50/40 dark:bg-slate-800/30 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setViewMode('single');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>{currentLang === 'ur' ? 'پوسٹر' : 'Poster'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleShare(e, item)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          title="Share"
                        >
                          <ShareIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= FULLSCREEN LIGHTBOX MODAL ================= */}
        {lightboxItem && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setLightboxItem(null)}
          >
            <div
              className="relative max-w-5xl w-full bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 text-white">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-xs sm:text-sm">
                    {getMonthDisplayName(lightboxItem)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, lightboxItem)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleShare(e, lightboxItem)}
                    className="p-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                    title="Share"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxItem(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
                    title="Close"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center bg-black/90">
                <img
                  src={resolveImageUrl(lightboxItem.image_url)}
                  alt={lightboxItem.title_en || 'Calendar'}
                  className="max-w-full max-h-[82vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
