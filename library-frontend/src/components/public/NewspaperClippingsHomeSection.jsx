import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  EyeIcon,
  ArrowRightIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/24/outline";
import newspaperService from "../../api/newspaperService";

const NewspaperClippingsHomeSection = ({ config = {} }) => {
  const [clippings, setClippings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeClipping, setActiveClipping] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const title = config?.title || "Press & Newspaper Clippings";
  const subtitle = config?.subtitle || "اخباری کٹنگز و اہم پریس ریلیز";
  const description = config?.description || "Read published reports and coverage of Markaz activities across national Urdu & English newspapers.";

  useEffect(() => {
    const loadClippings = async () => {
      try {
        setLoading(true);
        const data = await newspaperService.getPublicClippings({ limit: 4 });
        setClippings(data.items || []);
      } catch (err) {
        console.warn("Failed to load home newspaper clippings:", err);
      } finally {
        setLoading(false);
      }
    };
    loadClippings();
  }, []);

  const getClippingImages = (clipping) => {
    if (!clipping) return [];
    if (Array.isArray(clipping.images) && clipping.images.length > 0) return clipping.images;
    if (typeof clipping.images === "string") {
      try {
        const parsed = JSON.parse(clipping.images);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [clipping.image_url].filter(Boolean);
  };

  const handleShareWhatsApp = (clipping) => {
    const text = `📰 *${clipping.newspaper_name}* (${clipping.edition_date || 'Press Clipping'})\n\n*${clipping.title}*\n\nRead full clipping at:\n${window.location.origin}/clippings?id=${clipping.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const openLightbox = (clipping, idx = 0) => {
    setActiveClipping(clipping);
    setActiveImageIndex(idx);
    setZoomLevel(1);
  };

  if (!loading && clippings.length === 0) {
    return null; // Do not render empty section
  }

  return (
    <section className="py-6 px-4 max-w-7xl mx-auto font-sans">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>

        <Link
          to="/clippings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#002147] text-white font-bold text-xs hover:bg-slate-900 transition-all shadow-sm hover:shadow-md shrink-0 self-start sm:self-auto"
        >
          <span>View All</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid of Clippings */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200/80 p-4 space-y-3">
              <div className="aspect-4/3 rounded-2xl bg-slate-200" />
              <div className="h-4 bg-slate-200 rounded-md w-3/4" />
              <div className="h-3 bg-slate-100 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {clippings.map((clipping) => {
            const allImages = getClippingImages(clipping);
            return (
              <motion.div
                key={clipping.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => openLightbox(clipping)}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
              >
                {/* Image Container with Newspaper Stamp */}
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={clipping.image_url}
                    alt={clipping.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Header Strip */}
                  <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {clipping.newspaper_name}
                  </div>

                  {/* Date & Multi-page Badge */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    {clipping.edition_date && (
                      <div className="bg-white/95 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                        {clipping.edition_date}
                      </div>
                    )}
                    {allImages.length > 1 && (
                      <div className="bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <DocumentDuplicateIcon className="w-3 h-3" />
                        <span>{allImages.length} Pages</span>
                      </div>
                    )}
                  </div>

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white gap-1.5 font-bold text-xs backdrop-blur-xs">
                    <EyeIcon className="w-5 h-5" />
                    <span>Click to Zoom HD</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="inline-block bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {clipping.category || "Media Report"}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors" title={clipping.title}>
                      {clipping.title}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="text-emerald-600 font-bold group-hover:underline">Read Clipping →</span>
                    <span className="text-[11px] font-mono text-slate-400">HD Image</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ================= HD ZOOMABLE LIGHTBOX MODAL ================= */}
      <AnimatePresence>
        {activeClipping && (() => {
          const allImages = getClippingImages(activeClipping);
          const currentImg = allImages[activeImageIndex] || activeClipping.image_url;

          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md">
              <div className="fixed inset-0" onClick={() => setActiveClipping(null)} />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[95vh] z-10"
              >
                {/* Top Lightbox Bar */}
                <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-950/95 border-b border-slate-800 text-white gap-3">
                  {/* Left: Newspaper Metadata & Title */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        {activeClipping.newspaper_name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {activeClipping.edition_date || "Archive"}
                      </span>
                      {allImages.length > 1 && (
                        <span className="bg-slate-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                          Page {activeImageIndex + 1}/{allImages.length}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-200 truncate mt-1" title={activeClipping.title}>
                      {activeClipping.title}
                    </h3>
                  </div>

                  {/* Right: Clean Action Buttons (Zero Clutter) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Desktop Only Zoom Controls (Hidden on mobile) */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        title="Zoom In"
                      >
                        <MagnifyingGlassPlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        title="Zoom Out"
                      >
                        <MagnifyingGlassMinusIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setZoomLevel(1)}
                        className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-bold transition cursor-pointer"
                        title="Reset Zoom"
                      >
                        {Math.round(zoomLevel * 100)}%
                      </button>
                    </div>

                    {/* 1. Download High-Res Image */}
                    <a
                      href={currentImg}
                      download={`clipping_${activeClipping.id}_page${activeImageIndex + 1}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white transition border border-slate-700/60 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
                      title="Download Image"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Download</span>
                    </a>

                    {/* Optional PDF Download (if attached) */}
                    {activeClipping.pdf_url && (
                      <a
                        href={activeClipping.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition border border-slate-700/60 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
                        title="Open PDF Document"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </a>
                    )}

                    {/* 2. WhatsApp Share */}
                    <button
                      onClick={() => handleShareWhatsApp(activeClipping)}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
                      title="Share via WhatsApp"
                    >
                      <ShareIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* 3. Close */}
                    <button
                      onClick={() => setActiveClipping(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition border border-slate-700/60 cursor-pointer shadow-sm"
                      title="Close"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Image Container */}
                <div className="relative flex-1 overflow-auto p-4 sm:p-8 bg-black/80 flex items-center justify-center min-h-[50vh] max-h-[75vh]">
                  {allImages.length > 1 && (
                    <button
                      onClick={() => {
                        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                        setZoomLevel(1);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/80 hover:bg-emerald-600 text-white shadow-xl backdrop-blur-md transition z-20"
                    >
                      <ChevronLeftIcon className="w-6 h-6 stroke-[2.5]" />
                    </button>
                  )}

                  <div
                    className="transition-transform duration-200 cursor-grab active:cursor-grabbing origin-center"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    <img
                      src={currentImg}
                      alt={activeClipping.title}
                      className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl mx-auto"
                    />
                  </div>

                  {allImages.length > 1 && (
                    <button
                      onClick={() => {
                        setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                        setZoomLevel(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/80 hover:bg-emerald-600 text-white shadow-xl backdrop-blur-md transition z-20"
                    >
                      <ChevronRightIcon className="w-6 h-6 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Bottom Strip */}
                {allImages.length > 1 && (
                  <div className="bg-slate-950 border-t border-slate-800 p-3 flex items-center gap-2 overflow-x-auto">
                    {allImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveImageIndex(idx);
                          setZoomLevel(1);
                        }}
                        className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                          activeImageIndex === idx ? "border-emerald-500 scale-105" : "border-slate-700 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
};

export default NewspaperClippingsHomeSection;
