import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  QrCodeIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { donationService } from "../../api/donationService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const DEFAULT_POSTER = "/uploads/donation/markaz_donation_qr_2026.png";

const DonationModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("qr"); // 'qr' | 'bank' | 'appeal'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDonationData();
    }
  }, [isOpen]);

  const fetchDonationData = async () => {
    setLoading(true);
    try {
      const result = await donationService.getDonationDetails();
      setData(result);
    } catch {
      console.error("Failed to load donation info");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (p) => {
    if (!p || p.includes("donation_poster.jpg")) return DEFAULT_POSTER;
    return p.startsWith("http") ? p : `${API_BASE_URL}${p}`;
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Box */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg md:max-w-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* --- Header --- */}
        <div className="bg-[#001D3D] p-4 sm:p-5 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-xl font-serif font-bold text-white tracking-wide">
              Support Us
            </h2>
            <p className="text-xs text-[#F4A261] uppercase tracking-wider font-bold mt-0.5">
              Your Contribution Matters • مرکز میں تعاون کریں
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* --- Tabs (Navigation) --- */}
        <div className="flex p-2 bg-slate-50 border-b border-slate-100 gap-2 shrink-0">
          <TabButton
            active={activeTab === "qr"}
            onClick={() => setActiveTab("qr")}
            icon={<QrCodeIcon className="w-5 h-5" />}
            label="Scan QR"
          />
          <TabButton
            active={activeTab === "bank"}
            onClick={() => setActiveTab("bank")}
            icon={<BuildingLibraryIcon className="w-5 h-5" />}
            label="Bank Details"
          />
          <TabButton
            active={activeTab === "appeal"}
            onClick={() => setActiveTab("appeal")}
            icon={<DocumentTextIcon className="w-5 h-5" />}
            label="Appeal"
          />
        </div>

        {/* --- Content Area --- */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-50/60 min-h-[320px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-semibold">Loading donation details...</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* 1. QR CODE VIEW (With image) */}
              {activeTab === "qr" && (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white p-2">
                    <img
                      src={getImageUrl(data?.qr_code_desktop || data?.qr_code_mobile)}
                      alt="Donation QR Code"
                      className="max-h-[58vh] max-w-full rounded-xl object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium text-center">
                    Scan via Google Pay, PhonePe, Paytm or any UPI App
                  </p>
                </div>
              )}

              {/* 2. BANK DETAILS VIEW (Clean card only, NO IMAGE) */}
              {activeTab === "bank" && (
                <div className="w-full space-y-4">
                  {/* Verified Badge */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
                    <ShieldCheckIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>Official Bank Account of Markaz-ud-Daawatul Islamiyah</span>
                  </div>

                  {/* Clean Bank Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4 text-left">
                    {/* Account Holder */}
                    <div className="border-b border-slate-100 pb-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Account Holder Name
                      </p>
                      <p className="text-sm sm:text-base font-extrabold text-slate-800 mt-0.5">
                        MARKAZ-UD-DAAWATUL ISLAMIYAH WAL KHAIRIYAH
                      </p>
                    </div>

                    {/* Bank & Branch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Bank Name
                        </p>
                        <p className="text-sm font-bold text-[#002147] mt-0.5">
                          Central Bank of India
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Branch
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                          Khed Branch, Dist. Ratnagiri (Maharashtra)
                        </p>
                      </div>
                    </div>

                    {/* Account Number with 1-Click Copy */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Account Number
                        </p>
                        <p className="text-base sm:text-lg font-mono font-extrabold text-[#002147] tracking-wider mt-0.5">
                          3063920229
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("3063920229", "acc")}
                        className="px-3 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        title="Copy Account Number"
                      >
                        {copiedField === "acc" ? (
                          <>
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* IFSC Code with 1-Click Copy */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          IFSC Code
                        </p>
                        <p className="text-base sm:text-lg font-mono font-extrabold text-[#002147] tracking-wider mt-0.5">
                          CBIN0283345
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("CBIN0283345", "ifsc")}
                        className="px-3 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        title="Copy IFSC Code"
                      >
                        {copiedField === "ifsc" ? (
                          <>
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                            <span>Copied!</span>
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
              )}

              {/* 3. APPEAL VIEW (With image) */}
              {activeTab === "appeal" && (
                <div className="w-full flex flex-col items-center">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white p-2">
                    <img
                      src={getImageUrl(data?.appeal_desktop || data?.appeal_mobile)}
                      alt="Donation Appeal Poster"
                      className="max-h-[58vh] max-w-full rounded-xl object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- Footer Note --- */}
        <div className="bg-white p-3.5 text-center border-t border-slate-100 shrink-0">
          <p className="text-xs text-slate-600 font-medium leading-relaxed" dir="rtl">
            مرکز کی مسجد، مدرسہ اور لائبریری کے تعلیمی و رفاہی کاموں میں تعاون کر کے عند اللہ ماجور ہوں۔
          </p>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
      active
        ? "bg-[#001D3D] text-white border-[#001D3D] shadow-sm"
        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default DonationModal;
