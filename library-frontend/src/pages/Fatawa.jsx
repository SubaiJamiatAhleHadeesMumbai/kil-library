import React, { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  LockClosedIcon,
  GlobeAltIcon,
  SparklesIcon,
  XMarkIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { fatawaService } from '../api/fatawaService';
import useAuth from '../hooks/useAuth';

const AskQuestionModal = lazy(() => import('../components/fatawa/AskQuestionModal'));

const PAGE_SIZE = 8;

// ─── Sub-Component: Question Row Card (Accordion) ───────────
const QuestionRow = ({ question, open, onToggle }) => {
  const isAnswered = question.status === 'answered';
  const isPrivate = question.visibility === 'private';

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-300 hover:border-slate-300 hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 sm:p-6 text-left transition-colors hover:bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#002147] focus:ring-inset"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                  isPrivate
                    ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                }`}
              >
                {isPrivate ? <LockClosedIcon className="w-3 h-3" /> : <GlobeAltIcon className="w-3 h-3" />}
                {question.visibility}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                  isAnswered
                    ? 'bg-blue-50 text-blue-800 border border-blue-200/60'
                    : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                {isAnswered ? <CheckCircleIcon className="w-3 h-3 text-blue-600" /> : <ClockIcon className="w-3 h-3" />}
                {question.status}
              </span>

              {question.category?.name && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 border border-slate-200/60">
                  {question.category.name}
                </span>
              )}
            </div>

            {/* Question Text */}
            <h3 className="text-base sm:text-lg font-extrabold leading-snug text-slate-900 group-hover:text-[#002147] transition-colors">
              {question.question_text}
            </h3>

            {/* Meta Footer */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{question.is_anonymous ? 'Anonymous Scholar Query' : question.display_name || 'Guest User'}</span>
              <span>•</span>
              <span>
                {new Date(question.created_at).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-transform group-hover:bg-slate-200">
            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Answer Expandable Drawer */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 text-sm leading-relaxed text-slate-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-3 text-xs font-extrabold uppercase tracking-widest text-[#002147]">
            <SparklesIcon className="w-4 h-4 text-cyan-600" /> Official Scholarly Answer
          </div>
          {question.answer_text ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs text-slate-800 space-y-3">
              <p className="italic font-serif text-base sm:text-lg leading-relaxed text-slate-900">
                "{question.answer_text}"
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 font-medium">
              ⌛ Answer is currently pending review by scholars. Please check back soon.
            </div>
          )}
        </div>
      )}
    </article>
  );
};

// ─── Main Fatawa Component ─────────────────────────────────
const Fatawa = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuth } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [askOpen, setAskOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('all');

  const deferredSearch = useDeferredValue(searchInput);

  // Queries
  const categoriesQuery = useQuery({
    queryKey: ['fatawa-categories'],
    queryFn: () => fatawaService.getCategories(),
  });

  const questionsQuery = useInfiniteQuery({
    queryKey: ['fatawa-questions', deferredSearch, selectedCategory, isAuth],
    queryFn: ({ pageParam }) =>
      fatawaService.getQuestions({
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

  // Mutation
  const createQuestionMutation = useMutation({
    mutationFn: fatawaService.createQuestion,
    onSuccess: async () => {
      toast.success('Question submitted for scholarly review!');
      setAskOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['fatawa-questions'] });
      await queryClient.invalidateQueries({ queryKey: ['fatawa-my-questions'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Could not submit question right now.');
    },
  });

  const categories = categoriesQuery.data || [];
  const questions = useMemo(
    () => questionsQuery.data?.pages.flat() || [],
    [questionsQuery.data]
  );

  const heroStats = [
    { label: 'Answered', value: questions.filter((item) => item.status === 'answered').length },
    { label: 'Private Submissions', value: questions.filter((item) => item.visibility === 'private').length },
    { label: 'Topic Categories', value: categories.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-16">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-[#001d3d] via-[#002147] to-[#0f4c81] text-white">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_60%)] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-4xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-cyan-200 backdrop-blur-md">
              <ShieldCheckIcon className="w-4 h-4 text-cyan-300" />
              Fatawa & Guidance Hub
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight">
              Islamic Guidance & Scholarly Clarifications
            </h1>

            <p className="max-w-3xl text-sm leading-relaxed text-cyan-50/85 sm:text-base">
              Browse public answered questions, track your private questions, and submit new inquiries anonymously or with your account profile.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setAskOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#f4a261] px-6 py-3.5 text-sm font-bold text-[#001d3d] shadow-lg shadow-black/15 transition-all hover:bg-[#f6b27b] hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                Ask Your Question
              </button>
              <button
                onClick={() => navigate('/books')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white shadow-2xs backdrop-blur-md transition-all hover:bg-white/20"
              >
                <BookOpenIcon className="w-5 h-5" />
                Browse Catalog
              </button>
            </div>

            {/* Hero Stats */}
            <div className="grid gap-3 grid-cols-3 pt-4">
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/70 sm:text-xs">{item.label}</p>
                  <p className="mt-1 text-xl font-extrabold sm:text-3xl text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Tab Switcher */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 lg:hidden">
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            onClick={() => setMobileTab('all')}
            className={`flex-1 rounded-lg py-2 transition ${mobileTab === 'all' ? 'bg-white text-[#002147] shadow-2xs' : 'text-slate-500'}`}
          >
            All Questions ({questions.length})
          </button>
          <button
            onClick={() => setMobileTab('my')}
            className={`flex-1 rounded-lg py-2 transition ${mobileTab === 'my' ? 'bg-white text-[#002147] shadow-2xs' : 'text-slate-500'}`}
          >
            My Queue
          </button>
          <button
            onClick={() => setMobileTab('books')}
            className={`flex-1 rounded-lg py-2 transition ${mobileTab === 'books' ? 'bg-white text-[#002147] shadow-2xs' : 'text-slate-500'}`}
          >
            Related Books
          </button>
        </div>
      </div>

      {/* Main Content Layout Container */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.7fr_0.9fr]">
          
          {/* Left Column: Search & Questions List */}
          <main className={`space-y-6 ${mobileTab !== 'all' ? 'hidden lg:block' : ''}`}>
            
            {/* Search Toolbar Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Search Engine</p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">Find Specific Clarifications</h2>
                </div>
                <button
                  onClick={() => questionsQuery.refetch()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-2xs transition hover:bg-slate-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${questionsQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1.3fr_0.7fr]">
                <label className="relative flex items-center">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search questions or keywords..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-[#002147] focus:bg-white focus:ring-2 focus:ring-[#002147]/10"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </label>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#002147] focus:bg-white focus:ring-2 focus:ring-[#002147]/10"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Questions List & Skeletons */}
            {questionsQuery.isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-3xl bg-white border border-slate-200/80" />
                ))}
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

                {/* Pagination Button */}
                {questionsQuery.hasNextPage && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => questionsQuery.fetchNextPage()}
                      disabled={questionsQuery.isFetchingNextPage}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                    >
                      {questionsQuery.isFetchingNextPage ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        'Load More Questions'
                      )}
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!questions.length && (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-lg font-bold text-slate-900">No questions found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try a different search keyword or submit a new inquiry in this category.
                    </p>
                    <button
                      onClick={() => setAskOpen(true)}
                      className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#002147] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#002f66]"
                    >
                      <PlusIcon className="w-4 h-4" /> Ask Question Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar Column */}
          <aside className="space-y-6">
            
            {/* My Submissions Queue */}
            <div className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs ${mobileTab === 'my' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">My Submissions</p>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">Pending Queue</h2>
                </div>
                <ClockIcon className="h-5 w-5 text-slate-400" />
              </div>

              {!isAuth ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 border border-slate-200/60 text-center">
                  <p className="font-bold text-slate-800">Sign in to track your submissions</p>
                  <p className="mt-1 text-xs text-slate-500">View status updates and private answers.</p>
                </div>
              ) : myQuestionsQuery.isLoading ? (
                <div className="mt-5 space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {(myQuestionsQuery.data || []).map((question) => (
                    <div key={question.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        <span className={`px-2 py-0.5 rounded-full ${question.status === 'answered' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {question.status}
                        </span>
                        <span>{question.visibility}</span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-900 line-clamp-2">{question.question_text}</p>
                    </div>
                  ))}
                  {!(myQuestionsQuery.data || []).length && (
                    <p className="text-sm text-slate-500 text-center py-4">No submissions yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Related Books Reading Card */}
            <div className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs ${mobileTab === 'books' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Related Catalog</p>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">Recommended Reading</h2>
                </div>
                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-400" />
              </div>

              {relatedBooksQuery.isLoading ? (
                <div className="mt-5 space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {(relatedBooksQuery.data || []).map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => navigate(`/books/${book.id}`)}
                      className="group flex w-full items-start gap-3.5 rounded-2xl border border-slate-200/80 p-3 text-left transition hover:bg-slate-50 hover:shadow-2xs"
                    >
                      <div className="h-14 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-2xs">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                            BK
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-[#002147] transition-colors">
                          {book.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{book.author || 'Unknown Author'}</p>
                      </div>
                    </button>
                  ))}
                  {selectedCategory && !(relatedBooksQuery.data || []).length && (
                    <p className="text-sm text-slate-500 text-center py-4">No linked books found for this category.</p>
                  )}
                  {!selectedCategory && (
                    <p className="text-sm text-slate-500 text-center py-4">Select a category above to view recommended reading.</p>
                  )}
                </div>
              )}
            </div>

          </aside>
        </div>
      </div>

      {/* Floating Action Button for Mobile Devices */}
      <button
        onClick={() => setAskOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#f4a261] text-[#001d3d] shadow-xl transition-transform hover:scale-105 active:scale-95 lg:hidden"
        title="Ask Question"
      >
        <PlusIcon className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Ask Question Dialog Modal */}
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