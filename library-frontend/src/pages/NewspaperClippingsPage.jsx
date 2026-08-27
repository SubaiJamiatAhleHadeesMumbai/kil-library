import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  NewspaperIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingOffice2Icon,
  TagIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import newspaperService from "../api/newspaperService";

const NewspaperClippingsPage = () => {
  const [clippings, setClippings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newspapers, setNewspapers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedNewspaper, setSelectedNewspaper] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Lightbox Modal State
  const [activeClipping, setActiveClipping] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

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

  // Fetch Public Clippings
  const fetchClippings = async () => {
    try {
      setLoading(true);
      const data = await newspaperService.getPublicClippings({
        search: search.trim() || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        newspaper: selectedNewspaper !== "all" ? selectedNewspaper : undefined,
        sort: sortBy,
        page,
        limit: 24
      });
      setClippings(data.items || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error("Error fetching public clippings:", err);
      toast.error("Failed to load press clippings.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Category & Newspaper Filter Lists
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [cats, papers] = await Promise.all([
          newspaperService.getCategories(),
          newspaperService.getNewspapers()
        ]);
        setCategories(cats || []);
        setNewspapers(papers || []);
      } catch (err) {
        console.warn("Filters load error:", err);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    fetchClippings();
  }, [selectedCategory, selectedNewspaper, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchClippings();
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedNewspaper("all");
    setSortBy("newest");
    setPage(1);
  };

  // Open Lightbox
  const openLightbox = (clipping, imgIdx = 0) => {
    setActiveClipping(clipping);
    setActiveImageIndex(imgIdx);
    setZoomLevel(1);
  };

  // WhatsApp Share
  const handleShareWhatsApp = (clipping) => {
    const text = `📰 *${clipping.title}*\n_${clipping.newspaper_name} • ${clipping.edition_date || ''}_\n\nCheck out this clipping on Markaz Islamic Library: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-24">
      {/* ================= HERO SECTION ================= */}
      <div className="relative bg-[#0B1120] pt-14 pb-20 px-4 rounded-b-[3rem] shadow-2xl overflow-hidden text-center text-white">
        {/* Background glow & mesh */}
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-72 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-emerald-300 text-xs font-bold border border-white/10 backdrop-blur-md">
            <NewspaperIcon className="w-4 h-4 text-emerald-400" />
            <span>Markaz Press & Newspaper Archive</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Newspaper{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Clippings
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-urdu leading-relaxed pt-1" dir="rtl">
            مرکز اہل حدیث اور دیگر اہم علمی و سماجی خبروں، پریس بیانات اور اخباری تراشوں کا ڈیجیٹل ذخیرہ
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="pt-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl p-1.5 sm:p-2 rounded-2xl shadow-xl border border-white/20">
              <div className="pl-3 text-slate-400">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search headline, newspaper, event or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 outline-none font-medium placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setPage(1); fetchClippings(); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
          {/* Top row: Dropdown filters & Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Newspaper Filter */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <BuildingOffice2Icon className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedNewspaper}
                  onChange={(e) => { setSelectedNewspaper(e.target.value); setPage(1); }}
                  className="bg-transparent outline-none cursor-pointer max-w-[170px] truncate"
                >
                  <option value="all">📰 All Newspapers</option>
                  {newspapers.map((p, idx) => (
                    <option key={idx} value={p.name}>
                      {p.name} ({p.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  <option value="newest">✨ Newest First</option>
                  <option value="oldest">🕰️ Oldest First</option>
                  <option value="popular">🔥 Most Viewed</option>
                </select>
              </div>

              {/* Reset Button */}
              {(selectedCategory !== "all" || selectedNewspaper !== "all" || search || sortBy !== "newest") && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="text-xs font-bold text-slate-400">
              Showing {clippings.length} clipping{clippings.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Horizontal Category Pill Strip */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 py-1">
            <button
              onClick={() => { setSelectedCategory("all"); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#002147] text-white shadow-sm scale-105"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              All Categories
            </button>

            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedCategory(cat.name); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.name
                    ? "bg-emerald-600 text-white shadow-sm scale-105"
                    : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/60"
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === cat.name ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= CLIPPINGS GRID ================= */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading Press Clippings...</p>
          </div>
        ) : clippings.length === 0 ? (
          <div className="py-24 bg-white rounded-3xl border border-slate-200 text-center p-8 space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <NewspaperIcon className="w-8 h-8 stroke-1" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Newspaper Clippings Found</h3>
            <p className="text-xs text-slate-500">
              No press cuttings match your current search or category filters. Try clearing filters to view all records.
            </p>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#002147] text-white font-bold text-xs hover:bg-slate-900 transition"
            >
              <span>View All Clippings</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {clippings.map((clipping) => (
              <motion.div
                key={clipping.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
                onClick={() => openLightbox(clipping)}
              >
                {/* Image Container with Newspaper Stamp */}
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={clipping.image_url}
                    alt={clipping.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  {/* Newspaper Header Strip */}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {clipping.newspaper_name}
                  </div>

                  {/* Date & Multi-Page Badges */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    {clipping.edition_date && (
                      <div className="bg-white/95 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                        {clipping.edition_date}
                      </div>
                    )}
                    {getClippingImages(clipping).length > 1 && (
                      <div className="bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <span>🖼️ {getClippingImages(clipping).length} Pages</span>
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
                  <div className="space-y-2">
                    <span className="inline-block bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {clipping.category}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors" title={clipping.title}>
                      {clipping.title}
                    </h3>
                    {clipping.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {clipping.description}
                      </p>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="text-emerald-600 font-bold hover:underline">Read Clipping →</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareWhatsApp(clipping);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-600 transition"
                      title="Share to WhatsApp"
                    >
                      <ShareIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              disabled={page <= 1}
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 300, behavior: "smooth" }); }}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-30 hover:bg-slate-50 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-500 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: "smooth" }); }}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-30 hover:bg-slate-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ================= HD ZOOMABLE LIGHTBOX MODAL ================= */}
      <AnimatePresence>
        {activeClipping && (() => {
          const allImages = getClippingImages(activeClipping);
          const currentImg = allImages[activeImageIndex] || activeClipping.image_url;

          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md">
              {/* Backdrop */}
              <div className="fixed inset-0" onClick={() => setActiveClipping(null)} />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[95vh] z-10"
              >
                {/* Top Lightbox Bar */}
                <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 text-white">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                        {activeClipping.newspaper_name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{activeClipping.edition_date || "Archive"}</span>
                      {allImages.length > 1 && (
                        <span className="bg-slate-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">
                          Page {activeImageIndex + 1} of {allImages.length}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate mt-0.5" title={activeClipping.title}>
                      {activeClipping.title}
                    </h3>
                  </div>

                  {/* Viewer Tools */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Zoom In */}
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Zoom In"
                    >
                      <MagnifyingGlassPlusIcon className="w-5 h-5" />
                    </button>

                    {/* Zoom Out */}
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Zoom Out"
                    >
                      <MagnifyingGlassMinusIcon className="w-5 h-5" />
                    </button>

                    {/* Reset Zoom */}
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                      title="Reset Zoom"
                    >
                      100%
                    </button>

                    {/* Download Image */}
                    <a
                      href={currentImg}
                      download={`clipping_${activeClipping.id}_page${activeImageIndex + 1}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
                      title="Download High-Res Image"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </a>

                    {/* Optional PDF Download */}
                    {activeClipping.pdf_url && (
                      <a
                        href={activeClipping.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 text-xs font-bold"
                        title="Open PDF Document"
                      >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">PDF</span>
                      </a>
                    )}

                    {/* WhatsApp Share */}
                    <button
                      onClick={() => handleShareWhatsApp(activeClipping)}
                      className="p-2 rounded-xl bg-green-600 hover:bg-green-500 text-white transition"
                      title="Share via WhatsApp"
                    >
                      <ShareIcon className="w-5 h-5" />
                    </button>

                    {/* Close */}
                    <button
                      onClick={() => setActiveClipping(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition ml-2"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable / Zoomable HD Image Container with Carousel Controls */}
                <div className="relative flex-1 overflow-auto p-4 sm:p-8 bg-black/80 flex items-center justify-center min-h-[50vh] max-h-[75vh]">
                  {/* Prev Button */}
                  {allImages.length > 1 && (
                    <button
                      onClick={() => {
                        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                        setZoomLevel(1);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/80 hover:bg-emerald-600 text-white shadow-xl backdrop-blur-md transition z-20"
                      title="Previous Page"
                    >
                      <ChevronLeftIcon className="w-6 h-6 stroke-[2.5]" />
                    </button>
                  )}

                  {/* Zoomable Image */}
                  <div
                    className="transition-transform duration-200 cursor-grab active:cursor-grabbing origin-center"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    <img
                      src={currentImg}
                      alt={`${activeClipping.title} Page ${activeImageIndex + 1}`}
                      className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl mx-auto"
                    />
                  </div>

                  {/* Next Button */}
                  {allImages.length > 1 && (
                    <button
                      onClick={() => {
                        setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                        setZoomLevel(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/80 hover:bg-emerald-600 text-white shadow-xl backdrop-blur-md transition z-20"
                      title="Next Page"
                    >
                      <ChevronRightIcon className="w-6 h-6 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Bottom Thumbnail Strip & Description */}
                <div className="bg-slate-950 border-t border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Thumbnails if multi-image */}
                  {allImages.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
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

                  {/* Description */}
                  {activeClipping.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed flex-1">
                      {activeClipping.description}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default NewspaperClippingsPage;
