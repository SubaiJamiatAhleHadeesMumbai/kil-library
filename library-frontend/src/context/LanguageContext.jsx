import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import translationService from '../api/translationService';
import enLocale from '../locales/en.json';
import urLocale from '../locales/ur.json';
import arLocale from '../locales/ar.json';
import { formatLocalizedDate, formatLocalizedNumber } from '../utils/i18nFormatters';

export const LANGUAGES = [
  { code: 'ar', name: 'العربية', nativeName: 'العربية', dir: 'rtl', label: 'العربية', fontClass: 'font-arabic' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', label: 'English', fontClass: 'font-sans' },
  { code: 'ur', name: 'اردو', nativeName: 'اردو', dir: 'rtl', label: 'اردو', fontClass: 'font-urdu' },
];

// Helper to deeply extract nested values like 'nav.home'
const getDeepValue = (obj, path) => {
  if (!obj || !path) return null;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return typeof current === 'string' ? current : null;
};

// Flatten helper to make nested keys available flatly as well
const flattenLocale = (obj, prefix = '') => {
  const result = {};
  for (const [key, value] of Object.entries(obj || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenLocale(value, fullKey));
    } else {
      result[fullKey] = value;
      // also populate flat key for backward compatibility
      if (!result[key]) {
        result[key] = value;
      }
    }
  }
  return result;
};

const JSON_TRANSLATIONS = {
  en: flattenLocale(enLocale),
  ur: flattenLocale(urLocale),
  ar: flattenLocale(arLocale),
};

