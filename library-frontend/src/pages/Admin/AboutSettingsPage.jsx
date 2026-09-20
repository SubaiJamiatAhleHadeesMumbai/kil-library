import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentPlusIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  DevicePhoneMobileIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  ViewColumnsIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import aboutService from '../../api/aboutService';
import RichTextEditor from '../../components/common/RichTextEditor';

const DRAFT_STORAGE_KEY = 'kil_about_cms_draft';

const SUPPORTED_LANGS = [
  { code: 'ur', label: 'اردو (Urdu)', flag: '🇵🇰', dir: 'rtl', isDefault: true },
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', label: 'العربية (Arabic)', flag: '🇸🇦', dir: 'rtl' },
];

// Helper to count words from HTML string
const getWordCount = (html) => {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
};

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

  // View Modes: 'editor' | 'split' | 'preview'
  const [viewMode, setViewMode] = useState('editor');
  const [activeLang, setActiveLang] = useState('ur'); // 'ur' | 'en' | 'ar'

  // Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [previewLang, setPreviewLang] = useState('ur');

  const [fullSettings, setFullSettings] = useState({});
  const [originalLangData, setOriginalLangData] = useState(null);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);

  // 3-Language Content State
  const [langData, setLangData] = useState({
    ur: { title: '', subtitle: '', content_html: '' },
    en: { title: '', subtitle: '', content_html: '' },
    ar: { title: '', subtitle: '', content_html: '' },
  });

  // Load from backend & check draft
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

        const initialLangs = {
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
        };

        // Check if there is a local draft
        try {
          const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (draftJson) {
            const parsedDraft = JSON.parse(draftJson);
            if (parsedDraft?.ur || parsedDraft?.en || parsedDraft?.ar) {
              setLangData(parsedDraft);
              setOriginalLangData(initialLangs);
              setHasDraftRestored(true);
              setLoading(false);
              return;
            }
          }
        } catch (draftErr) {
          console.warn('Draft load error:', draftErr);
        }

        setLangData(initialLangs);
        setOriginalLangData(initialLangs);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load About settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Auto-save draft to localStorage whenever content changes
  useEffect(() => {
    if (!loading && langData) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(langData));
      } catch (err) {
        console.warn('Local draft storage error:', err);
      }
    }
  }, [langData, loading]);

  // Track if there are unsaved changes
  const isDirty = useMemo(() => {
    if (!originalLangData) return false;
    return JSON.stringify(langData) !== JSON.stringify(originalLangData);
  }, [langData, originalLangData]);

  const currentActiveLangObj = useMemo(
    () => SUPPORTED_LANGS.find((l) => l.code === activeLang) || SUPPORTED_LANGS[0],
    [activeLang]
  );

  const previewActiveLangObj = useMemo(
    () => SUPPORTED_LANGS.find((l) => l.code === previewLang) || SUPPORTED_LANGS[0],
    [previewLang]
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

  const handleDiscardDraft = () => {
    if (originalLangData) {
      setLangData(originalLangData);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraftRestored(false);
      toast.success('Restored published version. Draft discarded.');
    }
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
      setOriginalLangData(langData);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraftRestored(false);
      setIsPreviewModalOpen(false);
      toast.success('All 3 languages for About page successfully published!');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPreviewModal = () => {
    setPreviewLang(activeLang);
    setIsPreviewModalOpen(true);
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
  const previewLangContent = langData[previewLang] || { title: '', subtitle: '', content_html: '' };

  // Helper renderer for the live public preview card
  const renderPublicPreviewCard = (content, langObj) => {
    const rawHtml = content.content_html;
    const htmlToRender = rawHtml && rawHtml.trim() ? rawHtml : '<p class="text-slate-400 italic text-center py-8">No content written in this language yet.</p>';

    return (
      <article className="space-y-6 w-full">
        {/* Top Header Banner */}
        <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 text-center shadow-xs">
          <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-3 tracking-wide">
            Markaz & Library
          </span>
          <h1
            dir={langObj.dir}
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            {content.title || 'About Us'}
          </h1>
          {content.subtitle && (
            <p
              dir={langObj.dir}
              className="mt-3 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed"
            >
              {content.subtitle}
            </p>
          )}
        </header>

        {/* Dynamic Rich Text Body */}
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div
            dir={langObj.dir}
            className="about-rich-content prose prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-img:rounded-2xl prose-img:shadow-md prose-img:mx-auto prose-img:max-w-full text-slate-800 dark:text-slate-200 leading-relaxed text-sm sm:text-base"
            dangerouslySetInnerHTML={{ __html: htmlToRender }}
          />
        </section>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* ================= DRAFT NOTIFICATION BAR ================= */}
      {hasDraftRestored && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 px-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Unsaved Draft Restored:</strong> You have an auto-saved draft loaded from your previous editing session.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="font-bold underline hover:text-amber-700 dark:hover:text-amber-100 cursor-pointer ml-4 flex-shrink-0"
          >
            Discard Draft
          </button>
        </div>
      )}

      {/* ================= PAGE HEADER & PRIMARY CONTROLS ================= */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              About Page CMS & Multi-Language Editor
            </h1>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              3 Languages Supported
            </span>
            {isDirty ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved Changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-600" />
                All Saved
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage Title, Subtitle, and Rich Content in <strong>Urdu</strong>, <strong>English</strong>, and <strong>Arabic</strong>. Preview your changes live across devices before saving.
          </p>
        </div>

        {/* Action Buttons: Preview First, then Save */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <span>Live Public URL</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 opacity-60" />
          </Link>

          {/* ADVANCED: PREVIEW & CONFIRM BUTTON */}
          <button
            type="button"
            onClick={handleOpenPreviewModal}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer"
          >
            <ArrowsPointingOutIcon className="h-4 w-4 text-emerald-600" />
            <span>Preview & Review (پیش منظر)</span>
          </button>

          {/* SAVE ALL BUTTON */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Publishing All...</span>
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

      {/* ================= LANGUAGE SWITCHER TABS & COMPLETION BADGES ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <GlobeAltIcon className="w-5 h-5 text-emerald-600 ml-1" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mr-1">
            Active Language:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORTED_LANGS.map((lang) => {
              const isSelected = activeLang === lang.code;
              const words = getWordCount(langData[lang.code]?.content_html);
              const hasTitle = Boolean(langData[lang.code]?.title?.trim());
              const isComplete = hasTitle && words > 10;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setActiveLang(lang.code);
                    setPreviewLang(lang.code);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      isSelected
                        ? 'bg-emerald-700 text-white'
                        : isComplete
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {words} words
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy from Urdu Action */}
        {activeLang !== 'ur' && (
          <button
            type="button"
            onClick={handleCopyFromUrdu}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer"
            title="Copy images, headings, and structure from Urdu tab"
          >
            <DocumentDuplicateIcon className="w-4 h-4 text-emerald-600" />
            <span>Copy Layout from Urdu</span>
          </button>
        )}
      </div>

      {/* ================= VIEW MODE TOGGLES (Editor / Split View / Preview) ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {/* Mode 1: Editor Full */}
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'editor'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <PencilSquareIcon className="h-4 w-4" />
            <span>Editor Only</span>
          </button>

          {/* Mode 2: Split Screen Dual Pane */}
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'split'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ViewColumnsIcon className="h-4 w-4" />
            <span>Side-by-Side Split View</span>
          </button>

          {/* Mode 3: Inline Preview */}
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <EyeIcon className="h-4 w-4" />
            <span>Full Public Preview</span>
          </button>
        </div>

        {/* Word count & character tracker */}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Currently editing: <strong className="text-slate-800 dark:text-slate-200">{currentActiveLangObj.label}</strong> ({getWordCount(currentLangContent.content_html)} words, {currentLangContent.content_html?.length || 0} chars)
        </div>
      </div>

      {/* ================= WORKSPACE BODY: BASED ON VIEW MODE ================= */}
      {viewMode === 'preview' ? (
        /* ------------------ VIEW: FULL PREVIEW ------------------ */
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-300">
            <span>
              Previewing public rendering in <strong>{currentActiveLangObj.label}</strong>. Public users browsing in this language will see this exact page.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className="font-bold underline hover:opacity-80 cursor-pointer"
              >
                ← Back to Editor
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 cursor-pointer"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>Looks Good, Save Now</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
              {renderPublicPreviewCard(currentLangContent, currentActiveLangObj)}
            </div>
          </div>
        </div>
      ) : (
        /* ------------------ VIEW: EDITOR OR SPLIT VIEW ------------------ */
        <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* LEFT PANE: EDITOR FORM */}
          <div className="space-y-5">
            {/* Title and Subtitle inputs */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Page Subtitle / Tagline ({currentActiveLangObj.label})
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
                      : 'Departments • Activities • Achievements • Future Goals'
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Quick Insert Snippets */}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <DocumentPlusIcon className="w-3.5 h-3.5 text-emerald-600" /> Quick Inserts:
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
                + 2-Column Grid
              </button>
            </div>

            {/* RichTextEditor with Media & Nastaliq RTL */}
            <RichTextEditor
              key={activeLang}
              value={currentLangContent.content_html || ''}
              onChange={(html) => updateCurrentLangField('content_html', html)}
              label={`About Content (${currentActiveLangObj.label})`}
              placeholder={`Type or paste formatted content in ${currentActiveLangObj.label}, insert pictures, headers...`}
              initialRTL={currentActiveLangObj.dir === 'rtl'}
              minHeight={viewMode === 'split' ? '420px' : '480px'}
            />

            {/* Save Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <InformationCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Tip: Preview across devices with <strong>"Preview & Review"</strong> before publishing.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreviewModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                >
                  <EyeIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Preview First</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer"
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
          </div>

          {/* RIGHT PANE: SYNCHRONIZED REAL-TIME PREVIEW (IN SPLIT VIEW MODE) */}
          {viewMode === 'split' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <EyeIcon className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time Public Preview ({currentActiveLangObj.label})</span>
                </div>
                <span className="text-[11px] text-slate-400">Updates as you type</span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 max-h-[820px] overflow-y-auto shadow-inner">
                {renderPublicPreviewCard(currentLangContent, currentActiveLangObj)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= ADVANCED: FULLSCREEN DEVICE PREVIEW & CONFIRM MODAL ================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Top Modal Navigation Bar */}
          <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 border-b border-slate-800 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-wide flex items-center gap-2 text-emerald-400">
                <EyeIcon className="w-4 h-4" />
                Live Preview & Verification
              </span>

              {/* Language Switcher inside Modal */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                {SUPPORTED_LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setPreviewLang(lang.code)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      previewLang === lang.code
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Device Switcher (Desktop / Tablet / Mobile) */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                title="Desktop View (100%)"
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs ${
                  previewDevice === 'desktop'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ComputerDesktopIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                title="Tablet View (768px)"
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs ${
                  previewDevice === 'tablet'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DeviceTabletIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                title="Mobile View (390px)"
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs ${
                  previewDevice === 'mobile'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DevicePhoneMobileIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition cursor-pointer"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    <span>Confirm & Save All</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close Preview"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </header>

          {/* Modal Content Frame */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 flex justify-center items-start">
            <div
              className={`transition-all duration-300 w-full bg-slate-50 dark:bg-slate-950 rounded-3xl p-4 sm:p-8 shadow-2xl ${
                previewDevice === 'mobile'
                  ? 'max-w-[400px] border-4 border-slate-700'
                  : previewDevice === 'tablet'
                  ? 'max-w-[768px] border-4 border-slate-700'
                  : 'max-w-5xl'
              }`}
            >
              {renderPublicPreviewCard(previewLangContent, previewActiveLangObj)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
