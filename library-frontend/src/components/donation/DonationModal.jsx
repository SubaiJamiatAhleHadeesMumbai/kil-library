import React, { useState, useEffect } from 'react';
import { 
    XMarkIcon, 
    QrCodeIcon, 
    BuildingLibraryIcon, 
    DocumentTextIcon,
    DocumentDuplicateIcon,
    CheckIcon,
    DevicePhoneMobileIcon,
    ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { donationService } from '../../api/donationService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");
const DEFAULT_POSTER = "/uploads/donation/donation_poster.jpg";

const DonationModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('qr');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedField, setCopiedField] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        try {
            const result = await donationService.getDonationDetails();
            setData(result);
        } catch (error) {
            console.error("Failed to load donation info");
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (path) => {
        if (!path) return DEFAULT_POSTER;
        if (path.startsWith('http')) return path;
        return `${API_BASE_URL}${path}`;
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg md:max-w-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 max-h-[90vh]">
                
                {/* --- Header --- */}
                <div className="bg-[#001D3D] p-4 md:p-5 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-white tracking-wide">
                            Support Us
                        </h2>
                        <p className="text-xs text-[#F4A261] uppercase tracking-wider font-bold mt-1">
                            Your Contribution Matters
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* --- Tabs (Navigation) --- */}
                <div className="flex p-2 bg-gray-50 border-b border-gray-100 gap-2 shrink-0">
                    <TabButton 
                        active={activeTab === 'qr'} 
                        onClick={() => setActiveTab('qr')} 
                        icon={<QrCodeIcon className="w-5 h-5" />}
                        label="Scan QR" 
                    />
                    <TabButton 
                        active={activeTab === 'bank'} 
                        onClick={() => setActiveTab('bank')} 
                        icon={<BuildingLibraryIcon className="w-5 h-5" />}
                        label="Bank Details" 
                    />
                    <TabButton 
                        active={activeTab === 'appeal'} 
                        onClick={() => setActiveTab('appeal')} 
                        icon={<DocumentTextIcon className="w-5 h-5" />}
                        label="Appeal" 
                    />
                </div>

                {/* --- Content Area --- */}
                <div className="p-0 flex-1 overflow-y-auto bg-gray-100/50 flex flex-col items-center justify-start min-h-[300px] relative">
                    
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-10">
                            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#2D89C8] rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-medium">Loading details...</p>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center p-4">
                            
                            {/* 1. QR CODE VIEW */}
                            {activeTab === 'qr' && (
                                <div className="w-full flex flex-col items-center">
                                    <img 
                                        src={getImageUrl(data?.qr_code_desktop || data?.qr_code_mobile)} 
                                        alt="QR Code" 
                                        className="max-h-[60vh] max-w-full rounded-lg shadow-md border border-gray-200 object-contain"
                                    />
                                </div>
                            )}

                            {/* 2. BANK DETAILS VIEW */}
                            {activeTab === 'bank' && (
                                <div className="w-full flex flex-col gap-4">
                                    {/* Copyable Bank Card */}
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-left shadow-sm">
                                        <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                                            Central Bank of India (Khed Branch)
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            MARKAZ-UD-DAAWATUL ISLAMIYAH WAL KHAYRIYAH
                                        </p>

                                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-blue-100 shadow-xs">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Account No</p>
                                                    <p className="text-sm font-mono font-bold text-[#002147]">3785326835</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard("3785326835", "acc")}
                                                    className="p-1.5 rounded-md hover:bg-blue-100 text-slate-600 transition"
                                                    title="Copy Account Number"
                                                >
                                                    {copiedField === "acc" ? (
                                                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-blue-100 shadow-xs">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">IFSC Code</p>
                                                    <p className="text-sm font-mono font-bold text-[#002147]">CBIN0283345</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard("CBIN0283345", "ifsc")}
                                                    className="p-1.5 rounded-md hover:bg-blue-100 text-slate-600 transition"
                                                    title="Copy IFSC Code"
                                                >
                                                    {copiedField === "ifsc" ? (
                                                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full flex justify-center">
                                        <img 
                                            src={getImageUrl(data?.bank_desktop || data?.bank_mobile)} 
                                            alt="Bank Details Poster" 
                                            className="max-h-[50vh] max-w-full rounded-lg shadow-md border border-gray-200 object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3. APPEAL VIEW */}
                            {activeTab === 'appeal' && (
                                <div className="w-full flex flex-col items-center">
                                    <img 
                                        src={getImageUrl(data?.appeal_desktop || data?.appeal_mobile)} 
                                        alt="Appeal Poster" 
                                        className="max-h-[60vh] max-w-full rounded-lg shadow-md border border-gray-200 object-contain"
                                    />
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* --- Footer --- */}
                <div className="bg-white p-3 text-center border-t border-gray-100 shrink-0">
                    <p className="text-xs text-slate-600 font-semibold">
                        مرکز کی مسجد، مدرسہ اور لائبریری کی تعمیر میں تعاون کر کے عند اللہ ماجور ہوں۔
                    </p>
                </div>

            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all duration-200 border ${
            active 
                ? "bg-[#001D3D] text-white border-[#001D3D] shadow-md transform scale-[1.02]" 
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700"
        }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.split(" ")[0]}</span>
    </button>
);

export default DonationModal;
