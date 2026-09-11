import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  HomeIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import aboutService from '../api/aboutService';
import { AuthContext } from '../context/AuthProvider';
import { isAdminRole } from '../config/accessControl';
import { useLanguage } from '../context/LanguageContext';

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

        {/* ================= LOADING SKELETON ================= */}
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

        {/* ================= ERROR STATE ================= */}
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

        {/* ================= MAIN CONTENT CARD ================= */}
        {!loading && !error && (
          <article className="space-y-6">
            {/* Top Page Header Banner */}
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

            {/* Dynamic Rich Text Body */}
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 lg:p-14 shadow-sm transition-colors">
              <div
                dir={activeContent.dir}
                className="about-rich-content prose prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-img:rounded-2xl prose-img:shadow-md prose-img:mx-auto prose-img:max-w-full text-slate-800 dark:text-slate-200 leading-relaxed text-base sm:text-lg"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </section>
          </article>
        )}
      </div>
    </div>
  );
}