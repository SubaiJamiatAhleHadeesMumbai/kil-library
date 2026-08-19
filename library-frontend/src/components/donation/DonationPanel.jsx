import React, { useState, useEffect } from "react";
import {
  QrCodeIcon,
  BuildingLibraryIcon,
  HeartIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { donationService } from "../../api/donationService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000");
const DonationPanel = () => {
  const [activeTab, setActiveTab] = useState("qr");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const getImageUrl = (p) =>
    !p ? null : p.startsWith("http") ? p : `${API_BASE_URL}${p}`;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.6)]">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
          <HeartIcon className="h-4 w-4" />
          Community support
        </div>
        <h2 className="text-xl font-extrabold text-white sm:text-2xl">
          Support the Library
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-[15px]">
          Your contribution helps us expand the collection, keep it accessible, and serve more readers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/5 p-3">
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

      <div className="p-4 sm:p-5">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-3 shadow-inner backdrop-blur sm:p-4">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-300">
              Loading…
            </div>
          ) : (
            <>
              {activeTab === "qr" && (
                <PanelImage
                  desktop={data?.qr_code_desktop}
                  mobile={data?.qr_code_mobile}
                  getImageUrl={getImageUrl}
                />
              )}
              {activeTab === "bank" && (
                <PanelImage
                  desktop={data?.bank_desktop}
                  mobile={data?.bank_mobile}
                  getImageUrl={getImageUrl}
                />
              )}
              {activeTab === "appeal" && (
                <PanelImage
                  desktop={data?.appeal_desktop}
                  mobile={data?.appeal_mobile}
                  getImageUrl={getImageUrl}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 p-3 text-center text-xs text-slate-400">
        JazakAllah Khair for your support
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
      {desktop ? (
        <img
          src={getImageUrl(desktop)}
          className="mx-auto max-h-[50vh] max-w-full rounded-[1rem] border border-white/10 object-contain shadow-sm"
          alt="Support image"
        />
      ) : (
        <NoImage />
      )}
    </div>

    <div className="md:hidden">
      {mobile ? (
        <img
          src={getImageUrl(mobile)}
          className="w-full rounded-[1rem] border border-white/10 object-contain shadow-sm"
          alt="Support image"
        />
      ) : (
        <NoImage />
      )}
    </div>
  </div>
);

const NoImage = () => (
  <div className="flex min-h-[220px] items-center justify-center rounded-[1rem] border border-dashed border-white/15 bg-slate-900/40 text-center text-sm text-slate-400">
    No image available yet.
  </div>
);

export default DonationPanel;
