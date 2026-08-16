import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import {
  CalendarDaysIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  SparklesIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import posterService from '../../api/posterService';

import 'swiper/css';
import 'swiper/css/effect-fade';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://kil2-backend.onrender.com' : 'http://127.0.0.1:8000');

const toAbsoluteUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('http')) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const resolveTranslation = (poster, language) => {
  const translations = poster?.translations || {};
  return translations[language] || translations.en || Object.values(translations)[0] || {};
};

const getCaptionPositionClass = (alignment) => {
  if (alignment === 'top') return 'top-0 items-start bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent';
  if (alignment === 'center') return 'inset-0 items-center justify-center bg-slate-950/50';
  return 'bottom-0 items-end bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent';
};

const HomepagePostersCarousel = () => {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPoster, setOpenPoster] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const list = await posterService.getPublicPosters();
        if (mounted) setPosters(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setPosters([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (openPoster) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [openPoster]);

  const language = useMemo(() => {
    try {
      return localStorage.getItem('homepage_language') || 'en';
    } catch {
      return 'en';
    }
  }, []);

  // Loading Skeleton State
  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
        <div className="h-6 w-44 animate-pulse rounded-full bg-slate-800" />
        <div className="mt-4 h-[380px] animate-pulse rounded-2xl bg-slate-800/60 sm:h-[460px]" />
      </section>
    );
  }

  // Empty State
  if (!posters.length) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center sm:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/20">
            <SparklesIcon className="w-4 h-4 text-indigo-400" /> Media & Campaigns
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">No Posters Published Yet</h2>
          <p className="mt-2 max-w-lg mx-auto text-sm text-slate-400 sm:text-base leading-relaxed">
            Admin-uploaded event posters and announcements will automatically appear here with program info and location links.
          </p>
        </div>
      </section>
    );
  }

  const activePoster = openPoster ? posters.find((poster) => poster.id === openPoster) : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
      <Swiper
        modules={[Autoplay, EffectFade]}
        slidesPerView={1}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop={posters.length > 1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        className="w-full"
      >
        {posters.map((poster) => {
          const translation = resolveTranslation(poster, language);
          const desktopImage = toAbsoluteUrl(poster.desktop_image_url);
          const mobileImage = toAbsoluteUrl(poster.mobile_image_url) || desktopImage;
          const title = translation.title || poster.title || 'Untitled Poster';
          const programName = translation.program_name || poster.program_name;
          const eventDate = translation.event_date || poster.event_date;
          const locationName = translation.location_name || poster.location_name;
          const locationUrl = translation.location_url || poster.location_url;
          const description = translation.description || poster.description;
          const captionPosition = getCaptionPositionClass(poster.caption_alignment || 'bottom');

          return (
            <SwiperSlide key={poster.id}>
              <article
                className="group cursor-pointer overflow-hidden bg-slate-900"
                onClick={() => setOpenPoster(poster.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setOpenPoster(poster.id);
                }}
              >
                <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr] min-h-[420px] sm:min-h-[480px]">
                  {/* Left Canvas: Poster Display */}
                  <div className="relative flex items-center justify-center bg-slate-950 p-3 sm:p-6 overflow-hidden min-h-[300px] sm:min-h-[420px]">
                    <picture className="w-full h-full flex items-center justify-center">
                      <source media="(max-width: 767px)" srcSet={mobileImage || desktopImage || ''} />
                      <img
                        src={desktopImage || mobileImage || ''}
                        alt={title}
                        className="max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-lg transition-transform duration-500 group-hover:scale-[1.01]"
                        loading="eager"
                      />
                    </picture>

                    {/* Gradient Caption Overlay */}
                    <div className={`absolute inset-x-0 flex ${captionPosition} p-4 text-white sm:p-6 pointer-events-none`}>
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                          {eventDate && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-slate-200 border border-slate-700/80">
                              <CalendarDaysIcon className="h-3.5 w-3.5 text-cyan-400" />
                              {eventDate}
                            </span>
                          )}
                          {locationName && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-slate-200 border border-slate-700/80">
                              <MapPinIcon className="h-3.5 w-3.5 text-amber-400" />
                              {locationName}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-extrabold text-white sm:text-2xl leading-snug drop-shadow-md">
                          {title}
                        </h3>
                      </div>
                    </div>

                    {/* Expand Badge Indicator */}
                    <div className="absolute top-4 right-4 hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white border border-slate-700 opacity-0 transition-opacity group-hover:opacity-100">
                      <EyeIcon className="w-4 h-4 text-indigo-400" /> Click to Expand
                    </div>
                  </div>

                  {/* Right Sidebar: Program Details Panel */}
                  <div className="flex flex-col justify-between p-5 sm:p-7 border-t border-slate-800 lg:border-t-0 lg:border-l lg:border-slate-800 bg-slate-900 text-white">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-indigo-400 border border-indigo-500/20">
                        <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" /> Featured Notice
                      </div>

                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                          {programName || title}
                        </h2>
                        {description && (
                          <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-300 line-clamp-4">
                            {description}
                          </p>
                        )}
                      </div>

                      {/* Event Meta Box */}
                      <div className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs sm:text-sm">
                        {eventDate && (
                          <div className="flex items-center gap-2.5 text-slate-300">
                            <CalendarDaysIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span><strong className="text-white font-bold">Date:</strong> {eventDate}</span>
                          </div>
                        )}
                        {locationName && (
                          <div className="flex items-center gap-2.5 text-slate-300">
                            <MapPinIcon className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              <strong className="text-white font-bold">Location:</strong>{' '}
                              {locationUrl ? (
                                <a
                                  href={locationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-cyan-400 font-bold underline underline-offset-4 hover:text-cyan-300"
                                >
                                  {locationName}
                                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <span>{locationName}</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPoster(poster.id);
                      }}
                      className="mt-6 inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-indigo-600 px-4 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition"
                    >
                      <EyeIcon className="w-4 h-4" /> View Full Poster
                    </button>
                  </div>
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* React Portal Lightbox Dialog — Rendered on document.body */}
      {activePoster &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setOpenPoster(null)}
          >
            <div
              className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 text-white p-5 sm:p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="inline-block rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 border border-indigo-500/20">
                    Poster Lightbox Preview
                  </span>
                  <h3 className="mt-1 text-lg sm:text-xl font-extrabold text-white leading-snug">
                    {resolveTranslation(activePoster, language).title || activePoster.title}
                  </h3>
                </div>

                <button
                  onClick={() => setOpenPoster(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
                  title="Close Modal"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Poster Image Frame */}
              <div className="relative flex items-center justify-center rounded-2xl bg-slate-950 p-2 sm:p-3 border border-slate-800">
                <img
                  src={toAbsoluteUrl(activePoster.desktop_image_url || activePoster.mobile_image_url) || ''}
                  alt={resolveTranslation(activePoster, language).title || activePoster.title}
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-xl shadow-md"
                />
              </div>

              {/* Metadata & Description */}
              <div className="space-y-3 pt-1">
                {(resolveTranslation(activePoster, language).description || activePoster.description) && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {resolveTranslation(activePoster, language).description || activePoster.description}
                  </p>
                )}

                {/* Date & Location Chips */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  {(resolveTranslation(activePoster, language).event_date || activePoster.event_date) && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-slate-200">
                      <CalendarDaysIcon className="w-4 h-4 text-cyan-400" />
                      <span>
                        <strong className="text-white font-semibold">Date:</strong>{' '}
                        {resolveTranslation(activePoster, language).event_date || activePoster.event_date}
                      </span>
                    </span>
                  )}
                  {(resolveTranslation(activePoster, language).location_name || activePoster.location_name) && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-slate-200">
                      <MapPinIcon className="w-4 h-4 text-amber-400" />
                      <span>
                        <strong className="text-white font-semibold">Location:</strong>{' '}
                        {resolveTranslation(activePoster, language).location_name || activePoster.location_name}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};

export default HomepagePostersCarousel;