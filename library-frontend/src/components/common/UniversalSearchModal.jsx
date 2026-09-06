import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  SparklesIcon,
  ClockIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../api/apiClient';
import { useLanguage } from '../../context/LanguageContext';

const SUGGESTIONS_BY_LANG = {
  en: ['Bukhari', 'Muslim', 'Tafseer', 'Hadith', 'Taleem', 'Zakat', 'Fatawa', 'Kokan', 'Welfare'],
  ur: ['صحیح بخاری', 'صحیح مسلم', 'تفسیر', 'حدیث', 'تعلیم', 'زکوٰۃ', 'فتاویٰ', 'کوکن', 'سماجی خدمات'],
  ar: ['صحيح البخاري', 'صحيح مسلم', 'تفسير', 'الحديث', 'التعليم', 'الزكاة', 'الفتاوى', 'العمل الاجتماعي'],
};

const DYNAMIC_PLACEHOLDERS = {
  en: [
    'Search books (e.g. Bukhari, Muslim, Tafseer)...',
    'Search Fatawa & Islamic rulings...',
    'Search education programs & workshops...',
    'Search social work & welfare relief drives...',
    'Search by author, publisher, or subject...'
  ],
  ur: [
    'کتابیں تلاش کریں (مثلاً: صحیح بخاری، تفسیر ابن کثیر)...',
    'فتاویٰ اور شرعی مسائل تلاش کریں...',
    'تعلیمی پروگرام اور کورسز تلاش کریں...',
    'سماجی خدمات اور فلاحی کام تلاش کریں...',
    'مصنفین، ناشرین یا موضوع سے تلاش کریں...'
  ],
  ar: [
    'ابحث في الكتب (مثل: صحيح البخاري، التفسير)...',
    'ابحث في الفتاوى والأحكام الشرعية...',
    'ابحث في البرامج التعليمية والأنشطة...',
    'ابحث في الأعمال الاجتماعية والإغاثية...'
  ]
};

