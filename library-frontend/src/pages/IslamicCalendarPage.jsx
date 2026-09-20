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

const ISLAMIC_MONTHS = [
  { number: 1, key: 'muharram', ur: 'محرم الحرام', en: 'Muharram' },
  { number: 2, key: 'safar', ur: 'صفر المظفر', en: 'Safar' },
  { number: 3, key: 'rabi_al_awwal', ur: 'ربيع الأول', en: 'Rabi-ul-Awwal' },
  { number: 4, key: 'rabi_al_thani', ur: 'ربيع الثاني', en: 'Rabi-us-Sani' },
  { number: 5, key: 'jumada_al_awwal', ur: 'جمادى الأولى', en: 'Jumada al-Ula' },
  { number: 6, key: 'jumada_al_thani', ur: 'جمادى الثانية', en: 'Jumada al-Thani' },
  { number: 7, key: 'rajab', ur: 'رجب المرجب', en: 'Rajab' },
  { number: 8, key: 'shaban', ur: 'شعبان المعظم', en: "Sha'ban" },
  { number: 9, key: 'ramadan', ur: 'رمضان المبارک', en: 'Ramadan' },
  { number: 10, key: 'shawwal', ur: 'شوال المکرم', en: 'Shawwal' },
  { number: 11, key: 'dhul_qadah', ur: 'ذو القعدة', en: "Dhul Qi'dah" },
  { number: 12, key: 'dhul_hijjah', ur: 'ذو الحجة', en: 'Dhul Hijjah' },
];

