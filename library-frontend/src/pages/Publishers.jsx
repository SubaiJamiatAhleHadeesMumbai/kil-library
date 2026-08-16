import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BuildingOfficeIcon,
  BookOpenIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { bookService } from "../api/bookService";

const Publishers = () => {
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // ✅ Safe publisher normalizer (Fixes nulls, spacing, objects & case-insensitivity)
  const normalizePublisher = (publisher) => {
    if (!publisher) return null;

    if (typeof publisher === "object") {
      publisher = publisher?.name || publisher?.title || "";
    }

    const clean = String(publisher).trim();
    if (!clean) return null;

    return clean.replace(/\s+/g, " ");
  };

  useEffect(() => {
    fetchPublishers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPublishers = async () => {
    setLoading(true);
    setError(null);

    try {
      const allBooks = await bookService.getAllBooks(true);
      const list = Array.isArray(allBooks) ? allBooks : allBooks?.books || [];

      const map = new Map();

      for (const book of list) {
        const pub = normalizePublisher(book?.publisher);
        if (!pub) continue;

        const key = pub.toLowerCase();
        const prev = map.get(key);

        if (!prev) {
          map.set(key, { name: pub, count: 1 });
        } else {
          map.set(key, { ...prev, count: prev.count + 1 });
        }
      }

      const publishersList = Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setPublishers(publishersList);
    } catch (err) {
      console.error("❌ Error fetching publishers:", err);
      setError("Failed to load publishing houses. Please try again.");
      toast.error("Could not load publishers.");
      setPublishers([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Search Filter
  const filteredPublishers = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return publishers;

    return publishers.filter((p) => p.name.toLowerCase().includes(query));
  }, [publishers, q]);

  // ✅ Total Publications Count
  const totalBooks = useMemo(() => {
    return publishers.reduce((sum, p) => sum + (p.count || 0), 0);
  }, [publishers]);

  // ✅ Navigate to Books Library with preSearch
  const handlePublisherClick = (publisherName) => {
    navigate(`/books?search=${encodeURIComponent(publisherName)}`, {
      state: {
        preSearch: publisherName,
        mode: "publisher",
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 pb-16">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-[#001d3d] via-[#002147] to-[#0f4c81] text-white py-14 md:py-18">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_60%)] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-cyan-200 backdrop-blur-md mb-4">
            <BuildingLibraryIcon className="w-4 h-4 text-cyan-300" />
            Publishing Partners Directory
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Our Publishing Houses
          </h1>
          <p className="mt-3 text-cyan-50/85 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Explore catalog titles organized by the printing presses and publishing institutions that bring knowledge to light.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-xl mx-auto space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by publisher name..."
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-white focus:ring-4 focus:ring-white/10 backdrop-blur-md text-sm font-medium transition-all"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Statistics Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-cyan-100/90 pt-1">
              <span className="rounded-full bg-white/10 border border-white/15 px-3.5 py-1 backdrop-blur-md">
                Publishers: <strong className="text-white font-bold">{publishers.length}</strong>
              </span>
              <span className="rounded-full bg-white/10 border border-white/15 px-3.5 py-1 backdrop-blur-md">
                Total Publications: <strong className="text-white font-bold">{totalBooks}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-white border border-slate-200/80 animate-pulse" />
            ))}
          </div>
        ) : filteredPublishers.length > 0 ? (
          <>
            {/* Toolbar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <p className="text-sm font-semibold text-slate-600">
                Showing <strong className="text-slate-900">{filteredPublishers.length}</strong> publishers
                {q.trim() && (
                  <>
                    {" "}matching <strong className="text-[#002147]">"{q.trim()}"</strong>
                  </>
                )}
              </p>

              <button
                onClick={fetchPublishers}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition w-fit"
              >
                <ArrowPathIcon className="w-4 h-4 text-slate-500" />
                <span>Refresh Directory</span>
              </button>
            </div>

            {/* Publisher Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPublishers.map((pub, index) => (
                <motion.article
                  key={pub.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
                  onClick={() => handlePublisherClick(pub.name)}
                  className="group relative bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-cyan-300 transition-all duration-300 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Building Icon Badge */}
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:bg-cyan-700 group-hover:text-white transition-colors duration-300 shadow-2xs">
                      <BuildingOfficeIcon className="w-6 h-6" />
                    </div>

                    {/* Publisher Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg group-hover:text-cyan-700 transition-colors truncate">
                        {pub.name}
                      </h3>

                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <BookOpenIcon className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-slate-700 font-bold">{pub.count}</strong> {pub.count === 1 ? 'Publication' : 'Publications'}
                      </p>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <ArrowRightIcon className="w-5 h-5 text-slate-300 group-hover:text-cyan-700 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </motion.article>
              ))}
            </div>
          </>
        ) : (
          /* Empty Search State */
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 max-w-lg mx-auto">
            <BuildingOfficeIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-900 font-bold text-lg">
              {q.trim() ? "No matching publishers found" : "No publishers listed in catalog"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {q.trim()
                ? `We couldn't find any publisher matching "${q.trim()}".`
                : "The library catalog currently has no approved publisher records."}
            </p>

            {q.trim() && (
              <button
                onClick={() => setQ("")}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#002147] text-white font-bold text-sm shadow-md hover:bg-[#002f66] transition"
              >
                Clear Search Query
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Publishers;