export const TRANSLATIONS = {
  en: {
    home: "Home",
    library: "Library",
    about: "About",
    gallery: "Gallery",
    fatawa: "Fatawa",
    education: "Education",
    activities: "Activities",
    social_work: "Social Work",
    clippings: "Newspaper Clippings",
    authors: "Authors",
    publishers: "Publishers",
    updates: "Updates",
    history: "History",
    donate: "Donate",
    login: "Log In",
    logout: "Log Out",
    profile: "My Profile",
    admin_dashboard: "Admin Dashboard",
    search: "Search books, authors...",
    read_book: "Read Online",
    download_pdf: "Download PDF",
    download_offline: "Download Offline PDF",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    clear: "Clear",
    categories: "Categories",
    all_books: "All Books",
    our_projects: "Our Projects",
    database: "Database",
    markaz_title: "Markaz Library",
    markaz_sub: "Ahle Hadees Kokan",
    other: "Other",
    search_btn: "Search",
    search_placeholder: "Search books, fatawa, education, welfare drives, authors...",
    search_all: "All Results",
    search_books: "Books",
    search_fatawa: "Fatawa",
    search_education: "Education",
    search_social_work: "Social Work",
    search_activities: "Activities",
    searching_markaz: "Searching Markaz database...",
    no_search_results: "No results found for",
    our_publications: "Our Publications (Markaz Dawah)",
    markaz_org_name: "Markaz Dawah Al-Islamiyyah wal-Khayriyyah",
    folders: "Folders & Topics",
    read_more: "Read More",
    show_less: "Show Less",
    open_full_about: "Open Full Page",
    all_albums: "All Albums",
    all_photos: "All Photos",
    filter_by_year: "Filter by Year",
    all_years: "All Years",
    slideshow: "Slideshow",
    download_photo: "Download",
    share_whatsapp: "Share on WhatsApp",
    view_full_gallery: "Explore Full Gallery",
    photo_count: "Photos",
    no_photos_found: "No photos found in this category.",
    view_in_hd: "View HD",
    search_gallery: "Search photos or events...",
    ask_question: "Ask a Question",
    verified_fatwa: "Verified Fatwa",
    all_drives: "All Welfare Initiatives",
    event_date: "Date",
    location: "Location / Venue",
    newspaper_name: "Newspaper",
    edition_date: "Edition Date",
    zoom_clipping: "View High-Res",
    ...JSON_TRANSLATIONS.en,
  },
  ur: {
    home: "صفحہ اول",
    library: "کتب خانہ",
    about: "ہمارے متعلق",
    gallery: "نگارخانہ",
    fatawa: "فتاویٰ",
    education: "تعلیم",
    activities: "سرگرمیاں",
    social_work: "سماجی خدمات",
    clippings: "اخبارات کے تراشے",
    authors: "مصنفین",
    publishers: "ناشرین",
    updates: "تازہ ترین",
    history: "مطالعہ ریکارڈ",
    donate: "تعاون کریں",
    login: "لاگ ان",
    logout: "لاگ آؤٹ",
    profile: "میری پروفائل",
    admin_dashboard: "ایڈمن ڈیش بورڈ",
    search: "کتابیں یا مصنفین تلاش کریں...",
    read_book: "آن لائن پڑھیں",
    download_pdf: "پی ڈی ایف ڈاؤن لوڈ",
    download_offline: "آف لائن کاپی حاصل کریں",
    save: "محفوظ کریں",
    cancel: "منسوخ",
    close: "بند کریں",
    clear: "صاف کریں",
    categories: "زمرہ جات",
    all_books: "تمام کتب",
    our_projects: "ہمارے منصوبے",
    database: "ڈیٹا بیس",
    markaz_title: "مرکز لائبریری",
    markaz_sub: "اہل حدیث کوکن",
    other: "دیگر",
    search_btn: "تلاش کریں",
    search_placeholder: "کتب، فتاویٰ، تعلیمی پروگرام، سماجی خدمات تلاش کریں...",
    search_all: "تمام نتائج",
    search_books: "کتب",
    search_fatawa: "فتاویٰ",
    search_education: "تعلیم",
    search_social_work: "سماجی خدمات",
    search_activities: "سرگرمیاں",
    searching_markaz: "مرکز ڈیٹا بیس میں تلاش جاری ہے...",
    no_search_results: "کوئی نتیجہ نہیں ملا برائے",
    our_publications: "ہماری مطبوعات (مرکز الدعوۃ)",
    markaz_org_name: "مرکز الدعوۃ الاسلامیہ والخیریہ",
    folders: "فولڈرز اور موضوعات",
    read_more: "مزید پڑھیں",
    show_less: "مختصر کریں",
    open_full_about: "مکمل صفحہ کھولیں",
    all_albums: "تمام البم",
    all_photos: "تمام تصاویر",
    filter_by_year: "سال کے لحاظ سے",
    all_years: "تمام سال",
    slideshow: "سلائیڈ شو",
    download_photo: "ڈاؤن لوڈ",
    share_whatsapp: "واٹس ایپ شیئر",
    view_full_gallery: "مکمل نگارخانہ دیکھیں",
    photo_count: "تصاویر",
    no_photos_found: "اس زمرے میں فی الحال کوئی تصویر موجود نہیں ہے۔",
    view_in_hd: "بڑی تصویر دیکھیں",
    search_gallery: "تصاویر یا ایونٹ تلاش کریں...",
    ask_question: "سوال پوچھیں",
    verified_fatwa: "مستند فتویٰ",
    all_drives: "تمام رفاہی سرگرمیاں",
    event_date: "تاریخ",
    location: "مقام",
    newspaper_name: "اخبار کا نام",
    edition_date: "اشاعت کی تاریخ",
    zoom_clipping: "بڑا کر کے دیکھیں",
    ...JSON_TRANSLATIONS.ur,
  },
  ar: {
    home: "الرئيسية",
    library: "المكتبة",
    about: "من نحن",
    gallery: "معرض الصور",
    fatawa: "الفتاوى",
    education: "التعليم",
    activities: "الأنشطة",
    social_work: "العمل الخيري",
    clippings: "القصاصات الصحفية",
    authors: "المؤلفون",
    publishers: "دور النشر",
    updates: "التحديثات",
    history: "السجل",
    donate: "تبرع",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    profile: "الملف الشخصي",
    admin_dashboard: "لوحة الإدارة",
    search: "البحث في الكتب والمؤلفين...",
    read_book: "قراءة مباشرة",
    download_pdf: "تحميل PDF",
    download_offline: "نسخة للقراءة بدون إنترنت",
    save: "حفظ",
    cancel: "إلغاء",
    close: "إغلاق",
    clear: "مسح",
    categories: "الأقسام",
    all_books: "جميع الكتب",
    our_projects: "مشاريعنا",
    database: "قاعدة البيانات",
    markaz_title: "مكتبة المركز",
    markaz_sub: "أهل الحديث كوكان",
    other: "أخرى",
    search_btn: "بحث",
    search_placeholder: "ابحث في الكتب، الفتاوى، البرامج التعليمية، والأنشطة...",
    search_all: "جميع النتائج",
    search_books: "الكتب",
    search_fatawa: "الفتاوى",
    search_education: "التعليم",
    search_social_work: "العمل الاجتماعي",
    search_activities: "الأنشطة",
    searching_markaz: "جاري البحث في قاعدة بيانات المركز...",
    no_search_results: "لم يتم العثور على نتائج لـ",
    our_publications: "إصداراتنا (مركز الدعوة)",
    markaz_org_name: "مركز الدعوة الإسلامية والخيرية",
    folders: "المجلدات والمواضيع",
    read_more: "المزيد",
    show_less: "أقل",
    open_full_about: "فتح الصفحة كاملة",
    all_albums: "جميع الألبومات",
    all_photos: "جميع الصور",
    filter_by_year: "تصفية حسب السنة",
    all_years: "جميع السنوات",
    slideshow: "عرض الشرائح",
    download_photo: "تحميل",
    share_whatsapp: "مشاركة واتساب",
    view_full_gallery: "استعراض المعرض بالكامل",
    photo_count: "الصور",
    no_photos_found: "لا توجد صور في هذا القسم حالياً.",
    view_in_hd: "عرض بجودة عالية",
    search_gallery: "البحث في الصور والفعاليات...",
    ask_question: "طرح سؤال",
    verified_fatwa: "فتوى معتمدة",
    all_drives: "كافة المشاريع الإغاثية",
    event_date: "التاريخ",
    location: "المكان",
    newspaper_name: "اسم الصحيفة",
    edition_date: "تاريخ الإصدار",
    zoom_clipping: "عرض القصاصة بدقة عالية",
    ...JSON_TRANSLATIONS.ar,
  }
};

