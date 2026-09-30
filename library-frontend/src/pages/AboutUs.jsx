import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  HomeIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  MoonIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import aboutService from '../api/aboutService';
import { AuthContext } from '../context/AuthProvider';
import { isAdminRole } from '../config/accessControl';
import { useLanguage } from '../context/LanguageContext';
import IslamicCalendarPage from './IslamicCalendarPage';

const LANG_PILLS = [
  { code: 'ur', label: 'اردو', flag: '🇵🇰', dir: 'rtl' },
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

// Helper to convert legacy plain text to formatted HTML if content_html is empty
const formatLegacyTextToHtml = (raw) => {
  if (!raw || typeof raw !== 'string') return '<p class="text-slate-500 italic">No content has been published yet.</p>';
  const lines = raw.split(/\r?\n/);
  const formatted = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push('<p class="my-2"><br/></p>');
      continue;
    }

    if (trimmed.startsWith('✺') || trimmed.startsWith('◈')) {
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push(`<h3 class="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-8 mb-4">${trimmed}</h3>`);
    } else if (trimmed.startsWith('❶') || trimmed.startsWith('❷') || trimmed.startsWith('❸') || trimmed.startsWith('❹') || trimmed.startsWith('❺') || trimmed.startsWith('❻') || trimmed.startsWith('❼') || trimmed.startsWith('❽') || trimmed.startsWith('❾') || trimmed.startsWith('❿')) {
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push(`<div class="font-semibold my-2.5 pl-3 border-l-3 border-emerald-500 text-slate-800 dark:text-slate-200">${trimmed}</div>`);
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      if (!inList) {
        formatted.push('<ul class="list-disc list-inside space-y-1.5 my-3 text-slate-700 dark:text-slate-300">');
        inList = true;
      }
      formatted.push(`<li>${trimmed.replace(/^[•-]\s*/, '')}</li>`);
    } else {
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push(`<p class="leading-relaxed my-3.5 text-base sm:text-lg text-slate-700 dark:text-slate-300">${trimmed}</p>`);
    }
  }

  if (inList) formatted.push('</ul>');
  return formatted.join('\n');
};

