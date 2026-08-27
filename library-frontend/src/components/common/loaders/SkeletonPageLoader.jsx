import React from "react";

const SkeletonPageLoader = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 animate-pulse">
      {/* Skeleton Top Navbar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="space-y-1.5 hidden sm:block">
              <div className="w-32 h-3.5 bg-slate-200 rounded-md" />
              <div className="w-20 h-2.5 bg-slate-100 rounded-md" />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="w-16 h-4 bg-slate-200 rounded-md" />
            <div className="w-16 h-4 bg-slate-200 rounded-md" />
            <div className="w-16 h-4 bg-slate-200 rounded-md" />
            <div className="w-16 h-4 bg-slate-200 rounded-md" />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-16 h-8 rounded-full bg-slate-200" />
            <div className="w-24 h-8 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>

      {/* Skeleton Hero Banner */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="rounded-3xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 p-8 sm:p-12 space-y-4 text-center">
          <div className="w-36 h-6 bg-slate-300/80 rounded-full mx-auto" />
          <div className="w-3/4 max-w-xl h-10 bg-slate-300 rounded-2xl mx-auto" />
          <div className="w-1/2 max-w-md h-4 bg-slate-300/60 rounded-md mx-auto" />

          {/* Search Box Skeleton */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="h-14 bg-white/90 rounded-2xl shadow-sm border border-slate-200 flex items-center px-4">
              <div className="w-6 h-6 bg-slate-200 rounded-full mr-3" />
              <div className="w-48 h-4 bg-slate-200 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton Category Pills */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 w-28 bg-slate-200 rounded-full shrink-0" />
          ))}
        </div>
      </div>

      {/* Skeleton Book Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
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
    </div>
  );
};

export default SkeletonPageLoader;
