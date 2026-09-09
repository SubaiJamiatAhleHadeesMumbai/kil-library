import React from "react";
import { useLocation } from "react-router-dom";

// --- 1. HISTORY SKELETON (Used for /history page) ---
export const HistorySkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-6 font-sans">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0" />
        <div className="space-y-2">
          <div className="h-6 w-48 sm:w-64 bg-slate-200 rounded-xl" />
          <div className="h-3.5 w-60 sm:w-80 bg-slate-100 rounded-lg" />
        </div>
      </div>
      <div className="h-10 w-24 rounded-xl bg-slate-200 shrink-0" />
    </div>

    {/* Search & Filter Bar Skeleton */}
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs space-y-3">
      <div className="h-11 bg-slate-100/90 rounded-xl border border-slate-200/70" />
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="h-8 w-20 rounded-full bg-slate-200 shrink-0" />
        <div className="h-8 w-28 rounded-full bg-slate-200 shrink-0" />
        <div className="h-8 w-28 rounded-full bg-slate-200 shrink-0" />
        <div className="h-8 w-24 rounded-full bg-slate-200 shrink-0" />
      </div>
    </div>

    {/* Cards Skeleton */}
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-20 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-4 w-44 sm:w-72 bg-slate-200 rounded-lg" />
              <div className="h-3 w-32 bg-slate-100 rounded-md" />
              <div className="h-3 w-24 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="flex sm:flex-col items-end gap-2 shrink-0">
            <div className="h-7 w-24 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- 2. LIBRARY SKELETON (Used for /books page) ---
export const LibrarySkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse space-y-8 font-sans">
    {/* Hero Strip Skeleton */}
    <div className="rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 border border-slate-200/80 p-6 sm:p-10 space-y-4 text-center">
      <div className="h-7 w-56 bg-slate-300/80 rounded-xl mx-auto" />
      <div className="h-3.5 w-72 sm:w-96 bg-slate-200 rounded-lg mx-auto" />
      <div className="pt-3 max-w-xl mx-auto">
        <div className="h-12 bg-white rounded-2xl border border-slate-200 shadow-2xs" />
      </div>
    </div>

    {/* Filters and Controls Skeleton */}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-32 rounded-xl bg-slate-200" />
        <div className="h-9 w-40 rounded-xl bg-slate-200" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-9 w-20 rounded-xl bg-slate-200" />
        <div className="h-9 w-36 rounded-xl bg-slate-200" />
      </div>
    </div>

    {/* Book Cards Grid Skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-3 space-y-3 shadow-2xs"
        >
          <div className="aspect-[2/3] rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3.5 bg-slate-200 rounded-md w-4/5" />
            <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- 3. HOMEPAGE / DEFAULT SKELETON ---
export const GenericPageSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-8 font-sans">
    {/* Banner */}
    <div className="rounded-3xl bg-slate-100 border border-slate-200/80 p-8 sm:p-12 space-y-4 text-center">
      <div className="h-8 w-64 bg-slate-300/80 rounded-2xl mx-auto" />
      <div className="h-4 w-80 max-w-md bg-slate-200 rounded-lg mx-auto" />
      <div className="pt-4 max-w-xl mx-auto">
        <div className="h-12 bg-white rounded-2xl border border-slate-200 shadow-2xs" />
      </div>
    </div>

    {/* Category Pills */}
    <div className="flex items-center gap-3 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-9 w-28 bg-slate-200 rounded-full shrink-0" />
      ))}
    </div>

    {/* Content Cards */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-3 space-y-3 shadow-2xs">
          <div className="aspect-3/4 rounded-xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-3.5 bg-slate-200 rounded-md w-full" />
            <div className="h-2.5 bg-slate-100 rounded-md w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- MAIN ROUTE-AWARE SKELETON LOADER ---
const SkeletonPageLoader = () => {
  const location = useLocation();
  const path = (location?.pathname || "").toLowerCase();

  if (path.startsWith("/history")) {
    return <HistorySkeleton />;
  }

  if (path.startsWith("/books") || path.startsWith("/library")) {
    return <LibrarySkeleton />;
  }

  return <GenericPageSkeleton />;
};

export default SkeletonPageLoader;
