import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  XMarkIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

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

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

const IslamicAnnouncementTicker = ({ updates, config = {} }) => {
  const [dismissed, setDismissed] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState(null);

  if (dismissed) return null;
  if (!updates || (!updates.jumah && !updates.moon)) return null;

  const { jumah, moon } = updates;

  const handleShare = (item) => {
    const isJumah = item.item_type === 'jumah';
    const title = item.title_en || item.title_ur || (isJumah ? 'Jumah Schedule' : 'Moon Sighting Announcement');
    const dateText = item.event_date ? ` [Date: ${item.event_date}]` : '';
    const shareText = `📢 *${title}*${dateText}\nCheck details at Markaz Islamic Library:\n${window.location.origin}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const downloadImage = async (url, title) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${title || 'poster'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-slate-950 to-teal-950 text-white shadow-xs border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-3 py-1.5 sm:px-6 sm:py-2 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
          {/* Slim Horizontal Alerts Strip */}
          <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar whitespace-nowrap min-w-0 flex-1 py-0.5">
            {/* Jumah Alert */}
            {jumah && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-emerald-300">🕌 Jumah:</span>
                <span className="bg-emerald-900/60 text-emerald-200 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border border-emerald-700/50">
                  {formatDate(jumah.event_date) || 'This Week'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModalItem(jumah)}
                  className="text-emerald-300 hover:text-white underline font-semibold text-[11px] sm:text-xs cursor-pointer ml-0.5"
                >
                  View Schedule
                </button>
              </div>
            )}

            {jumah && moon && <span className="text-white/30 shrink-0">•</span>}

            {/* Moon Alert */}
            {moon && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-amber-300">🌙 Chand Ailaan:</span>
                <span className="bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border border-amber-700/50">
                  {formatDate(moon.event_date) || 'Latest'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModalItem(moon)}
                  className="text-amber-300 hover:text-white underline font-semibold text-[11px] sm:text-xs cursor-pointer ml-0.5"
                >
                  View Details
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <div className="flex items-center shrink-0 pl-1">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
              className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <XMarkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal for viewing poster */}
      {activeModalItem && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  activeModalItem.item_type === 'jumah'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {activeModalItem.item_type === 'jumah' ? '🕌 Jumah Schedule' : '🌙 Moon Announcement'}
                </span>
                {activeModalItem.event_date && (
                  <span className="text-white/80 text-xs font-semibold flex items-center gap-1.5">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(activeModalItem.event_date)}</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Image */}
            <div className="relative flex-1 min-h-[280px] max-h-[65vh] bg-black/50 flex items-center justify-center overflow-auto p-2">
              <img
                src={resolveImageUrl(activeModalItem.image_url)}
                alt={activeModalItem.title_en || 'Announcement'}
                className="max-h-[62vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Footer / Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-white font-bold text-sm sm:text-base">
                  {activeModalItem.title_en || activeModalItem.title_ur || (activeModalItem.item_type === 'jumah' ? 'Jumah Schedule' : 'Moon Announcement')}
                </h4>
                {(activeModalItem.caption_en || activeModalItem.caption_ur) && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeModalItem.caption_en || activeModalItem.caption_ur}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(resolveImageUrl(activeModalItem.image_url), activeModalItem.title_en)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(activeModalItem)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Share WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default IslamicAnnouncementTicker;
