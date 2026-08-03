import React from 'react';
import { Link } from 'react-router-dom';
import HomepageCustomizer from '../../components/admin/HomepageCustomizer';

const HomepageSettingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Admin Control</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Homepage Management</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">Control what visitors see on the homepage, decide what remains visible, and shape the atmosphere of the library experience.</p>
      </div>

      <div className="rounded-[2rem] border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">Poster Studio</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Manage poster content separately</h2>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">Use the dedicated poster screen for uploads, multilingual content, image sizing, and rotating media campaigns. Section visibility only controls whether posters appear on the public homepage.</p>
          </div>
          <Link
            to="/admin/posters"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Open Poster Studio
          </Link>
        </div>
      </div>

      <HomepageCustomizer />
    </div>
  );
};

export default HomepageSettingsPage;
