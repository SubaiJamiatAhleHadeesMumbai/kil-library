import React, { useState, useEffect } from "react";
import {
  QrCodeIcon,
  BuildingLibraryIcon,
  HeartIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { donationService } from "../../api/donationService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const DEFAULT_POSTER = "/uploads/donation/donation_poster.jpg";

const DonationPanel = () => {
  const [activeTab, setActiveTab] = useState("qr");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await donationService.getDonationDetails();
        setData(result);
      } catch {
        console.error("Failed to load donation info");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getImageUrl = (p) => {
    if (!p) return DEFAULT_POSTER;
    return p.startsWith("http") ? p : `${API_BASE_URL}${p}`;
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.6)]">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
          <HeartIcon className="h-4 w-4" />
          Community support
        </div>
        <h2 className="text-lg font-extrabold text-white sm:text-2xl">
          Support the Library
        </h2>
        <p className="mt-2 text-xs leading-6 text-slate-300 sm:text-[15px]">
          Your contribution helps us expand the collection, keep it accessible, and serve more readers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/5 p-2.5 sm:p-3">
        <TabButton
          active={activeTab === "qr"}
          onClick={() => setActiveTab("qr")}
          label="QR"
        />
        <TabButton
          active={activeTab === "bank"}
          onClick={() => setActiveTab("bank")}
          label="Bank"
        />
        <TabButton
          active={activeTab === "appeal"}
          onClick={() => setActiveTab("appeal")}
          label="Appeal"
        />
      </div>

      <div className="p-3 sm:p-5">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-3 shadow-inner backdrop-blur sm:p-4">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-300">
              Loading...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeTab === "qr" && (
                <PanelImage
                  desktop={data?.qr_code_desktop || DEFAULT_POSTER}
                  mobile={data?.qr_code_mobile || DEFAULT_POSTER}
                  getImageUrl={getImageUrl}
                />
              )}

              {activeTab === "bank" && (
                <div className="flex flex-col gap-4">
                  {/* Copyable Bank Card */}
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Central Bank of India (Khed Branch)
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      MARKAZ-UD-DAAWATUL ISLAMIYAH WAL KHAYRIYAH
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 border border-white/10">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Account No</p>
                          <p className="text-sm font-mono font-bold text-amber-200">3785326835</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("3785326835", "acc")}
                          className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 transition"
                          title="Copy Account Number"
                        >
                          {copiedField === "acc" ? (
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 border border-white/10">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">IFSC Code</p>
                          <p className="text-sm font-mono font-bold text-amber-200">CBIN0283345</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("CBIN0283345", "ifsc")}
                          className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 transition"
                          title="Copy IFSC Code"
                        >
                          {copiedField === "ifsc" ? (
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <PanelImage
                    desktop={data?.bank_desktop || DEFAULT_POSTER}
                    mobile={data?.bank_mobile || DEFAULT_POSTER}
                    getImageUrl={getImageUrl}
                  />
                </div>
              )}

              {activeTab === "appeal" && (
                <PanelImage
                  desktop={data?.appeal_desktop || DEFAULT_POSTER}
                  mobile={data?.appeal_mobile || DEFAULT_POSTER}
                  getImageUrl={getImageUrl}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 p-3 text-center text-xs text-slate-400">
        مرکز کی مسجد، مدرسہ اور لائبریری کی تعمیر میں تعاون کر کے عند اللہ ماجور ہوں۔
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
      active
        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
        : "border-white/10 bg-white/10 text-slate-300 hover:bg-white/15"
    }`}
  >
    {label}
  </button>
);

const PanelImage = ({ desktop, mobile, getImageUrl }) => (
  <div className="flex flex-col gap-3">
    <div className="hidden md:block text-center">
      <img
        src={getImageUrl(desktop)}
        className="mx-auto max-h-[50vh] max-w-full rounded-[1rem] border border-white/10 object-contain shadow-sm"
        alt="Support image"
      />
    </div>

    <div className="md:hidden">
      <img
        src={getImageUrl(mobile)}
        className="w-full rounded-[1rem] border border-white/10 object-contain shadow-sm"
        alt="Support image"
      />
    </div>
  </div>
);

export default DonationPanel;
