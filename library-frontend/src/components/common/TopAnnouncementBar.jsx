import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowTopRightOnSquareIcon, MegaphoneIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

const THEMES = {
  emerald: {
    bar: 'bg-[#0A2A20] text-[#F3E5C8] border-b border-[#C5A059]/20 shadow-xs',
    badge: 'bg-[#C5A059] text-[#0F3D2E] border border-[#C5A059]/40',
    link: 'text-[#C5A059] hover:text-white',
    accentText: 'text-[#F3E5C8]',
    subText: 'text-[#C5A059]/80',
    closeBtn: 'text-white/60 hover:text-white hover:bg-white/10',
  },
  navy: {
    bar: 'bg-[#0A2A20] text-[#F3E5C8] border-b border-[#C5A059]/20 shadow-xs',
    badge: 'bg-[#C5A059] text-[#0F3D2E] border border-[#C5A059]/40',
    link: 'text-[#C5A059] hover:text-white',
    accentText: 'text-[#F3E5C8]',
    subText: 'text-[#C5A059]/80',
    closeBtn: 'text-white/60 hover:text-white hover:bg-white/10',
  },
  amber: {
    bar: 'bg-[#1e1a0e] text-[#F3E5C8] border-b border-amber-500/30 shadow-xs',
    badge: 'bg-amber-400 text-slate-950 border border-amber-300',
    link: 'text-amber-300 hover:text-white',
    accentText: 'text-[#F3E5C8]',
    subText: 'text-amber-200/80',
    closeBtn: 'text-white/60 hover:text-white hover:bg-white/10',
  },
  rose: {
    bar: 'bg-[#200b0e] text-[#F3E5C8] border-b border-rose-500/30 shadow-xs',
    badge: 'bg-rose-500 text-white border border-rose-400',
    link: 'text-rose-300 hover:text-white',
    accentText: 'text-[#F3E5C8]',
    subText: 'text-rose-200/80',
    closeBtn: 'text-white/60 hover:text-white hover:bg-white/10',
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
            <span dir="rtl" className={`font-serif font-bold text-sm sm:text-base ${themeStyle.accentText} truncate`}>
              {mainText}
            </span>

            {/* Translation / Sub-text */}
            {transText && (
              <span className={`hidden md:inline font-sans text-xs ${themeStyle.subText || 'text-slate-300'} truncate max-w-md`}>
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
