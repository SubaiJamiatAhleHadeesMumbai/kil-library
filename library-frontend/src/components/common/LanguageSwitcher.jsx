import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeAltIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../context/LanguageContext';

const LANG_SHORT_CODES = {
  en: 'EN',
  ur: 'UR',
  ar: 'AR',
};

const LanguageSwitcher = ({ 
  className = '', 
  variant = 'dropdown', // 'dropdown' | 'segmented'
  direction = 'down' // 'down' | 'up'
}) => {
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

  // ==========================================
  // 1. SEGMENTED PILL SWITCHER (Mobile Menu & Footer)
  // ==========================================
  if (variant === 'segmented') {
    return (
      <div className={`w-full notranslate ${className}`} translate="no">
        <div className="flex items-center justify-between gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-2xs">
          {languages.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`relative flex-1 py-2 px-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'text-emerald-900 bg-white shadow-xs border border-emerald-100 font-black scale-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span className="text-xs">{lang.name}</span>
                {isSelected && (
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. DROPDOWN SWITCHER (Header & Desktop)
  // ==========================================
  const isUp = direction === 'up';

  return (
    <div className={`relative notranslate ${className}`} ref={dropdownRef} translate="no">
      {/* Compact Pill Button (Space-saving EN / UR / AR) */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#031d15]/90 text-slate-200 border border-emerald-500/30 hover:border-emerald-400/50 hover:text-white hover:bg-emerald-950 font-semibold text-[11px] transition-all duration-200 shadow-2xs group cursor-pointer focus:outline-none"
        aria-label="Select Language"
        aria-expanded={isOpen}
        title={currentLanguage?.name || 'Change Language'}
      >
        <GlobeAltIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300 flex-shrink-0" />
        <span className="font-extrabold text-[11px] tracking-wider uppercase text-slate-200 group-hover:text-white">
          {LANG_SHORT_CODES[currentLang] || currentLang.toUpperCase()}
        </span>
        <ChevronDownIcon
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : 'group-hover:text-slate-200'
          }`}
        />
      </button>

      {/* Dropdown Menu (Strictly 3 languages: Arabic, English, Urdu) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: isUp ? 6 : -6, scale: 0.95 }}
            animate={{ opacity: 1, y: isUp ? -4 : 4, scale: 1 }}
            exit={{ opacity: 0, y: isUp ? 6 : -6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute end-0 ${
              isUp ? 'bottom-full mb-2' : 'top-full mt-2'
            } w-44 bg-[#051c14]/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-amber-500/30 p-1.5 z-[110] overflow-hidden notranslate ring-1 ring-amber-400/20 text-white`}
            translate="no"
          >
            <div className="space-y-0.5">
              {languages.map((lang) => {
                const isSelected = currentLang === lang.code;
                const fontClass = lang.code === 'ur' ? 'font-urdu' : lang.code === 'ar' ? 'font-arabic' : 'font-sans';
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer text-start ${fontClass} ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 font-bold shadow-2xs border border-amber-400/30'
                        : 'text-slate-200 hover:bg-emerald-900/60 hover:text-amber-200 font-medium'
                    }`}
                  >
                    <span className="text-sm tracking-normal">{lang.name}</span>
                    {isSelected && (
                      <CheckIcon className="w-4 h-4 text-amber-400 stroke-[3] flex-shrink-0 ms-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
