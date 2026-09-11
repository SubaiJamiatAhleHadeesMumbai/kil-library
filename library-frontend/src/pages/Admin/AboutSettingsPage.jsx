import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import aboutService from '../../api/aboutService';
import RichTextEditor from '../../components/common/RichTextEditor';

const SUPPORTED_LANGS = [
  { code: 'ur', label: 'اردو (Urdu)', flag: '🇵🇰', dir: 'rtl', isDefault: true },
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', label: 'العربية (Arabic)', flag: '🇸🇦', dir: 'rtl' },
];

// Helper to convert legacy plain text to starter HTML
const formatLegacyTextToHtml = (raw) => {
  if (!raw || typeof raw !== 'string') return '<p>Enter content here...</p>';
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
      formatted.push('<p><br/></p>');
      continue;
    }

    if (trimmed.startsWith('✺') || trimmed.startsWith('◈')) {
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push(`<h3 class="text-xl font-bold text-emerald-800 dark:text-emerald-400 mt-6 mb-3">${trimmed}</h3>`);
    } else if (trimmed.startsWith('❶') || trimmed.startsWith('❷') || trimmed.startsWith('❸') || trimmed.startsWith('❹') || trimmed.startsWith('❺') || trimmed.startsWith('❻') || trimmed.startsWith('❼') || trimmed.startsWith('❽') || trimmed.startsWith('❾') || trimmed.startsWith('❿')) {
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push(`<p class="font-medium my-2 pl-2 border-l-2 border-emerald-500 text-slate-800 dark:text-slate-200">${trimmed}</p>`);
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      if (!inList) {
        formatted.push('<ul class="list-disc list-inside space-y-1 my-3">');
        inList = true;
      }
      formatted.push(`<li>${trimmed.replace(/^[•-]\s*/, '')}</li>`);
    } else {
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push(`<p class="leading-relaxed my-3">${trimmed}</p>`);
    }
  }

  if (inList) formatted.push('</ul>');
  return formatted.join('\n');
};

