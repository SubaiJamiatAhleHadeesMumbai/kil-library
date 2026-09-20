import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  CheckBadgeIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import galleryService from '../api/galleryService';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const resolveImageUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const path = String(value);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

// 12 Canonical Islamic Months
const ISLAMIC_MONTHS = [
  { key: 'muharram', ur: 'محرم الحرام', ar: 'المحرم', en: 'Muharram', number: 1 },
  { key: 'safar', ur: 'صفر المظفر', ar: 'صفر', en: 'Safar', number: 2 },
  { key: 'rabi_al_awwal', ur: 'ربيع الأول', ar: 'ربيع الأول', en: 'Rabi-ul-Awwal', number: 3 },
  { key: 'rabi_al_thani', ur: 'ربيع الثاني', ar: 'ربيع الآخر', en: 'Rabi-us-Sani', number: 4 },
  { key: 'jumada_al_awwal', ur: 'جمادى الأولى', ar: 'جمادى الأولى', en: 'Jumada al-Ula', number: 5 },
  { key: 'jumada_al_thani', ur: 'جمادى الثانية', ar: 'جمادى الآخرة', en: 'Jumada al-Thani', number: 6 },
  { key: 'rajab', ur: 'رجب المرجب', ar: 'رجب', en: 'Rajab', number: 7 },
  { key: 'shaban', ur: 'شعبان المعظم', ar: 'شعبان', en: 'Sha\'ban', number: 8 },
  { key: 'ramadan', ur: 'رمضان المبارك', ar: 'رمضان', en: 'Ramadan', number: 9 },
  { key: 'shawwal', ur: 'شوال المکرم', ar: 'شوال', en: 'Shawwal', number: 10 },
  { key: 'dhul_qadah', ur: 'ذو القعدة', ar: 'ذو القعدة', en: 'Dhul Qi\'dah', number: 11 },
  { key: 'dhul_hijjah', ur: 'ذو الحجة', ar: 'ذو الحجة', en: 'Dhul Hijjah', number: 12 },
];

