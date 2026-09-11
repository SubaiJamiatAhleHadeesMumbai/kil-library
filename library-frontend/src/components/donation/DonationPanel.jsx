import React, { useState, useEffect } from "react";
import {
  BuildingLibraryIcon,
  HeartIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ShieldCheckIcon,
  QrCodeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { donationService } from "../../api/donationService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const DEFAULT_POSTER = "/uploads/donation/markaz_donation_qr_2026.png";

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
    if (!p || p.includes("donation_poster.jpg")) return DEFAULT_POSTER;
    return p.startsWith("http") ? p : `${API_BASE_URL}${p}`;
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const bankDetails = {
    bankName: "Central Bank of India",
    branch: "Khed Branch, Dist. Ratnagiri (Maharashtra)",
    accountHolder: "MARKAZ-UD-DAAWATUL ISLAMIYAH WAL KHAIRIYAH",
    accountNumber: "3063920229",
    ifscCode: "CBIN0283345",
    accountType: "Current Account",
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850 text-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.6)]">
      {/* Header */}
      <div className="border-b border-white/10 p-5 sm:p-6 text-center sm:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
          <HeartIcon className="h-4 w-4" />
          Community support
        </div>
        <h2 className="text-xl font-black text-white sm:text-2xl">
          Support the Library & Markaz
        </h2>
        <p className="mt-2 text-xs leading-6 text-slate-300 sm:text-sm" dir="rtl">
          مرکز کے دعوتی، تعلیمی اور رفاہی کاموں میں تعاون کر کے عند اللہ ماجور ہوں۔
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/5 p-3">
        <TabButton
          active={activeTab === "qr"}
          onClick={() => setActiveTab("qr")}
          icon={<QrCodeIcon className="w-4 h-4" />}
          label="QR Code"
        />
        <TabButton
          active={activeTab === "bank"}
          onClick={() => setActiveTab("bank")}
          icon={<BuildingLibraryIcon className="w-4 h-4" />}
          label="Bank Details"
        />
        <TabButton
          active={activeTab === "appeal"}
          onClick={() => setActiveTab("appeal")}
          icon={<DocumentTextIcon className="w-4 h-4" />}
          label="Appeal"
        />
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 flex justify-center">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-400">
            Loading donation info...
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            {/* 1. QR CODE VIEW (With image) */}
            {activeTab === "qr" && (
              <PanelImage
                desktop={data?.qr_code_desktop || DEFAULT_POSTER}
                mobile={data?.qr_code_mobile || DEFAULT_POSTER}
                getImageUrl={getImageUrl}
              />
            )}

            {/* 2. BANK DETAILS VIEW (Clean card only, NO IMAGE) */}
            {activeTab === "bank" && (
              <div className="space-y-4">
                {/* Verified Notice */}
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <ShieldCheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold">
                    Official Bank Account of Markaz-ud-Daawatul Islamiyah Wal Khairiyah
                  </span>
                </div>

                {/* Bank Card */}
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 sm:p-5 text-left shadow-lg space-y-4">
                  <div className="border-b border-white/10 pb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Account Holder Name
                    </p>
                    <p className="mt-1 text-base sm:text-lg font-black text-white leading-tight">
                      {bankDetails.accountHolder}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                        Bank Name
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-white flex items-center gap-1.5">
                        <BuildingLibraryIcon className="w-4 h-4 text-amber-400" />
                        {bankDetails.bankName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                        Branch
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-200">
                        {bankDetails.branch}
                      </p>
                    </div>
                  </div>

                  {/* Account Number & IFSC Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Account Number */}
                    <div className="flex items-center justify-between rounded-xl bg-black/50 px-4 py-3 border border-white/10">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Account Number
                        </p>
                        <p className="text-base sm:text-lg font-mono font-bold text-amber-300 mt-0.5">
                          {bankDetails.accountNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bankDetails.accountNumber, "acc")}
                        className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                        title="Copy Account Number"
                      >
                        {copiedField === "acc" ? (
                          <>
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* IFSC Code */}
                    <div className="flex items-center justify-between rounded-xl bg-black/50 px-4 py-3 border border-white/10">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          IFSC Code
                        </p>
                        <p className="text-base sm:text-lg font-mono font-bold text-amber-300 mt-0.5">
                          {bankDetails.ifscCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bankDetails.ifscCode, "ifsc")}
                        className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                        title="Copy IFSC Code"
                      >
                        {copiedField === "ifsc" ? (
                          <>
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. APPEAL VIEW (With image) */}
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

      {/* Footer */}
      <div className="border-t border-white/10 p-4 text-center text-xs text-slate-400" dir="rtl">
        مرکز کی مسجد، مدرسہ اور لائبریری کی تعمیر میں تعاون کر کے عند اللہ ماجور ہوں۔
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
      active
        ? "border-amber-400/40 bg-amber-500/20 text-amber-200 shadow-sm"
        : "border-white/10 bg-white/10 text-slate-300 hover:bg-white/15"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const PanelImage = ({ desktop, mobile, getImageUrl }) => (
  <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl flex items-center justify-center">
    <img
      src={getImageUrl(desktop || mobile)}
      className="w-full h-auto object-cover rounded-2xl block"
      alt="Donation Poster"
      loading="eager"
    />
  </div>
);

export default DonationPanel;
