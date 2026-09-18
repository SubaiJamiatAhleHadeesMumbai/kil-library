import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  CalendarDaysIcon, 
  MapPinIcon, 
  TagIcon,
} from '@heroicons/react/24/outline';
import ImageLightbox from '../common/ImageLightbox';

const categoryLabels = {
  education: { name: 'Education & Taleem', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  activities: { name: 'Activities & Events', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  social_work: { name: 'Social Work & Welfare', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  other: { name: 'Other Activities', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const resolveImageUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const path = String(value);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const SocialWorkItemDetailModal = ({ isOpen, item, onClose }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!isOpen || !item) return null;

  const rawImages = Array.isArray(item.images) && item.images.length > 0 
    ? item.images 
    : (item.featured_image ? [{ url: item.featured_image, caption: item.title }] : []);

  const imagesList = rawImages.map((img) => {
    if (typeof img === 'string') {
      return resolveImageUrl(img);
    }
    return {
      ...img,
      url: resolveImageUrl(img?.url),
    };
  });

  const categoryInfo = categoryLabels[item.category] || categoryLabels.social_work;

  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const formattedDate = item.event_date 
    ? new Date(item.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <div
              style={{ zIndex: 100000 }}
              className="fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            >
              <div
                className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col"
              >
            {/* Header Sticky */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${categoryInfo.badgeClass}`}>
                  {categoryInfo.name}
                </span>
                {item.tags && (
                  <span className="hidden sm:inline-flex text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {item.tags}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
              
              {/* Title & Metadata */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#002147] tracking-tight leading-snug">
                  {item.title}
                </h2>
                {item.subtitle && (
                  <p className="mt-2 text-base text-slate-600 font-medium">
                    {item.subtitle}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                    <span>{formattedDate}</span>
                  </div>
                  {item.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPinIcon className="w-4 h-4 text-slate-400" />
                      <span>{item.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded images: horizontal scroll only, without gallery labels */}
              {imagesList.length > 0 && (
                <div className="-mx-1 overflow-x-auto scroll-smooth px-1 pb-2 scrollbar-thin snap-x snap-mandatory touch-pan-x">
                  <div className="flex w-max gap-3">
                    {imagesList.map((img, idx) => {
                      const url = typeof img === 'string' ? img : img?.url;
                      return (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => openLightbox(idx)}
                          className="h-48 w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm cursor-pointer"
                          aria-label={`Open image ${idx + 1}`}
                        >
                          <img
                            src={url}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Formatted Content */}
              {item.content && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Details & Overview</h3>
                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                    {item.content}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#002147] hover:bg-blue-900 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </AnimatePresence>,
      document.body
    )}

      {/* Lightbox for full-size viewing */}
      <ImageLightbox
        isOpen={lightboxOpen}
        images={imagesList}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </>
  );
};

export default SocialWorkItemDetailModal;
