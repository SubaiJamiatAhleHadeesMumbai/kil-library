import React, { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronDownIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  PrinterIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { fatawaService } from '../api/fatawaService';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import ImageLightbox from '../components/common/ImageLightbox';
import { getErrorMessage } from '../utils/errorMessage';

const AskQuestionModal = lazy(() => import('../components/fatawa/AskQuestionModal'));

const ITEMS_PER_PAGE = 6;

// Helper to strip mixed bilingual text when in English mode
const cleanTextByLanguage = (text = '', lang = 'en') => {
  if (!text) return '';
  if (lang === 'en') {
    // If English, remove (Urdu/Arabic) in brackets: e.g. "Ibadat (عبادات)" -> "Ibadat"
    return text.replace(/\s*\([\u0600-\u06FF\s]+\)/g, '').trim();
  }
  if (lang === 'ur' || lang === 'ar') {
    // If Urdu/Arabic, extract content in brackets if present
    const match = text.match(/\(([\u0600-\u06FF\s]+)\)/);
    if (match && match[1]) return match[1].trim();
  }
  return text;
};

// ─── Sub-Component: Question Row Card ───────────────────────
const QuestionRow = ({ question, open, onToggle, currentLang }) => {
  const isAnswered = question.status === 'answered';
  const isPrivate = question.visibility === 'private';
  const isRTL = currentLang === 'ur' || currentLang === 'ar';
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const images = Array.isArray(question.images) ? question.images : [];

  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    const qText = question.question_text || '';
    const vText = cleanTextByLanguage(question.verdict_summary, currentLang);
    const aText = question.answer_text ? (question.answer_text.substring(0, 250) + (question.answer_text.length > 250 ? '...' : '')) : '';
    const shareMsg = `*FATWA - Markaz Ahle Hadees Kokan*\n\n*Question:* ${qText}\n\n*Verdict:* ${vText}\n\n*Answer:* ${aText}\n\nRead more on Markaz Library`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`, '_blank');
  };

  const handlePrint = (e) => {
    e.stopPropagation();
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const qText = question.question_text || '';
    const vText = cleanTextByLanguage(question.verdict_summary, currentLang) || '';
    const aText = question.answer_text ? question.answer_text.replace(/\n/g, '<br/>') : '';
    const refNo = question.darul_ifta_reference_no || `FATWA-${question.id}`;
    const mufti = cleanTextByLanguage(question.mufti_name, currentLang) || 'Dar-ul-Ifta & Board of Islamic Scholars, Markaz Ahle Hadees Kokan';
    const dateStr = new Date(question.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fatwa - ${refNo}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.6; margin: 0; padding: 25px; }
            .header { text-align: center; border-bottom: 2px solid #002147; padding-bottom: 12px; margin-bottom: 18px; }
            .title { font-size: 20px; font-weight: bold; color: #002147; text-transform: uppercase; margin: 0; }
            .sub { font-size: 13px; color: #475569; font-weight: 600; margin-top: 3px; }
            .meta-bar { display: flex; justify-content: space-between; font-size: 12px; color: #334155; margin-bottom: 18px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; font-weight: 600; }
            .section { margin-bottom: 16px; }
            .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #002147; letter-spacing: 0.05em; margin-bottom: 6px; }
            .question-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0f172a; }
            .verdict-box { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: bold; margin: 14px 0; }
            .answer-box { font-size: 14px; color: #1e293b; line-height: 1.8; text-align: justify; padding: 4px; }
            .footer { margin-top: 50px; padding-top: 15px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature { text-align: right; }
            .signature-line { width: 200px; border-top: 1px solid #64748b; margin-top: 40px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Markaz Ahle Hadees Kokan</h1>
            <div class="sub">Dar-ul-Ifta & Islamic Guidance Council</div>
          </div>
          <div class="meta-bar">
            <div>Ref No: <strong>${refNo}</strong></div>
            <div>Date: <strong>${dateStr}</strong></div>
          </div>
          <div class="section">
            <div class="label">Question / سوال:</div>
            <div class="question-box">${qText}</div>
          </div>
          ${vText ? `<div class="verdict-box">Shariah Verdict / شرعی حکم: <strong>${vText}</strong></div>` : ''}
          <div class="section">
            <div class="label">Official Scholarly Answer / تفصیلی جواب:</div>
            <div class="answer-box">${aText}</div>
          </div>
          <div class="footer">
            <div style="font-size: 11px; color: #64748b;">Official Document • Markaz Ahle Hadees Kokan Portal</div>
            <div class="signature">
              <div style="font-size: 12px; font-weight: bold; color: #002147;">${mufti}</div>
              <div class="signature-line"></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Authorized Seal & Signature</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getVerdictBadgeStyle = (verdict = '') => {
    const lower = verdict.toLowerCase();
    if (lower.includes('haram') || lower.includes('na-jaaiz') || lower.includes('ناجائز')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (lower.includes('makrooh') || lower.includes('مکروہ')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const cleanedCategory = cleanTextByLanguage(question.category?.name, currentLang);
  const cleanedVerdict = cleanTextByLanguage(question.verdict_summary, currentLang);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all duration-200 hover:border-slate-300">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 sm:p-5 text-left transition-colors hover:bg-slate-50/60 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2.5 flex-1 min-w-0">
            
            {/* Top Badges Strip (Clean, No Icon Clutter) */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span
                className={`px-2.5 py-0.5 rounded-md border ${
                  isPrivate
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isPrivate ? 'Private' : 'Public'}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-md border ${
                  isAnswered
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isAnswered ? 'Answered' : 'Pending'}
              </span>

              {cleanedCategory && (
                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md">
                  {cleanedCategory}
                </span>
              )}

              {cleanedVerdict && (
                <span className={`px-2.5 py-0.5 rounded-md border font-bold ${getVerdictBadgeStyle(question.verdict_summary)}`}>
                  {cleanedVerdict}
                </span>
              )}

              {question.darul_ifta_reference_no && (
                <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-mono">
                  Ref: {question.darul_ifta_reference_no}
                </span>
              )}
            </div>

            {/* Question Text (Refined text size) */}
            <h3 className="text-sm sm:text-base font-bold leading-snug text-slate-900 group-hover:text-blue-900 transition-colors">
              {question.question_text}
            </h3>

            {/* Footer Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
              <span>{question.is_anonymous ? 'Anonymous' : question.display_name || 'Guest User'}</span>
              <span>•</span>
              <span>
                {new Date(question.created_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              {question.pdf_url && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  <DocumentArrowDownIcon className="w-3 h-3" /> PDF
                </span>
              )}

              {images.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  <PhotoIcon className="w-3 h-3" /> {images.length} {images.length === 1 ? 'Scan' : 'Scans'}
                </span>
              )}
            </div>
          </div>

          <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 transition-transform group-hover:bg-slate-200 group-hover:text-slate-700">
            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Answer Expandable Section */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 text-sm text-slate-700 space-y-4">
          
          {/* Header of Answer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {currentLang === 'ur' ? 'دار الافتاء کا جواب' : currentLang === 'ar' ? 'الجواب الشرعي' : 'Official Scholarly Answer'}
            </span>
            
            {question.mufti_name && (
              <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                {currentLang === 'ur' ? 'جاری کنندہ: ' : currentLang === 'ar' ? 'صادر عن: ' : 'Issued by: '}
                <strong>{cleanTextByLanguage(question.mufti_name, currentLang)}</strong>
              </span>
            )}
          </div>

          {/* Verdict Banner (Compact & Clean) */}
          {cleanedVerdict && (
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${getVerdictBadgeStyle(question.verdict_summary)}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  {currentLang === 'ur' ? 'شرعی حکم' : currentLang === 'ar' ? 'الحكم الشرعي' : 'Shariah Verdict'}
                </span>
                <p className="text-sm font-bold mt-0.5">{cleanedVerdict}</p>
              </div>

              {question.darul_ifta_reference_no && (
                <div className="text-right">
                  <span className="text-[10px] opacity-75 font-medium">Ref No.</span>
                  <p className="font-mono font-bold text-xs">{question.darul_ifta_reference_no}</p>
                </div>
              )}
            </div>
          )}

          {/* Detailed Answer Text */}
          {question.answer_text ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs text-slate-800">
              <div className="text-sm leading-relaxed whitespace-pre-line font-normal text-slate-800">
                {question.answer_text}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 text-xs">
              {currentLang === 'ur' ? 'یہ سوال علماء کے پاس زیرِ جائزہ ہے۔' : 'Answer is currently pending review by scholars.'}
            </div>
          )}

          {/* Official Signed PDF Download Card */}
          {question.pdf_url && (
            <div className="p-3.5 rounded-xl bg-white border border-red-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                  PDF
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">
                    {currentLang === 'ur' ? 'دستخط شدہ فتویٰ (پی ڈی ایف)' : 'Official Signed Fatwa (PDF)'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {currentLang === 'ur' ? 'مہر اور دستخط کے ساتھ اصل دستاویز' : 'Official document with Dar-ul-Ifta seal'}
                  </p>
                </div>
              </div>

              <a
                href={question.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
              >
                <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            </div>
          )}

          {/* Reference Book Scans */}
          {images.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {currentLang === 'ur' ? 'کتابی حوالہ جات کے اسکینز' : 'Reference Book Scans'} ({images.length})
                </span>
                <span className="text-[10px] text-slate-400">Click to view</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                    className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer aspect-4/3 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={img.url}
                      alt={img.caption || `Scan ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1">
                        <p className="text-[10px] text-white truncate text-center">{img.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox for Scans */}
          <ImageLightbox
            isOpen={lightboxOpen}
            images={images}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={(newIdx) => setLightboxIndex(newIdx)}
          />

          {/* Share & Print Toolbar (Clean, minimal) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition-colors cursor-pointer text-xs"
              >
                <ShareIcon className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer text-xs"
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              Markaz Ahle Hadees Kokan
            </span>
          </div>

        </div>
      )}
    </article>
  );
};

// ─── Main Fatawa Page Component ─────────────────────────────
const Fatawa = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuth } = useAuth();
  const { currentLang, t } = useLanguage();
  const isRTL = currentLang === 'ur' || currentLang === 'ar';

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [askOpen, setAskOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const deferredSearch = useDeferredValue(searchInput);

  // Queries
  const categoriesQuery = useQuery({
    queryKey: ['fatawa-categories'],
    queryFn: () => fatawaService.getCategories(),
  });

  const questionsQuery = useQuery({
    queryKey: ['fatawa-questions', deferredSearch, selectedCategory],
    queryFn: () => fatawaService.getQuestions({
      limit: 100,
      search: deferredSearch,
      category_id: selectedCategory || undefined,
    }),
  });

  const myQuestionsQuery = useQuery({
    queryKey: ['fatawa-my-questions', user?.id],
    queryFn: () => fatawaService.getMyQuestions(),
    enabled: isAuth,
  });

  const relatedBooksQuery = useQuery({
    queryKey: ['fatawa-related-books', selectedCategory],
    queryFn: () => fatawaService.getRelatedBooks(selectedCategory),
    enabled: Boolean(selectedCategory),
  });

  // Mutation
  const createQuestionMutation = useMutation({
    mutationFn: fatawaService.createQuestion,
    onSuccess: async () => {
      toast.success(currentLang === 'ur' ? 'سوال کامیابی سے جمع ہو گیا!' : 'Question submitted for scholarly review!');
      setAskOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-my-questions'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not submit question.'));
    },
  });

  const categories = categoriesQuery.data || [];
  const rawQuestions = questionsQuery.data || [];

  // Reset pagination on filter/search change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, selectedCategory]);

  // Pagination Math
  const totalQuestions = rawQuestions.length;
  const totalPages = Math.ceil(totalQuestions / ITEMS_PER_PAGE) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return rawQuestions.slice(start, start + ITEMS_PER_PAGE);
  }, [rawQuestions, currentPage]);

  const heroStats = [
    { label: currentLang === 'ur' ? 'جواب شدہ' : 'Answered', value: rawQuestions.filter((item) => item.status === 'answered').length },
    { label: currentLang === 'ur' ? 'نجی سوالات' : 'Private', value: rawQuestions.filter((item) => item.visibility === 'private').length },
    { label: currentLang === 'ur' ? 'زمرہ جات' : 'Categories', value: categories.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-16 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Banner (Compact & Clean) */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#001D3D] text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-cyan-200 border border-white/15">
              {currentLang === 'ur' ? 'دار الافتاء و رہنمائی مرکز' : 'Dar-ul-Ifta & Guidance'}
            </span>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {currentLang === 'ur' ? 'اسلامی فتاویٰ و شرعی رہنمائی' : 'Islamic Fatawa & Scholarly Clarifications'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {currentLang === 'ur'
                ? 'مرکز اہل حدیث کوکن کی جانب سے شرعی مسائل کے مدلل جوابات اور فتاویٰ کا مستند ریکارڈ۔'
                : 'Verified scholarly verdicts, public questions, and certified Islamic guidance.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => setAskOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-[#001D3D] transition-colors cursor-pointer"
              >
                <PlusIcon className="w-4 h-4 stroke-2" />
                <span>{currentLang === 'ur' ? 'نیا سوال پوچھیں' : 'Ask Question'}</span>
              </button>
              <button
                onClick={() => navigate('/books')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 hover:bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <BookOpenIcon className="w-4 h-4" />
                <span>{currentLang === 'ur' ? 'کتب خانہ دیکھیں' : 'Browse Catalog'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.8fr_0.9fr]">
          
          {/* Left Column: Search & Questions */}
          <main className="space-y-4">
            
            {/* Search Toolbar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr]">
                <div className="relative flex items-center">
                  <MagnifyingGlassIcon className={`pointer-events-none absolute h-4 w-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={currentLang === 'ur' ? 'مسائل یا الفاظ تلاش کریں...' : 'Search questions or keywords...'}
                    className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-[#002147] focus:bg-white ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput('')}
                      className={`absolute text-slate-400 hover:text-slate-600 ${isRTL ? 'left-2.5' : 'right-2.5'}`}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#002147] focus:bg-white"
                >
                  <option value="">{currentLang === 'ur' ? 'تمام زمرہ جات' : 'All Categories'}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cleanTextByLanguage(cat.name, currentLang)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Questions List */}
            {questionsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl bg-white border border-slate-200" />
                ))}
              </div>
            ) : paginatedQuestions.length > 0 ? (
              <div className="space-y-3">
                {paginatedQuestions.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    open={activeQuestionId === question.id}
                    onToggle={() => setActiveQuestionId((curr) => (curr === question.id ? null : question.id))}
                    currentLang={currentLang}
                  />
                ))}

                {/* Clean Numbered Pagination Bar */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-white p-3 rounded-2xl border">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong>–<strong>{Math.min(currentPage * ITEMS_PER_PAGE, totalQuestions)}</strong> of <strong>{totalQuestions}</strong> {currentLang === 'ur' ? 'فتاویٰ' : 'Fatawa'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCurrentPage(num)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === num
                              ? 'bg-[#002147] text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-800">
                  {currentLang === 'ur' ? 'کوئی سوال نہیں ملا' : 'No questions found'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {currentLang === 'ur' ? 'مختلف الفاظ تلاش کریں یا نیا سوال پوچھیں۔' : 'Try a different search keyword.'}
                </p>
              </div>
            )}
          </main>

          {/* Right Sidebar: My Submissions & Catalog */}
          <aside className="space-y-4">
            
            {/* My Submissions Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {currentLang === 'ur' ? 'میرے سوالات' : 'My Questions'}
                </h3>
                <ClockIcon className="h-4 w-4 text-slate-400" />
              </div>

              {!isAuth ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 text-center border border-slate-100">
                  <p className="font-semibold">{currentLang === 'ur' ? 'لاگ ان کریں' : 'Sign in to track your questions'}</p>
                </div>
              ) : myQuestionsQuery.isLoading ? (
                <div className="mt-3 space-y-2">
                  {[...Array(2)].map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {(myQuestionsQuery.data || []).map((q) => (
                    <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded ${q.status === 'answered' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {q.status}
                        </span>
                        <span className="text-slate-400">{q.visibility}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-800 line-clamp-2">{q.question_text}</p>
                    </div>
                  ))}
                  {!(myQuestionsQuery.data || []).length && (
                    <p className="text-xs text-slate-400 text-center py-2">
                      {currentLang === 'ur' ? 'کوئی سوال جمع نہیں کیا گیا۔' : 'No submissions yet.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Related Books */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {currentLang === 'ur' ? 'متعلقہ کتب' : 'Related Books'}
                </h3>
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-slate-400" />
              </div>

              {relatedBooksQuery.isLoading ? (
                <div className="mt-3 space-y-2">
                  {[...Array(2)].map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {(relatedBooksQuery.data || []).slice(0, 3).map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => navigate(`/books/${book.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="h-10 w-8 rounded bg-slate-100 overflow-hidden shrink-0">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                        ) : (
                          <BookOpenIcon className="h-4 w-4 m-2 text-slate-400" />
                        )}
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{book.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{book.author || 'Markaz'}</p>
                      </div>
                    </button>
                  ))}
                  {!(relatedBooksQuery.data || []).length && (
                    <p className="text-xs text-slate-400 text-center py-2">
                      {currentLang === 'ur' ? 'اس زمرے میں کوئی کتاب دستیاب نہیں۔' : 'Select a category to see books.'}
                    </p>
                  )}
                </div>
              )}
            </div>

          </aside>

        </div>
      </div>

      {/* Ask Question Modal */}
      <Suspense fallback={null}>
        {askOpen && (
          <AskQuestionModal
            open={askOpen}
            onClose={() => setAskOpen(false)}
            categories={categories}
            onSubmit={(payload) => createQuestionMutation.mutateAsync(payload)}
            loading={createQuestionMutation.isPending}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Fatawa;