const UniversalSearchModal = ({ isOpen, onClose }) => {
  const { currentLang, t } = useLanguage();
  const isRTL = currentLang === 'ur' || currentLang === 'ar';
  
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [results, setResults] = useState({
    books: [],
    fatawa: [],
    education: [],
    social_work: [],
    activities: []
  });
  const [totalCount, setTotalCount] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kil_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Dynamic placeholder rotation
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => {
        const list = DYNAMIC_PLACEHOLDERS[currentLang] || DYNAMIC_PLACEHOLDERS.en;
        return (prev + 1) % list.length;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, currentLang]);

  const activePlaceholder = (DYNAMIC_PLACEHOLDERS[currentLang] || DYNAMIC_PLACEHOLDERS.en)?.[placeholderIndex] || t('search_placeholder');

  const tabs = [
    { id: 'all', label: t('search_all') },
    { id: 'books', label: t('search_books'), icon: BookOpenIcon },
    { id: 'fatawa', label: t('search_fatawa'), icon: ChatBubbleLeftRightIcon },
    { id: 'education', label: t('search_education'), icon: AcademicCapIcon },
    { id: 'social_work', label: t('search_social_work'), icon: SparklesIcon },
    { id: 'activities', label: t('search_activities'), icon: SparklesIcon },
  ];

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Debounced Search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ books: [], fatawa: [], education: [], social_work: [], activities: [] });
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/api/search/global?q=${encodeURIComponent(trimmed)}&limit=6`);
        if (res.data) {
          setResults(res.data.results || {});
          setTotalCount(res.data.total_count || 0);
        }
      } catch (err) {
        console.error('Universal search error:', err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelectResult = (item) => {
    if (query.trim()) {
      const updated = [query.trim(), ...recentSearches.filter(s => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem('kil_recent_searches', JSON.stringify(updated));
    }

    onClose();
    if (item.url) {
      navigate(item.url);
    }
  };

  const handleApplySuggestion = (s) => {
    setQuery(s);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('kil_recent_searches');
  };

  if (!isOpen) return null;

  const visibleCategories = activeTab === 'all' 
    ? ['books', 'fatawa', 'education', 'social_work', 'activities']
    : [activeTab];

  const hasAnyResults = visibleCategories.some(cat => results[cat] && results[cat].length > 0);
  const currentSuggestions = SUGGESTIONS_BY_LANG[currentLang] || SUGGESTIONS_BY_LANG.en;

  const catTitleMap = {
    books: t('search_books'),
    fatawa: t('search_fatawa'),
    education: t('search_education'),
    social_work: t('search_social_work'),
    activities: t('search_activities'),
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 pt-12 sm:pt-16"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[82vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Header */}
          <div className="relative flex items-center px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <MagnifyingGlassIcon className={`w-6 h-6 text-[#002147] flex-shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} />
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={activePlaceholder}
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-base font-medium focus:outline-none"
            />

            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors mx-1 cursor-pointer"
                title={t('clear')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            ) : null}

            {/* ESC Badge & Easy Big Close Button */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
                ESC
              </kbd>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-full transition-colors cursor-pointer"
                title={t('close')}
              >
                <XMarkIcon className="w-6 h-6 stroke-2" />
              </button>
            </div>
          </div>

          {/* Filter Category Tabs (if query typed) */}
          {query.trim() && (
            <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-slate-100/60 border-b border-slate-100 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const count = tab.id === 'all' 
                  ? totalCount 
                  : (results[tab.id]?.length || 0);

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[#002147] text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Body Content */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 min-h-[220px]">
            
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-500">{t('searching_markaz')}</p>
              </div>
            ) : query.trim() ? (
              hasAnyResults ? (
                <div className="space-y-6">
                  {visibleCategories.map((catKey) => {
                    const catItems = results[catKey] || [];
                    if (!catItems.length) return null;

                    return (
                      <div key={catKey} className="space-y-2">
                        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-2">
                          {catTitleMap[catKey] || catKey} ({catItems.length})
                        </h4>

                        <div className="space-y-1.5">
                          {catItems.map((item) => (
                            <div
                              key={`${catKey}-${item.id}`}
                              onClick={() => handleSelectResult(item)}
                              className="flex items-center gap-3.5 p-2.5 sm:p-3 rounded-2xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all cursor-pointer group"
                            >
                              {/* Thumbnail / Icon */}
                              <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                                {item.thumbnail ? (
                                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-blue-700">
                                    {catKey === 'books' && <BookOpenIcon className="w-5 h-5" />}
                                    {catKey === 'fatawa' && <ChatBubbleLeftRightIcon className="w-5 h-5" />}
                                    {catKey === 'education' && <AcademicCapIcon className="w-5 h-5" />}
                                    {catKey === 'social_work' && <img src="/icons/social-work.png" alt="Social" className="w-5 h-5 object-contain" />}
                                    {catKey === 'activities' && <SparklesIcon className="w-5 h-5" />}
                                  </div>
                                )}
                              </div>

                              {/* Title & Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-900 transition-colors">
                                    {item.title}
                                  </h5>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${item.badge_class || 'bg-slate-100 text-slate-600'}`}>
                                    {item.badge}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>

                              {isRTL ? (
                                <ArrowLeftIcon className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:-translate-x-1 transition-all flex-shrink-0" />
                              ) : (
                                <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <MagnifyingGlassIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {t('no_search_results')} "{query}"
                  </h4>
                </div>
              )
            ) : (
              /* When Input is Empty: Suggestions & Recent */
              <div className="space-y-6">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {t('recent_searches')}
                      </span>
                      <button
                        onClick={handleClearRecent}
                        className="text-[11px] text-slate-400 hover:text-slate-600 font-bold transition-colors cursor-pointer"
                      >
                        {t('clear')}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 px-1">
                      {recentSearches.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleApplySuggestion(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                        >
                          <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Topic Suggestions */}
                <div className="space-y-2.5">
                  <div className="px-2">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {t('search_popular_topics')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-1">
                    {currentSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleApplySuggestion(s)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-xs font-bold text-blue-800 transition-colors cursor-pointer border border-blue-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-6">
            <span className="font-semibold">{t('markaz_title')}</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#002147] hover:bg-blue-900 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {t('close')}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UniversalSearchModal;
