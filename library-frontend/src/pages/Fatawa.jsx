import React, { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon, BookOpenIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon,
  PlusIcon, ChevronDownIcon, ClockIcon, ShieldCheckIcon, ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { fatawaService } from '../api/fatawaService';
import useAuth from '../hooks/useAuth';

const AskQuestionModal = lazy(() => import('../components/fatawa/AskQuestionModal'));

const PAGE_SIZE = 8;

const QuestionRow = ({ question, open, onToggle }) => (
  <button type="button" onClick={onToggle} className="w-full text-left rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
          <span className={`rounded-full px-2.5 py-1 ${question.visibility === 'private' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{question.visibility}</span>
          <span className={`rounded-full px-2.5 py-1 ${question.status === 'answered' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{question.status}</span>
          {question.category?.name && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{question.category.name}</span>}
        </div>
        <h3 className="text-base font-bold text-slate-900">{question.question_text}</h3>
        <p className="text-sm text-slate-500">{question.is_anonymous ? 'Anonymous question' : question.display_name || 'Guest'} · {new Date(question.created_at).toLocaleDateString()}</p>
      </div>
      <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </div>
    {open && (
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 leading-7">
        {question.answer_text || 'Answer pending...'}
      </div>
    )}
  </button>
);

const Fatawa = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuth } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [askOpen, setAskOpen] = useState(false);

  const deferredSearch = useDeferredValue(searchInput);

  const categoriesQuery = useQuery({
    queryKey: ['fatawa-categories'],
    queryFn: () => fatawaService.getCategories(),
  });

  const questionsQuery = useInfiniteQuery({
    queryKey: ['fatawa-questions', deferredSearch, selectedCategory, isAuth],
    queryFn: ({ pageParam }) => fatawaService.getQuestions({
      limit: PAGE_SIZE,
      before_id: pageParam,
      search: deferredSearch,
      category_id: selectedCategory || undefined,
    }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => (lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1]?.id : undefined),
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

  const createQuestionMutation = useMutation({
    mutationFn: fatawaService.createQuestion,
    onSuccess: async () => {
      toast.success('Question sent for review');
      setAskOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-my-questions'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Could not submit question');
    },
  });

  const categories = categoriesQuery.data || [];
  const questions = useMemo(
    () => questionsQuery.data?.pages.flat() || [],
    [questionsQuery.data],
  );

  const heroStats = [
    { label: 'Answered', value: questions.filter((item) => item.status === 'answered').length },
    { label: 'Private', value: questions.filter((item) => item.visibility === 'private').length },
    { label: 'Categories', value: categories.length },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,33,71,0.08),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] text-slate-900">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#001d3d] text-white">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.12)_50%,transparent_100%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-white/80">
              <ShieldCheckIcon className="w-4 h-4" />
              Fatawa Q&A
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Structured fatwa questions with fast search and clear answers.</h1>
            <p className="max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
              Browse public answered questions, keep private questions private, and ask with or without your name. Related books are linked by category for quick follow-up reading.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setAskOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#f4a261] px-5 py-3 text-sm font-bold text-[#001d3d] shadow-lg shadow-black/10 hover:translate-y-[-1px]">
                <PlusIcon className="w-4 h-4" />
                Ask Your Question
              </button>
              <button onClick={() => navigate('/books')} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15">
                <BookOpenIcon className="w-4 h-4" />
                Browse Library
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">{item.label}</p>
                  <p className="mt-2 text-2xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
          <main className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Search</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Find a specific answer</h2>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => questionsQuery.refetch()} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                    <ArrowPathIcon className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                <label className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search questions or answers"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none focus:border-[#002147]"
                  />
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#002147]"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {questionsQuery.isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => <div key={index} className="h-32 animate-pulse rounded-[1.5rem] bg-white border border-slate-200" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    open={activeQuestionId === question.id}
                    onToggle={() => setActiveQuestionId((current) => (current === question.id ? null : question.id))}
                  />
                ))}

                {questionsQuery.hasNextPage && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => questionsQuery.fetchNextPage()}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Load more questions
                    </button>
                  </div>
                )}

                {!questions.length && (
                  <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                    <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-4 text-lg font-bold text-slate-800">No questions found</p>
                    <p className="mt-2 text-sm text-slate-500">Try a different search or ask the first question in this category.</p>
                  </div>
                )}
              </div>
            )}
          </main>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">My Questions</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">Pending queue</h2>
                </div>
                <ClockIcon className="h-5 w-5 text-slate-400" />
              </div>

              {!isAuth ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Sign in to track your submissions and see pending answers.
                </div>
              ) : myQuestionsQuery.isLoading ? (
                <div className="mt-4 space-y-3">
                  {[...Array(3)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {(myQuestionsQuery.data || []).map((question) => (
                    <div key={question.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                        <span>{question.status}</span>
                        <span>{question.visibility}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900 line-clamp-3">{question.question_text}</p>
                    </div>
                  ))}
                  {!(myQuestionsQuery.data || []).length && <p className="text-sm text-slate-500">No submissions yet.</p>}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Related Books</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">From the chosen category</h2>
                </div>
                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-400" />
              </div>

              {relatedBooksQuery.isLoading ? (
                <div className="mt-4 space-y-3">
                  {[...Array(3)].map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {(relatedBooksQuery.data || []).map((book) => (
                    <button key={book.id} type="button" onClick={() => navigate(`/books/${book.id}`)} className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50">
                      <div className="h-12 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {book.cover_image_url ? <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-400">BK</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 line-clamp-2">{book.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{book.author || 'Unknown author'}</p>
                      </div>
                    </button>
                  ))}
                  {selectedCategory && !(relatedBooksQuery.data || []).length && <p className="text-sm text-slate-500">No linked books for this category yet.</p>}
                  {!selectedCategory && <p className="text-sm text-slate-500">Choose a category to see related books.</p>}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <Suspense fallback={null}>
        <AskQuestionModal
          open={askOpen}
          onClose={() => setAskOpen(false)}
          categories={categories}
          user={user}
          loading={createQuestionMutation.isPending}
          defaultCategoryId={selectedCategory}
          onSubmit={(payload) => createQuestionMutation.mutate(payload)}
        />
      </Suspense>
    </div>
  );
};

export default Fatawa;
