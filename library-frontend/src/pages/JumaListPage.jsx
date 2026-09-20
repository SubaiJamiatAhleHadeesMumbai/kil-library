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
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import galleryService from '../api/galleryService';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

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

const WEEK_NAMES = {
  1: { en: '1st Friday', ur: 'یکم جمعہ (پہلا)', ar: 'الجمعة الأولى' },
  2: { en: '2nd Friday', ur: 'دوسرا جمعہ', ar: 'الجمعة الثانية' },
  3: { en: '3rd Friday', ur: 'تیسرا جمعہ', ar: 'الجمعة الثالثة' },
  4: { en: '4th Friday', ur: 'چوتھا جمعہ', ar: 'الجمعة الرابعة' },
  5: { en: '5th Friday', ur: 'پانچواں جمعہ', ar: 'الجمعة الخامسة' },
};

// Computes the exact 4 or 5 Fridays of any given month and year
const getMonthFridays = (yearStr, monthIndex) => {
  const y = parseInt(yearStr, 10) || 2026;
  const m = monthIndex - 1; // 0-indexed month
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const fridays = [];

  const monthsUr = [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
  ];
  const monthsEn = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(y, m, d);
    if (dateObj.getDay() === 5) { // 5 = Friday
      const weekIndex = fridays.length + 1;
      const dateStr = `${y}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      fridays.push({
        weekIndex,
        day: d,
        dateStr,
        formattedEn: `${d} ${monthsEn[m]} ${y}`,
        formattedUr: `${d}؍ ${monthsUr[m]} ${y}`,
        labelEn: WEEK_NAMES[weekIndex]?.en || `${weekIndex}th Friday`,
        labelUr: WEEK_NAMES[weekIndex]?.ur || `${weekIndex}واں جمعہ`,
        labelAr: WEEK_NAMES[weekIndex]?.ar || `الجمعة ${weekIndex}`,
      });
    }
  }
  return fridays;
};

const getFridaySlotLabel = (eventDate) => {
  if (!eventDate) return null;
  try {
    const clean = eventDate.trim();
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      if (parts[2].length === 4) {
        y = parseInt(parts[2], 10);
        m = parseInt(parts[1], 10);
      }
      if (y && m) {
        const fridays = getMonthFridays(y, m);
        const matched = fridays.find((f) => f.dateStr === clean || clean.includes(f.dateStr));
        if (matched) return matched;
      }
    }
  } catch {
    // fallback
  }
  return null;
};

// Matches an uploaded poster item to a specific Friday slot
const findItemForFriday = (friday, items) => {
  if (!items || items.length === 0) return null;

  // 1. Direct date match (YYYY-MM-DD or partial)
  const dateMatch = items.find((it) => {
    if (!it.event_date) return false;
    const clean = it.event_date.trim();
    if (clean === friday.dateStr) return true;
    if (clean.includes(friday.dateStr)) return true;

    // Check day match if month matches
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4 && parseInt(parts[0], 10) === friday.day) return true;
      if (parts[0].length === 4 && parseInt(parts[2], 10) === friday.day) return true;
    }
    return false;
  });
  if (dateMatch) return dateMatch;

  // 2. Keyword match (e.g. 1st, 2nd, etc.)
  const keywordsByWeek = {
    1: ['1st', 'first', 'یکم', 'اول', 'پہلا', 'پہلی', '#1'],
    2: ['2nd', 'second', 'دوم', 'دوسرا', 'دوسری', '#2'],
    3: ['3rd', 'third', 'سوم', 'تیسرا', 'تیسری', '#3'],
    4: ['4th', 'fourth', 'چہارم', 'چوتھا', 'چوتھی', '#4'],
    5: ['5th', 'fifth', 'پنجم', 'پانچواں', 'پانچویں', '#5'],
  };
  const kws = keywordsByWeek[friday.weekIndex] || [];
  const kwMatch = items.find((it) => {
    const text = `${it.title_en || ''} ${it.title_ur || ''} ${it.caption_en || ''} ${it.caption_ur || ''}`.toLowerCase();
    return kws.some((k) => text.includes(k));
  });
  if (kwMatch) return kwMatch;

  return null;
};

const JumaListPage = () => {
  const { currentLang, language, isRTL } = useLanguage();
  const activeLang = language || currentLang || 'en';
  const { uiSettings } = useTheme();

  const [archiveData, setArchiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [expandedMonths, setExpandedMonths] = useState({});
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Dynamic organization name from central settings
  const orgName = useMemo(() => {
    const raw = uiSettings?.site_subtitle || uiSettings?.site_title;
    if (raw && typeof raw === 'object') {
      return raw[activeLang] || raw.ur || raw.en || (activeLang === 'ur' ? 'مرکز اہل حدیث کوکن' : 'Markaz Ahle Hadees Kokan');
    }
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    return activeLang === 'ur' ? 'مرکز اہل حدیث کوکن' : activeLang === 'ar' ? 'مركز أهل الحديث كوكن' : 'Markaz Ahle Hadees Kokan';
  }, [uiSettings, activeLang]);

  useEffect(() => {
    document.title = activeLang === 'ur'
      ? `خطباتِ جمعہ کی لسٹ | ${orgName}`
      : activeLang === 'ar'
      ? `جدول خطب الجمعة | ${orgName}`
      : `Friday Sermons Schedule | ${orgName}`;
    loadArchive();
  }, [activeLang, orgName]);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const res = await galleryService.getJumahArchive();
      const years = Array.isArray(res?.years) ? res.years : [];
      setArchiveData(years);

      const currentCalYear = String(new Date().getFullYear());
      // Check if current year has data or is in list
      const currentYearItem = years.find((y) => String(y.year) === currentCalYear);

      if (currentYearItem && currentYearItem.total_items > 0) {
        setSelectedYear(currentCalYear);
      } else if (years.length > 0 && years[0].total_items > 0) {
        // Pick the most recent year with items
        const firstWithItems = years.find((y) => y.total_items > 0) || years[0];
        setSelectedYear(String(firstWithItems.year));
      } else {
        setSelectedYear(currentCalYear);
      }
    } catch (err) {
      console.error('Failed to load jumah archive:', err);
      setSelectedYear(String(new Date().getFullYear()));
    } finally {
      setLoading(false);
    }
  };

  // Available Years - ONLY show years that have data, plus current calendar year
  const availableYears = useMemo(() => {
    const currentCalYear = String(new Date().getFullYear());
    const fromData = archiveData
      .filter((y) => (y.total_items || 0) > 0)
      .map((y) => String(y.year))
      .filter(Boolean);

    const merged = Array.from(new Set([...fromData, currentCalYear])).filter(Boolean);
    return merged.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [archiveData]);

  // Current year data
  const currentYearData = useMemo(() => {
    const found = archiveData.find((y) => String(y.year) === String(selectedYear));
    return found || null;
  }, [archiveData, selectedYear]);

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

  // Months with search filter - ONLY keep months with uploaded items!
  const filteredMonths = useMemo(() => {
    if (!currentYearData || !currentYearData.months) {
      return [];
    }

    return currentYearData.months
      .map((m) => {
        const meta = GREGORIAN_MONTHS.find((gm) => gm.index === m.index) || {};
        let items = m.items || [];
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          items = items.filter((item) => {
            const tUr = (item.title_ur || resolveText(item.title, 'ur') || '').toLowerCase();
            const tEn = (item.title_en || resolveText(item.title, 'en') || '').toLowerCase();
            const cap = (item.caption_ur || resolveText(item.caption, 'ur') || item.caption_en || resolveText(item.caption, 'en') || '').toLowerCase();
            const d = (item.event_date || '').toLowerCase();
            return tUr.includes(q) || tEn.includes(q) || cap.includes(q) || d.includes(q);
          });
        }
        return {
          ...m,
          en: m.name_en || m.en || meta.en || `Month ${m.index}`,
          ur: m.name_ur || m.ur || meta.ur || '',
          ar: m.name_ar || m.ar || meta.ar || m.name_en || meta.en || '',
          items,
          count: items.length,
        };
      })
      .filter((m) => m.items.length > 0);
  }, [currentYearData, searchQuery]);

  // Auto-expand all months that have items
  useEffect(() => {
    const allWithData = {};
    filteredMonths.forEach((m) => {
      allWithData[m.index] = true;
    });
    setExpandedMonths(allWithData);
  }, [selectedYear, filteredMonths]);

  const currentYearTotal = useMemo(() => {
    return currentYearData?.total_items || 0;
  }, [currentYearData]);

  const matchingSearchCount = useMemo(() => {
    if (!searchQuery.trim()) return currentYearTotal;
    return filteredMonths.reduce((acc, m) => acc + (m.items?.length || 0), 0);
  }, [searchQuery, filteredMonths, currentYearTotal]);

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

  const getItemTitle = (item) => {
    if (!item) return '';
    const fallback = activeLang === 'ur' ? 'خطباتِ جمعہ شیڈول' : activeLang === 'ar' ? 'جدول خطب الجمعة' : 'Friday Sermons Schedule';
    if (activeLang === 'ur') {
      return item.title_ur || resolveText(item.title, 'ur') || item.title_en || fallback;
    }
    if (activeLang === 'ar') {
      return item.title_ar || resolveText(item.title, 'ar') || item.title_en || item.title_ur || fallback;
    }
    return item.title_en || resolveText(item.title, 'en') || item.title_ur || fallback;
  };

  const getItemCaption = (item) => {
    if (!item) return '';
    if (activeLang === 'ur') {
      return item.caption_ur || resolveText(item.caption, 'ur') || item.caption_en || '';
    }
    if (activeLang === 'ar') {
      return item.caption_ar || resolveText(item.caption, 'ar') || item.caption_en || item.caption_ur || '';
    }
    return item.caption_en || resolveText(item.caption, 'en') || item.caption_ur || '';
  };

  const handleShare = (e, item, friday = null) => {
    if (e) e.stopPropagation();
    const title = getItemTitle(item);
    const weekLabel = friday ? (activeLang === 'ur' ? friday.labelUr : friday.labelEn) : '';
    const dateStr = friday ? (activeLang === 'ur' ? friday.formattedUr : friday.formattedEn) : (item?.event_date ? (activeLang === 'ur' ? formatDateUrdu(item.event_date) : formatDateEnglish(item.event_date)) : '');
    const orgName = activeLang === 'ur' ? 'مرکز اہل حدیث کوکن' : 'Markaz Ahle Hadees Kokan';
    const text = `🕌 *${title}*${weekLabel ? `\n📅 ${weekLabel} (${dateStr})` : (dateStr ? `\n📅 ${dateStr}` : '')}\n🌐 ${orgName}\nhttps://www.ahlehadeeskokan.com/juma-list`;
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
            <span>
              {orgName} • {activeLang === 'ur'
                ? 'خطباتِ جمعہ آرکائیو'
                : activeLang === 'ar'
                ? 'أرشيف خطب الجمعة'
                : 'Friday Sermons Archive'}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white font-serif">
            {activeLang === 'ur'
              ? 'خطباتِ جمعہ کا شیڈول'
              : activeLang === 'ar'
              ? 'جدول خطب الجمعة الأسبوعي'
              : 'Friday Sermons Schedule'}
          </h1>
          <p className="text-sm sm:text-lg text-emerald-200/90 font-medium">
            {activeLang === 'ur'
              ? `مساجد کے خطبات، اوقات اور خطباء کا ہفتہ وار شیڈول (${selectedYear})`
              : activeLang === 'ar'
              ? `مواعيد خطب الجمعة وأسماء الخطباء والمساجد (${selectedYear})`
              : `Weekly Masjid Khutbah Timings & Speaker Schedules (${selectedYear})`}
          </p>

          {/* Quranic Ayah Box */}
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-4 sm:p-6 backdrop-blur-md shadow-lg">
            <p className="text-lg sm:text-2xl text-amber-200/95 font-arabic leading-loose tracking-wide dir-rtl" dir="rtl">
              ﴿ يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا نُودِيَ لِلصَّلَاةِ مِن يَوْمِ الْجُمُعَةِ فَاسْعَوْا إِلَىٰ ذِكْرِ اللَّهِ وَذَرُوا الْبَيْعَ ۚ ذَٰلِكُمْ خَيْرٌ لَّكُمْ إِن كُنتُمْ تَعْلَمُونَ ﴾
            </p>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed" dir={activeLang === 'en' ? 'ltr' : 'rtl'}>
              {activeLang === 'en'
                ? '"O you who have believed, when [the adhan] is called for the prayer on the day of Jumu\'ah, then proceed to the remembrance of Allah and leave trade. That is better for you, if you only knew." [Surah Al-Jumu\'ah: 9]'
                : activeLang === 'ar'
                ? '(سورة الجمعة: ٩)'
                : '"اے ایمان والو! جب جمعہ کے دن نماز کے لیے پکارا جائے تو اللہ کے ذکر کی طرف دوڑو اور خرید و فروخت چھوڑ دو، یہ تمہارے لیے زیادہ بہتر ہے اگر تم سمجھو۔" (سورۃ الجمعۃ: ۹)'}
            </p>
          </div>

          {/* Dynamic Year Switcher Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="text-xs uppercase font-bold text-slate-400 mr-2 flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-emerald-400" />
              {activeLang === 'ur' ? 'سال منتخب کریں:' : activeLang === 'ar' ? 'اختر السنة:' : 'Select Year:'}
            </span>
            {availableYears.map((yr) => {
              const isSelected = yr === selectedYear;
              const yearObj = archiveData.find((a) => String(a.year) === String(yr));
              const yearCount = yearObj?.total_items || 0;

              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-md flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400/50 shadow-emerald-900/40 scale-105'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <span>{yr} {activeLang === 'ur' ? 'ء' : activeLang === 'ar' ? 'م' : 'CE'}</span>
                  {yearCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {yearCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= CONTROLS & SEARCH BAR ================= */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-8 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          {/* Search Box with Clear Button */}
          <div className="relative w-full sm:w-96">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeLang === 'ur' ? 'تلاش کریں (مسجد، خطیب، موضوع یا تاریخ)...' : activeLang === 'ar' ? 'بحث (المسجد، الخطيب، أو التاريخ)...' : 'Search by mosque, khateeb, topic, or date...'}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              dir={activeLang === 'ur' || activeLang === 'ar' ? 'rtl' : 'ltr'}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full text-xs font-bold"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={expandAll}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              {activeLang === 'ur' ? 'تمام کھولیں (Expand All)' : activeLang === 'ar' ? 'توسيع الكل' : 'Expand All'}
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              {activeLang === 'ur' ? 'تمام سمیٹیں (Collapse All)' : activeLang === 'ar' ? 'طي الكل' : 'Collapse All'}
            </button>
          </div>
        </div>

        {/* Dynamic Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-2">
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {searchQuery.trim() ? (
                activeLang === 'ur'
                  ? `تلاش کے مطابق ${matchingSearchCount} خطبہ شیڈول ملے`
                  : activeLang === 'ar'
                  ? `تم العثور على ${matchingSearchCount} خطبة`
                  : `Found ${matchingSearchCount} matching sermon schedule(s)`
              ) : (
                activeLang === 'ur'
                  ? `سال ${selectedYear} میں کل ${currentYearTotal} خطبات شیڈول ہیں`
                  : activeLang === 'ar'
                  ? `إجمالي خطب سنة ${selectedYear}: ${currentYearTotal}`
                  : `Total ${currentYearTotal} sermon schedule(s) for year ${selectedYear}`
              )}
            </span>
          </div>

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
            >
              {activeLang === 'ur' ? 'فلٹر ختم کریں' : activeLang === 'ar' ? 'إلغاء التصفية' : 'Clear Filter'}
            </button>
          )}
        </div>
      </div>

      {/* ================= 12 MONTHS ACCORDIONS ================= */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">
              {activeLang === 'ur'
                ? 'خطباتِ جمعہ کی لسٹ لوڈ ہو رہی ہے...'
                : activeLang === 'ar'
                ? 'جارٍ تحميل جدول خطب الجمعة...'
                : 'Loading Friday Sermons schedule...'}
            </p>
          </div>
        ) : filteredMonths.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4 max-w-md mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-800/40 text-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              🕌
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {activeLang === 'ur'
                  ? `سال ${selectedYear} کے لیے فی الحال کوئی خطبہ شیڈول نہیں ہے`
                  : activeLang === 'ar'
                  ? `لا توجد جداول لسنة ${selectedYear}`
                  : `No Friday Sermons uploaded yet for ${selectedYear}`}
              </h3>
              <p className="text-xs text-slate-400">
                {activeLang === 'ur'
                  ? 'ایڈمن جب پوسٹر اپ لوڈ کریں گے تو وہ یہاں مہینے کے لحاظ سے ظاہر ہو جائے گا۔'
                  : 'Schedules will appear here automatically when uploaded by the admin.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMonths.map((m) => {
              const isExpanded = !!expandedMonths[m.index];

              return (
                <div
                  key={m.index}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-emerald-500/40 transition-all duration-300 shadow-md"
                >
                  {/* Accordion Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleMonth(m.index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left transition bg-gradient-to-r from-transparent hover:from-emerald-950/20 to-transparent cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {m.index}
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                          {activeLang === 'ur' ? (
                            <>
                              <span className="font-urdu">{m.ur}</span>
                              <span className="text-xs sm:text-sm font-normal text-slate-400">
                                ({m.en} {selectedYear})
                              </span>
                            </>
                          ) : (
                            <>
                              <span>{m.en}</span>
                              <span className="text-xs sm:text-sm font-normal text-slate-400">
                                ({m.ur} {selectedYear})
                              </span>
                            </>
                          )}
                        </h2>
                        <span className="text-[11px] text-emerald-400/90 font-medium">
                          {activeLang === 'ur'
                            ? `${m.items.length} خطبات دستیاب`
                            : activeLang === 'ar'
                            ? `${m.items.length} جداول متاحة`
                            : `${m.items.length} Schedule(s) Available`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          {activeLang === 'ur'
                            ? `${m.items.length} شیڈول`
                            : activeLang === 'ar'
                            ? `${m.items.length} جداول`
                            : `${m.items.length} Schedules`}
                        </span>
                      </span>

                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content - ONLY uploaded Friday posters */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 border-t border-slate-800/80 bg-slate-950/40">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-3">
                        {m.items.map((item) => {
                          const fridaySlot = getFridaySlotLabel(item.event_date);
                          const title = getItemTitle(item);
                          const caption = getItemCaption(item);
                          const imgUrl = resolveImageUrl(item.image_url);

                          return (
                            <div
                              key={item.id}
                              onClick={() => setActiveModalItem(item)}
                              className="group relative rounded-2xl border border-slate-800 bg-slate-900/95 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-emerald-950/30 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md"
                            >
                              {/* Top Week Label & Date Banner */}
                              <div className="px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>
                                    {fridaySlot
                                      ? (activeLang === 'ur' ? fridaySlot.labelUr : (activeLang === 'ar' ? fridaySlot.labelAr : fridaySlot.labelEn))
                                      : (activeLang === 'ur' ? 'خطبہ جمعہ' : 'Jumah Sermon')}
                                  </span>
                                </span>

                                <span className="text-[11px] font-medium text-slate-400">
                                  {fridaySlot
                                    ? (activeLang === 'ur' ? fridaySlot.formattedUr : fridaySlot.formattedEn)
                                    : (item.event_date ? (activeLang === 'ur' ? formatDateUrdu(item.event_date) : formatDateEnglish(item.event_date)) : item.year)}
                                </span>
                              </div>

                              {/* Poster Image */}
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
                                    <EyeIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    {activeLang === 'ur' ? 'پوسٹر دیکھیں (Full HD)' : activeLang === 'ar' ? 'عرض الملصق' : 'View Full HD'}
                                  </span>
                                </div>
                              </div>

                              {/* Card Bottom Details & Actions */}
                              <div className="p-3.5 space-y-2 flex-grow flex flex-col justify-between border-t border-slate-800/80 bg-slate-900/60">
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
                                    {title}
                                  </h4>
                                  {caption && (
                                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2" dir={activeLang === 'en' ? 'ltr' : 'rtl'}>
                                      {caption}
                                    </p>
                                  )}
                                </div>

                                <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveModalItem(item);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
                                  >
                                    <span>{activeLang === 'ur' ? 'پوسٹر دیکھیں' : activeLang === 'ar' ? 'عرض الملصق' : 'View'}</span>
                                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => handleShare(e, item, fridaySlot)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition cursor-pointer"
                                    title="Share via WhatsApp"
                                  >
                                    <ShareIcon className="w-3 h-3 text-emerald-400" />
                                    <span>{activeLang === 'ur' ? 'شیئر' : 'Share'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                      🕌 {activeLang === 'ur' ? 'خطباتِ جمعہ شیڈول' : activeLang === 'ar' ? 'جدول خطب الجمعة' : 'Friday Sermons Schedule'}
                    </span>
                    {activeModalItem.event_date && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10">
                        {activeLang === 'ur'
                          ? `${formatDateUrdu(activeModalItem.event_date)} (${formatDateEnglish(activeModalItem.event_date)})`
                          : formatDateEnglish(activeModalItem.event_date)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                    {getItemTitle(activeModalItem)}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(activeModalItem)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 cursor-pointer"
                    title="Download Poster"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleShare(e, activeModalItem)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
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
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 cursor-pointer"
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
                  alt={getItemTitle(activeModalItem)}
                  className="max-h-full max-w-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 bg-slate-900/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span>{activeLang === 'ur' ? 'زوم کنٹرول:' : activeLang === 'ar' ? 'التحكم بالتكبير:' : 'Zoom:'}</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-white">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                  >
                    +
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="text-right">
                  <span className="hidden sm:inline">
                    {activeLang === 'ur' ? 'مرکز اہل حدیث کوکن | ' : 'Markaz Ahle Hadees Kokan | '}
                  </span>
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