export default function AboutUs() {
  const auth = useContext(AuthContext);
  const isAdmin = auth?.role && isAdminRole(auth.role);

  const { currentLang, changeLanguage } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'about');
  const [scholarSearch, setScholarSearch] = useState('');
  const [selectedLetterModal, setSelectedLetterModal] = useState(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['about', 'calendar', 'jumah', 'moon', 'ulama'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (t) => {
    setActiveTab(t);
    setSearchParams(t === 'about' ? {} : { tab: t });
  };

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aboutService.getAboutSettings();
      setSettings(data || {});
    } catch (err) {
      console.error(err);
      setError('Unable to load About page information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Determine active language data with graceful fallback
  const activeContent = useMemo(() => {
    if (!settings) return { title: 'About Us', subtitle: '', content_html: '', dir: 'ltr' };

    const langs = settings.languages || {};
    const selected = langs[currentLang];

    // If current language has title or content, use it
    if (selected && (selected.title?.trim() || selected.content_html?.trim())) {
      return {
        title: selected.title || 'About Us',
        subtitle: selected.subtitle || '',
        content_html: selected.content_html || '',
        dir: currentLang === 'en' ? 'ltr' : 'rtl',
      };
    }

    // Fallback 1: Urdu primary
    if (langs.ur && (langs.ur.title?.trim() || langs.ur.content_html?.trim())) {
      return {
        title: langs.ur.title || settings.title || 'About Us',
        subtitle: langs.ur.subtitle || settings.subtitle || '',
        content_html: langs.ur.content_html || settings.content_html || '',
        dir: 'rtl',
      };
    }

    // Fallback 2: Top-level settings
    return {
      title: settings.title || settings.hero?.title || 'About Us',
      subtitle: settings.subtitle || settings.hero?.subtitle || '',
      content_html: settings.content_html || '',
      dir: 'rtl',
    };
  }, [settings, currentLang]);

  const rawHtml = activeContent.content_html;
  const renderedHtml = rawHtml && rawHtml.trim() ? rawHtml : formatLegacyTextToHtml(settings?.hero?.description);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-6 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ================= BREADCRUMBS & TOP BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <nav className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Link to="/" className="flex items-center gap-1 hover:text-emerald-600 transition">
              <HomeIcon className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <ChevronRightIcon className="h-3 w-3 opacity-60" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">About Us</span>
          </nav>

          <div className="flex items-center gap-2">
            {/* Quick Language Switcher Pills */}
            <div className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <GlobeAltIcon className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5" />
              {LANG_PILLS.map((pill) => {
                const isActive = currentLang === pill.code;
                return (
                  <button
                    key={pill.code}
                    type="button"
                    onClick={() => changeLanguage(pill.code)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <Link
                to="/admin/about-settings"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition shadow-2xs"
              >
                <PencilSquareIcon className="h-3.5 w-3.5" />
                <span>Edit in CMS</span>
              </Link>
            )}
          </div>
        </div>

        {/* ================= 4 TABS: ABOUT | CALENDAR | JUMAH | MOON ================= */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('about')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'about'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <InformationCircleIcon className="w-4 h-4" />
            <span>{currentLang === 'ur' ? 'تعارف مرکز' : 'About Markaz'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span>{currentLang === 'ur' ? 'اسلامی کیلنڈر (تقویم)' : 'Islamic Calendar'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('jumah')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'jumah'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span>{currentLang === 'ur' ? 'خطبات جمعہ' : 'Jumah Schedule'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('moon')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'moon'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MoonIcon className="w-4 h-4" />
            <span>{currentLang === 'ur' ? 'رؤیت ہلال' : 'Moon Announcements'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('ulama')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'ulama'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>{currentLang === 'ur' ? 'علماء کی آراء' : (currentLang === 'ar' ? 'آراء العلماء' : 'Scholarly Opinions')}</span>
            {Array.isArray(settings?.ulma_quotes) && settings.ulma_quotes.filter(q => q.name?.trim() || q.quote?.trim()).length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'ulama' ? 'bg-amber-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {settings.ulma_quotes.filter(q => q.name?.trim() || q.quote?.trim()).length}
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB 1: ABOUT MARKAZ ================= */}
        {activeTab === 'about' && (
          <>
            {/* Loading Skeleton */}
            {loading && (
              <div className="space-y-6 animate-pulse">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-4">
                  <div className="h-10 w-2/3 mx-auto rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-1/2 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 space-y-6">
                  <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-4/6 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-64 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="rounded-3xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-8 text-center space-y-4">
                <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300">{error}</h3>
                <button
                  type="button"
                  onClick={fetchSettings}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition cursor-pointer"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Main Content Card */}
            {!loading && !error && (
              <article className="space-y-6">
                <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-xs transition-colors">
                  <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-3 tracking-wide">
                    Markaz & Library
                  </span>
                  <h1
                    dir={activeContent.dir}
                    className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
                  >
                    {activeContent.title}
                  </h1>
                  {activeContent.subtitle && (
                    <p
                      dir={activeContent.dir}
                      className="mt-3 sm:mt-4 text-base sm:text-xl font-medium text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed"
                    >
                      {activeContent.subtitle}
                    </p>
                  )}
                </header>

                <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 lg:p-14 shadow-sm transition-colors">
                  <div
                    dir={activeContent.dir}
                    className="about-rich-content prose prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-img:rounded-2xl prose-img:shadow-md prose-img:mx-auto prose-img:max-w-full text-slate-800 dark:text-slate-200 leading-relaxed text-base sm:text-lg"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                </section>

                {/* ================= ULAMA KI ARAAY SECTION ================= */}
                {Array.isArray(settings?.ulma_quotes) && settings.ulma_quotes.filter(q => q.name?.trim() || q.quote?.trim()).length > 0 && (
                  <section className="rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 p-6 sm:p-10 shadow-sm space-y-8 transition-colors">
                    <div className="text-center space-y-2">
                      <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold tracking-wide">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        {currentLang === 'ur' ? 'علماء کی آراء و تأثرات' : currentLang === 'ar' ? 'آراء العلماء وشهاداتهم' : 'Scholarly Testimonials'}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white" dir={currentLang === 'en' ? 'ltr' : 'rtl'}>
                        {currentLang === 'ur' ? 'علماء کرام کی زبانی' : currentLang === 'ar' ? 'شهادات العلماء الكرام' : 'What Scholars Say'}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400" dir={currentLang === 'en' ? 'ltr' : 'rtl'}>
                        {currentLang === 'ur'
                          ? 'علماء کرام کی آراء جنہوں نے مرکز اور اس کے دینی کاموں کو سراہا ہے'
                          : currentLang === 'ar'
                          ? 'آراء العلماء الذين أثنوا على المركز وأعماله الدينية'
                          : 'Opinions of scholars who have praised the Markaz and its religious efforts'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {settings.ulma_quotes
                        .filter(q => q.name?.trim() || q.quote?.trim())
                        .map((q, idx) => (
                          <div key={idx} className="relative rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between">
                            <div className="absolute top-4 right-5 text-amber-200 dark:text-amber-900/60 text-5xl font-serif leading-none select-none pointer-events-none" aria-hidden="true">"</div>
                            {q.quote && (
                              <blockquote dir="rtl" className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-loose font-urdu relative z-10">
                                {q.quote}
                              </blockquote>
                            )}

                            {/* 📜 Handwritten Letter Thumbnail & Zoom Button */}
                            {q.document_image_url && (
                              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 flex items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={q.document_image_url}
                                    alt="Original Handwritten Letter"
                                    className="w-11 h-11 rounded-lg object-cover border border-amber-300 shadow-2xs cursor-pointer hover:opacity-90 flex-shrink-0"
                                    onClick={() => setSelectedLetterModal({
                                      imageUrl: q.document_image_url,
                                      scholarName: q.name,
                                      designation: q.designation,
                                      quote: q.quote,
                                    })}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <div className="min-w-0" dir="rtl">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block font-urdu truncate">
                                      📜 اصل دستی مکتوب
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      Original Handwritten Letter
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedLetterModal({
                                    imageUrl: q.document_image_url,
                                    scholarName: q.name,
                                    designation: q.designation,
                                    quote: q.quote,
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition shadow-2xs flex-shrink-0 cursor-pointer"
                                >
                                  <span>اصل مکتوب دیکھیں</span>
                                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-3 pt-2 border-t border-amber-100 dark:border-amber-900/40">
                              {q.image_url ? (
                                <img src={q.image_url} alt={q.name} className="w-11 h-11 rounded-full object-cover border-2 border-amber-200 dark:border-amber-700 shadow-sm flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border-2 border-amber-200 dark:border-amber-700 flex-shrink-0">
                                  <span className="text-amber-600 dark:text-amber-400 text-lg font-bold">{q.name?.charAt(0) || '؟'}</span>
                                </div>
                              )}
                              <div className="min-w-0" dir="rtl">
                                {q.name && <p className="font-bold text-slate-900 dark:text-white text-sm truncate font-urdu">{q.name}</p>}
                                {q.designation && <p className="text-xs text-amber-700 dark:text-amber-400 font-urdu truncate">{q.designation}</p>}
                                {q.source_text && <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-urdu">— {q.source_text}</p>}
                              </div>
                              {q.source_url && (
                                <a
                                  href={q.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`ms-auto flex-shrink-0 inline-flex items-center gap-1 transition ${
                                    (q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/'))
                                      ? 'px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 text-[11px] font-bold'
                                      : 'p-1.5 rounded-lg text-slate-400 hover:text-amber-600'
                                  }`}
                                  title={(q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/')) ? "دستاویز پی ڈی ایف دیکھیں" : "ماخذ لنک"}
                                >
                                  {(q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/')) ? (
                                    <>
                                      <span>📄 پی ڈی ایف</span>
                                      <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                  )}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </article>
            )}
          </>
        )}

        {/* ================= TAB 2: ISLAMIC CALENDAR ================= */}
        {activeTab === 'calendar' && (
          <div className="rounded-3xl overflow-hidden shadow-xs">
            <IslamicCalendarPage />
          </div>
        )}

        {/* ================= TAB 3: JUMAH SCHEDULE PREVIEW ================= */}
        {activeTab === 'jumah' && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CalendarDaysIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {currentLang === 'ur' ? 'خطبات و شیڈول برائے نماز جمعہ' : 'Jumah Sermons & Schedules'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              {currentLang === 'ur'
                ? 'مرکز اہل حدیث اور ملحقہ مساجد کے خطبات جمعہ، خطباء کے نام اور اوقات کی مکمل فہرست اور آرکائیو دیکھنے کے لیے نیچے کلک کریں۔'
                : 'Browse all upcoming and archived Friday sermon schedules, Bayan topics, and Khatib assignments.'}
            </p>
            <div className="pt-2">
              <Link
                to="/juma-list"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition shadow-md"
              >
                <span>View Full Jumah Schedule List (مکمل شیڈول دیکھیں)</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ================= TAB 4: MOON ANNOUNCEMENTS PREVIEW ================= */}
        {activeTab === 'moon' && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <MoonIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {currentLang === 'ur' ? 'اعلانات رؤیت ہلال و ہجری تقویم' : 'Moon Sighting Announcements'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              {currentLang === 'ur'
                ? 'صوبائی جمعیت اہل حدیث اور مرکز کے باضابطہ رؤیت ہلال کے اعلانات، سرکلرز اور ہجری سال کے ماہانہ اعلانات دیکھیں۔'
                : 'Browse verified crescent sighting declarations and official Hijri month circulars.'}
            </p>
            <div className="pt-2">
              <Link
                to="/moon"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition shadow-md"
              >
                <span>View All Moon Announcements (تمام اعلانات دیکھیں)</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ================= TAB 5: ULAMA TESTIMONIALS (علماء کی آراء) ================= */}
        {activeTab === 'ulama' && (
          <div className="space-y-6">
            {/* Header with Search and Stats */}
            <header className="rounded-3xl border border-amber-100 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-10 shadow-xs space-y-6">
              <div className="text-center space-y-2.5 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold tracking-wide">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  {currentLang === 'ur' ? 'علماء کی آراء و تأثرات' : (currentLang === 'ar' ? 'آراء العلماء وشهاداتهم' : 'Scholarly Testimonials')}
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white" dir={currentLang === 'en' ? 'ltr' : 'rtl'}>
                  {currentLang === 'ur' ? 'اکابر و علمائے کرام کی آراء' : (currentLang === 'ar' ? 'شهادات العلماء الكرام' : 'Endorsements from Respected Scholars')}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed" dir={currentLang === 'en' ? 'ltr' : 'rtl'}>
                  {currentLang === 'ur'
                    ? 'مرکز الدعوۃ الاسلامیۃ، جامع مسجد، مکتبہ اور تعلیمی و سماجی سرگرمیوں کے حوالے سے اہلِ علم و دانش کے تأثرات'
                    : (currentLang === 'ar'
                    ? 'انطباعات وشهادات أصحاب الفضيلة العلماء حول المركز والمكتبة والمشاريع الخيرية'
                    : 'Impressions and authentic testimonials from distinguished scholars regarding Markaz Dawah & Islamic Library.')}
                </p>
              </div>

              {/* Search Bar for 100+ Scholars */}
              {Array.isArray(settings?.ulma_quotes) && settings.ulma_quotes.length > 0 && (
                <div className="max-w-md mx-auto relative">
                  <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    dir="auto"
                    value={scholarSearch}
                    onChange={(e) => setScholarSearch(e.target.value)}
                    placeholder={
                      currentLang === 'ur'
                        ? 'عالم کا نام، عہدہ یا رائے تلاش کریں...'
                        : (currentLang === 'ar' ? 'ابحث عن اسم العالم أو شهادته...' : 'Search scholars by name, title, or quote...')
                    }
                    className="w-full ps-11 pe-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 shadow-xs transition"
                  />
                  {scholarSearch && (
                    <button
                      type="button"
                      onClick={() => setScholarSearch('')}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </header>

            {/* Scholars Grid with Live Filter */}
            {(() => {
              const allQuotes = Array.isArray(settings?.ulma_quotes)
                ? settings.ulma_quotes.filter(q => q.name?.trim() || q.quote?.trim())
                : [];
              const term = scholarSearch.toLowerCase().trim();
              const filtered = term
                ? allQuotes.filter(q =>
                    (q.name && q.name.toLowerCase().includes(term)) ||
                    (q.designation && q.designation.toLowerCase().includes(term)) ||
                    (q.quote && q.quote.toLowerCase().includes(term)) ||
                    (q.source_text && q.source_text.toLowerCase().includes(term))
                  )
                : allQuotes;

              if (allQuotes.length === 0) {
                return (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                      {currentLang === 'ur' ? 'ابھی کوئی رائے شامل نہیں کی گئی' : 'No Scholarly Testimonials Published Yet'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {currentLang === 'ur' ? 'ایڈمن پینل سے علماء کی آراء شامل ہونے کے بعد یہاں ظاہر ہوں گی۔' : 'Check back soon for statements from esteemed scholars.'}
                    </p>
                  </div>
                );
              }

              if (filtered.length === 0) {
                return (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {currentLang === 'ur' ? `"${scholarSearch}" کے لیے کوئی عالم نہیں ملا` : `No scholars found matching "${scholarSearch}"`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setScholarSearch('')}
                      className="text-xs text-amber-600 font-bold hover:underline"
                    >
                      {currentLang === 'ur' ? 'تمام علماء دکھائیں' : 'Show All Scholars'}
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>
                      {currentLang === 'ur'
                        ? `کل ${filtered.length} علماء کی آراء موجود ہیں`
                        : `Showing ${filtered.length} scholarly testimonials`}
                    </span>
                    {scholarSearch && (
                      <span className="font-semibold text-amber-600">
                        {currentLang === 'ur' ? 'فلٹر شدہ نتائج' : 'Filtered Results'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filtered.map((q, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-white dark:bg-slate-900 p-6 shadow-xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
                      >
                        <div className="absolute top-4 right-5 text-amber-200 dark:text-amber-900/60 text-5xl font-serif leading-none select-none pointer-events-none" aria-hidden="true">
                          "
                        </div>

                        {q.quote && (
                          <blockquote
                            dir="rtl"
                            className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-loose font-urdu relative z-10"
                          >
                            {q.quote}
                          </blockquote>
                        )}

                        {/* 📜 Handwritten Letter Thumbnail & Zoom Button */}
                        {q.document_image_url && (
                          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={q.document_image_url}
                                alt="Original Handwritten Letter"
                                className="w-11 h-11 rounded-lg object-cover border border-amber-300 shadow-2xs cursor-pointer hover:opacity-90 flex-shrink-0"
                                onClick={() => setSelectedLetterModal({
                                  imageUrl: q.document_image_url,
                                  scholarName: q.name,
                                  designation: q.designation,
                                  quote: q.quote,
                                })}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <div className="min-w-0" dir="rtl">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block font-urdu truncate">
                                  📜 اصل دستی مکتوب
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  Original Handwritten Letter
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedLetterModal({
                                imageUrl: q.document_image_url,
                                scholarName: q.name,
                                designation: q.designation,
                                quote: q.quote,
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition shadow-2xs flex-shrink-0 cursor-pointer"
                            >
                              <span>اصل مکتوب دیکھیں</span>
                              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-3 border-t border-amber-100 dark:border-amber-900/40">
                          {q.image_url ? (
                            <img
                              src={q.image_url}
                              alt={q.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-amber-200 dark:border-amber-700 shadow-sm flex-shrink-0"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border-2 border-amber-200 dark:border-amber-700 flex-shrink-0">
                              <span className="text-amber-700 dark:text-amber-400 text-lg font-bold">
                                {q.name?.charAt(0) || '؟'}
                              </span>
                            </div>
                          )}

                          <div className="min-w-0 flex-1" dir="rtl">
                            {q.name && (
                              <h4 className="font-bold text-slate-900 dark:text-white text-base truncate font-urdu">
                                {q.name}
                              </h4>
                            )}
                            {q.designation && (
                              <p className="text-xs text-amber-700 dark:text-amber-400 font-urdu truncate font-medium">
                                {q.designation}
                              </p>
                            )}
                            {q.source_text && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-urdu mt-0.5">
                                — {q.source_text}
                              </p>
                            )}
                          </div>

                          {q.source_url && (
                            <a
                              href={q.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`ms-auto flex-shrink-0 inline-flex items-center gap-1.5 transition ${
                                (q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/'))
                                  ? 'px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 text-xs font-bold'
                                  : 'p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-2xs'
                              }`}
                              title={(q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/')) ? "دستاویز پی ڈی ایف دیکھیں" : "View Document / Source"}
                            >
                              {(q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/')) ? (
                                <>
                                  <span className="font-urdu">📄 پی ڈی ایف دیکھیں</span>
                                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                              )}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ================= LIGHTBOX MODAL: ORIGINAL HANDWRITTEN LETTER ================= */}
      {selectedLetterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedLetterModal(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
              <div dir="rtl">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block font-urdu">
                  اصل دستی تحریر / مکتوب
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-urdu">
                  {selectedLetterModal.scholarName}
                  {selectedLetterModal.designation && (
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ms-2">
                      ({selectedLetterModal.designation})
                    </span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLetterModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                title="بند کریں (Close)"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Image Viewport */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex justify-center items-center">
              <img
                src={selectedLetterModal.imageUrl}
                alt="Original handwritten letter"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>

            {/* Lightbox Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="text-slate-500 dark:text-slate-400 font-urdu text-[11px]" dir="rtl">
                نوٹ: قارئین کی آسانی کے لیے اس مکتوب کا مکمل متن صاف الفاظ میں نیچے اور مرکزی صفحے پر درج ہے۔
              </p>
              <a
                href={selectedLetterModal.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-1.5 ms-auto"
              >
                <span>اصل تصویر نئی ونڈو میں کھولیں</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}