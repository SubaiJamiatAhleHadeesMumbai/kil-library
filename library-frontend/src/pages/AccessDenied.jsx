import React from "react";
import { Link } from "react-router-dom";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

const AccessDenied = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-lg sm:p-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <ShieldExclamationIcon className="h-9 w-9 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Access Denied</h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          You do not have permission to view this page.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#002147] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#003366] sm:w-auto"
          >
            Go to Home
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Login with another account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
