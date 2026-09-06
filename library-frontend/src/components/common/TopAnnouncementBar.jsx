import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowTopRightOnSquareIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

const THEMES = {
  emerald: {
    bar: 'bg-emerald-950 text-emerald-100 border-b border-emerald-800/60 shadow-xs',
    badge: 'bg-emerald-800/90 text-emerald-200 border border-emerald-600/50',
    link: 'text-emerald-300 hover:text-white',
    accentText: 'text-emerald-300',
    closeBtn: 'text-emerald-400 hover:text-white hover:bg-emerald-800/50',
  },
  navy: {
    bar: 'bg-[#001428] text-cyan-100 border-b border-cyan-900/60 shadow-xs',
    badge: 'bg-blue-900/90 text-cyan-200 border border-blue-600/50',
    link: 'text-cyan-300 hover:text-white',
    accentText: 'text-cyan-300',
    closeBtn: 'text-cyan-400 hover:text-white hover:bg-blue-800/50',
  },
  amber: {
    bar: 'bg-amber-950 text-amber-100 border-b border-amber-800/60 shadow-xs',
    badge: 'bg-amber-900/90 text-amber-200 border border-amber-600/50',
    link: 'text-amber-300 hover:text-white',
    accentText: 'text-amber-300',
    closeBtn: 'text-amber-400 hover:text-white hover:bg-amber-800/50',
  },
  rose: {
    bar: 'bg-rose-950 text-rose-100 border-b border-rose-800/60 shadow-xs',
    badge: 'bg-rose-900/90 text-rose-200 border border-rose-600/50',
    link: 'text-rose-300 hover:text-white',
    accentText: 'text-rose-300',
    closeBtn: 'text-rose-400 hover:text-white hover:bg-rose-800/50',
  },
};

const TopAnnouncementBar = ({ config = null }) => {
  const [isDismissed, setIsDismissed] = useState(true);

  const announcement = config || {};
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
            {announcement.badge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${themeStyle.badge}`}>
                <SparklesIcon className="w-3 h-3 text-amber-400" />
                <span>{announcement.badge}</span>
              </span>
            )}

            {/* Arabic / Main Message */}
            <span dir="rtl" className="font-serif font-semibold text-sm sm:text-sm truncate drop-shadow-2xs">
              {announcement.text}
            </span>

            {/* Translation / Sub-text */}
            {announcement.translation && (
              <span className="hidden md:inline font-sans text-xs opacity-80 italic truncate max-w-md">
                — "{announcement.translation}"
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
