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
  ArrowDownTrayIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import posterService from '../../api/posterService';

import 'swiper/css';
import 'swiper/css/effect-fade';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

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

const downloadImage = async (url, filename) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'poster.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank');
  }
};

const shareToWhatsApp = (title, posterUrl) => {
  const shareText = `📢 *${title}*\nCheck this poster out at Kokan Islamic Library:\n${window.location.origin}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
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
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        className="w-full"
      >
        {posters.map((poster) => {
          const translation = resolveTranslation(poster, language);
          const desktopImage = toAbsoluteUrl(poster.desktop_image_url);
          const mobileImage = toAbsoluteUrl(poster.mobile_image_url) || desktopImage;
          const currentImage = desktopImage || mobileImage || '';
          const title = translation.title || poster.title || 'Untitled Poster';
          const programName = translation.program_name || poster.program_name;
          const eventDate = translation.event_date || poster.event_date;
          const locationName = translation.location_name || poster.location_name;
          const locationUrl = translation.location_url || poster.location_url;
          const description = translation.description || poster.description;
          const captionPosition = getCaptionPositionClass(poster.caption_alignment || 'bottom');

          const settings = poster?.translations?.settings || {};
          const enableShare = settings.enable_share !== false;
          const enableDownload = settings.enable_download !== false;
          const enableLink = Boolean(settings.enable_link && settings.external_link);
          const hasMeta = Boolean(programName || eventDate || locationName || description);

          const handlePosterClick = () => {
            if (enableLink && settings.external_link) {
              window.open(settings.external_link, '_blank');
            } else {
              setOpenPoster(poster.id);
            }
          };

          return (
            <SwiperSlide key={poster.id}>
              <article
                className="group cursor-pointer overflow-hidden bg-slate-950"
                onClick={handlePosterClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handlePosterClick();
                }}
              >
                <div className={`grid gap-0 ${hasMeta ? 'lg:grid-cols-[1.5fr_1fr]' : 'grid-cols-1'} min-h-[380px] sm:min-h-[500px]`}>
                  {/* Poster Display Canvas with Ambient Backdrop */}
                  <div className="relative flex items-center justify-center bg-slate-950 p-2 sm:p-6 overflow-hidden min-h-[320px] sm:min-h-[460px]">
                    {/* Ambient Glow Backdrop */}
                    {currentImage && (
                      <div
                        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-125 pointer-events-none transition-opacity duration-700"
                        style={{ backgroundImage: `url(${currentImage})` }}
                      />
                    )}

                    <picture className="relative z-10 w-full h-full flex items-center justify-center">
                      <source media="(max-width: 767px)" srcSet={mobileImage || desktopImage || ''} />
                      <img
                        src={currentImage}
                        alt={title}
                        className="max-h-[480px] sm:max-h-[560px] w-auto max-w-full object-contain rounded-xl sm:rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.015]"
                        loading="eager"
                      />
                    </picture>

                    {/* Gradient Caption Overlay for non-meta or mobile */}
                    {!hasMeta && (
                      <div className={`absolute inset-x-0 z-20 flex ${captionPosition} p-4 text-white sm:p-6 pointer-events-none`}>
                        <div className="space-y-1.5 max-w-2xl bg-slate-950/60 backdrop-blur-md p-3 rounded-2xl border border-slate-800/80">
                          <h3 className="text-base font-extrabold text-white sm:text-xl leading-snug drop-shadow-md">
                            {title}
                          </h3>
                        </div>
                      </div>
                    )}

                    {/* Quick Action Floating Bar on Top Right */}
                    <div 
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {enableShare && (
                        <button
                          type="button"
                          onClick={() => shareToWhatsApp(title, currentImage)}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-emerald-400/40"
                          title="Share to WhatsApp"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                          </svg>
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      )}

                      {enableDownload && currentImage && (
                        <button
                          type="button"
                          onClick={() => downloadImage(currentImage, `${title.replace(/\s+/g, '_')}.jpg`)}
                          className="flex items-center gap-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-slate-700"
                          title="Download Poster"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1 rounded-full bg-slate-900/90 text-slate-300 px-2.5 py-1.5 text-xs font-semibold backdrop-blur-md border border-slate-700">
                        {enableLink ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> Visit Link
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-indigo-400">
                            <EyeIcon className="w-3.5 h-3.5" /> Full View
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar (Only shown if poster has extra program metadata) */}
                  {hasMeta && (
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

                      <div className="mt-6 flex items-center gap-2">
                        {enableLink ? (
                          <a
                            href={settings.external_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-2 flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-[0.98] transition cursor-pointer"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Open Link / Register
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenPoster(poster.id);
                            }}
                            className="inline-flex items-center justify-center gap-2 flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition cursor-pointer"
                          >
                            <EyeIcon className="w-4 h-4" /> View Full Poster
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* React Portal Lightbox Dialog â€” Rendered on document.body */}
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