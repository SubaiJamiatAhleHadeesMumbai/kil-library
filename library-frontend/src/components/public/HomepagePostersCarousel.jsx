import React, { useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import { CalendarDaysIcon, MapPinIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import posterService from '../../api/posterService';

import 'swiper/css';
import 'swiper/css/effect-fade';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://kil2-backend.onrender.com' : 'http://127.0.0.1:8000');

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
  if (alignment === 'top') return 'top-0 items-start bg-gradient-to-b from-slate-950/85 via-slate-950/30 to-transparent';
  if (alignment === 'center') return 'inset-0 items-center justify-center bg-slate-950/35';
  return 'bottom-0 items-end bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent';
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

  const language = useMemo(() => {
    try {
      return localStorage.getItem('homepage_language') || 'en';
    } catch {
      return 'en';
    }
  }, []);

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="h-8 w-44 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-[420px] animate-pulse rounded-[1.75rem] bg-slate-100" />
      </section>
    );
  }

  if (!posters.length) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/40 p-4 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)] sm:p-6 lg:p-7">
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">Media / Poster</p>
          <h2 className="mt-3 text-2xl font-extrabold text-[#002147] sm:text-3xl">No posters published yet</h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">When an admin adds a poster, it will appear here with desktop and mobile versions, program details, and a clickable location link.</p>
        </div>
      </section>
    );
  }

  const activePoster = openPoster ? posters.find((poster) => poster.id === openPoster) : null;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-0 shadow-sm md:h-[calc(100vh-88px)] md:max-h-[calc(100vh-88px)] md:overflow-hidden">
      <div className="h-full md:h-full">
        <Swiper
          modules={[Autoplay, EffectFade]}
          slidesPerView={1}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          loop={posters.length > 1}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          className="!h-auto md:!h-full !pb-2"
        >
          {posters.map((poster) => {
            const translation = resolveTranslation(poster, language);
            const desktopImage = toAbsoluteUrl(poster.desktop_image_url);
            const mobileImage = toAbsoluteUrl(poster.mobile_image_url) || desktopImage;
            const title = translation.title || poster.title;
            const programName = translation.program_name || poster.program_name;
            const eventDate = translation.event_date || poster.event_date;
            const locationName = translation.location_name || poster.location_name;
            const locationUrl = translation.location_url || poster.location_url;
            const description = translation.description || poster.description;
            const captionPosition = getCaptionPositionClass(poster.caption_alignment || 'bottom');
            return (
              <SwiperSlide key={poster.id} className="!h-auto md:!h-full">
                <article
                  className="flex h-auto min-h-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm md:h-full md:items-stretch"
                  onClick={() => setOpenPoster(poster.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setOpenPoster(poster.id);
                  }}
                >
                  <div className="grid h-full min-h-0 gap-0 md:grid-cols-[minmax(0,2.3fr)_minmax(180px,0.7fr)] md:items-stretch">
                    <div className="flex h-auto min-h-0 flex-col border-b border-slate-200 bg-white p-1 sm:p-2 md:h-full md:border-b-0 md:border-r md:self-stretch">
                      <div className="poster-frame relative block w-full overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-none aspect-[2/3] md:aspect-auto md:min-h-[min(100%,22rem)] md:flex-1">
                        <picture className="absolute inset-0 block p-1 sm:p-2 md:p-2">
                          <source media="(max-width: 767px)" srcSet={mobileImage || desktopImage || ''} />
                          <img
                            src={desktopImage || mobileImage || ''}
                            alt={title}
                            className="poster-image absolute inset-0 m-auto block h-full w-full object-contain"
                            loading="eager"
                          />
                        </picture>
                        <div className={`absolute inset-x-0 flex ${captionPosition} p-3 text-white sm:p-5`}>
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:gap-3 sm:text-sm">
                              {eventDate ? <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur"><CalendarDaysIcon className="h-4 w-4" />{eventDate}</span> : null}
                              {locationName ? <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur"><MapPinIcon className="h-4 w-4" />{locationName}</span> : null}
                            </div>
                            <h3 className="text-lg font-extrabold leading-tight sm:text-3xl">{title}</h3>
                            {programName ? <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200 sm:text-sm">{programName}</p> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex h-auto flex-col justify-start gap-1.5 overflow-hidden p-2 text-sm sm:p-3 md:h-full md:min-w-0 lg:self-stretch">
                      <div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700 sm:text-xs">Media / Poster</p>
                          <h2 className="mt-1 text-base font-extrabold leading-snug text-[#002147] sm:text-xl">Upcoming programs and notices</h2>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">Admin-uploaded posters rotate automatically and stay optimized for mobile and desktop screens.</p>
                        </div>

                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700 sm:text-xs">Program Details</p>
                        <h4 className="mt-1 text-sm font-bold leading-snug text-slate-900 sm:text-lg">{programName || title}</h4>
                        {description ? <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[11px] leading-5 text-slate-600 sm:line-clamp-3 sm:text-sm">{description}</p> : null}

                        <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs sm:space-y-1.5 sm:p-2.5 sm:text-sm">
                          {eventDate ? <p className="text-slate-700"><span className="font-semibold text-slate-900">Date:</span> {eventDate}</p> : null}
                          {locationName ? (
                            <div className="text-slate-700">
                              <span className="font-semibold text-slate-900">Location:</span>{' '}
                              {locationUrl ? (
                                <a href={locationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900">
                                  {locationName}
                                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                </a>
                              ) : (
                                <span>{locationName}</span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {activePoster ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setOpenPoster(null)}
        >
          <div
            className="relative max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpenPoster(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-950 sm:right-4 sm:top-4"
            >
              Close
            </button>
            <div className="grid max-h-[95vh] md:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.3fr)]">
              <div className="relative flex min-h-[50vh] items-center justify-center bg-slate-950 p-3 sm:min-h-[70vh] sm:p-4">
                <img
                  src={toAbsoluteUrl(activePoster.desktop_image_url || activePoster.mobile_image_url) || ''}
                  alt={resolveTranslation(activePoster, language).title || activePoster.title}
                  className="max-h-[88vh] w-auto max-w-full object-contain"
                />
              </div>
              <div className="border-t border-slate-200 bg-white p-4 md:border-l md:border-t-0 md:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Full Poster</p>
                <h3 className="mt-1 text-lg font-extrabold text-[#002147]">
                  {resolveTranslation(activePoster, language).title || activePoster.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {resolveTranslation(activePoster, language).description || activePoster.description || 'Poster preview'}
                </p>
                <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {resolveTranslation(activePoster, language).event_date || activePoster.event_date ? (
                    <p><span className="font-semibold text-slate-900">Date:</span> {resolveTranslation(activePoster, language).event_date || activePoster.event_date}</p>
                  ) : null}
                  {resolveTranslation(activePoster, language).location_name || activePoster.location_name ? (
                    <p>
                      <span className="font-semibold text-slate-900">Location:</span>{' '}
                      {resolveTranslation(activePoster, language).location_name || activePoster.location_name}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default HomepagePostersCarousel;