const MoonSightingPage = () => {
  const [archiveData, setArchiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [activeModalItem, setActiveModalItem] = useState(null);

  useEffect(() => {
    document.title = 'رؤیت ہلال | Ruyat-e-Hilal (Moon Sighting) - Markaz Ahle Hadees';
    loadArchive();
  }, []);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const res = await galleryService.getMoonArchive();
      const years = Array.isArray(res?.years) ? res.years : [];
      setArchiveData(years);
      if (years.length > 0) {
        setSelectedYear(years[0].year);
      } else {
        setSelectedYear('1448');
      }
    } catch (err) {
      console.error('Failed to load moon archive:', err);
    } finally {
      setLoading(false);
    }
  };

  // Available Hijri years (from data or standard defaults)
  const availableYears = useMemo(() => {
    const fromData = archiveData.map((y) => y.year);
    const defaults = ['1448', '1447', '1446'];
    const merged = Array.from(new Set([...fromData, ...defaults])).filter(Boolean);
    return merged.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [archiveData]);

  // Current year's items
  const currentYearData = useMemo(() => {
    const found = archiveData.find((y) => y.year === selectedYear);
    return found ? found.items : [];
  }, [archiveData, selectedYear]);

  // Map items to standard 12 months
  const monthMap = useMemo(() => {
    const map = {};
    currentYearData.forEach((item) => {
      const key = (item.hijri_month || '').toLowerCase().replace(/[- ]/g, '_');
      if (key) {
        map[key] = item;
      } else {
        // Fallback match by title or date if hijri_month is blank
        const lowerTitle = (item.title_en || item.title_ur || '').toLowerCase();
        const matched = ISLAMIC_MONTHS.find((m) => lowerTitle.includes(m.key) || lowerTitle.includes(m.en.toLowerCase()));
        if (matched) {
          map[matched.key] = item;
        }
      }
    });
    return map;
  }, [currentYearData]);

  const handleShare = (item) => {
    const title = item.title_en || item.title_ur || 'Moon Sighting Announcement';
    const dateText = item.event_date ? ` [Date: ${item.event_date}]` : '';
    const shareText = `📢 *${title}*${dateText}\nView the official Ruyat-e-Hilal circular at Markaz Islamic Library:\n${window.location.origin}/moon`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const downloadImage = async (url, title) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${title || 'moon_circular'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-900 text-white py-14 sm:py-20 border-b border-emerald-500/20">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-bold text-emerald-300 uppercase tracking-widest">
            <MoonIcon className="w-4 h-4 text-emerald-400" />
            <span>Islamic Hijri Calendar & Hilal Declarations</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-serif">
            <span className="block font-urdu text-4xl sm:text-6xl text-amber-300 mb-2">رؤیت ہلال</span>
            <span className="text-2xl sm:text-3xl font-sans font-bold text-slate-200">
              Ruyat-e-Hilal (Moon Sighting Announcements)
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            Official monthly Hilal sighting declarations, circulars, and Hijri calendar updates released by Markaz Jamiat Ahle Hadees.
          </p>

          <div className="pt-2 text-xs sm:text-sm text-emerald-200/80 font-arabic font-medium">
            ﴿ يَسْأَلُونَكَ عَنِ الْأَهِلَّةِ ۖ قُلْ هِيَ مَوَاقِيتُ لِلنَّاسِ وَالْحَجِّ ﴾
          </div>
        </div>
      </section>

      {/* 2. HIJRI YEAR SELECTOR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl p-3 shadow-lg border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
              Hijri Year (ہجری سال):
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {availableYears.map((yr) => {
              const isSelected = selectedYear === yr;
              const count = archiveData.find((y) => y.year === yr)?.items?.length || 0;

              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-urdu text-base">{yr} ھ</span>
                  <span className="text-xs font-sans">({yr} H)</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. 12 ISLAMIC MONTHS GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>{selectedYear} ھ کے تمام اسلامی مہینوں کے اعلانات</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Annual circular archive for the year {selectedYear} Hijri
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 rounded-3xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ISLAMIC_MONTHS.map((month) => {
              const item = monthMap[month.key];
              const isAvailable = Boolean(item && item.image_url);

              return (
                <div
                  key={month.key}
                  className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                    isAvailable
                      ? 'bg-white border-slate-200/90 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-emerald-400/60'
                      : 'bg-slate-50/60 border-dashed border-slate-200 shadow-none opacity-85'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {month.number}
                      </span>
                      <div>
                        <h3 className="font-urdu text-lg sm:text-xl font-black text-slate-900 leading-none">
                          {month.ur}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          {month.en} • {selectedYear} H
                        </p>
                      </div>
                    </div>

                    {isAvailable ? (
                      <span className="p-1 rounded-full text-emerald-600 bg-emerald-50">
                        <CheckBadgeIcon className="w-5 h-5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-full text-slate-300">
                        <ClockIcon className="w-5 h-5" />
                      </span>
                    )}
                  </div>

                  {/* Card Visual / Thumbnail */}
                  {isAvailable ? (
                    <div
                      onClick={() => setActiveModalItem(item)}
                      className="relative overflow-hidden aspect-[4/3] bg-slate-900 cursor-pointer m-3.5 rounded-2xl border border-slate-100"
                    >
                      <img
                        src={resolveImageUrl(item.image_url)}
                        alt={month.ur}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>بڑا پوسٹر دیکھیں</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] m-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/50 flex flex-col items-center justify-center text-center p-4">
                      <span className="text-3xl mb-1.5 opacity-40">🌙</span>
                      <p className="font-urdu text-sm font-bold text-slate-600">
                        اعلان کا انتظار
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Declaration Pending
                      </p>
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="p-4 pt-1 flex items-center justify-between gap-2">
                    {isAvailable ? (
                      <>
                        <div className="min-w-0">
                          {item.event_date && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                              <CalendarDaysIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{formatDate(item.event_date)}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleShare(item)}
                            className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <ShareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveModalItem(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <span>دیکھیں</span>
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        No circular uploaded yet
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. HIGH RESOLUTION LIGHTBOX MODAL */}
      {activeModalItem && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  🌙 رؤیت ہلال اعلان
                </span>
                {activeModalItem.event_date && (
                  <span className="text-white/90 text-xs font-semibold px-2.5 py-1 rounded-xl bg-white/10 border border-white/10">
                    📅 {formatDate(activeModalItem.event_date)}
                  </span>
                )}
                {activeModalItem.year && (
                  <span className="text-white/80 text-xs font-semibold font-urdu">
                    {activeModalItem.year} ھ
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image View */}
            <div className="relative flex-1 min-h-[320px] max-h-[66vh] bg-black/70 flex items-center justify-center overflow-auto p-3">
              <img
                src={resolveImageUrl(activeModalItem.image_url)}
                alt={activeModalItem.title_en || 'Moon Circular'}
                className="max-h-[63vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-white font-bold text-sm sm:text-base">
                  {activeModalItem.title_en || activeModalItem.title_ur || 'رؤیت ہلال اعلان'}
                </h4>
                {(activeModalItem.caption_en || activeModalItem.caption_ur) && (
                  <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                    {activeModalItem.caption_en || activeModalItem.caption_ur}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(resolveImageUrl(activeModalItem.image_url), activeModalItem.title_en)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(activeModalItem)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Share WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MoonSightingPage;
