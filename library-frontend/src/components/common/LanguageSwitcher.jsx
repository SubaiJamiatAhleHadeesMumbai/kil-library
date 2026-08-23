import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeAltIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../context/LanguageContext';

const LanguageSwitcher = ({ className = '' }) => {
  const { currentLang, currentLanguage, languages, changeLanguage, isAdmin } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Exclude switcher in admin panel
  if (isAdmin) return null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (langCode) => {
    setIsOpen(false);
    if (langCode !== currentLang) {
      changeLanguage(langCode);
    }
  };

  return (
    <div className={`relative notranslate ${className}`} ref={dropdownRef} translate="no">
      {/* Pill Button Matching User Screenshot */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/90 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 font-semibold text-xs transition-all shadow-xs group"
        aria-label="Select Language"
        aria-expanded={isOpen}
      >
        <GlobeAltIcon className="w-4 h-4 text-emerald-600 group-hover:rotate-45 transition-transform duration-300" />
        <span className="font-bold">{currentLanguage.label}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-emerald-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu (Strictly 3 languages: Arabic, English, Urdu) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 overflow-hidden notranslate"
            translate="no"
          >
            {languages.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-all text-left ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 font-black'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#002147]'
                  }`}
                >
                  <span className="text-sm font-semibold">{lang.name}</span>
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
