import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  CalendarDaysIcon, 
  MapPinIcon, 
  UserCircleIcon,
  TagIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import ImageLightbox from '../common/ImageLightbox';

const categoryLabels = {
  education: { name: 'Education & Taleem', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  activities: { name: 'Activities & Events', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  social_work: { name: 'Social Work & Welfare', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  other: { name: 'Other Activities', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const SocialWorkItemDetailModal = ({ isOpen, item, onClose }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  if (!isOpen || !item) return null;

  const imagesList = Array.isArray(item.images) && item.images.length > 0 
    ? item.images 
    : (item.featured_image ? [{ url: item.featured_image, caption: item.title }] : []);

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
      <AnimatePresence>
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
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
                  <div className="flex items-center gap-1.5">
                    <UserCircleIcon className="w-4 h-4 text-slate-400" />
                    <span>{item.author_name || 'Markaz Admin'}</span>
                  </div>
                </div>
              </div>

              {/* Gallery Section */}
              {imagesList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PhotoIcon className="w-4 h-4 text-blue-600" />
                      Photo Gallery ({imagesList.length} Photos)
                    </h3>
                    <button
                      onClick={() => openLightbox(activeGalleryIndex)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      View Fullscreen
                    </button>
                  </div>

                  {/* Main Active Image with Click to Zoom */}
                  <div 
                    onClick={() => openLightbox(activeGalleryIndex)}
                    className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 group cursor-pointer border border-slate-200/80 shadow-sm"
                  >
                    <img 
                      src={typeof imagesList[activeGalleryIndex] === 'string' ? imagesList[activeGalleryIndex] : imagesList[activeGalleryIndex]?.url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <p className="text-white text-xs font-semibold">Click to expand fullscreen</p>
                    </div>

                    {/* Left / Right arrow overlay for active image */}
                    {imagesList.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGalleryIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"
                        >
                          <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGalleryIndex((prev) => (prev + 1) % imagesList.length);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"
                        >
                          <ChevronRightIcon className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Caption for active image */}
                  {typeof imagesList[activeGalleryIndex] === 'object' && imagesList[activeGalleryIndex]?.caption && (
                    <p className="text-xs text-slate-500 italic px-1">
                      {imagesList[activeGalleryIndex].caption}
                    </p>
                  )}

                  {/* Thumbnails row */}
                  {imagesList.length > 1 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                      {imagesList.map((img, idx) => {
                        const url = typeof img === 'string' ? img : img?.url;
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveGalleryIndex(idx)}
                            className={`relative h-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              idx === activeGalleryIndex 
                                ? 'border-blue-600 ring-2 ring-blue-100 scale-102' 
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}
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
          </motion.div>
        </div>
      </AnimatePresence>

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
