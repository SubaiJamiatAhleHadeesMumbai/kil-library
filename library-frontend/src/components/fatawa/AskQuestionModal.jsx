import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

const MODAL_TEXT = {
  en: {
    badge: 'Ask Fatawa',
    title: 'Submit Your Question',
    category: 'Category',
    selectCategory: 'Select a category',
    yourQuestion: 'Your Question',
    questionPlaceholder: 'State your Islamic question clearly with all relevant context...',
    visibility: 'Visibility',
    public: 'Public (Visible on portal once answered)',
    private: 'Confidential (Only visible to you and scholars)',
    anonymous: 'Anonymous',
    anonymousOn: 'Anonymous (Your name hidden)',
    anonymousOff: 'Show Name',
    displayName: 'Your Name',
    displayNamePlaceholder: 'Name shown with the question',
    email: 'Email Address',
    emailPlaceholder: 'Optional for email notifications upon answer',
    cancel: 'Cancel',
    submit: 'Submit Question',
    submitting: 'Submitting...',
  },
  ur: {
    badge: 'استفتاء و سوال',
    title: 'اپنا شرعی سوال ارسال کریں',
    category: 'زمرہ / موضوع',
    selectCategory: 'زمرہ منتخب کریں',
    yourQuestion: 'آپ کا شرعی سوال',
    questionPlaceholder: 'اپنا سوال تمام ضروری تفصیلات کے ساتھ واضح تحریر فرمائیں...',
    visibility: 'نوعیت',
    public: 'عوامی (جواب کے بعد پورٹل پر ظاہر ہوگا)',
    private: 'خفیہ (صرف آپ اور مفتیان کرام کے لیے)',
    anonymous: 'نام پوشیدہ رکھیں',
    anonymousOn: 'نام پوشیدہ ہے',
    anonymousOff: 'نام ظاہر کریں',
    displayName: 'آپ کا نام',
    displayNamePlaceholder: 'جو نام سوال کے ساتھ ظاہر ہو',
    email: 'ای میل پتہ',
    emailPlaceholder: 'جواب موصول ہونے پر اطلاع کے لیے (اختیاری)',
    cancel: 'منسوخ',
    submit: 'سوال جمع کروائیں',
    submitting: 'ارسال ہو رہا ہے...',
  },
  ar: {
    badge: 'طلب فتوى شرعية',
    title: 'إرسال السؤال الشرعي',
    category: 'القسم / الباب الفقهي',
    selectCategory: 'اختر القسم',
    yourQuestion: 'نص السؤال',
    questionPlaceholder: 'اكتب سؤالك الشرعي بدقة ووضوح مع ذكر كافة التفاصيل...',
    visibility: 'الخصوصية',
    public: 'عام (يظهر للعامة بعد الإجابة)',
    private: 'سري (خاص بالسائل والمفتين فقط)',
    anonymous: 'إخفاء الهوية',
    anonymousOn: 'مجهول الهوية',
    anonymousOff: 'إظهار الاسم',
    displayName: 'الاسم الكريم',
    displayNamePlaceholder: 'الاسم الذي سيظهر مع السؤال',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'اختياري لتلقي الإشعار عند الإجابة',
    cancel: 'إلغاء',
    submit: 'إرسال السؤال',
    submitting: 'جارٍ الإرسال...',
  },
};

const cleanCategoryName = (text = '', lang = 'en') => {
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

const initialForm = (user, defaultCategoryId) => ({
  category_id: defaultCategoryId || '',
  question_text: '',
  visibility: 'public',
  is_anonymous: false,
  display_name: user?.full_name || user?.username || '',
  guest_email: user?.email || '',
});

const lockBodyScroll = (shouldLock) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  if (shouldLock) {
    const previousOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = '0';
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    root.dataset.modalScrollLock = JSON.stringify({
      previousOverflow,
      previousBodyOverflow,
      previousBodyPosition,
      previousBodyTop,
      previousBodyWidth,
    });
    return;
  }

  try {
    const previous = root.dataset.modalScrollLock ? JSON.parse(root.dataset.modalScrollLock) : null;
    root.style.overflow = previous?.previousOverflow ?? '';
    body.style.overflow = previous?.previousBodyOverflow ?? '';
    body.style.position = previous?.previousBodyPosition ?? '';
    body.style.top = previous?.previousBodyTop ?? '';
    body.style.width = previous?.previousBodyWidth ?? '';
    body.style.left = '';
    body.style.right = '';
    delete root.dataset.modalScrollLock;
  } catch {
    root.style.overflow = '';
    body.style.overflow = '';
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
  }
};

const AskQuestionModal = ({
  open,
  onClose,
  onSubmit,
  categories = [],
  user,
  loading = false,
  defaultCategoryId = '',
  currentLang = 'en',
}) => {
  const [form, setForm] = useState(initialForm(user, defaultCategoryId));
  const txt = MODAL_TEXT[currentLang] || MODAL_TEXT.en;
  const isRTL = currentLang === 'ur' || currentLang === 'ar';

  useEffect(() => {
    if (!open) return;

    setForm(initialForm(user, defaultCategoryId));
    lockBodyScroll(true);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      lockBodyScroll(false);
    };
  }, [open, user, defaultCategoryId, onClose]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.is_active !== false),
    [categories]
  );

  if (!open || typeof document === 'undefined') return null;

  const submit = (event) => {
    event.preventDefault();
    const questionText = (form.question_text || '').trim();
    if (!questionText) return;

    onSubmit({
      question_text: questionText,
      category_id: form.category_id ? Number(form.category_id) : null,
      visibility: form.visibility || 'public',
      is_anonymous: Boolean(form.is_anonymous),
      display_name: form.is_anonymous
        ? currentLang === 'ur' ? 'سائل' : 'Anonymous'
        : form.display_name?.trim() || user?.full_name || user?.username || (currentLang === 'ur' ? 'سائل' : 'Inquirer'),
      guest_email: form.guest_email?.trim() || null,
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{txt.badge}</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{txt.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{txt.category}</span>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition"
                >
                  <option value="">{txt.selectCategory}</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {cleanCategoryName(category.name, currentLang)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{txt.yourQuestion}</span>
                <textarea
                  value={form.question_text}
                  onChange={(e) => setForm((prev) => ({ ...prev, question_text: e.target.value }))}
                  rows={4}
                  required
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition resize-none ${currentLang === 'ur' ? 'font-urdu text-base' : ''}`}
                  placeholder={txt.questionPlaceholder}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{txt.visibility}</span>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition"
                >
                  <option value="public">{txt.public}</option>
                  <option value="private">{txt.private}</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{txt.anonymous}</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_anonymous: !prev.is_anonymous }))}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition cursor-pointer ${
                    form.is_anonymous
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {form.is_anonymous ? txt.anonymousOn : txt.anonymousOff}
                </button>
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{txt.displayName}</span>
                <input
                  value={form.display_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition"
                  placeholder={txt.displayNamePlaceholder}
                />
              </label>

              {!user && (
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{txt.email}</span>
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => setForm((prev) => ({ ...prev, guest_email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition"
                    placeholder={txt.emailPlaceholder}
                  />
                </label>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {txt.cancel}
            </button>
            <button
              disabled={loading}
              type="button"
              onClick={submit}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loading ? txt.submitting : txt.submit}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AskQuestionModal;
