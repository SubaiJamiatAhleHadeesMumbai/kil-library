import React from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarDaysIcon, 
  MapPinIcon, 
  PhotoIcon, 
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

const categoryColorStyles = {
  education: { badge: 'bg-blue-50 text-blue-700 border-blue-200', accent: 'group-hover:text-blue-700' },
  activities: { badge: 'bg-amber-50 text-amber-700 border-amber-200', accent: 'group-hover:text-amber-700' },
  social_work: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', accent: 'group-hover:text-emerald-700' },
  other: { badge: 'bg-purple-50 text-purple-700 border-purple-200', accent: 'group-hover:text-purple-700' },
};

const SocialWorkCard = ({ item, onSelect }) => {
  const images = Array.isArray(item.images) && item.images.length > 0
    ? item.images
    : (item.featured_image ? [{ url: item.featured_image }] : []);

  const featuredUrl = item.featured_image || (images[0]?.url || images[0]);
  const style = categoryColorStyles[item.category] || categoryColorStyles.social_work;

  const formattedDate = item.event_date 
    ? new Date(item.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col overflow-hidden"
    >
      {/* Featured Cover / Image Banner */}
      <div 
        onClick={() => onSelect(item)}
        className="relative h-52 sm:h-56 w-full overflow-hidden bg-slate-100 cursor-pointer"
      >
        {featuredUrl ? (
          <img
            src={featuredUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
            <PhotoIcon className="w-12 h-12 stroke-1" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Photo Count Pill */}
        {images.length > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold">
            <PhotoIcon className="w-3.5 h-3.5" />
            <span>{images.length} {images.length === 1 ? 'Photo' : 'Photos'}</span>
          </div>
        )}

        {/* Date Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 text-[11px] font-bold shadow-sm">
          <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Location if exists */}
          {item.location && (
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-2">
              <MapPinIcon className="w-3.5 h-3.5" />
              <span>{item.location}</span>
            </div>
          )}

          {/* Title */}
          <h3 
            onClick={() => onSelect(item)}
            className={`text-lg font-bold text-slate-900 line-clamp-2 transition-colors cursor-pointer ${style.accent}`}
          >
            {item.title}
          </h3>

          {/* Subtitle / Excerpt */}
          <p className="mt-2 text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
            {item.subtitle || item.content || 'Click to view full details and photo gallery.'}
          </p>
        </div>

        {/* Image Preview Strip if 2 or more images */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 pt-2">
            {images.slice(0, 4).map((img, idx) => {
              const url = typeof img === 'string' ? img : img?.url;
              return (
                <div 
                  key={idx} 
                  onClick={() => onSelect(item)}
                  className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img src={url} alt="Gallery thumb" className="w-full h-full object-cover" />
                </div>
              );
            })}
            {images.length > 4 && (
              <div 
                onClick={() => onSelect(item)}
                className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-200"
              >
                +{images.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => onSelect(item)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#002147] hover:text-blue-700 transition-colors cursor-pointer group/btn"
          >
            <span>View Full Details & Photos</span>
            <ArrowRightIcon className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SocialWorkCard;
