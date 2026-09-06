import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PhotoIcon 
} from '@heroicons/react/24/outline';

const ImageLightbox = ({ isOpen, images = [], currentIndex = 0, onClose, onNavigate }) => {
  const currentImage = images[currentIndex] || {};
  const currentUrl = typeof currentImage === 'string' ? currentImage : currentImage?.url;
  const currentCaption = typeof currentImage === 'object' ? (currentImage?.caption || currentImage?.title) : '';

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && images.length > 1) {
      onNavigate((currentIndex - 1 + images.length) % images.length);
    }
    if (e.key === 'ArrowRight' && images.length > 1) {
      onNavigate((currentIndex + 1) % images.length);
    }
  }, [isOpen, images.length, currentIndex, onClose, onNavigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown, isOpen]);

  if (!isOpen || !images.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
        onClick={onClose}
      >
        {/* Top Controls */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-50" onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold">
            {currentIndex + 1} / {images.length}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((currentIndex - 1 + images.length) % images.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-50 cursor-pointer hidden sm:flex items-center justify-center"
            aria-label="Previous image"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}

        {/* Main Image Container */}
        <div 
          className="relative max-w-5xl max-h-[85vh] flex flex-col items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.img
            key={currentUrl}
            src={currentUrl}
            alt={currentCaption || 'Image preview'}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl select-none"
          />

          {/* Caption */}
          {currentCaption && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-6 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md text-white text-sm font-medium text-center max-w-2xl"
            >
              {currentCaption}
            </motion.div>
          )}

          {/* Thumbnail preview strip if multiple */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto max-w-full px-2 py-1 scrollbar-none">
              {images.map((img, idx) => {
                const url = typeof img === 'string' ? img : img?.url;
                return (
                  <button
                    key={idx}
                    onClick={() => onNavigate(idx)}
                    className={`relative flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      idx === currentIndex ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/20' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((currentIndex + 1) % images.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-50 cursor-pointer hidden sm:flex items-center justify-center"
            aria-label="Next image"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageLightbox;