export default function AboutSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [activeLang, setActiveLang] = useState('ur'); // 'ur' | 'en' | 'ar'

  const [fullSettings, setFullSettings] = useState({});

  // 3-Language Content State
  const [langData, setLangData] = useState({
    ur: { title: '', subtitle: '', content_html: '' },
    en: { title: '', subtitle: '', content_html: '' },
    ar: { title: '', subtitle: '', content_html: '' },
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await aboutService.getAboutSettings();
        setFullSettings(data || {});

        const backendLangs = data?.languages || {};
        const legacyTitle = data?.title || data?.hero?.title || 'مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)';
        const legacySubtitle = data?.subtitle || data?.hero?.subtitle || '';
        let legacyContent = data?.content_html || '';

        if (!legacyContent && data?.hero?.description) {
          legacyContent = formatLegacyTextToHtml(data.hero.description);
        }

        setLangData({
          ur: {
            title: backendLangs.ur?.title || legacyTitle,
            subtitle: backendLangs.ur?.subtitle || legacySubtitle,
            content_html: backendLangs.ur?.content_html || legacyContent,
          },
          en: {
            title: backendLangs.en?.title || 'About Markaz Dawah & Islamic Library',
            subtitle: backendLangs.en?.subtitle || 'Departments • Activities • Achievements • Future Goals',
            content_html: backendLangs.en?.content_html || '',
          },
          ar: {
            title: backendLangs.ar?.title || 'مركز الدعوة الإسلامية والخيرية والمكتبة',
            subtitle: backendLangs.ar?.subtitle || 'الأقسام • الأنشطة • الإنجازات • المشاريع المستقبلية',
            content_html: backendLangs.ar?.content_html || '',
          },
        });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load About settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const currentActiveLangObj = useMemo(
    () => SUPPORTED_LANGS.find((l) => l.code === activeLang) || SUPPORTED_LANGS[0],
    [activeLang]
  );

  const updateCurrentLangField = (field, val) => {
    setLangData((prev) => ({
      ...prev,
      [activeLang]: {
        ...(prev[activeLang] || {}),
        [field]: val,
      },
    }));
  };

  const handleCopyFromUrdu = () => {
    if (activeLang === 'ur') return;
    const urduContent = langData.ur?.content_html || '';
    if (!urduContent) {
      toast.error('Urdu content is currently empty');
      return;
    }
    updateCurrentLangField('content_html', urduContent);
    toast.success(`Copied rich layout and images from Urdu to ${currentActiveLangObj.label}! You can now translate the text.`);
  };

  const handleSave = async () => {
    const urTitle = langData.ur?.title?.trim();
    if (!urTitle) {
      toast.error('Please provide at least a title for the primary Urdu tab');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...fullSettings,
        title: urTitle,
        subtitle: langData.ur?.subtitle?.trim() || '',
        content_html: langData.ur?.content_html || '',
        languages: langData,
        hero: {
          ...(fullSettings.hero || {}),
          title: urTitle,
          subtitle: langData.ur?.subtitle?.trim() || '',
        },
      };

      const res = await aboutService.updateAboutSettings(payload);
      setFullSettings(res?.settings || payload);
      toast.success('All 3 languages for About page successfully saved!');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertSampleBlock = (type) => {
    let snippet = '';
    if (type === 'quote') {
      snippet = `
        <blockquote class="my-6 p-4 rounded-xl border-l-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-slate-700 dark:text-slate-200 italic">
          "Knowledge is light that illuminates the path of righteous guidance."
          <cite class="block not-italic font-semibold text-xs mt-2 text-emerald-700 dark:text-emerald-400">— Scholar Name / Citation</cite>
        </blockquote><p><br/></p>
      `;
    } else if (type === 'callout') {
      snippet = `
        <div class="my-6 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20">
          <h4 class="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-2">✦ Important Objective / Mission</h4>
          <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Write your highlighted objective or institutional milestone here with full clarity.
          </p>
        </div><p><br/></p>
      `;
    } else if (type === 'twoCol') {
      snippet = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div>
            <h4 class="font-bold text-base text-slate-900 dark:text-white mb-2">Section 1: Our Mission</h4>
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Details on religious education, research library, and humanitarian projects.</p>
          </div>
          <div>
            <h4 class="font-bold text-base text-slate-900 dark:text-white mb-2">Section 2: Future Expansion</h4>
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Proposed multi-story complex, digital manuscript hub, and student dormitories.</p>
          </div>
        </div><p><br/></p>
      `;
    }

    const currentHtml = langData[activeLang]?.content_html || '';
    updateCurrentLangField('content_html', currentHtml ? currentHtml + snippet : snippet);
    toast.success('Block appended to current editor');
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium text-slate-500">Loading About Page CMS...</span>
        </div>
      </div>
    );
  }

  const currentLangContent = langData[activeLang] || { title: '', subtitle: '', content_html: '' };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              About Page CMS & Multi-Language Editor
            </h1>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              3 Languages Supported
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage Title, Subtitle, and Rich Content in <strong>Urdu</strong>, <strong>English</strong>, and <strong>Arabic</strong>. Public users will automatically see the page in their selected language.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <EyeIcon className="h-4 w-4 text-slate-500" />
            <span>View Public Page</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 opacity-60" />
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Saving All...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                <span>Save All Languages</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= LANGUAGE SWITCHER TABS ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <GlobeAltIcon className="w-5 h-5 text-emerald-600 ml-1" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Editing Language:
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            {SUPPORTED_LANGS.map((lang) => {
              const isSelected = activeLang === lang.code;
              const hasContent = Boolean(langData[lang.code]?.title || langData[lang.code]?.content_html);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setActiveLang(lang.code)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {hasContent && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                      title="Has content"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy from Urdu Shortcut */}
        {activeLang !== 'ur' && (
          <button
            type="button"
            onClick={handleCopyFromUrdu}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
            title="Copy images, headings, and structure from Urdu tab"
          >
            <DocumentDuplicateIcon className="w-4 h-4 text-emerald-600" />
            <span>Copy Layout from Urdu</span>
          </button>
        )}
      </div>

      {/* ================= EDIT / PREVIEW VIEW TOGGLE ================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'editor'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <PencilSquareIcon className="h-4 w-4" />
          <span>Editor View ({currentActiveLangObj.label})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'preview'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <EyeIcon className="h-4 w-4" />
          <span>Live Site Preview</span>
        </button>
      </div>

      {/* ================= TAB 1: EDITOR VIEW ================= */}
      {activeTab === 'editor' ? (
        <div className="space-y-6">
          {/* Top Inputs: Page Title & Short Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Page Title ({currentActiveLangObj.label}) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                dir={currentActiveLangObj.dir}
                value={currentLangContent.title || ''}
                onChange={(e) => updateCurrentLangField('title', e.target.value)}
                placeholder={
                  activeLang === 'ur'
                    ? 'مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)'
                    : activeLang === 'ar'
                    ? 'مركز الدعوة الإسلامية والخيرية'
                    : 'About Markaz Dawah & Islamic Library'
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <p className="mt-1 text-xs text-slate-400">
                Shown as the main heading when public users view the site in {currentActiveLangObj.label}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Page Short Description / Subtitle ({currentActiveLangObj.label})
              </label>
              <input
                type="text"
                dir={currentActiveLangObj.dir}
                value={currentLangContent.subtitle || ''}
                onChange={(e) => updateCurrentLangField('subtitle', e.target.value)}
                placeholder={
                  activeLang === 'ur'
                    ? 'شعبے • سرگرمیاں • کارکردگی • مستقبل کے عزائم'
                    : activeLang === 'ar'
                    ? 'الأقسام • الأنشطة • الإنجازات • المشاريع المستقبلية'
                    : 'A sanctuary for authentic Islamic learning, scholarly research, and welfare.'
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <p className="mt-1 text-xs text-slate-400">
                Brief subtitle underneath the title.
              </p>
            </div>
          </div>

          {/* Quick Insert Snippets */}
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" /> Quick Inserts:
            </span>
            <button
              type="button"
              onClick={() => handleInsertSampleBlock('quote')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-emerald-500 transition cursor-pointer"
            >
              + Styled Quote Box
            </button>
            <button
              type="button"
              onClick={() => handleInsertSampleBlock('callout')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-emerald-500 transition cursor-pointer"
            >
              + Notice Banner
            </button>
            <button
              type="button"
              onClick={() => handleInsertSampleBlock('twoCol')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-emerald-500 transition cursor-pointer"
            >
              + 2-Column Content Grid
            </button>
          </div>

          {/* Upgraded RichTextEditor with Media Deletion */}
          <RichTextEditor
            key={activeLang}
            value={currentLangContent.content_html || ''}
            onChange={(html) => updateCurrentLangField('content_html', html)}
            label={`About Content (${currentActiveLangObj.label})`}
            placeholder={`Type or paste formatted content in ${currentActiveLangObj.label}, add images, video links, headings...`}
            initialRTL={currentActiveLangObj.dir === 'rtl'}
            minHeight="480px"
          />

          {/* Save Action Footer */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <InformationCircleIcon className="w-4 h-4 text-emerald-600" />
              <span>
                Saving commits content for <strong>all 3 languages</strong> instantly.
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Saving All Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Save All Languages</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ================= TAB 2: LIVE SITE PREVIEW ================= */
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
            <span>
              Previewing in <strong>{currentActiveLangObj.label}</strong>. You can switch language tabs above to preview other languages.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className="font-bold underline hover:opacity-80 cursor-pointer"
            >
              ← Back to Editor
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-sm">
            <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white" dir={currentActiveLangObj.dir}>
                {currentLangContent.title || 'About Us'}
              </h2>
              {currentLangContent.subtitle && (
                <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto" dir={currentActiveLangObj.dir}>
                  {currentLangContent.subtitle}
                </p>
              )}
            </div>

            <div
              dir={currentActiveLangObj.dir}
              className="prose prose-slate max-w-none dark:prose-invert prose-img:rounded-2xl prose-img:shadow-md prose-a:text-emerald-600"
              dangerouslySetInnerHTML={{
                __html: currentLangContent.content_html || '<p class="text-slate-400 italic text-center">No content published in this language yet.</p>',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}