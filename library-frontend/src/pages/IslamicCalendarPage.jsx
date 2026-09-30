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

export default function IslamicCalendarPage() {
  const { currentLang, isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState({
    current_calendar: null,
    items: [],
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

  // Only consider items that actually have an uploaded image
  const uploadedItems = useMemo(() => {
    return (calendarData.items || []).filter((item) => Boolean(item.image_url));
  }, [calendarData.items]);

  const activePoster = selectedItem || calendarData.current_calendar || (uploadedItems.length > 0 ? uploadedItems[0] : null);
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

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 py-4 sm:py-6 font-sans transition-colors" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-5xl px-3 sm:px-6 space-y-4 sm:space-y-5">
        
        {/* Compact Header */}
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
            <CalendarDaysIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              {currentLang === 'ur'
                ? 'مرکز اہل حدیث کوکن • ماہانہ و اسلامی تقویم'
                : 'Markaz Ahle Hadees Kokan • Monthly Calendar'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentLang === 'ur' ? 'مرکز اہل حدیث کوکن — ماہانہ کیلنڈر' : 'Markaz Ahle Hadees Kokan — Monthly Calendar'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {currentLang === 'ur'
              ? 'سرکاری ماہانہ تقویم و کیلنڈر۔ نیچے دیا گیا پوسٹر دیکھیں یا زوم کریں۔'
              : 'Official monthly Islamic calendar declarations and prayer schedules.'}
          </p>
        </div>

        {/* Uploaded Months Pills Selector — ONLY rendered if multiple images are uploaded */}
        {uploadedItems.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            {uploadedItems.map((item) => {
              const isSelected = activePoster?.id === item.id;
              const isLive = item.id === calendarData.current_calendar?.id;
              const label = getMonthDisplayName(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  <span>{label}</span>
                  {item.year && <span className="opacity-70 text-[10px]">({item.year})</span>}
                  {isLive && (
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      LIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block w-7 h-7 border-3 border-slate-300 border-t-emerald-600 rounded-full animate-spin mb-2" />
            <p className="text-xs font-semibold">Loading Calendar...</p>
          </div>
        ) : activePoster ? (
          /* ================= COMPACT CALENDAR VIEW ================= */
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden transition-all">
            
            {/* Top Info & Action Toolbar */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 min-w-0">
                {isLiveActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                    <SparklesIcon className="w-3 h-3" />
                    <span>{currentLang === 'ur' ? 'جاری ماہ • Live' : 'Live Month'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <CalendarDaysIcon className="w-3 h-3 text-slate-500" />
                    <span>{activePoster.year || ''}</span>
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
                  onClick={() => setIsLightboxOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
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
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Poster Canvas — Constrained Height so NO endless scroll is needed! */}
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="group relative bg-slate-950 flex items-center justify-center p-2 sm:p-4 cursor-pointer overflow-hidden select-none"
              style={{ maxHeight: 'calc(65vh)' }}
            >
              <img
                src={resolveImageUrl(activePoster.image_url)}
                alt={activePoster.title_en || 'Calendar Poster'}
                className="w-auto h-auto max-w-full max-h-[58vh] object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                loading="eager"
              />

              <div className="absolute bottom-3 end-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition shadow-md pointer-events-none">
                <MagnifyingGlassPlusIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Click to Zoom & View Fullscreen</span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State if NO posters uploaded at all */
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-3 max-w-lg mx-auto shadow-xs">
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
        )}

        {/* ================= FULLSCREEN LIGHTBOX MODAL ================= */}
        {isLightboxOpen && activePoster && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div
              className="relative max-w-5xl w-full bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 text-white">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-xs sm:text-sm">
                    {getMonthDisplayName(activePoster)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, activePoster)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleShare(e, activePoster)}
                    className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                    title="Share"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(false)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
                    title="Close"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center bg-black/90">
                <img
                  src={resolveImageUrl(activePoster.image_url)}
                  alt={activePoster.title_en || 'Calendar'}
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
