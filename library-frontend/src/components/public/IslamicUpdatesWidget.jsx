import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  EyeIcon,
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

const IslamicUpdatesWidget = ({ updates, config = {} }) => {
  const navigate = useNavigate();
  const [activeModalItem, setActiveModalItem] = useState(null);

  if (!updates || (!updates.jumah && !updates.moon)) return null;

  const { jumah, moon } = updates;
  const hasBoth = Boolean(jumah && moon);

  const handleShare = (e, item) => {
    e.stopPropagation();
    const isJumah = item.item_type === 'jumah';
    const title = item.title_en || item.title_ur || (isJumah ? 'Jumah Schedule' : 'Moon Sighting Announcement');
    const dateText = item.event_date ? ` [Date: ${item.event_date}]` : '';
    const shareText = `📢 *${title}*${dateText}\nView the official schedule & poster at Markaz Islamic Library:\n${window.location.origin}`;
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

  const renderCard = (item, type) => {
    const isJumah = type === 'jumah';
    const title = item.title_en || item.title_ur || (isJumah ? 'Upcoming Jumah Schedule' : 'Islamic Moon Sighting Announcement');
    const subtitle = item.caption_en || item.caption_ur || (isJumah ? 'Khutbah timings, Bayan & Musalla guidelines' : 'Official Hijri month declaration & calendar details');
    const formattedDate = formatDate(item.event_date);
    const imageUrl = resolveImageUrl(item.image_url);

    const theme = isJumah
      ? {
          cardBg: 'from-emerald-950/80 via-slate-900 to-teal-950/90',
          borderColor: 'border-emerald-500/30 hover:border-emerald-400/60',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          iconBg: 'bg-emerald-500/20 text-emerald-400',
          btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          glow: 'bg-emerald-500/10',
          tag: '🕌 Jumah Schedule',
        }
      : {
          cardBg: 'from-amber-950/80 via-slate-900 to-yellow-950/90',
          borderColor: 'border-amber-500/30 hover:border-amber-400/60',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          iconBg: 'bg-amber-500/20 text-amber-400',
          btnPrimary: 'bg-amber-600 hover:bg-amber-500 text-white',
          glow: 'bg-amber-500/10',
          tag: '🌙 Moon Announcement',
        };

    return (
      <div
        key={item.id || type}
        onClick={() => setActiveModalItem(item)}
        className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br ${theme.cardBg} ${theme.borderColor} p-5 sm:p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer flex flex-col justify-between`}
      >
        {/* Glow */}
        <div className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full ${theme.glow} blur-3xl`} />

        {/* Card Header */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${theme.badgeBg}`}>
                {theme.tag}
              </span>
              {formattedDate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90 border border-white/10 shadow-xs">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  {formattedDate}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug line-clamp-2">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Poster Visual Thumbnail - Full Size Uncropped View */}
        <div className="relative z-10 my-2 overflow-hidden rounded-2xl border border-white/10 bg-black/60 min-h-[220px] max-h-[380px] w-full flex items-center justify-center p-1">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto max-h-[370px] object-contain transition-transform duration-500 group-hover:scale-102"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-md">
              <EyeIcon className="w-3.5 h-3.5" />
              Click to View Full Poster
            </span>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="relative z-10 mt-4 flex items-center justify-between gap-2 pt-3 border-t border-white/10 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveModalItem(item);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${theme.btnPrimary}`}
            >
              <span>{isJumah ? 'View Schedule' : 'View Circular'}</span>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </button>

            {isJumah ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/juma-list');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
              >
                <span>تمام خطبات (Archive)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/moon');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-500/30 transition cursor-pointer"
              >
                <span>تمام اعلانات (Archive)</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => handleShare(e, item)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition cursor-pointer"
            title="Share via WhatsApp"
          >
            <ShareIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="relative my-2 sm:my-4">
      <div className={`grid gap-4 sm:gap-6 ${hasBoth ? 'md:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
        {jumah && renderCard(jumah, 'jumah')}
        {moon && renderCard(moon, 'moon')}
      </div>

      {/* Full Resolution Modal */}
      {activeModalItem && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                  activeModalItem.item_type === 'jumah'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {activeModalItem.item_type === 'jumah' ? '🕌 Jumah Schedule' : '🌙 Moon Announcement'}
                </span>
                {activeModalItem.event_date && (
                  <span className="text-white/90 text-xs font-semibold px-2.5 py-1 rounded-xl bg-white/10 border border-white/10">
                    📅 {formatDate(activeModalItem.event_date)}
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

            {/* Image View */}
            <div className="relative flex-1 min-h-[300px] max-h-[66vh] bg-black/60 flex items-center justify-center overflow-auto p-3">
              <img
                src={resolveImageUrl(activeModalItem.image_url)}
                alt={activeModalItem.title_en || 'Poster'}
                className="max-h-[63vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-white font-bold text-sm sm:text-base">
                  {activeModalItem.title_en || activeModalItem.title_ur || (activeModalItem.item_type === 'jumah' ? 'Jumah Schedule' : 'Moon Announcement')}
                </h4>
                {(activeModalItem.caption_en || activeModalItem.caption_ur) && (
                  <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                    {activeModalItem.caption_en || activeModalItem.caption_ur}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(resolveImageUrl(activeModalItem.image_url), activeModalItem.title_en)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleShare(e, activeModalItem)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
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
    </section>
  );
};

export default IslamicUpdatesWidget;
