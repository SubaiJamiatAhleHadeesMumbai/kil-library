import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  UserCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  BookOpenIcon,
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import aboutService from '../api/aboutService';
import settingsService from '../api/settingsService';

// Constants & Utilities
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://kil2-backend.onrender.com' : 'http://127.0.0.1:8000');

const PUBLIC_GALLERY_PREVIEW = 4;
const PUBLIC_ULMA_PREVIEW = 4;
const PUBLIC_ULMA_PAGE_SIZE = 9;

const resolveImageUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const cleanPath = value.startsWith('/') ? value : `/${value}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const emptySettings = {
  hero: {
    title: 'About the Markaz Library',
    subtitle: '',
    description: '',
    cta_label: 'Explore the collection',
    cta_url: '/books',
    image_url: '',
  },
  intro: {
    title: 'Introduction',
    description: '',
    paragraphs: [],
  },
  display: {
    gallery_preview_count: PUBLIC_GALLERY_PREVIEW,
    ulma_preview_count: PUBLIC_ULMA_PREVIEW,
  },
  ulma_quotes: [],
  gallery: [],
};

// Sub-component: Image with Graceful Fallback State
const ImageWithFallback = ({ src, alt, className, fallbackIcon: FallbackIcon = PhotoIcon }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <FallbackIcon className="h-8 w-8 opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

// Sub-component: Skeleton Loader (Premium Layout Matching)
const AboutSkeleton = () => (
  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 animate-pulse">
    <div className="grid gap-8 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5 flex flex-col justify-center">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-9 w-3/4 rounded-xl bg-slate-200" />
        <div className="h-20 w-full rounded-2xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="h-80 lg:h-full min-h-[320px] rounded-3xl bg-slate-200" />
    </div>

    <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-3 w-36 bg-slate-200 rounded-full" />
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-10 w-40 bg-slate-200 rounded-full" />
      </div>
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[1.75rem] border border-slate-200 overflow-hidden">
            <div className="h-48 bg-slate-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Sub-component: Error Banner
const ErrorState = ({ onRetry }) => (
  <div className="mx-auto max-w-4xl px-4 py-16 text-center">
    <div className="rounded-[2.5rem] border border-red-200/80 bg-gradient-to-b from-red-50/80 to-white p-8 sm:p-12 shadow-sm">
      <div className="mx-auto h-16 w-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
        <ExclamationTriangleIcon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-black text-slate-900">Unable to load information</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
        We encountered a network issue while retrieving the library details. Please try refreshing.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#002147] px-7 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#12315a] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#002147] focus:ring-offset-2"
        >
          <ArrowPathIcon className="h-4 w-4" /> Try Again
        </button>
      )}
    </div>
  </div>
);

// Sub-component: Hero & Introduction Section
const IntroSection = ({ settings, heroImage }) => (
  <section className="grid gap-8 overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white/90 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:grid-cols-[1.1fr_0.9fr]">
    <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#002147]/5 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#002147] w-fit">
        <SparklesIcon className="h-3.5 w-3.5 text-[#002147]" /> Introduction
      </div>

      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
        {settings.intro?.title || 'Introduction'}
      </h2>

      {settings.intro?.description && (
        <p className="mt-4 text-base leading-8 text-slate-600 font-normal">{settings.intro.description}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(settings.intro?.paragraphs || []).slice(0, 2).map((paragraph, index) => (
          <div
            key={index}
            className="group rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-5 text-sm leading-7 text-slate-600 transition-all hover:border-[#002147]/30 hover:shadow-sm"
          >
            <p>{paragraph}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="relative min-h-[340px] bg-slate-100 overflow-hidden group">
      {heroImage ? (
        <>
          <img
            src={heroImage}
            alt={settings.hero?.title || 'About library'}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
              Library Campus
            </span>
            <h3 className="mt-2 text-xl font-bold">{settings.hero?.title || 'Markaz Library'}</h3>
          </div>
        </>
      ) : (
        <div className="flex h-full min-h-[340px] items-center justify-center bg-gradient-to-br from-[#002147] via-[#0f4c81] to-cyan-700 px-8 text-center text-white relative">
          <div className="relative z-10 max-w-sm">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md mb-4">
              <BookOpenIcon className="h-6 w-6 text-cyan-200" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-200/80">Markaz Library</p>
            <h3 className="mt-2 text-2xl font-black">Knowledge, Learning & Heritage</h3>
            <p className="mt-3 text-xs leading-6 text-cyan-50/80">
              Add a custom hero image from the admin panel to personalize the library identity.
            </p>
          </div>
        </div>
      )}
    </div>
  </section>
);

// Sub-component: Gallery Preview Section
const GalleryPreviewSection = ({ galleryVisible, gallery, galleryPreview, galleryPreviewLimit }) => (
  <section className="mt-10 rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-6 sm:p-10 shadow-sm backdrop-blur-sm">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Markaz Gallery Preview</p>
        <h2 className="mt-1.5 text-2xl sm:text-3xl font-black text-slate-900">Gallery highlights</h2>
      </div>
      {!galleryVisible || gallery.length === 0 ? (
        <button
          type="button"
          disabled
          className="rounded-full bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed uppercase tracking-wider"
        >
          Gallery Unavailable
        </button>
      ) : (
        <Link
          to="/about/gallery"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#002147] to-[#0f4c81] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#002147] focus:ring-offset-2"
        >
          Open Markaz Gallery <ArrowRightIcon className="h-4 w-4" />
        </Link>
      )}
    </div>

    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {galleryPreview.length > 0 ? (
        galleryPreview.map((item, index) => {
          const imageUrl = resolveImageUrl(item.image_url);
          return (
            <article
              key={`${item.title || 'gallery'}-${index}`}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 flex flex-col justify-between"
            >
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                <ImageWithFallback
                  src={imageUrl}
                  alt={item.title || 'Markaz gallery'}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 right-3 rounded-full bg-slate-950/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                  #{String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#002147] transition-colors">
                  {item.title || 'Markaz view'}
                </h3>
                <p className="mt-1.5 text-xs leading-6 text-slate-500 line-clamp-2">
                  {item.caption || 'Image from the Markaz introduction gallery.'}
                </p>
              </div>
            </article>
          );
        })
      ) : (
        <div className="col-span-full rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center text-sm font-medium text-slate-500">
          Gallery images will appear here once uploaded by the administration.
        </div>
      )}
    </div>

    {galleryVisible && gallery.length > galleryPreviewLimit && (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-5 py-3.5">
        <p className="text-sm text-slate-600">
          Showing <span className="font-bold text-slate-900">{galleryPreview.length}</span> preview images out of{' '}
          <span className="font-bold text-slate-900">{gallery.length}</span>.
        </p>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Use top button for complete gallery
        </span>
      </div>
    )}
  </section>
);

// Sub-component: Ulma Preview Section (Scholar Quotes)
const UlmaPreviewSection = ({ quotes, ulmaPreview, ulmaPreviewLimit, onOpenModal }) => (
  <section className="mt-10 rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-6 sm:p-10 shadow-sm backdrop-blur-sm">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-5">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-cyan-800">
          <ChatBubbleBottomCenterTextIcon className="h-3.5 w-3.5 text-cyan-700" /> Ulma ki ray
        </div>
        <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">Praise & guidance about the library</h2>
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <button
          onClick={onOpenModal}
          disabled={quotes.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-[#002147] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#12315a] disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-[#002147] focus:ring-offset-2"
        >
          Open Ulma Gallery <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {ulmaPreview.length > 0 ? (
        ulmaPreview.map((item, index) => {
          const imageUrl = resolveImageUrl(item.image_url);
          return (
            <article
              key={`${item.name || 'ulma-preview'}-${index}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 relative overflow-hidden"
            >
              <div className="absolute top-2 right-4 text-slate-200 text-6xl font-serif select-none pointer-events-none opacity-40">
                “
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-200 ring-2 ring-white shadow-sm">
                    <ImageWithFallback
                      src={imageUrl}
                      alt={item.name || 'Scholar'}
                      fallbackIcon={UserCircleIcon}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-[#002147] transition-colors">
                      {item.name || 'Scholar name'}
                    </h3>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 mt-0.5">
                      {item.designation || 'Scholar'}
                    </p>
                  </div>
                </div>

                <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-700 italic">
                  “{item.quote || 'Add a quote from the admin panel.'}”
                </p>
              </div>

              {item.source_url ? (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#002147] hover:underline focus:outline-none focus:ring-1 focus:ring-[#002147]"
                >
                  {item.source_text || 'Visit source'} <ArrowRightIcon className="h-3 w-3" />
                </a>
              ) : item.source_text ? (
                <p className="mt-4 text-xs font-bold text-[#002147]">{item.source_text}</p>
              ) : null}
            </article>
          );
        })
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/50 p-10 text-sm font-medium text-slate-500 sm:col-span-2 xl:col-span-4 text-center">
          Scholar reviews and quotes will appear here once added by the administration.
        </div>
      )}
    </div>

    {quotes.length > ulmaPreviewLimit && (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-5 py-3.5">
        <p className="text-sm text-slate-600">
          Showing <span className="font-bold text-slate-900">{ulmaPreview.length}</span> preview quotes out of{' '}
          <span className="font-bold text-slate-900">{quotes.length}</span>.
        </p>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Click button above to open full modal
        </span>
      </div>
    )}
  </section>
);

