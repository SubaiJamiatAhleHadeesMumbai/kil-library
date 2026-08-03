import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { fatawaService } from '../../api/fatawaService';
import { PlusIcon, PencilSquareIcon, TrashIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const QuestionEditorModal = lazy(() => import('../../components/fatawa/QuestionEditorModal'));

const emptyCategory = {
  name: '',
  slug: '',
  description: '',
  sort_order: 0,
  is_active: true,
};

const FatawaManager = () => {
  const queryClient = useQueryClient();
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ['admin-fatawa-categories'],
    queryFn: () => fatawaService.getCategories(),
  });

  const questionsQuery = useQuery({
    queryKey: ['admin-fatawa-questions'],
    queryFn: () => fatawaService.getAdminQuestions(),
  });

  const categoryMutation = useMutation({
    mutationFn: async () => {
      if (editingCategoryId) {
        return fatawaService.updateCategory(editingCategoryId, categoryForm);
      }
      return fatawaService.createCategory(categoryForm);
    },
    onSuccess: async () => {
      toast.success(editingCategoryId ? 'Category updated' : 'Category created');
      setCategoryForm(emptyCategory);
      setEditingCategoryId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-fatawa-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-categories'] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Category save failed'),
  });

  const questionMutation = useMutation({
    mutationFn: ({ id, payload }) => fatawaService.updateQuestion(id, payload),
    onSuccess: async () => {
      toast.success('Question updated');
      setEditingQuestion(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-my-questions'] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Question save failed'),
  });

  const answerMutation = useMutation({
    mutationFn: ({ id, payload }) => fatawaService.answerQuestion(id, payload),
    onSuccess: async () => {
      toast.success('Answer saved');
      setEditingQuestion(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-my-questions'] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Answer save failed'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: fatawaService.deleteCategory,
    onSuccess: async () => {
      toast.success('Category deleted');
      await queryClient.invalidateQueries({ queryKey: ['admin-fatawa-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-categories'] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Category delete failed'),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: fatawaService.deleteQuestion,
    onSuccess: async () => {
      toast.success('Question deleted');
      setEditingQuestion(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-questions'] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Question delete failed'),
  });

  const categories = categoriesQuery.data || [];
  const questions = questionsQuery.data || [];

  const stats = useMemo(() => ([
    { label: 'Categories', value: categories.length },
    { label: 'Pending', value: questions.filter((question) => question.status === 'pending').length },
    { label: 'Answered', value: questions.filter((question) => question.status === 'answered').length },
  ]), [categories.length, questions]);

  const saveCategory = async (event) => {
    event.preventDefault();
    await categoryMutation.mutateAsync();
  };

  const editCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      sort_order: category.sort_order ?? 0,
      is_active: category.is_active !== false,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Fatawa Management</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Questions and category taxonomy</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">Manage the public question feed, answer queue, and the category that links questions to books.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Categories</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Link books to fatwa topics</h2>
            </div>
            <PlusIcon className="h-5 w-5 text-slate-400" />
          </div>

          <form onSubmit={saveCategory} className="mt-5 space-y-4">
            <input value={categoryForm.name} onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Category name" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]" required />
            <input value={categoryForm.slug} onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="slug (optional)" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]" />
            <textarea value={categoryForm.description} onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Category description" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147] resize-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#002147]" />
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
                Active
                <input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={categoryMutation.isPending} className="rounded-full bg-[#002147] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {editingCategoryId ? 'Update category' : 'Create category'}
              </button>
              {editingCategoryId && (
                <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategory); }} className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{category.name}</p>
                    <p className="text-xs text-slate-500">{category.slug}</p>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{category.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => editCategory(category)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><PencilSquareIcon className="h-4 w-4" /></button>
                    <button onClick={() => deleteCategoryMutation.mutate(category.id)} className="rounded-full p-2 text-rose-500 hover:bg-rose-50"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {!categories.length && <p className="text-sm text-slate-500">No categories yet.</p>}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Questions</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Answer and moderate</h2>
            </div>
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-5 space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{question.status}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{question.visibility}</span>
                  {question.category?.name && <span className="rounded-full bg-slate-100 px-2.5 py-1">{question.category.name}</span>}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900 line-clamp-3">{question.question_text}</p>
                <p className="mt-2 text-xs text-slate-500">{question.display_name || 'Guest'} · {new Date(question.created_at).toLocaleDateString()}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditingQuestion(question)} className="rounded-full bg-[#002147] px-4 py-2 text-xs font-bold text-white">Open</button>
                  <button type="button" onClick={() => deleteQuestionMutation.mutate(question.id)} className="rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600">Delete</button>
                </div>
              </div>
            ))}
            {!questions.length && <p className="text-sm text-slate-500">No questions yet.</p>}
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <QuestionEditorModal
          open={Boolean(editingQuestion)}
          question={editingQuestion}
          categories={categories}
          onClose={() => setEditingQuestion(null)}
          onSave={async (id, payload) => {
            await answerMutation.mutateAsync({ id, payload: { answer_text: payload.answer_text, visibility: payload.visibility, status: payload.status } });
            await questionMutation.mutateAsync({ id, payload });
          }}
          onDelete={(id) => deleteQuestionMutation.mutate(id)}
          loading={questionMutation.isPending || answerMutation.isPending}
        />
      </Suspense>
    </div>
  );
};

export default FatawaManager;
