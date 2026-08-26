import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

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

const AskQuestionModal = ({ open, onClose, onSubmit, categories = [], user, loading = false, defaultCategoryId = '' }) => {
  const [form, setForm] = useState(initialForm(user, defaultCategoryId));

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

  const visibleCategories = useMemo(() => categories.filter((category) => category.is_active !== false), [categories]);

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
      display_name: form.is_anonymous ? 'Anonymous' : (form.display_name?.trim() || user?.full_name || user?.username || 'Guest User'),
      guest_email: form.guest_email?.trim() || null,
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl flex flex-col"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Ask Fatawa</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Send your question</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={submit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Category</span>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]"
                >
                  <option value="">Select a category</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Your question</span>
                <textarea
                  value={form.question_text}
                  onChange={(e) => setForm((prev) => ({ ...prev, question_text: e.target.value }))}
                  rows={5}
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147] resize-none"
                  placeholder="Write your question clearly..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Visibility</span>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Anonymous</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_anonymous: !prev.is_anonymous }))}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${form.is_anonymous ? 'border-[#002147] bg-[#002147]/5 text-[#002147]' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  {form.is_anonymous ? 'Anonymous on' : 'Anonymous off'}
                </button>
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Display name</span>
                <input
                  value={form.display_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]"
                  placeholder="Name shown with the question"
                />
              </label>

              {!user && (
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Email</span>
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => setForm((prev) => ({ ...prev, guest_email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]"
                    placeholder="Optional for follow-up"
                  />
                </label>
              )}
            </div>
          </form>

          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              type="button"
              onClick={submit}
              className="rounded-full bg-[#002147] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#003166] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Sending...' : 'Submit question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AskQuestionModal;
