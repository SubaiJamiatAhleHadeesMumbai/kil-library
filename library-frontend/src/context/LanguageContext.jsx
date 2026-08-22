import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const LANGUAGES = [
  { code: 'ar', name: 'العربية', nativeName: 'العربية', dir: 'rtl', label: 'العربية' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', label: 'English' },
  { code: 'ur', name: 'اردو', nativeName: 'اردو', dir: 'rtl', label: 'اردو' },
];

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('kil_language') || 'en';
  });

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const applyLanguage = (langCode) => {
    if (isAdmin) {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      document.body.classList.remove('lang-ur', 'lang-ar');
      document.body.classList.add('lang-en');
      return;
    }

    const langObj = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[1];
    
    document.documentElement.dir = langObj.dir;
    document.documentElement.lang = langObj.code;

    document.body.classList.remove('lang-ur', 'lang-ar', 'lang-en');
    document.body.classList.add(`lang-${langObj.code}`);

    // Set Google Translate Cookie
    const hostname = window.location.hostname;
    document.cookie = `googtrans=/en/${langObj.code}; path=/; domain=${hostname}`;
    document.cookie = `googtrans=/en/${langObj.code}; path=/;`;

    // Trigger Google Translate Widget if initialized
    try {
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = langObj.code;
        select.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      console.warn('Translate trigger exception:', e);
    }
  };

  const changeLanguage = (langCode) => {
    const valid = LANGUAGES.some(l => l.code === langCode);
    const target = valid ? langCode : 'en';
    setCurrentLang(target);
    localStorage.setItem('kil_language', target);
    applyLanguage(target);

    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = target;
      select.dispatchEvent(new Event('change'));
    }
  };

  useEffect(() => {
    applyLanguage(currentLang);
  }, [currentLang, location.pathname]);

  const activeLangObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[1];

  return (
    <LanguageContext.Provider value={{
      currentLang,
      currentLanguage: activeLangObj,
      languages: LANGUAGES,
      changeLanguage,
      isRTL: activeLangObj.dir === 'rtl',
      isAdmin
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
