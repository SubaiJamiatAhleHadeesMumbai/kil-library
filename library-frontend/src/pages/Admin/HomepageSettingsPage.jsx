import React from 'react';
import HomepageCustomizer from '../../components/admin/HomepageCustomizer';

const HomepageSettingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Admin Control</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Homepage Management</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">Control what visitors see on the homepage, decide what remains visible, and shape the atmosphere of the library experience.</p>
      </div>
      <HomepageCustomizer />
    </div>
  );
};

export default HomepageSettingsPage;
