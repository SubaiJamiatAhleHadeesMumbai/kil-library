import React, { Suspense, lazy, useDeferredValue, useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HomeIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BookOpenIcon,
  ClockIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  PrinterIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { fatawaService } from '../api/fatawaService';
import useAuth from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import ImageLightbox from '../components/common/ImageLightbox';
import { getErrorMessage } from '../utils/errorMessage';

const AskQuestionModal = lazy(() => import('../components/fatawa/AskQuestionModal'));

const ITEMS_PER_PAGE = 6;

// ─── Trilingual UI Dictionary (Strict Language Isolation) ───────────────
const UI_TEXT = {
  en: {
    home: 'Home',
    badge: 'Dar-ul-Ifta & Islamic Guidance',
    title: 'Islamic Fatawa & Scholarly Verdicts',
    subtitle: 'Verified scholarly rulings, public questions, and certified Islamic guidance from the scholars of Markaz Ahle Hadees Kokan.',
    askBtn: 'Ask a Question',
    browseBooks: 'Browse Related Books',
    tabAll: 'All Fatawa',
    tabMy: 'My Questions',
    searchPlaceholder: 'Search questions, verdicts, or keywords...',
    allCategories: 'All Categories',
    totalCount: 'Total Fatawa',
    showing: 'Showing',
    of: 'of',
    results: 'results',
    fatawa: 'Fatawa',
    public: 'Public',
    private: 'Confidential',
    answered: 'Answered',
    pending: 'Under Review',
    refNo: 'Ref No:',
    issuedBy: 'Issued by:',
    verdictLabel: 'Shariah Verdict',
    officialAnswer: 'Official Scholarly Answer & Evidence',
    pendingReview: 'This question is currently under review by the scholars.',
    signedPdf: 'Official Signed Fatwa (PDF)',
    signedPdfSub: 'Authorized document with Dar-ul-Ifta seal & signature',
    downloadPdf: 'Download PDF',
    bookScans: 'Reference Book Scans & Citations',
    clickToView: 'Click to zoom',
    share: 'Share',
    print: 'Print Fatwa',
    noQuestions: 'No Fatawa Found',
    noQuestionsSub: 'Try different search keywords or select another category.',
    signInPrompt: 'Sign in to track your submitted questions and view private answers.',
    signInBtn: 'Sign In to Portal',
    noSubmissions: 'You have not submitted any questions yet.',
    anonymous: 'Anonymous',
    guestUser: 'Inquirer',
    scanSingle: 'Scan',
    scanPlural: 'Scans',
    pageOf: 'Page',
    relatedBooksTitle: 'Related Fiqh & Reference Books',
    relatedBooksSubtitle: 'Authoritative references and literature related to this topic in Markaz library',
    viewBook: 'View Book',
    authorDefault: 'Markaz Scholar',
    submittedOn: 'Submitted on',
  },
  ur: {
    home: 'مرکز ہوم',
    badge: 'دار الافتاء و رہنمائی مرکز',
    title: 'اسلامی فتاویٰ و شرعی رہنمائی',
    subtitle: 'مرکز اہل حدیث کوکن کی جانب سے شرعی مسائل کے مدلل جوابات اور فتاویٰ کا مستند و باضابطہ ریکارڈ۔',
    askBtn: 'نیا سوال پوچھیں',
    browseBooks: 'متعلقہ کتب کتب خانہ',
    tabAll: 'تمام فتاویٰ',
    tabMy: 'میرے سوالات',
    searchPlaceholder: 'مسائل، احکام یا الفاظ تلاش کریں...',
    allCategories: 'تمام زمرہ جات',
    totalCount: 'کل فتاویٰ',
    showing: 'ظاہر کردہ',
    of: 'از',
    results: 'نتائج',
    fatawa: 'فتاویٰ',
    public: 'عوامی',
    private: 'خفیہ و نجی',
    answered: 'جواب شدہ',
    pending: 'زیرِ جائزہ',
    refNo: 'فتویٰ نمبر:',
    issuedBy: 'جاری کنندہ:',
    verdictLabel: 'شرعی حکم',
    officialAnswer: 'دار الافتاء کا تفصیلی جواب و دلائل',
    pendingReview: 'یہ سوال مفتیان کرام کے پاس زیرِ جائزہ ہے۔',
    signedPdf: 'دستخط شدہ فتویٰ (پی ڈی ایف)',
    signedPdfSub: 'مہر اور دستخط کے ساتھ باضابطہ دستاویز',
    downloadPdf: 'پی ڈی ایف ڈاؤنلوڈ کریں',
    bookScans: 'کتابی حوالہ جات کے اسکینز',
    clickToView: 'بڑا کر کے دیکھنے کے لیے کلک کریں',
    share: 'شیئر کریں',
    print: 'پرنٹ فتویٰ',
    noQuestions: 'کوئی سوال یا فتویٰ نہیں ملا',
    noQuestionsSub: 'مختلف الفاظ تلاش کریں یا دوسرا زمرہ منتخب کریں۔',
    signInPrompt: 'اپنے پوچھے گئے سوالات اور نجی جوابات دیکھنے کے لیے لاگ ان کریں۔',
    signInBtn: 'پورٹل میں لاگ ان کریں',
    noSubmissions: 'ابھی تک آپ کا کوئی سوال جمع نہیں ہوا ہے۔',
    anonymous: 'سائل (پوشیدہ نام)',
    guestUser: 'سائل',
    scanSingle: 'اسکین',
    scanPlural: 'اسکینز',
    pageOf: 'صفحہ',
    relatedBooksTitle: 'متعلقہ فقہی و حوالہ جاتی کتب',
    relatedBooksSubtitle: 'اس موضوع سے متعلق کتب خانہ میں موجود معتبر کتب و مراجع',
    viewBook: 'کتاب دیکھیں',
    authorDefault: 'علماء مرکز',
    submittedOn: 'تاریخِ ارسال',
  },
  ar: {
    home: 'الرئيسية',
    badge: 'دار الإفتاء والتوجيه الشرعي',
    title: 'الفتاوى الشرعية والبيانات الفقهية',
    subtitle: 'إجابات شرعية موثقة وفتاوى صادرة عن هيئة كبار علماء مركز أهل الحديث كوكان.',
    askBtn: 'طرح سؤال جديد',
    browseBooks: 'الكتب الفقهية ذات الصلة',
    tabAll: 'جميع الفتاوى',
    tabMy: 'أسئلتي الفقهية',
    searchPlaceholder: 'البحث في الأسئلة والفتاوى والموضوعات...',
    allCategories: 'جميع الأقسام',
    totalCount: 'مجموع الفتاوى',
    showing: 'عرض',
    of: 'من',
    results: 'نتائج',
    fatawa: 'فتاوى',
    public: 'عام',
    private: 'سري',
    answered: 'تمت الإجابة',
    pending: 'قيد المراجعة',
    refNo: 'رقم الفتوى:',
    issuedBy: 'صادر عن:',
    verdictLabel: 'الحكم الشرعي',
    officialAnswer: 'الجواب الفقهي المعتمد والأدلة',
    pendingReview: 'هذا السؤال قيد النظر والمراجعة من قبل العلماء.',
    signedPdf: 'الفتوى الموقعة (PDF)',
    signedPdfSub: 'الوثيقة المعتمدة مع ختم وتوقيع دار الإفتاء',
    downloadPdf: 'تحميل ملف PDF',
    bookScans: 'المراجع والمصادر المصورة',
    clickToView: 'انقر للتكبير',
    share: 'مشاركة',
    print: 'طباعة الفتوى',
    noQuestions: 'لم يتم العثور على أي أسئلة',
    noQuestionsSub: 'جرب كلمات بحث أخرى أو اختر قسماً آخر.',
    signInPrompt: 'سجل الدخول لمتابعة أسئلتك وإجاباتها الشرعية.',
    signInBtn: 'تسجيل الدخول إلى البوابة',
    noSubmissions: 'لم تقم بتقديم أي أسئلة فقهية حتى الآن.',
    anonymous: 'سائل (مجهول)',
    guestUser: 'سائل',
    scanSingle: 'مرفق',
    scanPlural: 'مرفقات',
    pageOf: 'صفحة',
    relatedBooksTitle: 'كتب ومراجع فقهية ذات صلة',
    relatedBooksSubtitle: 'أمهات الكتب والمصادر الفقهية المعتمدة في المكتبة',
    viewBook: 'عرض الكتاب',
    authorDefault: 'علماء المركز',
    submittedOn: 'تاريخ الإرسال',
  },
};

// Helper to strictly isolate languages (strips opposite scripts)
const cleanTextByLanguage = (text = '', lang = 'en') => {
  if (!text || typeof text !== 'string') return '';
  if (lang === 'en') {
    let cleaned = text.replace(/\s*\([\u0600-\u06FF\s-]+\)/g, '').trim();
    if (cleaned.includes('/') && /[\u0600-\u06FF]/.test(cleaned)) {
      const parts = cleaned.split('/');
      const enPart = parts.find((p) => !/[\u0600-\u06FF]/.test(p));
      if (enPart) cleaned = enPart.trim();
    }
    return cleaned || text;
  }
  if (lang === 'ur' || lang === 'ar') {
    const match = text.match(/\(([\u0600-\u06FF\s-]+)\)/);
    if (match && match[1]) return match[1].trim();
    if (text.includes('/') && /[\u0600-\u06FF]/.test(text)) {
      const parts = text.split('/');
      const urPart = parts.find((p) => /[\u0600-\u06FF]/.test(p));
      if (urPart) return urPart.trim();
    }
  }
  return text;
};

// ─── Sub-Component: Question Card ───────────────────────
const QuestionRow = ({ question, open, onToggle, currentLang }) => {
  const txt = UI_TEXT[currentLang] || UI_TEXT.en;
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
    const aText = question.answer_text
      ? question.answer_text.substring(0, 250) + (question.answer_text.length > 250 ? '...' : '')
      : '';
    const shareMsg = `*FATWA - Markaz Ahle Hadees Kokan*\n\n*Question:* ${qText}\n\n*Verdict:* ${vText}\n\n*Answer:* ${aText}\n\nRead more on: ${window.location.origin}/fatawa?id=${question.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`, '_blank');
  };

  const handlePrint = (e) => {
    e.stopPropagation();
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    const qText = escapeHtml(question.question_text || '');
    const vText = escapeHtml(cleanTextByLanguage(question.verdict_summary, currentLang) || '');
    const aText = question.answer_text ? escapeHtml(question.answer_text).replace(/\n/g, '<br/>') : '';
    const refNo = escapeHtml(question.darul_ifta_reference_no || `FATWA-${question.id}`);
    const mufti = escapeHtml(
      cleanTextByLanguage(question.mufti_name, currentLang) ||
        (currentLang === 'en' ? 'Dar-ul-Ifta & Board of Islamic Scholars' : 'دار الافتاء و مجلس علماء مرکز اہل حدیث')
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <title>${escapeHtml(txt.badge)} - ${refNo}</title>
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
            .signature { text-align: ${isRTL ? 'left' : 'right'}; }
            .signature-line { width: 200px; border-top: 1px solid #64748b; margin-top: 40px; }
            @media print { body { padding: 0; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${escapeHtml(txt.title)}</h1>
            <p class="sub">${escapeHtml(txt.badge)}</p>
          </div>
          <div class="meta-bar">
            <span>${txt.refNo} ${refNo}</span>
            <span>Markaz Ahle Hadees Kokan</span>
          </div>
          <div class="section">
            <div class="label">${isRTL ? 'سوال:' : 'Question:'}</div>
            <div class="question-box">${qText}</div>
          </div>
          ${vText ? `<div class="verdict-box">${txt.verdictLabel}: <strong>${vText}</strong></div>` : ''}
          <div class="section">
            <div class="label">${txt.officialAnswer}:</div>
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
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getVerdictBadgeStyle = (verdict = '') => {
    const lower = verdict.toLowerCase();
    if (lower.includes('haram') || lower.includes('na-jaaiz') || lower.includes('حرام') || lower.includes('ناجائز') || lower.includes('محرم')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (lower.includes('makrooh') || lower.includes('مکروہ')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  };

  const cleanedCategory = cleanTextByLanguage(question.category?.name, currentLang);
  const cleanedVerdict = cleanTextByLanguage(question.verdict_summary, currentLang);

  const formattedDate = question.created_at
    ? new Date(question.created_at).toLocaleDateString(
        currentLang === 'ur' ? 'ur-PK' : currentLang === 'ar' ? 'ar-SA' : 'en-US',
        { month: 'short', day: 'numeric', year: 'numeric' }
      )
    : '';

  return (
    <article
      id={`fatawa-${question.id}`}
      className={`group overflow-hidden rounded-2xl border transition-all duration-200 ${
        open
          ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20 bg-white'
          : 'border-slate-200 bg-white shadow-2xs hover:border-slate-300'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 sm:p-5 text-left transition-colors hover:bg-slate-50/60 focus:outline-none cursor-pointer"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2.5 flex-1 min-w-0">
            {/* Top Badges Strip */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span
                className={`px-2.5 py-0.5 rounded-md border ${
                  isPrivate
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isPrivate ? txt.private : txt.public}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-md border ${
                  isAnswered
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isAnswered ? txt.answered : txt.pending}
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
                  {txt.refNo} {question.darul_ifta_reference_no}
                </span>
              )}
            </div>

            {/* Question Text */}
            <h3 className={`text-sm sm:text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-800 transition-colors ${currentLang === 'ur' ? 'font-urdu text-lg leading-relaxed' : ''}`}>
              {question.question_text}
            </h3>

            {/* Footer Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
              <span>{question.is_anonymous ? txt.anonymous : question.display_name || txt.guestUser}</span>
              <span>•</span>
              <span>{formattedDate}</span>

              {question.pdf_url && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  <DocumentArrowDownIcon className="w-3 h-3" /> PDF
                </span>
              )}

              {images.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  <PhotoIcon className="w-3 h-3" /> {images.length} {images.length === 1 ? txt.scanSingle : txt.scanPlural}
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
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 text-sm text-slate-700 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Header of Answer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {txt.officialAnswer}
            </span>

            {question.mufti_name && (
              <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                {txt.issuedBy}{' '}
                <strong>{cleanTextByLanguage(question.mufti_name, currentLang)}</strong>
              </span>
            )}
          </div>

          {/* Verdict Banner */}
          {cleanedVerdict && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${getVerdictBadgeStyle(question.verdict_summary)}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  {txt.verdictLabel}
                </span>
                <p className="text-sm font-bold mt-0.5">{cleanedVerdict}</p>
              </div>

              {question.darul_ifta_reference_no && (
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <span className="text-[10px] opacity-75 font-medium">{txt.refNo}</span>
                  <p className="font-mono font-bold text-xs">{question.darul_ifta_reference_no}</p>
                </div>
              )}
            </div>
          )}

          {/* Detailed Answer Text */}
          {question.answer_text ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs text-slate-800">
              {/<[a-z][\s\S]*>/i.test(question.answer_text) ? (
                <div
                  dir="auto"
                  className={`prose prose-slate max-w-none dark:prose-invert text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 prose-headings:font-bold prose-a:text-emerald-600 prose-img:rounded-xl prose-img:shadow-md ${currentLang === 'ur' ? 'font-urdu' : ''}`}
                  dangerouslySetInnerHTML={{ __html: question.answer_text }}
                />
              ) : (
                <div
                  dir="auto"
                  className={`text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal text-slate-800 ${currentLang === 'ur' ? 'font-urdu leading-loose text-base' : ''}`}
                >
                  {question.answer_text}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 text-xs">
              {txt.pendingReview}
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
                  <h5 className="text-xs font-bold text-slate-900">{txt.signedPdf}</h5>
                  <p className="text-[11px] text-slate-500">{txt.signedPdfSub}</p>
                </div>
              </div>

              <a
                href={question.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shrink-0"
              >
                <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                <span>{txt.downloadPdf}</span>
              </a>
            </div>
          )}

          {/* Reference Book Scans */}
          {images.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {txt.bookScans} ({images.length})
                </span>
                <span className="text-[10px] text-slate-400">{txt.clickToView}</span>
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

          {/* Share & Print Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition-colors cursor-pointer text-xs"
              >
                <ShareIcon className="w-3.5 h-3.5" />
                <span>{txt.share}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer text-xs"
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>{txt.print}</span>
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
  const [searchParams] = useSearchParams();
  const targetQuestionId = searchParams.get('id') || searchParams.get('questionId');

  const { user, isAuth } = useAuth();
  const { currentLang } = useLanguage();
  const txt = UI_TEXT[currentLang] || UI_TEXT.en;
  const isRTL = currentLang === 'ur' || currentLang === 'ar';

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [extraTargetQuestion, setExtraTargetQuestion] = useState(null);
  const [askOpen, setAskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [currentPage, setCurrentPage] = useState(1);

  const deferredSearch = useDeferredValue(searchInput);

  // Queries
  const categoriesQuery = useQuery({
    queryKey: ['fatawa-categories'],
    queryFn: () => fatawaService.getCategories(),
  });

  const questionsQuery = useQuery({
    queryKey: ['fatawa-questions', deferredSearch, selectedCategory, currentPage],
    queryFn: () =>
      fatawaService.getQuestions({
        paginated: true,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: deferredSearch || undefined,
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
      toast.success(
        currentLang === 'ur'
          ? 'سوال کامیابی سے جمع ہو گیا!'
          : currentLang === 'ar'
          ? 'تم إرسال السؤال بنجاح!'
          : 'Question submitted for scholarly review!'
      );
      setAskOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-my-questions'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not submit question.'));
    },
  });

  const categories = categoriesQuery.data || [];
  const responseData = questionsQuery.data;
  const rawQuestions = Array.isArray(responseData) ? responseData : responseData?.items || [];
  const totalQuestions = responseData?.total !== undefined ? responseData.total : rawQuestions.length;
  const totalPages =
    responseData?.total_pages !== undefined
      ? responseData.total_pages
      : Math.ceil(totalQuestions / ITEMS_PER_PAGE) || 1;

  // Handle URL param targeting ?id=X or ?questionId=X
  useEffect(() => {
    if (!targetQuestionId) return;

    const parsedId = Number(targetQuestionId);
    const existing = rawQuestions.find((q) => q.id === parsedId);
    if (existing) {
      setActiveQuestionId(parsedId);
      setTimeout(() => {
        const el = document.getElementById(`fatawa-${parsedId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    } else {
      fatawaService
        .getQuestionById(parsedId)
        .then((q) => {
          if (q && q.id) {
            setExtraTargetQuestion(q);
            setActiveQuestionId(q.id);
            setTimeout(() => {
              const el = document.getElementById(`fatawa-${q.id}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          }
        })
        .catch(() => {});
    }
  }, [targetQuestionId, rawQuestions]);

  const paginatedQuestions = useMemo(() => {
    if (extraTargetQuestion && !rawQuestions.some((q) => q.id === extraTargetQuestion.id)) {
      return [extraTargetQuestion, ...rawQuestions];
    }
    return rawQuestions;
  }, [extraTargetQuestion, rawQuestions]);

  // Reset pagination on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, selectedCategory]);

  return (
    <div
      className="min-h-screen bg-slate-50/60 text-slate-900 pb-20 font-sans"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6 pt-6 sm:pt-8">
        
        {/* ================= BREADCRUMBS ================= */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/" className="flex items-center gap-1 hover:text-emerald-600 transition">
            <HomeIcon className="h-4 w-4" />
            <span>{txt.home}</span>
          </Link>
          <ChevronRightIcon className={`h-3 w-3 opacity-60 ${isRTL ? 'rotate-180' : ''}`} />
          <span className="font-semibold text-slate-800">{txt.tabAll}</span>
        </nav>

        {/* ================= 🌟 LIGHT MODERN HERO HEADER ================= */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 shadow-2xs">
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-600" />
            <span>{txt.badge}</span>
          </div>

          <h1 className={`text-2xl sm:text-4xl font-black text-slate-900 tracking-tight ${currentLang === 'ur' ? 'font-urdu sm:text-5xl leading-tight' : ''}`}>
            {txt.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {txt.subtitle}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setAskOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 stroke-2" />
              <span>{txt.askBtn}</span>
            </button>
            <button
              onClick={() => navigate('/books')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <BookOpenIcon className="w-4 h-4 text-slate-500" />
              <span>{txt.browseBooks}</span>
            </button>
          </div>
        </div>

        {/* ================= CATEGORY PILLS BAR ================= */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
              selectedCategory === ''
                ? 'bg-[#002147] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {txt.allCategories} ({totalQuestions})
          </button>

          {categories.map((cat) => {
            const isSelected = String(selectedCategory) === String(cat.id);
            const label = cleanTextByLanguage(cat.name, currentLang);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? '' : String(cat.id))}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ================= TABS SWITCHER & SEARCH TOOLBAR ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Top Switcher: All Fatawa vs My Questions */}
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {txt.tabAll} ({totalQuestions})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('my')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'my'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClockIcon className="w-3.5 h-3.5" />
                <span>{txt.tabMy}</span>
                {isAuth && (myQuestionsQuery.data || []).length > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 font-mono">
                    {(myQuestionsQuery.data || []).length}
                  </span>
                )}
              </button>
            </div>

            {/* Total Results Count */}
            <div className="text-xs text-slate-500 font-medium">
              {txt.showing} <strong>{paginatedQuestions.length}</strong> {txt.of} <strong>{totalQuestions}</strong> {txt.results}
            </div>
          </div>

          {/* Search Input and Category Select */}
          <div className="grid gap-3 sm:grid-cols-[1.5fr_0.8fr]">
            <div className="relative flex items-center">
              <MagnifyingGlassIcon
                className={`pointer-events-none absolute h-4 w-4 text-slate-400 ${
                  isRTL ? 'right-3' : 'left-3'
                }`}
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={txt.searchPlaceholder}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white ${
                  isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'
                }`}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className={`absolute text-slate-400 hover:text-slate-600 cursor-pointer ${
                    isRTL ? 'left-2.5' : 'right-2.5'
                  }`}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
            >
              <option value="">{txt.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cleanTextByLanguage(cat.name, currentLang)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================= TAB 1: ALL FATAWA ================= */}
        {activeTab === 'all' && (
          <main className="space-y-4">
            {questionsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-2xl bg-white border border-slate-200"
                  />
                ))}
              </div>
            ) : paginatedQuestions.length > 0 ? (
              <div className="space-y-3">
                {paginatedQuestions.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    open={activeQuestionId === question.id}
                    onToggle={() =>
                      setActiveQuestionId((curr) => (curr === question.id ? null : question.id))
                    }
                    currentLang={currentLang}
                  />
                ))}

                {/* Numbered Pagination Bar */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-white p-3.5 rounded-2xl border shadow-2xs">
                    <span className="text-xs text-slate-500 font-medium">
                      {txt.showing}{' '}
                      <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong>–
                      <strong>{Math.min(currentPage * ITEMS_PER_PAGE, totalQuestions)}</strong>{' '}
                      {txt.of} <strong>{totalQuestions}</strong> {txt.fatawa}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeftIcon className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCurrentPage(num)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === num
                              ? 'bg-emerald-700 text-white shadow-xs'
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
                        <ChevronRightIcon className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
                <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 text-base font-bold text-slate-800">{txt.noQuestions}</p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{txt.noQuestionsSub}</p>
              </div>
            )}
          </main>
        )}

        {/* ================= TAB 2: MY QUESTIONS ================= */}
        {activeTab === 'my' && (
          <div className="space-y-4">
            {!isAuth ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs space-y-4">
                <UserCircleIcon className="mx-auto h-12 w-12 text-slate-400" />
                <div className="max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">{txt.tabMy}</h3>
                  <p className="text-xs text-slate-500 mt-1">{txt.signInPrompt}</p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition cursor-pointer"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span>{txt.signInBtn}</span>
                </Link>
              </div>
            ) : myQuestionsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="h-20 animate-pulse rounded-2xl bg-white border border-slate-200" />
                ))}
              </div>
            ) : (myQuestionsQuery.data || []).length > 0 ? (
              <div className="space-y-3">
                {(myQuestionsQuery.data || []).map((q) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    open={activeQuestionId === q.id}
                    onToggle={() =>
                      setActiveQuestionId((curr) => (curr === q.id ? null : q.id))
                    }
                    currentLang={currentLang}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
                <ClockIcon className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 text-base font-bold text-slate-800">{txt.noSubmissions}</p>
                <button
                  type="button"
                  onClick={() => setAskOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>{txt.askBtn}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= RELATED BOOKS SHOWCASE (When Category Selected) ================= */}
        {selectedCategory && (relatedBooksQuery.data || []).length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{txt.relatedBooksTitle}</h3>
                <p className="text-xs text-slate-500">{txt.relatedBooksSubtitle}</p>
              </div>
              <BookOpenIcon className="h-5 w-5 text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(relatedBooksQuery.data || []).slice(0, 3).map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => navigate(`/books/${book.id}`)}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50 hover:border-slate-200 transition-colors cursor-pointer group"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <div className="h-14 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 shadow-2xs">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <BookOpenIcon className="h-5 w-5 m-3 text-slate-400" />
                    )}
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                      {book.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {book.author || txt.authorDefault}
                    </p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 mt-1">
                      {txt.viewBook} →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ================= ASK QUESTION MODAL ================= */}
      <Suspense fallback={null}>
        {askOpen && (
          <AskQuestionModal
            open={askOpen}
            onClose={() => setAskOpen(false)}
            categories={categories}
            user={user}
            defaultCategoryId={selectedCategory}
            currentLang={currentLang}
            onSubmit={(payload) => createQuestionMutation.mutateAsync(payload)}
            loading={createQuestionMutation.isPending}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Fatawa;