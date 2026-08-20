import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, ShareIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import aboutService from '../api/aboutService';
import settingsService from '../api/settingsService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://kil2-backend.onrender.com' : 'http://127.0.0.1:8000');
const PAGE_SIZE = 18;

const resolveImageUrl = (value) => {
  if (!value) return '';
  if (String(value).startsWith('http')) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const GalleryCardSkeleton = () => (
  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
    <div className="aspect-[4/3] animate-pulse bg-slate-100" />
    <div className="space-y-3 p-4">
      <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
      <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
    </div>
  </div>
);

const AboutGallery = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [homepageSettings, setHomepageSettings] = useState(null);
  const touchStartRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(gallery.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return gallery.slice(start, start + PAGE_SIZE).map((item, offset) => ({
      item,
      index: start + offset,
    }));
  }, [gallery, page]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await aboutService.getAboutSettings();
        const list = Array.isArray(data?.gallery)
          ? data.gallery.filter((item) => item?.image_url || item?.title || item?.caption)
          : [];
        setGallery(list);
      } catch (error) {
        console.error('Unable to load Markaz gallery', error);
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

  const galleryVisible = homepageSettings?.sections?.gallery?.enabled !== false;

  useEffect(() => {
    if (!gallery.length) return;
    const raw = Number(searchParams.get('image'));
    if (!Number.isFinite(raw) || raw < 1) return;
    const imageIndex = raw - 1;
    if (imageIndex >= 0 && imageIndex < gallery.length) {
      setSelectedIndex(imageIndex);
      setPage(Math.floor(imageIndex / PAGE_SIZE) + 1);
    }
  }, [gallery, searchParams]);

  const openImage = (index) => {
    setSelectedIndex(index);
    setSearchParams({ image: String(index + 1) }, { replace: true });
  };

  const closeImage = () => {
    setSelectedIndex(null);
    setSearchParams({}, { replace: true });
  };

  const goToImage = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= gallery.length) return;
    openImage(nextIndex);
  };

  const currentItem = selectedIndex !== null ? gallery[selectedIndex] : null;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (selectedIndex === null) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeImage();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToImage(selectedIndex - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToImage(selectedIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, gallery.length]);

  const handleTouchStart = (event) => {
    touchStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        goToImage(selectedIndex + 1);
      } else {
        goToImage(selectedIndex - 1);
      }
    }
    touchStartRef.current = null;
  };

  const handleDownload = () => {
    if (!currentItem?.image_url) return;
    const url = resolveImageUrl(currentItem.image_url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = currentItem.title || 'markaz-gallery-image';
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleShare = async () => {
    if (selectedIndex === null) return;
    const item = gallery[selectedIndex];
    const shareUrl = `${window.location.origin}/about/gallery?image=${selectedIndex + 1}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: item?.title || 'Markaz Gallery Image',
          text: item?.caption || 'View this image from Markaz Gallery',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Image link copied');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        toast.error('Unable to share image right now');
      }
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="h-3 w-36 animate-pulse rounded-full bg-slate-100" />
              <div className="h-8 w-64 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <GalleryCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,33,71,0.08),_transparent_36%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_55%,_#f8fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#002147]">Markaz Gallery</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Introduction Photos</h1>
              <p className="mt-2 text-sm text-slate-600">Click any image to open full view and share it.</p>
            </div>
            <Link to="/about" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#002147] hover:text-[#002147]">
              Back to About
            </Link>
          </div>
          {!galleryVisible ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Gallery is currently hidden by the homepage visibility settings.
            </div>
          ) : null}

          {gallery.length ? (
            <>
              <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {pageItems.map(({ item, index }) => {
                  const imageUrl = resolveImageUrl(item.image_url);
                  return (
                    <button
                      key={`${item.title || 'gallery'}-${index}`}
                      type="button"
                      onClick={() => openImage(index)}
                      className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="aspect-[4/3] bg-slate-100">
                        {imageUrl ? <img src={imageUrl} alt={item.title || 'Markaz gallery'} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : null}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-bold text-slate-900">{item.title || `Image ${index + 1}`}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-500">{item.caption || 'Markaz gallery image'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-4 w-4" /> Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No gallery images available yet.
            </div>
          )}
        </section>
      </div>

      {selectedIndex !== null ? (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
          <div className="mx-auto flex h-[calc(100vh-1rem)] w-full max-w-6xl items-center justify-center">
            <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.8rem] bg-white shadow-2xl">
              <div className="flex flex-col gap-2 border-b border-white/10 bg-slate-950/85 px-4 py-3 text-white backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/80">Image {selectedIndex + 1}</p>
                  <h3 className="truncate text-base font-black text-white sm:text-lg">{currentItem?.title || 'Markaz Gallery'}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={closeImage}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-white/15 sm:px-3 sm:text-sm"
                  >
                    <ChevronLeftIcon className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-white/15 sm:px-3 sm:text-sm"
                  >
                    <ShareIcon className="h-4 w-4" /> Share
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-white/15 sm:px-3 sm:text-sm"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" /> Download
                  </button>
                  <button
                    type="button"
                    onClick={closeImage}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden bg-white">
                <div className="flex flex-1 items-center justify-center bg-slate-100 px-3 py-3 sm:px-5 sm:py-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                  <img
                    src={resolveImageUrl(currentItem?.image_url)}
                    alt={currentItem?.title || 'Markaz gallery image'}
                    className="max-h-[calc(100vh-18rem)] w-auto max-w-full object-contain sm:max-h-[calc(100vh-16rem)] lg:max-h-[calc(100vh-15rem)]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 sm:px-5 sm:py-3">
                  <p className="text-sm text-slate-600">{currentItem?.caption || 'Markaz gallery image'}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToImage(selectedIndex - 1)}
                      disabled={selectedIndex <= 0}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-4 w-4" /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => goToImage(selectedIndex + 1)}
                      disabled={selectedIndex >= gallery.length - 1}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Thumbnails</p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {gallery.map((item, index) => {
                      const thumbUrl = resolveImageUrl(item.image_url);
                      const isActive = index === selectedIndex;
                      return (
                        <button
                          key={`thumb-${index}`}
                          type="button"
                          onClick={() => openImage(index)}
                          className={`flex w-24 shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition ${isActive ? 'border-[#002147] ring-2 ring-[#002147]/20' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="aspect-[4/3] bg-slate-100">
                            {thumbUrl ? <img src={thumbUrl} alt={item.title || `Thumbnail ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AboutGallery;