export default function IslamicCalendarPage() {
  const { currentLang, isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState({
    current_calendar: null,
    items: [],
    month_definitions: ISLAMIC_MONTHS,
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const res = await galleryService.getCalendarArchive();
      setCalendarData(res);

      if (res?.current_calendar) {
        setSelectedItem(res.current_calendar);
        setSelectedMonthKey(res.current_calendar.hijri_month);
      } else if (res?.items && res.items.length > 0) {
        setSelectedItem(res.items[0]);
        setSelectedMonthKey(res.items[0].hijri_month);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const itemsByMonth = useMemo(() => {
    const map = {};
    (calendarData.items || []).forEach((item) => {
      const k = String(item.hijri_month || '').toLowerCase().trim();
      if (k) map[k] = item;
    });
    return map;
  }, [calendarData.items]);

  const handleSelectMonth = (monthDef) => {
    setSelectedMonthKey(monthDef.key);
    const item = itemsByMonth[monthDef.key];
    if (item) {
      setSelectedItem(item);
    } else {
      setSelectedItem(null);
    }
  };

  const resolveText = (val, lang = 'en', fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'object') {
      const preferred = lang === 'ar'
        ? (val.ar || val.ur || val.en)
        : lang === 'ur'
        ? (val.ur || val.en || val.ar)
        : (val.en || val.ur || val.ar);
      if (typeof preferred === 'string' && preferred.trim()) return preferred.trim();
      for (const k of ['ur', 'en', 'ar', ...Object.keys(val)]) {
        if (typeof val[k] === 'string' && val[k].trim()) return val[k].trim();
      }
      return fallback;
    }
    return String(val);
  };

  const handleShare = (e, item) => {
    if (e) e.stopPropagation();
    const title = resolveText(item?.title, currentLang) || item?.title_ur || item?.title_en || 'Islamic Calendar';
    const text = encodeURIComponent(`*${title}*\nMarkaz Ahle Hadees Kokan - Islamic Calendar\n` + window.location.href);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleDownload = (e, item) => {
    if (e) e.stopPropagation();
    const title = resolveText(item?.title, 'en') || item?.title_en || 'islamic-calendar';
    const link = document.createElement('a');
    link.href = resolveImageUrl(item.image_url);
    link.download = `${title}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activePoster = selectedItem || calendarData.current_calendar;
  const isLiveActive = activePoster?.id === calendarData.current_calendar?.id;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-6 sm:pt-10 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs">
            <CalendarDaysIcon className="w-4 h-4 text-emerald-600" />
            <span>
              {currentLang === 'ur'
                ? 'مرکز اہل حدیث کوکن • اسلامی تقویم'
                : 'Markaz Ahle Hadees Kokan • Islamic Calendar'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            {currentLang === 'ur' ? 'مرکز اہل حدیث کوکن — اسلامی کیلنڈر' : 'Markaz Ahle Hadees Kokan — Islamic Calendar'}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
            {currentLang === 'ur'
              ? 'سال کے بارہ مہینوں کا مستند اسلامی و ہجری کیلنڈر۔ نیچے دیے گئے مہینوں پر کلک کر کے کسی بھی ماہ کا کیلنڈر دیکھیں۔'
              : 'Official 12-month Hijri and Islamic calendar declarations. Select any month below to view and download posters.'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              12 Islamic Months (بارہ اسلامی مہینے)
            </h3>
            {calendarData.current_calendar && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Month: {resolveText(calendarData.current_calendar.title, currentLang) || calendarData.current_calendar.title_ur || calendarData.current_calendar.title_en || 'Islamic Calendar'}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {ISLAMIC_MONTHS.map((m) => {
              const uploadedItem = itemsByMonth[m.key];
              const isSelected = selectedMonthKey === m.key;
              const isCurrentLive = uploadedItem && uploadedItem.id === calendarData.current_calendar?.id;

              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => handleSelectMonth(m)}
                  className={`group relative flex flex-col items-start p-2.5 rounded-2xl border text-start transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                      : isCurrentLive
                      ? 'bg-emerald-50/70 border-emerald-300 text-slate-800 hover:bg-emerald-100/60'
                      : uploadedItem
                      ? 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                      : 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{m.number}
                    </span>
                    {isCurrentLive && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                        LIVE
                      </span>
                    )}
                  </div>

                  <span className="text-xs sm:text-sm font-urdu font-bold truncate w-full" dir="rtl">
                    {m.ur}
                  </span>
                  <span
                    className={`text-[11px] font-semibold truncate w-full ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {m.en}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-emerald-600 rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">Loading Islamic Calendar...</p>
          </div>
        ) : activePoster ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-md">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {isLiveActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                      <SparklesIcon className="w-3.5 h-3.5" />
                      <span>Current Active Month • جاری ماہ</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Archived Month</span>
                    </span>
                  )}
                  {activePoster.year && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {activePoster.year}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {resolveText(activePoster.title, currentLang) || activePoster.title_ur || activePoster.title_en || 'Islamic Calendar'}
                </h2>
                {(activePoster.caption_en || activePoster.caption_ur || activePoster.caption) && (
                  <p className="text-xs sm:text-sm text-slate-500">
                    {resolveText(activePoster.caption, currentLang) || activePoster.caption_ur || activePoster.caption_en}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>Full View (HD)</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownload(e, activePoster)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  title="Download Poster"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleShare(e, activePoster)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            <div
              onClick={() => setIsLightboxOpen(true)}
              className="group relative max-w-4xl mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/80 shadow-lg cursor-pointer flex items-center justify-center min-h-[360px] sm:min-h-[520px]"
            >
              <img
                src={resolveImageUrl(activePoster.image_url)}
                alt={activePoster.title_en || 'Islamic Calendar'}
                className="w-full h-auto max-h-[780px] object-contain transition-transform duration-500 group-hover:scale-101"
                loading="eager"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4 sm:p-6 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-white/95 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 shadow-md">
                  <MagnifyingGlassPlusIcon className="w-4 h-4 text-emerald-400" />
                  <span>Click to Zoom & View Full Poster</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">
              No calendar poster uploaded for this month yet.
            </h3>
            <p className="text-xs text-slate-500">
              The administration will publish the official Islamic calendar declaration for this month soon.
            </p>
          </div>
        )}

        {isLightboxOpen && activePoster && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div
              className="relative max-w-5xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 text-white">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm sm:text-base">
                    {activePoster.title_ur || activePoster.title_en}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, activePoster)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleShare(e, activePoster)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                    title="Share"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
                    title="Close"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center bg-black/90">
                <img
                  src={resolveImageUrl(activePoster.image_url)}
                  alt={activePoster.title_en}
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
