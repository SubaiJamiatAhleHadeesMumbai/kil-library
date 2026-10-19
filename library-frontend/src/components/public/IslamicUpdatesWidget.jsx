import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ShareIcon,
  XMarkIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
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

  const resolveText = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'object') {
      const txt = val.ur || val.ar || val.en;
      if (typeof txt === 'string' && txt.trim()) return txt.trim();
      for (const k of Object.keys(val)) {
        if (typeof val[k] === 'string' && val[k].trim()) return val[k].trim();
      }
      return fallback;
    }
    return String(val);
  };

  const handleShare = (e, item, isJumah) => {
    e.stopPropagation();
    const fallbackTitle = isJumah ? 'خطباتِ جمعہ کا شیڈول' : 'رویتِ ہلال کا اعلان';
    const title = resolveText(item.title_ur) || resolveText(item.title) || resolveText(item.title_en, fallbackTitle);
    const dateText = item.event_date ? ` [تاریخ: ${item.event_date}]` : '';
    const shareText = `📢 *${title}*${dateText}\n\nمرکز اہل حدیث کوکن کا باضابطہ شیڈول ملاحظہ فرمائیں:\n${window.location.origin}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <section className="py-4 w-full" dir="rtl">
      {/* ================= IMAGE 4: SPLIT JUMAH & MOON SIGHTING CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        
        {/* CARD 1: خطباتِ جمعہ کا شیڈول (Weekly Jumah Schedule) */}
        {jumah && (
          <div className="rounded-2xl border border-[#E6E2DD] bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
            {/* Header Pill */}
            <div className="bg-[#0F3D2E] text-white px-5 py-3 flex items-center justify-between">
              <span 
                className="text-sm sm:text-base font-extrabold flex items-center gap-2"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>🕌</span>
                <span>خطباتِ جمعہ کا شیڈول (Jumah Schedule)</span>
              </span>
              <span className="text-[11px] text-[#C5A059] font-bold tracking-wider">
                ہفتہ وار شیڈول
              </span>
            </div>

            {/* Jumah Card Body */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              
              <div className="space-y-3">
                {/* Meta Row */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#0F3D2E] text-xs font-bold">
                    <span>🕌</span>
                    <span>جامع مسجد اہل حدیث، سونس / کھڑ</span>
                  </span>
                  {jumah.event_date && (
                    <span className="text-xs text-slate-500 font-mono font-bold flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(jumah.event_date)}</span>
                    </span>
                  )}
                </div>

                {/* Jumah Title */}
                <h3 
                  className="text-base sm:text-lg font-black text-[#1E293B] leading-snug hover:text-[#0F3D2E] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  onClick={() => setActiveModalItem(jumah)}
                >
                  {resolveText(jumah.title_ur) || resolveText(jumah.title) || "خطبہ جمعہ شیڈول - ائمہ و خطباء"}
                </h3>

                {/* Poster Preview */}
                <div 
                  onClick={() => setActiveModalItem(jumah)}
                  className="w-full h-52 sm:h-60 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 relative cursor-pointer group shadow-2xs flex items-center justify-center"
                >
                  <img
                    src={resolveImageUrl(jumah.image_url)}
                    alt="Jumah Schedule Poster"
                    className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-3.5 py-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-bold shadow-md flex items-center gap-1.5">
                      <EyeIcon className="w-4 h-4 text-[#0F3D2E]" />
                      <span>مکمل شیڈول دیکھیں</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalItem(jumah)}
                    className="inline-flex items-center gap-1.5 bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    <span>مکمل شیڈول</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/juma-list")}
                    className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <span>گزشتہ شیڈول</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleShare(e, jumah, true)}
                  className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span>واٹس ایپ شیئر</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CARD 2: رویت ہلال کا باضابطہ اعلان (Moon Sighting Announcement) */}
        {moon && (
          <div className="rounded-2xl border border-[#E6E2DD] bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
            {/* Header Pill */}
            <div className="bg-[#0F3D2E] text-white px-5 py-3 flex items-center justify-between">
              <span 
                className="text-sm sm:text-base font-extrabold flex items-center gap-2"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>🌙</span>
                <span>رویتِ ہلال کا باضابطہ اعلان (Moon Sighting)</span>
              </span>
              <span className="text-[11px] text-[#C5A059] font-bold tracking-wider">
                ہجری تقویم
              </span>
            </div>

            {/* Moon Card Body */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              
              <div className="space-y-3">
                {/* Meta Row */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                    <span>🌙</span>
                    <span>{moon.hijri_month || "مرکزی رویت ہلال کمیٹی"}</span>
                  </span>
                  {moon.event_date && (
                    <span className="text-xs text-slate-500 font-mono font-bold flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(moon.event_date)}</span>
                    </span>
                  )}
                </div>

                {/* Moon Title */}
                <h3 
                  className="text-base sm:text-lg font-black text-[#1E293B] leading-snug hover:text-[#0F3D2E] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  onClick={() => setActiveModalItem(moon)}
                >
                  {resolveText(moon.title_ur) || resolveText(moon.title) || "چاند کی تاریخ اور نئے ہجری مہینے کا اعلان"}
                </h3>

                {/* Poster Preview */}
                <div 
                  onClick={() => setActiveModalItem(moon)}
                  className="w-full h-52 sm:h-60 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 relative cursor-pointer group shadow-2xs flex items-center justify-center"
                >
                  <img
                    src={resolveImageUrl(moon.image_url)}
                    alt="Moon Sighting Circular"
                    className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-3.5 py-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-bold shadow-md flex items-center gap-1.5">
                      <EyeIcon className="w-4 h-4 text-[#C5A059]" />
                      <span>سرکلر بڑا کریں</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalItem(moon)}
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    <span>سرکلر دیکھیں</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/moon")}
                    className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <span>آرکائیو دیکھیں</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleShare(e, moon, false)}
                  className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span>واٹس ایپ شیئر</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ================= FULL POSTER LIGHTBOX MODAL ================= */}
      {activeModalItem &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{ zIndex: 100000 }}
            className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setActiveModalItem(null)}
            dir="rtl"
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="absolute top-4 start-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              {/* Poster Image */}
              <div className="max-h-[75vh] flex items-center justify-center bg-black">
                <img
                  src={resolveImageUrl(activeModalItem.image_url)}
                  alt="Official Announcement Poster"
                  className="max-h-[75vh] w-auto max-w-full object-contain"
                />
              </div>

              {/* Modal Bar */}
              <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#C5A059]">
                    {activeModalItem.item_type === 'jumah' ? '🕌 خطباتِ جمعہ' : '🌙 رویتِ ہلال'}
                  </span>
                  <h4 
                    className="text-sm sm:text-base font-bold text-white"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    {resolveText(activeModalItem.title_ur) || resolveText(activeModalItem.title)}
                  </h4>
                  {activeModalItem.event_date && (
                    <p className="text-xs text-slate-400 font-mono">
                      تاریخ: {formatDate(activeModalItem.event_date)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleShare(e, activeModalItem, activeModalItem.item_type === 'jumah')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShareIcon className="w-3.5 h-3.5" />
                    <span>واٹس ایپ شیئر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModalItem(null);
                      navigate(activeModalItem.item_type === 'jumah' ? '/juma-list' : '/moon');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    صفحہ کھولیں
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
