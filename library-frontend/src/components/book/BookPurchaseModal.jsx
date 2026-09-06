import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BookOpenIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { bookOrderService } from '../../api/bookOrderService';

const BookPurchaseModal = ({ book, pdfUrl, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('pay'); // 'pay' | 'check'
  const [checkOrderCode, setCheckOrderCode] = useState('');
  const [checking, setChecking] = useState(false);

  // Form inputs
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [localQrDataUrl, setLocalQrDataUrl] = useState('');

  const isPaid = paymentInfo !== null
    ? Boolean(paymentInfo.is_download_paid && paymentInfo.price > 0)
    : Boolean(book?.is_download_paid && (book?.download_price > 0));
  const price = paymentInfo?.price ?? book?.download_price ?? 0;
  const upiId = paymentInfo?.upi_id || "kokanislamiclibrary@upi";
  const bookTitle = paymentInfo?.title || book?.title || "Book Download";
  const effectivePdfUrl = pdfUrl || book?.pdf_url || book?.pdf_file;

  // Standard UPI URI for UPI apps & QR generation
  const encodedTitle = encodeURIComponent(`KIL Book: ${bookTitle}`.slice(0, 40));
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Kokan%20Islamic%20Library&am=${price}&cu=INR&tn=${encodedTitle}`;

  // Fetch Payment Info when modal opens
  useEffect(() => {
    if (isOpen && book?.id) {
      setSubmittedOrder(null);
      bookOrderService.getPaymentInfo(book.id)
        .then(info => setPaymentInfo(info))
        .catch(err => {
          console.error("Failed to load payment info:", err);
          // Fallback info
          setPaymentInfo({
            book_id: book.id,
            title: book.title,
            cover_image_url: book.cover_image_url || book.cover_image,
            is_download_paid: Boolean(book.is_download_paid),
            price: book.download_price || 49,
            upi_id: book.download_upi_id || "kokanislamiclibrary@upi",
            instructions: "Scan the UPI QR Code using Google Pay, PhonePe, Paytm, or BHIM. Enter your 12-digit UTR transaction reference to verify."
          });
        });
    }
  }, [isOpen, book]);

  // Generate 100% offline local QR Code unconditionally (Rules of Hooks)
  useEffect(() => {
    if (isOpen && upiDeepLink) {
      QRCode.toDataURL(upiDeepLink, {
        width: 260,
        margin: 1,
        color: {
          dark: '#002147',
          light: '#FFFFFF'
        }
      })
      .then(url => setLocalQrDataUrl(url))
      .catch(err => console.error("Local QR generation failed:", err));
    }
  }, [isOpen, upiDeepLink]);

  if (!isOpen) return null;

  const qrCodeUrl = paymentInfo?.qr_image_url || localQrDataUrl;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Please provide your name and email.");
      return;
    }
    if (price > 0 && !transactionRef.trim()) {
      toast.error("Please enter the UPI Transaction Reference (UTR) number.");
      return;
    }

    try {
      setLoading(true);
      const res = await bookOrderService.createOrder({
        book_id: book.id,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
        buyer_phone: buyerPhone.trim() || null,
        transaction_ref: transactionRef.trim() || null,
        notes: notes.trim() || null
      });

      setSubmittedOrder(res);
      toast.success(res.status === 'APPROVED' ? "Download ready!" : "Payment details submitted!");
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error(err.response?.data?.detail || "Failed to submit payment details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExistingOrder = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!checkOrderCode.trim()) return;
    try {
      setChecking(true);
      const res = await bookOrderService.verifyOrder(checkOrderCode.trim());
      setSubmittedOrder(res);
      setActiveTab('pay');
    } catch (err) {
      toast.error(err.response?.data?.detail || "Order reference not found.");
    } finally {
      setChecking(false);
    }
  };

  const modalContent = (
    <div 
      key="purchase-modal-portal"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#002147] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ArrowDownTrayIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Download Offline Book</h3>
              <p className="text-[11px] text-slate-300 font-normal">
                {isPaid ? "Free to read online • Paid permanent copy" : "Free to read online • Free to download"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Only for Paid books */}
        {!submittedOrder && isPaid && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('pay')}
              className={`flex-1 py-2.5 px-4 text-center transition cursor-pointer ${
                activeTab === 'pay'
                  ? 'bg-white text-[#002147] border-b-2 border-[#002147] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Scan & Pay (₹{price})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('check')}
              className={`flex-1 py-2.5 px-4 text-center transition cursor-pointer ${
                activeTab === 'check'
                  ? 'bg-white text-[#002147] border-b-2 border-[#002147] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Already Paid? Track Order
            </button>
          </div>
        )}

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* TAB 2: Check Existing Order */}
          {activeTab === 'check' && !submittedOrder && (
            <form onSubmit={handleCheckExistingOrder} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                If you already made a payment or received an order reference code, enter it below to retrieve your download link:
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Order Code (e.g. KIL-1A2B3C4D)
                </label>
                <input
                  type="text"
                  required
                  placeholder="KIL-XXXXXXXX"
                  value={checkOrderCode}
                  onChange={(e) => setCheckOrderCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:bg-white focus:border-[#002147] outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={checking}
                className="w-full py-2.5 bg-[#002147] hover:bg-[#003166] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {checking ? "Checking..." : "Retrieve Download Link"}
              </button>
            </form>
          )}

          {/* TAB 1: New Payment or Free Download */}
          {activeTab === 'pay' && (
            <>
              {/* SUCCESS / DOWNLOAD SCREEN */}
              {submittedOrder ? (
                <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
                  {submittedOrder.status === 'APPROVED' && submittedOrder.download_token ? (
                    <div className="space-y-3">
                      <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircleIcon className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">Payment Verified!</h4>
                      <p className="text-xs text-slate-600 max-w-xs mx-auto">
                        Your permanent offline PDF copy is ready to download.
                      </p>
                      
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-1">
                        <p className="font-mono font-bold">Order: {submittedOrder.order_code}</p>
                        <p className="text-[11px] text-emerald-600">Link valid for 48 hours • Max 5 downloads</p>
                      </div>

                      <a
                        href={bookOrderService.getDownloadUrl(submittedOrder.download_token)}
                        download
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" /> Download Book PDF Now
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                        <ClockIcon className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">Payment Submitted for Approval</h4>
                      <p className="text-xs text-slate-600 max-w-xs mx-auto">
                        Your transaction reference has been logged. Admin will verify and activate your download link.
                      </p>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Order Reference:</span>
                          <span className="font-mono font-bold text-[#002147]">{submittedOrder.order_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">UTR / Ref No:</span>
                          <span className="font-mono">{submittedOrder.transaction_ref || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Status:</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px]">
                            {submittedOrder.status}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        Close Window
                      </button>
                    </div>
                  )}
                </div>
              ) : !isPaid ? (
                /* FREE DOWNLOAD VIEW */
                <div className="text-center py-6 space-y-5 animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-emerald-50/50 shadow-xs">
                    <ArrowDownTrayIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
                      <CheckIcon className="w-3.5 h-3.5" /> 100% Free Download
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{bookTitle}</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      This book is available for free download. Click the button below to get your PDF copy.
                    </p>
                  </div>

                  <div className="pt-2">
                    <a
                      href={effectivePdfUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        toast.success("Download started!");
                        onClose?.();
                      }}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" /> Download Book PDF Now
                    </a>
                  </div>
                </div>
              ) : (
                /* PAID PAYMENT & FORM VIEW */
                <div className="space-y-5">
                  {/* Book Summary Banner */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-10 h-14 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 shadow-xs">
                      {(paymentInfo?.cover_image_url || book?.cover_image_url || book?.cover_image) ? (
                        <img
                          src={paymentInfo?.cover_image_url || book?.cover_image_url || book?.cover_image}
                          alt={bookTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BookOpenIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{bookTitle}</h4>
                      <p className="text-[11px] text-slate-500 truncate">By {book?.author || 'KIL Library'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-700 font-mono">₹{price}</span>
                      <p className="text-[10px] text-slate-400">One-time fee</p>
                    </div>
                  </div>

                  {/* UPI QR & ID Block */}
                  <div className="p-4 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex-shrink-0 flex items-center justify-center">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="UPI Payment QR Code"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-7 h-7 border-2 border-[#002147] border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Loading QR...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <QrCodeIcon className="w-3 h-3" /> Scan with Any UPI App
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        GPay, PhonePe, Paytm, BHIM, Cred or Mobile Banking.
                      </p>
                      <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 select-all">
                          {upiId}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition"
                        >
                          {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Form Submission */}
                  <form onSubmit={handleSubmitOrder} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Your Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          placeholder="e.g. Tarique Khan"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#002147] outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#002147] outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          UPI UTR / Ref Number {price > 0 && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          required={price > 0}
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="12-digit UPI reference"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-[#002147] outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          WhatsApp / Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#002147] outline-none transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 bg-[#002147] hover:bg-[#003166] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {loading ? "Submitting Payment..." : `Submit Payment & Get Download Link`}
                    </button>

                    <p className="text-[10px] text-center text-slate-400">
                      🔒 Zero surcharge for payer • Secure tokenized PDF delivery
                    </p>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default BookPurchaseModal;
