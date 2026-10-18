import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowTopRightOnSquareIcon, MegaphoneIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

const THEMES = {
  emerald: {
    bar: 'bg-white text-slate-700 border-b border-slate-200/90 shadow-2xs',
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    link: 'text-emerald-700 hover:text-emerald-900',
    accentText: 'text-emerald-950',
    closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  },
  navy: {
    bar: 'bg-white text-slate-700 border-b border-slate-200/90 shadow-2xs',
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    link: 'text-emerald-700 hover:text-emerald-900',
    accentText: 'text-emerald-950',
    closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  },
  amber: {
    bar: 'bg-white text-slate-700 border-b border-slate-200/90 shadow-2xs',
    badge: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    link: 'text-amber-700 hover:text-amber-900',
    accentText: 'text-slate-900',
    closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  },
  rose: {
    bar: 'bg-white text-slate-700 border-b border-slate-200/90 shadow-2xs',
    badge: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    link: 'text-rose-700 hover:text-rose-900',
    accentText: 'text-slate-900',
    closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  },
};

const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  badge: 'مرکزی اعلان',
  text: 'مسجد اہل حدیث، بیت السلام کمپلیکس کھڑ میں روزانہ بعد نمازِ مغرب علمی دروس کا اہتمام۔',
  theme: 'emerald',
  is_dismissible: false,
};

const TopAnnouncementBar = ({ config = null }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const announcement = (config && config.text) ? config : DEFAULT_ANNOUNCEMENT;
  const isEnabled = announcement.enabled !== false && Boolean(announcement.text);

  useEffect(() => {
    if (!isEnabled) {
      setIsDismissed(true);
      return;
    }
    const dismissedSession = sessionStorage.getItem('kil_announcement_dismissed');
    if (dismissedSession === announcement.text) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }
  }, [isEnabled, announcement.text]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (announcement.text) {
      sessionStorage.setItem('kil_announcement_dismissed', announcement.text);
    }
  };

  if (!isEnabled || isDismissed) return null;

  const themeStyle = THEMES[announcement.theme] || THEMES.emerald;
  const isExternalLink = announcement.link && (announcement.link.startsWith('http://') || announcement.link.startsWith('https://'));

  const resolveText = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'object') {
      const preferred = val.en || val.ur || val.ar;
      if (typeof preferred === 'string' && preferred.trim()) return preferred.trim();
      for (const k of Object.keys(val)) {
        if (typeof val[k] === 'string' && val[k].trim()) return val[k].trim();
      }
      return fallback;
    }
    return String(val);
  };

  const badgeText = resolveText(announcement.badge);
  const mainText = resolveText(announcement.text);
  const transText = resolveText(announcement.translation);

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Top Announcement"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={`relative z-50 w-full overflow-hidden text-xs ${themeStyle.bar}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-1.5 sm:px-6">
          
          {/* CENTER / CONTENT */}
          <div className="flex flex-1 items-center justify-center gap-2 text-center min-w-0 pr-6 pl-2 sm:px-0">
            {/* Tag Badge */}
            {badgeText && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${themeStyle.badge}`}>
                <MegaphoneIcon className="w-3 h-3 text-amber-400" />
                <span>{badgeText}</span>
              </span>
            )}

            {/* Arabic / Main Message */}
            <span dir="rtl" className="font-serif font-bold text-sm sm:text-base text-emerald-950 truncate">
              {mainText}
            </span>

            {/* Translation / Sub-text */}
            {transText && (
              <span className="hidden md:inline font-sans text-xs text-slate-600 truncate max-w-md">
                — ”{transText}“
              </span>
            )}

            {/* Optional Action Link */}
            {announcement.link && (
              isExternalLink ? (
                <a
                  href={announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 font-bold underline text-[11px] shrink-0 ml-1.5 ${themeStyle.link}`}
                >
                  <span>Learn more</span>
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </a>
              ) : (
                <Link
                  to={announcement.link}
                  className={`inline-flex items-center gap-1 font-bold underline text-[11px] shrink-0 ml-1.5 ${themeStyle.link}`}
                >
                  <span>Explore</span>
                </Link>
              )
            )}
          </div>

          {/* RIGHT: Dismiss Button */}
          {announcement.is_dismissible !== false && (
            <button
              type="button"
              onClick={handleDismiss}
              className={`p-1 rounded-lg transition cursor-pointer shrink-0 ml-2 ${themeStyle.closeBtn}`}
              title="Dismiss announcement"
              aria-label="Dismiss banner"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export default TopAnnouncementBar;
