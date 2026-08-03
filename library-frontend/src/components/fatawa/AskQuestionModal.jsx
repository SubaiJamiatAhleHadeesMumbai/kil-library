import React, { useEffect, useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const initialForm = (user, defaultCategoryId) => ({
  category_id: defaultCategoryId || '',
  question_text: '',
  visibility: 'public',
  is_anonymous: false,
  display_name: user?.full_name || user?.username || '',
  guest_email: user?.email || '',
});

const AskQuestionModal = ({ open, onClose, onSubmit, categories = [], user, loading = false, defaultCategoryId = '' }) => {
  const [form, setForm] = useState(initialForm(user, defaultCategoryId));

  useEffect(() => {
    if (open) {
      setForm(initialForm(user, defaultCategoryId));
    }
  }, [open, user, defaultCategoryId]);

  const visibleCategories = useMemo(() => categories.filter((category) => category.is_active !== false), [categories]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      category_id: form.category_id ? Number(form.category_id) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="mx-auto mt-6 max-w-2xl rounded-[2rem] bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Ask Fatawa</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Send your question</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button disabled={loading} type="submit" className="rounded-full bg-[#002147] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#003166] disabled:opacity-60">
              {loading ? 'Sending...' : 'Submit question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AskQuestionModal;
