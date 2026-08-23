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
    about: "About Us",
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
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('kil_language') || 'ur';
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
