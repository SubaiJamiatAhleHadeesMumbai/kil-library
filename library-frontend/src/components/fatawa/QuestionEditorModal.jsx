import React, { useEffect, useState } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

const QuestionEditorModal = ({ open, onClose, question, categories = [], onSave, onDelete, loading = false }) => {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (open && question) {
      setForm({
        category_id: question.category_id || '',
        question_text: question.question_text || '',
        visibility: question.visibility || 'public',
        is_anonymous: Boolean(question.is_anonymous),
        display_name: question.display_name || '',
        guest_email: question.guest_email || '',
        status: question.status || 'pending',
        answer_text: question.answer_text || '',
      });
    }
  }, [open, question]);

  if (!open || !question || !form) return null;

  const submit = (event) => {
    event.preventDefault();
    onSave(question.id, {
      ...form,
      answer_text: form.answer_text.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/65 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="mx-auto mt-6 max-w-3xl rounded-[2rem] bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Admin Editor</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Question details</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Category</span>
              <select value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]">
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Question</span>
              <textarea value={form.question_text} onChange={(e) => setForm((prev) => ({ ...prev, question_text: e.target.value }))} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147] resize-none" />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Visibility</span>
              <select value={form.visibility} onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Status</span>
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]">
                <option value="pending">Pending</option>
                <option value="answered">Answered</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Answer</span>
              <textarea value={form.answer_text} onChange={(e) => setForm((prev) => ({ ...prev, answer_text: e.target.value }))} rows={6} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147] resize-none" placeholder="Write the answer here..." />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Display name</span>
              <input value={form.display_name} onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]" />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={() => onDelete(question.id)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50">
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">
                Close
              </button>
              <button disabled={loading} type="submit" className="rounded-full bg-[#002147] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#003166] disabled:opacity-60">
                {loading ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionEditorModal;
