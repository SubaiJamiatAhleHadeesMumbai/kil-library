import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

// Trilingual messages for the reader loader
const MESSAGES = {
  en: {
    title: 'Preparing Document Pages...',
    subtitle: 'Optimizing high-resolution rendering for smooth reading',
    page: 'Page',
  },
  ur: {
    title: 'کتاب کے صفحات تیار ہو رہے ہیں...',
    subtitle: 'بہترین کوالٹی اور تیز رفتار مطالعہ کے لیے صفحات ترتیب دیے جا رہے ہیں',
    page: 'صفحہ',
  },
  ar: {
    title: 'جارٍ تجهيز صفحات الكتاب...',
    subtitle: 'تحسين العرض فائق الدقة لتجربة قراءة سلسة ومريحة',
    page: 'صفحة',
  },
};

/**
 * Animated Flipping Book Component (Option 2)
 * High-performance, pure CSS 3D keyframe animated book with flipping pages.
 */
export const FlippingBook = ({ size = 'default' }) => {
  const isCompact = size === 'compact';
  const scaleClass = isCompact ? 'scale-75' : 'scale-100';

  return (
    <div className={`relative flex items-center justify-center ${scaleClass} select-none py-2`}>
      <style>{`
        @keyframes kilBookPageFlip1 {
          0%, 15% { transform: rotateY(0deg); }
          50%, 100% { transform: rotateY(-180deg); }
        }
        @keyframes kilBookPageFlip2 {
          0%, 35% { transform: rotateY(0deg); }
          70%, 100% { transform: rotateY(-180deg); }
        }
        @keyframes kilBookPageFlip3 {
          0%, 55% { transform: rotateY(0deg); }
          90%, 100% { transform: rotateY(-180deg); }
        }
        @keyframes kilShimmerMove {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .kil-page-1 {
          animation: kilBookPageFlip1 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: left center;
        }
        .kil-page-2 {
          animation: kilBookPageFlip2 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: left center;
        }
        .kil-page-3 {
          animation: kilBookPageFlip3 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: left center;
        }
      `}</style>

      <div className="relative w-28 h-20 perspective-[800px]">
        {/* Soft shadow under book */}
        <div className="absolute -bottom-2 left-2 right-2 h-3 bg-slate-900/10 rounded-full blur-md" />

        {/* Book Hardcover Base */}
        <div className="absolute inset-0 flex">
          {/* Left Cover */}
          <div className="w-1/2 h-full bg-[#002147] rounded-l-md border-r border-[#001733] shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />
            <div className="absolute top-1 bottom-1 right-1.5 w-1 bg-amber-400/70 rounded-full" />
            {/* Left page sheets stack */}
            <div className="absolute top-1 bottom-1 left-2 right-2 bg-[#fbf9f4] rounded-l-[3px] p-2 flex flex-col justify-around border-l border-slate-200">
              <div className="h-1 bg-slate-200/90 rounded w-full" />
              <div className="h-1 bg-slate-200/80 rounded w-4/5" />
              <div className="h-1 bg-slate-200/80 rounded w-full" />
              <div className="h-1 bg-slate-200/70 rounded w-3/4" />
            </div>
          </div>

          {/* Right Cover */}
          <div className="w-1/2 h-full bg-[#002147] rounded-r-md border-l border-[#001733] shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-black/10" />
            <div className="absolute top-1 bottom-1 left-1.5 w-1 bg-amber-400/70 rounded-full" />
            {/* Right page sheets stack */}
            <div className="absolute top-1 bottom-1 left-2 right-2 bg-[#fbf9f4] rounded-r-[3px] p-2 flex flex-col justify-around border-r border-slate-200">
              <div className="h-1 bg-slate-200/90 rounded w-full" />
              <div className="h-1 bg-slate-200/80 rounded w-5/6" />
              <div className="h-1 bg-slate-200/80 rounded w-full" />
              <div className="h-1 bg-slate-200/70 rounded w-2/3" />
            </div>
          </div>
        </div>

        {/* Center Spine */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-2.5 bg-gradient-to-r from-[#001937] via-[#002f63] to-[#001937] z-20 shadow-inner rounded-sm" />

        {/* Golden Bookmark Ribbon */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-amber-500 rounded-b-xs z-30 shadow-xs" />

        {/* 3 Flipping Pages from right to left */}
        <div className="absolute top-1 bottom-1 right-2 w-[calc(50%-8px)] pointer-events-none z-10 [transform-style:preserve-3d]">
          {/* Flipping Page 1 */}
          <div className="kil-page-1 absolute inset-0 bg-gradient-to-l from-[#faf8f2] to-[#ede8db] rounded-r-[2px] border-r border-slate-300 p-1.5 flex flex-col justify-around shadow-sm [backface-visibility:hidden]">
            <div className="h-1 bg-slate-300 rounded w-full" />
            <div className="h-1 bg-slate-300/80 rounded w-4/5" />
            <div className="h-1 bg-slate-300/80 rounded w-full" />
          </div>

          {/* Flipping Page 2 */}
          <div className="kil-page-2 absolute inset-0 bg-gradient-to-l from-[#faf8f2] to-[#ede8db] rounded-r-[2px] border-r border-slate-300 p-1.5 flex flex-col justify-around shadow-sm [backface-visibility:hidden]">
            <div className="h-1 bg-slate-300 rounded w-5/6" />
            <div className="h-1 bg-slate-300/80 rounded w-full" />
            <div className="h-1 bg-slate-300/70 rounded w-3/4" />
          </div>

          {/* Flipping Page 3 */}
          <div className="kil-page-3 absolute inset-0 bg-gradient-to-l from-[#faf8f2] to-[#ede8db] rounded-r-[2px] border-r border-slate-300 p-1.5 flex flex-col justify-around shadow-sm [backface-visibility:hidden]">
            <div className="h-1 bg-slate-300 rounded w-full" />
            <div className="h-1 bg-slate-300/80 rounded w-3/4" />
            <div className="h-1 bg-slate-300/80 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Single Page Shimmer Skeleton
 * Used while individual pages render in scroll / single view
 */
export const SinglePageSkeleton = ({ scale = 1.0, pageNumber = 1 }) => (
  <div
    style={{
      width: Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.92 : 600, 700 * scale),
      minHeight: Math.min(typeof window !== 'undefined' ? window.innerHeight * 0.85 : 850, 950 * scale),
    }}
    className="bg-white rounded-xs shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/90 relative p-6 sm:p-10 flex flex-col justify-between overflow-hidden animate-pulse select-none my-2"
  >
    {/* Page spine subtle fold */}
    <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-slate-200/50 to-transparent pointer-events-none" />

    {/* Header line */}
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div className="h-2.5 w-24 bg-slate-200 rounded" />
      <div className="h-2.5 w-12 bg-slate-100 rounded" />
    </div>

    {/* Body text skeleton rows */}
    <div className="space-y-4 py-6 flex-1">
      <div className="h-4 w-2/5 bg-slate-200/90 rounded mb-6" />
      <div className="space-y-2.5">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-11/12" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-4/5" />
      </div>

      <div className="h-px bg-slate-100 w-1/3 mx-auto my-6" />

      <div className="space-y-2.5">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
        <div className="h-3 bg-slate-100 rounded w-3/4" />
      </div>
    </div>

    {/* Footer page number */}
    <div className="pt-4 border-t border-slate-100 flex justify-center">
      <div className="h-2.5 w-8 bg-slate-200 rounded" />
    </div>
  </div>
);

/**
 * Main Combined Loader (Option 1: Book Page Skeleton + Option 2: Animated Flipping Book)
 * Displays while the entire PDF document initializes.
 */
const BookReaderLoader = () => {
  const { currentLang = 'en', isRTL = false } = useLanguage?.() || {};
  const langKey = ['en', 'ur', 'ar'].includes(currentLang) ? currentLang : 'en';
  const t = MESSAGES[langKey] || MESSAGES.en;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full flex items-center justify-center px-4 py-8 sm:py-12"
    >
      {/* Real Book Page Canvas (Option 1) */}
      <div className="w-full max-w-[440px] sm:max-w-[540px] min-h-[540px] sm:min-h-[620px] bg-white rounded-md shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-200/90 relative p-6 sm:p-10 flex flex-col justify-between overflow-hidden select-none transition-all">
        
        {/* Left Book Spine Gutter Gradient */}
        <div className="absolute top-0 bottom-0 left-0 w-5 bg-gradient-to-r from-slate-200/60 via-slate-100/30 to-transparent pointer-events-none" />

        {/* Right Page Edge Subtle Contour */}
        <div className="absolute top-0 bottom-0 right-0 w-2 bg-gradient-to-l from-slate-200/40 to-transparent pointer-events-none" />

        {/* Top Header Skeleton */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-ping" />
            <div className="h-2.5 w-28 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-2.5 w-12 bg-slate-100 rounded" />
        </div>

        {/* Upper Paragraph Shimmer Skeleton */}
        <div className="space-y-2.5 my-4 opacity-75">
          <div className="h-2.5 bg-slate-100 rounded w-full animate-pulse" />
          <div className="h-2.5 bg-slate-100 rounded w-11/12 animate-pulse" />
          <div className="h-2.5 bg-slate-100 rounded w-4/5 animate-pulse" />
        </div>

        {/* CENTERPIECE: Animated Flipping Book & Trilingual Message (Option 2) */}
        <div className="my-auto py-6 flex flex-col items-center justify-center text-center relative z-10">
          {/* 3D Animated Flipping Book */}
          <div className="mb-4">
            <FlippingBook />
          </div>

          {/* Main Title Badge */}
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight leading-snug">
            {t.title}
          </h3>

          {/* Subtitle */}
          <p className="text-xs text-slate-400 font-medium max-w-xs sm:max-w-sm mt-1.5 leading-relaxed">
            {t.subtitle}
          </p>

          {/* Sleek Animated Progress Bar */}
          <div className="w-48 sm:w-56 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#002147] to-transparent w-full animate-[kilShimmerMove_1.8s_infinite]" />
          </div>
        </div>

        {/* Lower Paragraph Shimmer Skeleton */}
        <div className="space-y-2.5 my-4 opacity-75">
          <div className="h-2.5 bg-slate-100 rounded w-full animate-pulse" />
          <div className="h-2.5 bg-slate-100 rounded w-5/6 animate-pulse" />
          <div className="h-2.5 bg-slate-100 rounded w-3/4 animate-pulse" />
        </div>

        {/* Bottom Page Number Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 relative z-10">
          <span className="text-[11px] font-semibold text-slate-400">
            — {t.page} 1 —
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookReaderLoader;