// Sub-component: Accessible Ulma Gallery Modal Dialog
const UlmaModal = ({ isOpen, onClose, quotes, page, setPage, totalPages }) => {
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-md transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ulma-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8 bg-slate-50/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Ulma Gallery</span>
            <h3 id="ulma-modal-title" className="text-2xl font-black text-slate-900 mt-0.5">
              Ulma ki ray
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-[#002147] hover:bg-[#002147] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002147]"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {quotes.map((item, index) => {
              const imageUrl = resolveImageUrl(item.image_url);
              return (
                <article
                  key={`${item.name || 'ulma-modal'}-${index}`}
                  className="flex flex-col justify-between rounded-[1.75rem] border border-slate-200/90 bg-slate-50/70 p-6 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-200 ring-2 ring-white">
                        <ImageWithFallback
                          src={imageUrl}
                          alt={item.name || 'Scholar'}
                          fallbackIcon={UserCircleIcon}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900">{item.name || 'Scholar name'}</h4>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mt-0.5">
                          {item.designation || 'Scholar'}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-700 italic">“{item.quote || 'No quote provided.'}”</p>
                  </div>

                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#002147] hover:underline focus:outline-none focus:ring-1 focus:ring-[#002147]"
                    >
                      {item.source_text || 'Visit source'} <ArrowRightIcon className="h-3 w-3" />
                    </a>
                  ) : item.source_text ? (
                    <p className="mt-5 text-xs font-bold text-[#002147]">{item.source_text}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>

        {/* Modal Footer / Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:px-8 bg-slate-50/80">
          <p className="text-sm text-slate-600">
            Page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#002147]"
            >
              <ChevronLeftIcon className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#002147]"
            >
              Next <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const AboutUs = () => {
  const [settings, setSettings] = useState(emptySettings);
  const [homepageSettings, setHomepageSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ulmaModalOpen, setUlmaModalOpen] = useState(false);
  const [ulmaPage, setUlmaPage] = useState(1);

  // Parallel API Loading with Error Recovery
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aboutRes, homepageRes] = await Promise.allSettled([
        aboutService.getAboutSettings(),
        settingsService.getHomepageSettings(),
      ]);

      if (aboutRes.status === 'fulfilled' && aboutRes.value) {
        setSettings({ ...emptySettings, ...aboutRes.value });
      } else {
        setSettings(emptySettings);
      }

      if (homepageRes.status === 'fulfilled') {
        setHomepageSettings(homepageRes.value || {});
      } else {
        setHomepageSettings({});
      }

      if (aboutRes.status === 'rejected' && homepageRes.status === 'rejected') {
        setError('Failed to load library settings.');
      }
    } catch (err) {
      console.error('Unexpected error loading about page data', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    loadData();
  }, [loadData]);

  // Derived Values
  const heroImage = useMemo(() => resolveImageUrl(settings.hero?.image_url), [settings.hero?.image_url]);

  const quotes = useMemo(() => {
    return Array.isArray(settings.ulma_quotes)
      ? settings.ulma_quotes.filter((item) => item?.quote || item?.name || item?.image_url)
      : [];
  }, [settings.ulma_quotes]);

  const gallery = useMemo(() => {
    return Array.isArray(settings.gallery)
      ? settings.gallery.filter((item) => item?.image_url || item?.title || item?.caption)
      : [];
  }, [settings.gallery]);

  const galleryVisible = homepageSettings?.sections?.gallery?.enabled !== false;

  const galleryPreviewLimit = useMemo(() => {
    return Math.min(24, Math.max(1, Number(settings.display?.gallery_preview_count ?? PUBLIC_GALLERY_PREVIEW)));
  }, [settings.display?.gallery_preview_count]);

  const ulmaPreviewLimit = useMemo(() => {
    return Math.min(24, Math.max(1, Number(settings.display?.ulma_preview_count ?? PUBLIC_ULMA_PREVIEW)));
  }, [settings.display?.ulma_preview_count]);

  const galleryPreview = useMemo(() => gallery.slice(0, galleryPreviewLimit), [gallery, galleryPreviewLimit]);
  const ulmaPreview = useMemo(() => quotes.slice(0, ulmaPreviewLimit), [quotes, ulmaPreviewLimit]);

  const totalUlmaPages = useMemo(() => Math.max(1, Math.ceil(quotes.length / PUBLIC_ULMA_PAGE_SIZE)), [quotes.length]);

  const pagedUlma = useMemo(() => {
    const start = (ulmaPage - 1) * PUBLIC_ULMA_PAGE_SIZE;
    return quotes.slice(start, start + PUBLIC_ULMA_PAGE_SIZE);
  }, [quotes, ulmaPage]);

  const handleOpenUlmaModal = useCallback(() => {
    setUlmaPage(1);
    setUlmaModalOpen(true);
  }, []);

  const handleCloseUlmaModal = useCallback(() => {
    setUlmaModalOpen(false);
  }, []);

  if (loading) {
    return <AboutSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={loadData} />;
  }

  return (
    <div className="bg-[radial-gradient(circle_at_top,_rgba(0,33,71,0.06),_transparent_40%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_50%,_#f8fafc_100%)] min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <IntroSection settings={settings} heroImage={heroImage} />

        <GalleryPreviewSection
          galleryVisible={galleryVisible}
          gallery={gallery}
          galleryPreview={galleryPreview}
          galleryPreviewLimit={galleryPreviewLimit}
        />

        <UlmaPreviewSection
          quotes={quotes}
          ulmaPreview={ulmaPreview}
          ulmaPreviewLimit={ulmaPreviewLimit}
          onOpenModal={handleOpenUlmaModal}
        />
      </div>

      <UlmaModal
        isOpen={ulmaModalOpen}
        onClose={handleCloseUlmaModal}
        quotes={pagedUlma}
        page={ulmaPage}
        setPage={setUlmaPage}
        totalPages={totalUlmaPages}
      />
    </div>
  );
};

export default AboutUs;