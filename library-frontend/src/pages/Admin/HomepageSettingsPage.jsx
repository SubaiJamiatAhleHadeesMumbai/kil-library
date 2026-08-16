import React from 'react';
import { Link } from 'react-router-dom';
import HomepageCustomizer from '../../components/admin/HomepageCustomizer';

const HomepageSettingsPage = () => {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
        {/* Subtle Background Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
              Admin Control Center
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Homepage Management
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Customize live homepage sections, curate visibility, and define the atmosphere of the digital library experience.
            </p>
          </div>

          {/* Header Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
            >
              <span>Preview Live Site</span>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Featured Callout Banner: Poster Studio */}
      <div className="group relative overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 p-6 sm:p-8 shadow-xs transition-all duration-300 hover:border-violet-300 hover:shadow-md">
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            {/* Visual Icon Badge */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-violet-600">Poster Studio</span>
                <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">Media Center</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Manage Media & Campaign Posters
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                Upload campaign artwork, set multilingual titles, adjust scaling, and configure rotating poster slides. Section toggles on this page control overall visibility on the public homepage.
              </p>
            </div>
          </div>

          <Link
            to="/admin/posters"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 hover:shadow-lg transition-all duration-200"
          >
            <span>Open Poster Studio</span>
            <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Main Section Customizer Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <HomepageCustomizer />
      </div>
    </div>
  );
};

export default HomepageSettingsPage;