export const LanguageContext = createContext({
  currentLang: 'en',
  currentLanguage: LANGUAGES[1],
  languages: LANGUAGES,
  changeLanguage: () => {},
  resetToEnglish: () => {},
  isRTL: false,
  isAdmin: false,
  t: () => '',
  formatDate: () => '',
  formatNumber: () => '',
  reloadTranslations: () => {}
});

export const LanguageProvider = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // Load language preference from cookie or localStorage
  const [currentLang, setCurrentLang] = useState(() => {
    try {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)kil_locale=([^;]+)/);
      if (cookieMatch && ['ur', 'ar', 'en'].includes(cookieMatch[1])) {
        return cookieMatch[1];
      }
      const saved = localStorage.getItem('kil_language') || localStorage.getItem('kil_locale');
      if (saved && ['ur', 'ar', 'en'].includes(saved)) {
        return saved;
      }
      // Browser language detection
      const browserLang = navigator.language || navigator.userLanguage || '';
      if (browserLang.startsWith('ur')) return 'ur';
      if (browserLang.startsWith('ar')) return 'ar';
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setLocaleCookies = (lang) => {
    try {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;

      // Persist chosen locale
      document.cookie = `kil_locale=${lang}; path=/; max-age=31536000; SameSite=Lax;`;

      const clearCookie = (name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
      };

      clearCookie('googtrans');
      clearCookie('googtrans_en');
      clearCookie('googtrans_ur');
      clearCookie('googtrans_ar');

      if (lang && lang !== 'en') {
        const val = `/en/${lang}`;
        document.cookie = `googtrans=${val}; path=/; max-age=31536000;`;
        document.cookie = `googtrans=${val}; path=/; domain=${hostname}; max-age=31536000;`;
        document.cookie = `googtrans=${val}; path=/; domain=.${rootDomain}; max-age=31536000;`;
      }
    } catch (e) {
      console.warn('Failed to set translation cookies:', e);
    }
  };

  const applyLanguage = (langCode) => {
    if (isAdmin) {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      document.body.classList.remove('lang-ur', 'lang-ar', 'font-urdu', 'font-arabic');
      document.body.classList.add('lang-en');
      return;
    }

    const langObj = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
    
    document.documentElement.dir = langObj.dir;
    document.documentElement.lang = langObj.code;

    document.body.classList.remove('lang-ur', 'lang-ar', 'lang-en', 'font-urdu', 'font-arabic');
    document.body.classList.add(`lang-${langObj.code}`);
    if (langObj.code === 'ur') document.body.classList.add('font-urdu');
    if (langObj.code === 'ar') document.body.classList.add('font-arabic');

    setLocaleCookies(langObj.code);
  };

  // ✅ ZERO-RELOAD INSTANT LANGUAGE SWITCHER
  const changeLanguage = (langCode) => {
    const target = ['ur', 'ar', 'en'].includes(langCode) ? langCode : 'en';
    setCurrentLang(target);
    localStorage.setItem('kil_language', target);
    localStorage.setItem('kil_locale', target);
    setLocaleCookies(target);
    applyLanguage(target);

    // Sync Google Translate combobox if present
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = target;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const resetToEnglish = () => {
    setCurrentLang('en');
    localStorage.setItem('kil_language', 'en');
    localStorage.setItem('kil_locale', 'en');
    setLocaleCookies('en');
    applyLanguage('en');
  };

  // Dynamic translations loaded from backend CMS
  const [dynamicTranslations, setDynamicTranslations] = useState(() => {
    try {
      const cached = localStorage.getItem('kil_dynamic_translations');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const reloadTranslations = useCallback(async () => {
    try {
      const data = await translationService.getDictionary();
      if (data && (data.en || data.ur || data.ar)) {
        setDynamicTranslations(data);
        localStorage.setItem('kil_dynamic_translations', JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Dynamic translations fetch notice:", err);
    }
  }, []);

  useEffect(() => {
    reloadTranslations();
  }, [reloadTranslations]);

  useEffect(() => {
    applyLanguage(currentLang);
  }, [currentLang, location.pathname]);

  const activeLangObj = useMemo(() => {
    return LANGUAGES.find(l => l.code === currentLang) || LANGUAGES.find(l => l.code === 'en') || LANGUAGES[0];
  }, [currentLang]);

  // ✅ ENHANCED SMART TRANSLATION HELPER (Nested Path + Flat Key + Dynamic CMS Fallback)
  const t = (key, fallbackText) => {
    if (!key) return '';

    // 1. Direct dynamic lookup in current language
    if (dynamicTranslations?.[currentLang]?.[key]) {
      return dynamicTranslations[currentLang][key];
    }

    // 2. Short key lookup if key has namespace (e.g. 'navbar.home' -> 'home')
    const shortKey = key.includes('.') ? key.split('.').pop() : null;
    if (shortKey && dynamicTranslations?.[currentLang]?.[shortKey]) {
      return dynamicTranslations[currentLang][shortKey];
    }

    // 3. Static dictionary lookup for current language
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    if (dict?.[key]) return dict[key];
    if (shortKey && dict?.[shortKey]) return dict[shortKey];

    // 4. Fallback to English dynamic
    if (dynamicTranslations?.en?.[key]) return dynamicTranslations.en[key];
    if (shortKey && dynamicTranslations?.en?.[shortKey]) return dynamicTranslations.en[shortKey];

    // 5. Fallback to English static
    if (TRANSLATIONS.en?.[key]) return TRANSLATIONS.en[key];
    if (shortKey && TRANSLATIONS.en?.[shortKey]) return TRANSLATIONS.en[shortKey];

    // 6. Return fallbackText or key
    return fallbackText || key;
  };

  const formatDate = (date, options) => formatLocalizedDate(date, currentLang, options);
  const formatNumber = (num, options) => formatLocalizedNumber(num, currentLang, options);

  return (
    <LanguageContext.Provider value={{
      currentLang,
      currentLanguage: activeLangObj,
      languages: LANGUAGES,
      changeLanguage,
      resetToEnglish,
      isRTL: activeLangObj.dir === 'rtl',
      isAdmin,
      t,
      formatDate,
      formatNumber,
      reloadTranslations
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
