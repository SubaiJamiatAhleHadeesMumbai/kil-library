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
  UserCircleIcon,
  PlusIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import aboutService from '../../api/aboutService';
import RichTextEditor from '../../components/common/RichTextEditor';

const EMPTY_QUOTE = () => ({
  name: '',
  designation: '',
  quote: '',
  source_text: '',
  source_url: '',
  image_url: '',
  document_image_url: '',
  language: 'all',
});

const DRAFT_STORAGE_KEY = 'kil_about_cms_draft';

const SUPPORTED_LANGS = [
  { code: 'ur', label: 'اردو (Urdu)', dir: 'rtl', isDefault: true },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية (Arabic)', dir: 'rtl' },
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

  const [adminTab, setAdminTab] = useState('content');
  const [ulmaQuotes, setUlmaQuotes] = useState([]);

  // Ulama Pro UX: Search, Pagination & Modal Editor
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteLangFilter, setQuoteLangFilter] = useState('all'); // 'all' | 'ur' | 'en'
  const [quotePage, setQuotePage] = useState(1);
  const quotesPerPage = 10;
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingQuoteIndex, setEditingQuoteIndex] = useState(null);
  const [quoteFormData, setQuoteFormData] = useState(EMPTY_QUOTE());
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Load from backend & check draft
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await aboutService.getAboutSettings();
        setFullSettings(data || {});

        // Always load and sync scholars quotes from backend regardless of content draft
        const backendQuotes = data?.ulma_quotes;
        if (Array.isArray(backendQuotes)) {
          setUlmaQuotes(backendQuotes.filter(q => q.name?.trim() || q.quote?.trim()));
        } else {
          setUlmaQuotes([]);
        }

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

        // Check if there is a local draft for content
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
        ulma_quotes: ulmaQuotes.filter(q => q.name?.trim() || q.quote?.trim()),
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

  // ── Ulama Management Handlers & Filtering ──────────────────────────────
  const handleOpenAddQuoteModal = () => {
    setEditingQuoteIndex(null);
    setQuoteFormData(EMPTY_QUOTE());
    setIsQuoteModalOpen(true);
  };

  const handleOpenEditQuoteModal = (index) => {
    setEditingQuoteIndex(index);
    setQuoteFormData({ ...ulmaQuotes[index] });
    setIsQuoteModalOpen(true);
  };

  const saveQuotesToBackend = async (newQuotes, successMessage) => {
    setSaving(true);
    try {
      const cleaned = newQuotes.filter(q => q.name?.trim() || q.quote?.trim());
      const urTitle = langData?.ur?.title?.trim() || fullSettings?.title || 'مرکز الدعوۃ الاسلامیۃ والخیریہ';
      const urSubtitle = langData?.ur?.subtitle?.trim() || fullSettings?.subtitle || '';
      const urContent = langData?.ur?.content_html || fullSettings?.content_html || '';
      const payload = {
        ...fullSettings,
        title: urTitle,
        subtitle: urSubtitle,
        content_html: urContent,
        languages: langData || fullSettings?.languages || {},
        ulma_quotes: cleaned,
        hero: {
          ...(fullSettings?.hero || {}),
          title: urTitle,
          subtitle: urSubtitle,
        },
      };
      const res = await aboutService.updateAboutSettings(payload);
      setFullSettings(res?.settings || payload);
      setUlmaQuotes(cleaned);
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (err) {
      console.error('Error saving quotes to backend:', err);
      toast.error(err?.response?.data?.detail || err.message || 'سیٹنگز محفوظ کرنے میں مسئلہ پیش آیا');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuoteFromModal = async (e) => {
    e?.preventDefault();
    if (!quoteFormData.name?.trim() && !quoteFormData.quote?.trim()) {
      toast.error('براہ کرم عالم کا نام یا ان کی رائے درج کریں');
      return;
    }
    let updatedQuotes = [];
    if (editingQuoteIndex !== null) {
      updatedQuotes = ulmaQuotes.map((q, i) => i === editingQuoteIndex ? { ...quoteFormData } : q);
    } else {
      const existing = ulmaQuotes.filter(q => q.name?.trim() || q.quote?.trim());
      updatedQuotes = [...existing, { ...quoteFormData }];
    }
    const ok = await saveQuotesToBackend(
      updatedQuotes,
      editingQuoteIndex !== null ? 'عالم کی معلومات اپ ڈیٹ اور محفوظ ہو گئیں' : 'نیا عالم کامیابی سے شامل اور محفوظ ہو گیا'
    );
    if (ok) {
      setIsQuoteModalOpen(false);
    }
  };

  const handleDeleteQuote = async (index) => {
    if (window.confirm('کیا آپ واقعی اس عالم کی رائے کو فہرست سے حذف کرنا چاہتے ہیں؟ یہ ڈیٹا بیس سے بھی مستقل حذف ہو جائے گی۔')) {
      const updatedQuotes = ulmaQuotes.filter((_, i) => i !== index);
      await saveQuotesToBackend(updatedQuotes, 'رائے کامیابی سے حذف ہو گئی');
    }
  };

  const handleUploadDocumentImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('براہ کرم تصویر والی فائل منتخب کریں (PNG, JPG, WebP)');
      return;
    }
    try {
      setUploadingDoc(true);
      const res = await aboutService.uploadImage(file);
      if (res?.url) {
        setQuoteFormData(prev => ({ ...prev, document_image_url: res.url }));
        toast.success('اصل مکتوب کی تصویر کامیابی سے اپلوڈ ہو گئی');
      } else {
        toast.error('اپلوڈ میں مسئلہ پیش آیا');
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err.message || 'تصویر اپلوڈ نہیں ہو سکی');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleUploadScholarPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('براہ کرم تصویر والی فائل منتخب کریں');
      return;
    }
    try {
      setUploadingPhoto(true);
      const res = await aboutService.uploadImage(file);
      if (res?.url) {
        setQuoteFormData(prev => ({ ...prev, image_url: res.url }));
        toast.success('عالم کی تصویر اپلوڈ ہو گئی');
      } else {
        toast.error('اپلوڈ میں مسئلہ پیش آیا');
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err.message || 'تصویر اپلوڈ نہیں ہو سکی');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleUploadSourcePdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('براہ کرم پی ڈی ایف فائل منتخب کریں (Only .pdf files)');
      return;
    }
    try {
      setUploadingPdf(true);
      const res = await aboutService.uploadPdf(file);
      if (res?.url) {
        setQuoteFormData(prev => ({ ...prev, source_url: res.url }));
        toast.success('پی ڈی ایف دستاویز کامیابی سے اپلوڈ ہو گئی');
      } else {
        toast.error('پی ڈی ایف اپلوڈ میں مسئلہ پیش آیا');
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err.message || 'پی ڈی ایف اپلوڈ نہیں ہو سکی');
    } finally {
      setUploadingPdf(false);
      e.target.value = '';
    }
  };

  const filteredQuotes = useMemo(() => {
    let list = ulmaQuotes.map((q, idx) => ({ ...q, originalIndex: idx }));
    if (quoteLangFilter !== 'all') {
      list = list.filter(q => (q.language || 'ur') === quoteLangFilter || q.language === 'all');
    }
    if (!quoteSearch.trim()) return list;
    const term = quoteSearch.toLowerCase().trim();
    return list.filter(q => 
      (q.name && q.name.toLowerCase().includes(term)) ||
      (q.designation && q.designation.toLowerCase().includes(term)) ||
      (q.quote && q.quote.toLowerCase().includes(term)) ||
      (q.source_text && q.source_text.toLowerCase().includes(term))
    );
  }, [ulmaQuotes, quoteSearch, quoteLangFilter]);

  const totalQuotePages = Math.ceil(filteredQuotes.length / quotesPerPage) || 1;
  const paginatedQuotes = useMemo(() => {
    const start = (quotePage - 1) * quotesPerPage;
    return filteredQuotes.slice(start, start + quotesPerPage);
  }, [filteredQuotes, quotePage, quotesPerPage]);

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

      {/* ================= ADMIN SECTION TABS ================= */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs w-fit">
        <button type="button" onClick={() => setAdminTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${adminTab === 'content' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          <PencilSquareIcon className="w-4 h-4" /><span>Content Editor</span>
        </button>
        <button type="button" onClick={() => setAdminTab('ulama')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${adminTab === 'ulama' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          <ChatBubbleLeftRightIcon className="w-4 h-4" /><span>علماء کی آراء</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${adminTab === 'ulama' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {ulmaQuotes.filter(q => q.name?.trim()).length}
          </span>
        </button>
      </div>

      {adminTab === 'ulama' && (
        <div className="space-y-4">
          {/* Top Control Bar: Search & Actions */}
          <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  dir="auto"
                  value={quoteSearch}
                  onChange={(e) => {
                    setQuoteSearch(e.target.value);
                    setQuotePage(1);
                  }}
                  placeholder="عالم کا نام، عہدہ یا رائے تلاش کریں... (Search 100+ scholars)"
                  className="w-full ps-10 pe-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
                {quoteSearch && (
                  <button
                    type="button"
                    onClick={() => { setQuoteSearch(''); setQuotePage(1); }}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Stats & Action Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                  کل علماء: <strong className="text-amber-700 dark:text-amber-400">{ulmaQuotes.filter(q => q.name?.trim() || q.quote?.trim()).length}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleOpenAddQuoteModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>عالم شامل کریں</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                  <span>محفوظ کریں</span>
                </button>
              </div>
            </div>

            {/* Language Filter Tabs */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
              <span className="text-xs font-bold text-slate-400 me-1">زبان فلٹر:</span>
              <button
                type="button"
                onClick={() => { setQuoteLangFilter('all'); setQuotePage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  quoteLangFilter === 'all'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                تمام زبانیں ({ulmaQuotes.filter(q => q.name?.trim() || q.quote?.trim()).length})
              </button>
              <button
                type="button"
                onClick={() => { setQuoteLangFilter('ur'); setQuotePage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  quoteLangFilter === 'ur'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                اردو ({ulmaQuotes.filter(q => (q.language || 'ur') === 'ur').length})
              </button>
              <button
                type="button"
                onClick={() => { setQuoteLangFilter('en'); setQuotePage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  quoteLangFilter === 'en'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                English ({ulmaQuotes.filter(q => q.language === 'en').length})
              </button>
            </div>
          </div>

          {/* Scholars Data Table / Compact List */}
          {paginatedQuotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {quoteSearch ? `"${quoteSearch}" کے مطابق کوئی عالم نہیں ملا` : 'فہرست میں کوئی عالم موجود نہیں ہے'}
              </h4>
              <p className="text-xs text-slate-400">
                {quoteSearch ? 'تلاش کا لفظ تبدیل کریں یا سرچ کلیر کریں۔' : 'نیا عالم شامل کرنے کے لیے اوپر دیے گئے بٹن پر کلک کریں۔'}
              </p>
              {!quoteSearch && (
                <button
                  type="button"
                  onClick={handleOpenAddQuoteModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>پہلا عالم شامل کریں</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 text-start">عالم و عہدہ (Scholar)</th>
                      <th className="py-3 px-4 text-start">رائے / تأثر (Quote Excerpt)</th>
                      <th className="py-3 px-4 text-start w-36">ماخذ (Source)</th>
                      <th className="py-3 px-4 text-center w-28">ایکشن (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedQuotes.map((q) => (
                      <tr key={q.originalIndex} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {q.originalIndex + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {q.image_url ? (
                              <img
                                src={q.image_url}
                                alt={q.name}
                                className="w-10 h-10 rounded-full object-cover border border-amber-200 dark:border-amber-700 shadow-2xs flex-shrink-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border border-amber-200 dark:border-amber-700 flex-shrink-0">
                                <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">
                                  {q.name?.charAt(0) || '؟'}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0" dir="rtl">
                              <p className="font-bold text-slate-900 dark:text-white text-sm font-urdu truncate">
                                {q.name || '(نام درج نہیں)'}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {q.language === 'en' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                    English
                                  </span>
                                ) : q.language === 'all' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                    تمام زبانیں
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold font-urdu">
                                    اردو
                                  </span>
                                )}
                                {q.designation && (
                                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-urdu truncate">
                                    {q.designation}
                                  </span>
                                )}
                                {q.document_image_url && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                                    📜 اصل مکتوب
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div dir="rtl" className="max-w-md">
                            <p className="text-slate-700 dark:text-slate-300 font-urdu text-xs line-clamp-2 leading-relaxed">
                              "{q.quote || '...'}"
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {q.source_text ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-urdu text-[11px] truncate max-w-[130px]">
                                {q.source_text}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                            {q.source_url && (
                              <a
                                href={q.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/')
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                                    : 'text-blue-600 hover:underline'
                                }`}
                              >
                                <span>{q.source_url.toLowerCase().includes('.pdf') || q.source_url.includes('/pdfs/') ? '📄 PDF' : 'Link'}</span>
                                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuoteModal(q.originalIndex)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                              title="ترمیم کریں (Edit)"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuote(q.originalIndex)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                              title="حذف کریں (Delete)"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalQuotePages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs">
                  <span className="text-slate-500">
                    Showing {(quotePage - 1) * quotesPerPage + 1} - {Math.min(quotePage * quotesPerPage, filteredQuotes.length)} of {filteredQuotes.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={quotePage === 1}
                      onClick={() => setQuotePage(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold hover:bg-slate-100"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                      {quotePage} / {totalQuotePages}
                    </span>
                    <button
                      type="button"
                      disabled={quotePage === totalQuotePages}
                      onClick={() => setQuotePage(p => Math.min(totalQuotePages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold hover:bg-slate-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save All Footer inside Ulama tab */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400">
              تبدیلیوں کے بعد اوپر یا نیچے دیے گئے <strong>"محفوظ کریں"</strong> بٹن پر کلک کرنا نہ بھولیں۔
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer shadow-sm"
            >
              {saving ? (<><ArrowPathIcon className="h-4 w-4 animate-spin" /><span>محفوظ ہو رہا ہے...</span></>) : (<><CheckCircleIcon className="h-4 w-4" /><span>تمام آراء محفوظ کریں</span></>)}
            </button>
          </div>
        </div>
      )}

      {adminTab === 'content' && (
      <>{/* ================= LANGUAGE SWITCHER TABS & COMPLETION BADGES ================= */}
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

      </>)}

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

      {/* ================= MODAL: ADD / EDIT SCHOLAR QUOTE ================= */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingQuoteIndex !== null ? 'عالم کی معلومات میں ترمیم کریں' : 'نیا عالم شامل کریں'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveQuoteFromModal} className="space-y-4">
              {/* Language Selection: Urdu vs English vs All */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  زبان منتخب کریں / Select Language
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteFormData(prev => ({ ...prev, language: 'ur' }))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      (quoteFormData.language || 'ur') === 'ur'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>اردو (Urdu)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuoteFormData(prev => ({ ...prev, language: 'en' }))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      quoteFormData.language === 'en'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuoteFormData(prev => ({ ...prev, language: 'all' }))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      quoteFormData.language === 'all'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>تمام زبانیں (All)</span>
                  </button>
                </div>
              </div>

              {/* Scholar Photo preview + Upload + URL */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {quoteFormData.image_url ? (
                      <img
                        src={quoteFormData.image_url}
                        alt="Scholar Photo"
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-300 dark:border-amber-700 shadow-sm"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border-2 border-dashed border-amber-300 dark:border-amber-700">
                        <UserCircleIcon className="w-8 h-8 text-amber-500" />
                      </div>
                    )}
                  </div>
                  <div className="sm:hidden">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer">
                      <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                      <span>{uploadingPhoto ? 'اپلوڈ...' : 'تصویر منتخب کریں'}</span>
                      <input type="file" accept="image/*" disabled={uploadingPhoto} onChange={handleUploadScholarPhoto} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        عالم کی تصویر (اختیاری / Optional)
                      </label>
                      {quoteFormData.image_url && (
                        <button
                          type="button"
                          onClick={() => setQuoteFormData(prev => ({ ...prev, image_url: '' }))}
                          className="text-[11px] font-bold text-red-600 hover:underline px-1.5 py-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          تصویر ہٹائیں ✕
                        </button>
                      )}
                    </div>
                    <label className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer">
                      {uploadingPhoto ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpTrayIcon className="w-3.5 h-3.5" />}
                      <span>{uploadingPhoto ? 'اپلوڈ ہو رہی ہے...' : 'تصویر اپلوڈ کریں'}</span>
                      <input type="file" accept="image/*" disabled={uploadingPhoto} onChange={handleUploadScholarPhoto} className="hidden" />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={quoteFormData.image_url}
                    onChange={(e) => setQuoteFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="یا تصویر کا لنک درج کریں (اختیاری / Optional)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Scholar Name & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عالم کا نام / Scholar Name
                  </label>
                  <input
                    type="text"
                    dir={quoteFormData.language === 'en' ? 'ltr' : 'auto'}
                    value={quoteFormData.name}
                    onChange={(e) => setQuoteFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={quoteFormData.language === 'en' ? "e.g. Sheikh Abdul Rahim" : "مثلاً: شیخ عبد الرحیم صاحب"}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عہدہ / لقب (Designation)
                  </label>
                  <input
                    type="text"
                    dir={quoteFormData.language === 'en' ? 'ltr' : 'auto'}
                    value={quoteFormData.designation}
                    onChange={(e) => setQuoteFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder={quoteFormData.language === 'en' ? "e.g. Mufti, Head Scholar" : "مثلاً: مفتی، صدر جمعیت، استاد حدیث"}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* 📜 NEW: DIRECT UPLOAD FOR HANDWRITTEN LETTER / DOCUMENT IMAGE */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                        اصل دستی تحریر / مکتوب کی تصویر (Original Handwritten Letter Image)
                      </h4>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
                        اگر عالم نے ہاتھ سے لکھ کر مکتوب دیا ہے تو خط کی تصویر براہِ راست اپنے موبائل یا کمپیوٹر سے اپلوڈ کریں
                      </p>
                    </div>
                  </div>
                  {quoteFormData.document_image_url && (
                    <button
                      type="button"
                      onClick={() => setQuoteFormData(prev => ({ ...prev, document_image_url: '' }))}
                      className="text-[11px] font-bold text-red-600 hover:underline px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      تصویر ہٹائیں ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50">
                    {uploadingDoc ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>اپلوڈ ہو رہا ہے...</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        <span>{quoteFormData.document_image_url ? 'دوسری تصویر منتخب کریں' : 'دستی مکتوب کی تصویر اپلوڈ کریں'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingDoc}
                      onChange={handleUploadDocumentImage}
                      className="hidden"
                    />
                  </label>

                  {quoteFormData.document_image_url ? (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 shadow-2xs flex-1">
                      <img
                        src={quoteFormData.document_image_url}
                        alt="Handwritten Letter Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-amber-300 flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block truncate">
                          ✓ دستی مکتوب محفوظ ہے
                        </span>
                        <a
                          href={quoteFormData.document_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <span>اصل تصویر مکمل دیکھیں</span>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      کوئی تصویر منتخب نہیں (اختیاری)
                    </span>
                  )}
                </div>
              </div>

              {/* Clean Readable Quote Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    صاف ٹائپ شدہ متن / نقلِ تحریر (Clean Readable Text)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    عام قارئین کی آسانی کے لیے
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-1.5 leading-relaxed">
                  اگر اوپر دستی خط کی تصویر لگائی ہے، تو اس کا مکمل متن یہاں صاف الفاظ میں ٹائپ کریں تاکہ ہر عام صارف آسانی سے پڑھ سکے۔
                </p>
                <textarea
                  rows={4}
                  dir={quoteFormData.language === 'en' ? 'ltr' : 'rtl'}
                  value={quoteFormData.quote}
                  onChange={(e) => setQuoteFormData(prev => ({ ...prev, quote: e.target.value }))}
                  placeholder={
                    quoteFormData.language === 'en'
                      ? "Type scholar's statement or testimonial in clear English text..."
                      : "عالم کے تأثرات یا خط کا مکمل متن یہاں اردو یا عربی میں صاف ٹائپ کریں..."
                  }
                  className={`w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm leading-relaxed text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 resize-none ${
                    quoteFormData.language === 'en' ? 'font-sans' : 'font-urdu'
                  }`}
                />
              </div>

              {/* Source & Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ماخذ (Source Attribution)
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={quoteFormData.source_text}
                    onChange={(e) => setQuoteFormData(prev => ({ ...prev, source_text: e.target.value }))}
                    placeholder="مثلاً: رسالہ، مکتوب، کانفرنس"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ماخذ لنک یا پی ڈی ایف (Source Link / PDF)
                    </label>
                    <label className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer">
                      {uploadingPdf ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpTrayIcon className="w-3.5 h-3.5" />}
                      <span>{uploadingPdf ? 'پی ڈی ایف اپلوڈ ہو رہی ہے...' : '📄 پی ڈی ایف اپلوڈ کریں'}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={uploadingPdf}
                        onChange={handleUploadSourcePdf}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {quoteFormData.source_url && (quoteFormData.source_url.toLowerCase().includes('.pdf') || quoteFormData.source_url.includes('/pdfs/')) ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-xs">
                      <div className="flex items-center gap-1.5 truncate text-rose-800 dark:text-rose-300 font-medium">
                        <span className="font-bold">📄 پی ڈی ایف دستاویز منسلک ہے</span>
                        <a
                          href={quoteFormData.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-[11px]"
                        >
                          (کھولیں ↗)
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuoteFormData(prev => ({ ...prev, source_url: '' }))}
                        className="text-[11px] font-bold text-red-500 hover:text-red-700"
                        title="پی ڈی ایف ہٹائیں"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <input
                      type="url"
                      value={quoteFormData.source_url}
                      onChange={(e) => setQuoteFormData(prev => ({ ...prev, source_url: e.target.value }))}
                      placeholder="پی ڈی ایف اپلوڈ کریں یا لنک درج کریں (https://...)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  منسوخ کریں (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>محفوظ ہو رہا ہے...</span>
                    </>
                  ) : (
                    <span>{editingQuoteIndex !== null ? 'معلومات محفوظ کریں' : 'شامل اور محفوظ کریں'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
