import React from 'react';
import PosterManagerPanel from '../../components/admin/PosterManagerPanel';

const PosterManagementPage = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">Admin Control</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Poster Management</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">Control poster size, fit mode, caption alignment, and multilingual content from one dedicated screen.</p>
      </div>
      <PosterManagerPanel />
    </div>
  );
};

export default PosterManagementPage;