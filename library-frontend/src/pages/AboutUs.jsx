import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import aboutService from '../api/aboutService';
import settingsService from '../api/settingsService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://kil2-backend.onrender.com' : 'http://127.0.0.1:8000');

const resolveImageUrl = (value) => {
  if (!value) return '';
  if (String(value).startsWith('http')) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
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
    gallery_preview_count: 4,
    ulma_preview_count: 4,
  },
  ulma_quotes: [],
  gallery: [],
};

const PUBLIC_GALLERY_PREVIEW = 4;
const PUBLIC_GALLERY_PAGE_SIZE = 12;
const PUBLIC_ULMA_PREVIEW = 4;
const PUBLIC_ULMA_PAGE_SIZE = 9;

const AboutUs = () => {
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [ulmaModalOpen, setUlmaModalOpen] = useState(false);
  const [ulmaPage, setUlmaPage] = useState(1);
  const [homepageSettings, setHomepageSettings] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await aboutService.getAboutSettings();
        setSettings({ ...emptySettings, ...data });
      } catch (error) {
        console.error('Unable to load about settings', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    let mounted = true;
    settingsService.getHomepageSettings().then((data) => {
      if (mounted) setHomepageSettings(data || {});
    }).catch(() => {
      if (mounted) setHomepageSettings({});
    });
    return () => {
      mounted = false;
    };
  }, []);

  const heroImage = resolveImageUrl(settings.hero?.image_url);
  const quotes = Array.isArray(settings.ulma_quotes) ? settings.ulma_quotes.filter((item) => item?.quote || item?.name || item?.image_url) : [];
  const gallery = Array.isArray(settings.gallery) ? settings.gallery.filter((item) => item?.image_url || item?.title || item?.caption) : [];
  const galleryVisible = homepageSettings?.sections?.gallery?.enabled !== false;
  const galleryPreviewLimit = Math.min(24, Math.max(1, Number(settings.display?.gallery_preview_count ?? PUBLIC_GALLERY_PREVIEW)));
  const ulmaPreviewLimit = Math.min(24, Math.max(1, Number(settings.display?.ulma_preview_count ?? PUBLIC_ULMA_PREVIEW)));
  const galleryPreview = gallery.slice(0, galleryPreviewLimit);
  const ulmaPreview = quotes.slice(0, ulmaPreviewLimit);
  const totalUlmaPages = Math.max(1, Math.ceil(quotes.length / PUBLIC_ULMA_PAGE_SIZE));
  const pagedUlma = useMemo(() => {
    const start = (ulmaPage - 1) * PUBLIC_ULMA_PAGE_SIZE;
    return quotes.slice(start, start + PUBLIC_ULMA_PAGE_SIZE);
  }, [quotes, ulmaPage]);

  useEffect(() => {
    if (ulmaModalOpen) {
      setUlmaPage(1);
    }
  }, [ulmaModalOpen]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-80 animate-pulse rounded-[2rem] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="bg-[radial-gradient(circle_at_top,_rgba(0,33,71,0.08),_transparent_36%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_55%,_#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.08)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 sm:p-10 lg:p-14">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Introduction</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">{settings.intro?.title || 'Introduction'}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{settings.intro?.description}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(settings.intro?.paragraphs || []).slice(0, 2).map((paragraph) => (
                <div key={paragraph} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  {paragraph}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[320px] bg-slate-100">
            {heroImage ? (
              <img src={heroImage} alt={settings.hero?.title || 'About library'} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center bg-gradient-to-br from-[#002147] via-[#0f4c81] to-cyan-700 px-8 text-center text-white">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-100/80">Markaz</p>
                  <h2 className="mt-4 text-3xl font-black">Library, learning, and community</h2>
                  <p className="mt-3 text-sm leading-7 text-cyan-50/90">Add a hero image from the admin panel to highlight the library identity.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Markaz Gallery Preview</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Gallery highlights</h2>
            </div>
            {!galleryVisible || gallery.length === 0 ? (
              <button
                type="button"
                disabled
                className="rounded-full bg-slate-300 px-4 py-2 text-sm font-bold text-white"
              >
                Gallery Unavailable
              </button>
            ) : (
              <Link
                to="/about/gallery"
                className="rounded-full bg-[#002147] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#12315a]"
              >
                Open Markaz Gallery
              </Link>
            )}
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {galleryPreview.length > 0 ? galleryPreview.map((item, index) => {
              const imageUrl = resolveImageUrl(item.image_url);
              return (
                <article key={`${item.title || 'gallery'}-${index}`} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                  <div className="aspect-[4/3] bg-slate-100">
                    {imageUrl ? <img src={imageUrl} alt={item.title || 'Markaz gallery'} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-slate-900">{item.title || 'Markaz view'}</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{item.caption || 'Image from the Markaz introduction gallery.'}</p>
                  </div>
                </article>
              );
            }) : (
              <div className="col-span-full rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Gallery images will appear here after the admin uploads them.
              </div>
            )}
          </div>

          {galleryVisible && gallery.length > galleryPreviewLimit ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-600">
                Showing <span className="font-bold text-slate-900">{galleryPreview.length}</span> preview images out of <span className="font-bold text-slate-900">{gallery.length}</span>.
              </p>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Use button above for full gallery</span>
            </div>
          ) : null}
        </section>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Ulma ki ray</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Praise and guidance about the library</h2>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="max-w-xl text-sm leading-7 text-slate-600">These cards can be managed from the admin panel, including name, quote, source link text, and image upload.</p>
              <button
                onClick={() => setUlmaModalOpen(true)}
                disabled={quotes.length === 0}
                className="rounded-full bg-[#002147] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#12315a] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Open Ulma Gallery
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ulmaPreview.length > 0 ? ulmaPreview.map((item, index) => {
              const imageUrl = resolveImageUrl(item.image_url);
              return (
                <article key={`${item.name || 'ulma'}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-200">
                      {imageUrl ? <img src={imageUrl} alt={item.name || 'Scholar'} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{item.name || 'Scholar name'}</h3>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.designation || 'Designation'}</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-700">“{item.quote || 'Add a quote from the admin panel.'}”</p>
                  {item.source_url ? (
                    <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-bold text-[#002147] hover:underline">
                      {item.source_text || 'Visit source'}
                    </a>
                  ) : item.source_text ? (
                    <p className="mt-4 text-sm font-bold text-[#002147]">{item.source_text}</p>
                  ) : null}
                </article>
              );
            }) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 sm:col-span-2 xl:col-span-4">
                Admin abhi ulma quotes add nahi kiye. Yeh section unke liye reserved hai.
              </div>
            )}
          </div>

          {quotes.length > ulmaPreviewLimit ? (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">
                Showing <span className="font-bold text-slate-900">{ulmaPreview.length}</span> preview quotes out of <span className="font-bold text-slate-900">{quotes.length}</span>.
              </p>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Use the button above to open full gallery</span>
            </div>
          ) : null}
        </section>
      </div>

      {ulmaModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Ulma Gallery</p>
                <h3 className="text-xl font-black text-slate-900">Ulma ki ray</h3>
              </div>
              <button
                onClick={() => setUlmaModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-[#002147] hover:text-[#002147]"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {pagedUlma.map((item, index) => {
                  const imageUrl = resolveImageUrl(item.image_url);
                  return (
                    <article key={`${item.name || 'ulma-full'}-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-200">
                          {imageUrl ? <img src={imageUrl} alt={item.name || 'Scholar'} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-900">{item.name || 'Scholar name'}</h4>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.designation || 'Designation'}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-700">“{item.quote || 'No quote provided.'}”</p>
                      {item.source_url ? (
                        <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-bold text-[#002147] hover:underline">
                          {item.source_text || 'Visit source'}
                        </a>
                      ) : item.source_text ? (
                        <p className="mt-4 text-sm font-bold text-[#002147]">{item.source_text}</p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
              <p className="text-sm text-slate-600">
                Page <span className="font-bold text-slate-900">{ulmaPage}</span> of <span className="font-bold text-slate-900">{totalUlmaPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUlmaPage((prev) => Math.max(1, prev - 1))}
                  disabled={ulmaPage <= 1}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeftIcon className="h-4 w-4" /> Prev
                </button>
                <button
                  onClick={() => setUlmaPage((prev) => Math.min(totalUlmaPages, prev + 1))}
                  disabled={ulmaPage >= totalUlmaPages}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AboutUs;