import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
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

const formatDateUrdu = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const monthsUr = [
        'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
        'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
      ];
      const day = d.getDate();
      const month = monthsUr[d.getMonth()];
      const year = d.getFullYear();
      return `${day}؍ ${month} ${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

const formatDateEnglish = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

const GREGORIAN_MONTHS = [
  { index: 1, key: 'january', ur: 'جنوری', en: 'January' },
  { index: 2, key: 'february', ur: 'فروری', en: 'February' },
  { index: 3, key: 'march', ur: 'مارچ', en: 'March' },
  { index: 4, key: 'april', ur: 'اپریل', en: 'April' },
  { index: 5, key: 'may', ur: 'مئی', en: 'May' },
  { index: 6, key: 'june', ur: 'جون', en: 'June' },
  { index: 7, key: 'july', ur: 'جولائی', en: 'July' },
  { index: 8, key: 'august', ur: 'اگست', en: 'August' },
  { index: 9, key: 'september', ur: 'ستمبر', en: 'September' },
  { index: 10, key: 'october', ur: 'اکتوبر', en: 'October' },
  { index: 11, key: 'november', ur: 'نومبر', en: 'November' },
  { index: 12, key: 'december', ur: 'دسمبر', en: 'December' },
];

const JumaListPage = () => {
  const [archiveData, setArchiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [expandedMonths, setExpandedMonths] = useState({});
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    document.title = 'خطبات جمعہ کی لسٹ | List of Friday Sermons - Subai Jamiat Ahle Hadees';
    loadArchive();
  }, []);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const res = await galleryService.getJumahArchive();
      const years = Array.isArray(res?.years) ? res.years : [];
      setArchiveData(years);
      if (years.length > 0) {
        setSelectedYear(years[0].year);
        // By default expand months that have items in the latest year
        const initExpanded = {};
        years[0].months.forEach((m) => {
          if (m.count > 0) {
            initExpanded[m.index] = true;
          }
        });
        setExpandedMonths(initExpanded);
      } else {
        setSelectedYear('2026');
      }
    } catch (err) {
      console.error('Failed to load jumah archive:', err);
    } finally {
      setLoading(false);
    }
  };

  // Available Years
  const availableYears = useMemo(() => {
    const fromData = archiveData.map((y) => y.year);
    const defaults = ['2026', '2025', '2024', '2023'];
    const merged = Array.from(new Set([...fromData, ...defaults])).filter(Boolean);
    return merged.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [archiveData]);

  // Current year data
  const currentYearData = useMemo(() => {
    const found = archiveData.find((y) => y.year === selectedYear);
    return found || null;
  }, [archiveData, selectedYear]);

  // Months with search filter
  const filteredMonths = useMemo(() => {
    if (!currentYearData) {
      return GREGORIAN_MONTHS.map((m) => ({
        ...m,
        items: [],
        count: 0,
      }));
    }

    return currentYearData.months.map((m) => {
      let items = m.items || [];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        items = items.filter((item) => {
          const tUr = (item.title_ur || '').toLowerCase();
          const tEn = (item.title_en || '').toLowerCase();
          const cap = (item.caption_ur || item.caption_en || '').toLowerCase();
          const d = (item.event_date || '').toLowerCase();
          return tUr.includes(q) || tEn.includes(q) || cap.includes(q) || d.includes(q);
        });
      }
      return {
        ...m,
        items,
        count: items.length,
      };
    });
  }, [currentYearData, searchQuery]);

  const toggleMonth = (monthIdx) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthIdx]: !prev[monthIdx],
    }));
  };

  const expandAll = () => {
    const all = {};
    GREGORIAN_MONTHS.forEach((m) => {
      all[m.index] = true;
    });
    setExpandedMonths(all);
  };

  const collapseAll = () => {
    setExpandedMonths({});
  };

  const handleShare = (e, item) => {
    if (e) e.stopPropagation();
    const title = item.title_ur || item.title_en || 'خطبات جمعہ شیڈول';
    const dateStr = item.event_date ? formatDateUrdu(item.event_date) : '';
    const imgUrl = resolveImageUrl(item.image_url);
    const text = `🕌 *${title}*\n📅 تاریخ: ${dateStr}\n🌐 صوبائی جمعیت اہل حدیث ممبئی\nتصویر دیکھیں: ${imgUrl}\nhttps://ahlehadeesmumbai.com/juma-list`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownload = async (item) => {
    try {
      const url = resolveImageUrl(item.image_url);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanDate = item.event_date ? item.event_date.replace(/[^a-zA-Z0-9]/g, '_') : 'schedule';
      link.download = `Jumah_Schedule_${cleanDate}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(resolveImageUrl(item.image_url), '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-20">
      {/* ================= HERO HEADER ================= */}
      <div className="relative overflow-hidden border-b border-emerald-500/20 bg-gradient-to-b from-emerald-950/70 via-slate-950/90 to-slate-950 px-4 pt-12 pb-14 sm:px-6 lg:px-8">
        {/* Islamic Glow & Pattern Decor */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-10 right-10 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-semibold tracking-wide shadow-inner">
            <BuildingOffice2Icon className="w-4 h-4 text-emerald-400" />
            <span>صوبائی جمعیت اہل حدیث ممبئی | خطبات جمعہ آرکائیو</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white font-urdu">
            خطباتِ جمعہ کی لسٹ
          </h1>
          <p className="text-sm sm:text-lg text-emerald-200/90 font-medium">
            List of Friday Sermons & Weekly Masjid Schedules ({selectedYear})
          </p>

          {/* Quranic Ayah Box */}
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-4 sm:p-6 backdrop-blur-md shadow-lg">
            <p className="text-lg sm:text-2xl text-amber-200/95 font-arabic leading-loose tracking-wide dir-rtl" dir="rtl">
              ﴿ يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا نُودِيَ لِلصَّلَاةِ مِن يَوْمِ الْجُمُعَةِ فَاسْعَوْا إِلَىٰ ذِكْرِ اللَّهِ وَذَرُوا الْبَيْعَ ۚ ذَٰلِكُمْ خَيْرٌ لَّكُمْ إِن كُنتُمْ تَعْلَمُونَ ﴾
            </p>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 font-urdu leading-relaxed dir-rtl" dir="rtl">
              "اے ایمان والو! جب جمعہ کے دن نماز کے لیے پکارا جائے تو اللہ کے ذکر کی طرف دوڑو اور خرید و فروخت چھوڑ دو، یہ تمہارے لیے زیادہ بہتر ہے اگر تم سمجھو۔" (سورۃ الجمعۃ: ۹)
            </p>
          </div>

          {/* Year Switcher Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="text-xs uppercase font-bold text-slate-400 mr-2 flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-emerald-400" />
              سال منتخب کریں:
            </span>
            {availableYears.map((yr) => {
              const isSelected = yr === selectedYear;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-5 py-2 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 cursor-pointer shadow-md ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400/50 shadow-emerald-900/40 scale-105'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <span>{yr} عیسوی</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= CONTROLS & SEARCH BAR ================= */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="تلاش کریں (مسجد، خطیب یا تاریخ)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              dir="rtl"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={expandAll}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              تمام کھولیں (Expand All)
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              تمام سمیٹیں (Collapse All)
            </button>
          </div>
        </div>
      </div>

      {/* ================= 12 MONTHS ACCORDIONS ================= */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">خطبات جمعہ کی لسٹ لوڈ ہو رہی ہے...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMonths.map((m) => {
              const isExpanded = !!expandedMonths[m.index];
              const hasItems = m.count > 0;

              return (
                <div
                  key={m.index}
                  className={`overflow-hidden rounded-2xl border transition-all duration-300 shadow-md ${
                    hasItems
                      ? 'border-slate-800 bg-slate-900/70 hover:border-emerald-500/40'
                      : 'border-slate-800/40 bg-slate-900/30 opacity-75'
                  }`}
                >
                  {/* Accordion Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleMonth(m.index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left transition bg-gradient-to-r from-transparent hover:from-emerald-950/20 to-transparent cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          hasItems
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {m.index}
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white font-urdu flex items-center gap-2">
                          <span>{m.ur}</span>
                          <span className="text-xs sm:text-sm font-normal text-slate-400">
                            ({m.en} {selectedYear})
                          </span>
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          hasItems
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {hasItems ? `${m.count} جمعہ شیڈول` : 'کوئی اعلان نہیں'}
                      </span>

                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 border-t border-slate-800/80 bg-slate-950/40">
                      {hasItems ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-3">
                          {m.items.map((item) => {
                            const dateUrdu = formatDateUrdu(item.event_date);
                            const dateEn = formatDateEnglish(item.event_date);
                            const title = item.title_ur || item.title_en || 'خطبات جمعہ شیڈول';
                            const imgUrl = resolveImageUrl(item.image_url);

                            return (
                              <div
                                key={item.id}
                                onClick={() => setActiveModalItem(item)}
                                className="group relative rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-emerald-950/30 cursor-pointer flex flex-col justify-between"
                              >
                                {/* Poster Image Container - Full Size Uncropped Containment */}
                                <div className="relative w-full aspect-[4/5] bg-black/80 flex items-center justify-center p-2 overflow-hidden">
                                  <img
                                    src={imgUrl}
                                    alt={title}
                                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-102"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-3 opacity-90 group-hover:opacity-100 transition-opacity">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-md">
                                      <EyeIcon className="w-3.5 h-3.5" />
                                      پوسٹر دیکھیں (Full HD)
                                    </span>
                                  </div>
                                </div>

                                {/* Content Details */}
                                <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                                        {dateUrdu || dateEn}
                                      </span>
                                    </div>
                                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                                      {title}
                                    </h3>
                                    {item.caption_ur && (
                                      <p className="text-xs text-slate-300 mt-1 line-clamp-2" dir="rtl">
                                        {item.caption_ur}
                                      </p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveModalItem(item);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
                                    >
                                      <span>پوسٹر دیکھیں</span>
                                      <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => handleShare(e, item)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition cursor-pointer"
                                      title="Share via WhatsApp"
                                    >
                                      <ShareIcon className="w-3.5 h-3.5" />
                                      <span>شیئر</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400 space-y-1">
                          <BuildingOffice2Icon className="w-8 h-8 mx-auto text-slate-600" />
                          <p className="text-sm">اس مہینے کے خطبات کا شیڈول فی الحال اپلوڈ نہیں ہوا۔</p>
                          <p className="text-xs text-slate-500">جیسے ہی مرکزی دفتر سے نیا شیڈول جاری ہوگا، یہاں ظاہر ہو جائے گا۔</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= FULL HD LIGHTBOX MODAL ================= */}
      {activeModalItem &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={() => {
              setActiveModalItem(null);
              setZoomLevel(1);
            }}
          >
            <div
              className="relative max-h-[95vh] max-w-5xl w-full flex flex-col rounded-3xl border border-white/15 bg-slate-950/95 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-slate-900/80">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      🕌 خطباتِ جمعہ شیڈول
                    </span>
                    {activeModalItem.event_date && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10">
                        {formatDateUrdu(activeModalItem.event_date)} ({formatDateEnglish(activeModalItem.event_date)})
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                    {activeModalItem.title_ur || activeModalItem.title_en}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(activeModalItem)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
                    title="Download Poster"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleShare(e, activeModalItem)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                    title="Share via WhatsApp"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModalItem(null);
                      setZoomLevel(1);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
                    title="Close"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Image Area with Zoom */}
              <div className="relative flex-1 overflow-auto bg-black/95 flex items-center justify-center p-2 min-h-[50vh] max-h-[75vh]">
                <img
                  src={resolveImageUrl(activeModalItem.image_url)}
                  alt={activeModalItem.title_en || 'Jumah Schedule Poster'}
                  className="max-h-full max-w-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 bg-slate-900/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span>زوم کنٹرول:</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono text-white">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    +
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-300"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="text-right">
                  <span className="hidden sm:inline">صوبائی جمعیت اہل حدیث ممبئی | </span>
                  <span className="text-emerald-400 font-semibold">Khutbaat-e-Jumu'ah</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default JumaListPage;
