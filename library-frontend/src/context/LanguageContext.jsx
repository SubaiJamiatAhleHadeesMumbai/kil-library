import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export const LANGUAGES = [
  { code: 'ar', name: 'العربية', nativeName: 'العربية', dir: 'rtl', label: 'العربية', fontClass: 'font-arabic' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', label: 'English', fontClass: 'font-sans' },
  { code: 'ur', name: 'اردو', nativeName: 'اردو', dir: 'rtl', label: 'اردو', fontClass: 'font-urdu' },
];

export const TRANSLATIONS = {
  en: {
    home: "Home",
    library: "Library",
    about: "About",
    fatawa: "Fatawa",
    authors: "Authors",
    publishers: "Publishers",
    updates: "Updates",
    history: "History",
    donate: "Donate",
    login: "Log in",
    logout: "Log Out",
    profile: "My Profile",
    search: "Search books, authors...",
    read_book: "Read Online",
    download_pdf: "Download PDF",
    save: "Save",
    categories: "Categories",
    all_books: "All Books",
    our_projects: "Our Projects",
    database: "Database",
    markaz_title: "Markaz Library",
    markaz_sub: "Ahle Hadees Kokan",
    social_work: "Social Work",
    education_taleem: "Education (Taleem)",
    activities: "Activities",
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
    clear: "Clear",
    close: "Close",
    our_publications: "Our Publications (Markaz Dawah)",
    markaz_org_name: "Markaz Dawah Al-Islamiyyah wal-Khayriyyah",
    folders: "Folders & Topics",
  },
  ur: {
    home: "صفحہ اول",
    library: "کتب خانہ",
    about: "ہمارے متعلق",
    fatawa: "فتاویٰ",
    authors: "مصنفین",
    publishers: "ناشرین",
    updates: "تازہ ترین",
    history: "مطالعہ ریکارڈ",
    donate: "تعاون کریں",
    login: "لاگ ان",
    logout: "لاگ آؤٹ",
    profile: "میری پروفائل",
    search: "کتابیں یا مصنفین تلاش کریں...",
    read_book: "آن لائن پڑھیں",
    download_pdf: "پی ڈی ایف ڈاؤن لوڈ",
    save: "محفوظ کریں",
    categories: "زمرہ جات",
    all_books: "تمام کتب",
    our_projects: "ہمارے منصوبے",
    database: "ڈیٹا بیس",
    markaz_title: "مرکز لائبریری",
    markaz_sub: "اہل حدیث کوکن",
    social_work: "سماجی خدمات",
    education_taleem: "تعلیم (Taleem)",
    activities: "سرگرمیاں",
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
    search_popular_topics: "اہم عنوانات",
    recent_searches: "حالیہ تلاش",
    clear: "صاف کریں",
    close: "بند کریں",
    our_publications: "ہماری مطبوعات (مرکز الدعوۃ)",
    markaz_org_name: "مرکز الدعوۃ الاسلامیہ والخیریہ",
    folders: "فولڈرز اور موضوعات",
  },
  ar: {
    home: "الرئيسية",
    library: "المكتبة",
    about: "عن المركز",
    fatawa: "الفتاوى",
    authors: "المؤلفون",
    publishers: "دور النشر",
    updates: "المستجدات",
    history: "سجل القراءة",
    donate: "تبرع الآن",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    profile: "الملف الشخصي",
    search: "ابحث عن الكتب والمؤلفين...",
    read_book: "قراءة مباشرة",
    download_pdf: "تحميل PDF",
    save: "حفظ",
    categories: "التصنيفات",
    all_books: "جميع الكتب",
    our_projects: "مشاريعنا",
    database: "قاعدة البيانات",
    markaz_title: "مكتبة المركز",
    markaz_sub: "أهل الحديث كوكن",
    social_work: "العمل الاجتماعي",
    education_taleem: "التعليم (Taleem)",
    activities: "الأنشطة",
    other: "أخرى",
    search_btn: "بحث",
    search_placeholder: "ابحث عن الكتب، الفتاوى، البرامج التعليمية، العمل الاجتماعي...",
    search_all: "جميع النتائج",
    search_books: "الكتب",
    search_fatawa: "الفتاوى",
    search_education: "التعليم",
    search_social_work: "العمل الاجتماعي",
    search_activities: "الأنشطة",
    searching_markaz: "جاري البحث في قاعدة البيانات...",
    no_search_results: "لم يتم العثور على نتائج لـ",
    search_popular_topics: "المواضيع الشائعة",
    recent_searches: "عمليات البحث الأخيرة",
    clear: "مسح",
    close: "إغلاق",
    our_publications: "منشوراتنا (مركز الدعوة)",
    markaz_org_name: "مركز الدعوة الإسلامية والخيرية",
    folders: "المجلدات والتصنيفات",
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('kil_language') || 'en';
  });

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const setGoogleCookies = (lang) => {
    try {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;

      // Clear previous cookies
      const clearCookie = (name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`;
      };

      clearCookie('googtrans');

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

    setGoogleCookies(langObj.code);
  };

  const changeLanguage = (langCode) => {
    const target = ['ur', 'ar', 'en'].includes(langCode) ? langCode : 'ur';
    setCurrentLang(target);
    localStorage.setItem('kil_language', target);
    setGoogleCookies(target);
    applyLanguage(target);

    // Trigger Google Translate combo if active
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = target;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Quick reload ensures all DOM text nodes across React app are 100% translated
    window.location.reload();
  };

  useEffect(() => {
    applyLanguage(currentLang);
  }, [currentLang, location.pathname]);

  const activeLangObj = useMemo(() => {
    return LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
  }, [currentLang]);

  // Translation helper function
  const t = (key) => {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{
      currentLang,
      currentLanguage: activeLangObj,
      languages: LANGUAGES,
      changeLanguage,
      isRTL: activeLangObj.dir === 'rtl',
      isAdmin,
      t
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
