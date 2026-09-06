import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  QrCodeIcon,
  ArrowUpTrayIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { bookOrderService } from '../../api/bookOrderService';

const AdminBookOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  
  // Master Switch state (1-Click Global Toggle)
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [togglingMaster, setTogglingMaster] = useState(false);

  // QR Code & Payment Settings state
  const [showQrModal, setShowQrModal] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    default_upi_id: '',
    default_price: 49,
    qr_image_url: '',
    instructions: ''
  });
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Bulk update state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPrice, setBulkPrice] = useState(49);
  const [bulkIsPaid, setBulkIsPaid] = useState(true);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchMasterToggle = useCallback(async () => {
    try {
      const res = await bookOrderService.getMasterToggle();
      setMasterEnabled(Boolean(res.master_enabled));
    } catch (err) {
      console.warn("Could not fetch master toggle:", err);
    }
  }, []);

  const fetchPaymentSettings = useCallback(async () => {
    try {
      const res = await bookOrderService.getPaymentSettings();
      if (res) setPaymentSettings(res);
    } catch (err) {
      console.warn("Could not fetch payment settings:", err);
    }
  }, []);

  useEffect(() => {
    fetchPaymentSettings();
  }, [fetchPaymentSettings]);

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingQr(true);
      const res = await bookOrderService.uploadQrCode(file);
      setPaymentSettings(prev => ({ ...prev, qr_image_url: res.qr_image_url }));
      toast.success("QR Code uploaded successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload QR code.");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await bookOrderService.updatePaymentSettings(paymentSettings);
      toast.success("UPI & QR settings saved!");
      setShowQrModal(false);
    } catch (err) {
      toast.error("Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleMaster = async () => {
    const nextVal = !masterEnabled;
    const confirmMsg = nextVal
      ? "Activate Paid Download system across the website?"
      : "Turn OFF Paid Downloads globally? (All books will become 100% FREE to download immediately!)";
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setTogglingMaster(true);
      const res = await bookOrderService.setMasterToggle(nextVal);
      setMasterEnabled(Boolean(res.master_enabled));
      toast.success(res.message || "Master toggle updated!");
    } catch (err) {
      toast.error("Failed to update master switch.");
    } finally {
      setTogglingMaster(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await bookOrderService.listOrders(params);
      setOrders(res || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      toast.error("Failed to load book orders.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchMasterToggle();
  }, [fetchMasterToggle]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleApprove = async (orderId) => {
    try {
      setActionLoading(orderId);
      await bookOrderService.updateOrderStatus(orderId, {
        status: 'APPROVED',
        expiry_hours: 48,
        max_downloads: 5
      });
      toast.success("Order approved! Download link generated.");
      fetchOrders();
    } catch (err) {
      toast.error("Failed to approve order.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId) => {
    const reason = window.prompt("Reason for rejection (optional):", "Invalid or missing UTR transaction reference.");
    if (reason === null) return;

    try {
      setActionLoading(orderId);
      await bookOrderService.updateOrderStatus(orderId, {
        status: 'REJECTED',
        admin_remarks: reason
      });
      toast.success("Order marked as rejected.");
      fetchOrders();
    } catch (err) {
      toast.error("Failed to reject order.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendLink = async (order) => {
    try {
      setActionLoading(order.id);
      const res = await bookOrderService.resendOrderLink(order.id, 48);
      const dlUrl = bookOrderService.getDownloadUrl(res.download_token);
      navigator.clipboard.writeText(dlUrl);
      toast.success("Fresh link copied to clipboard! (Valid for 48 hours)");
      fetchOrders();
    } catch (err) {
      toast.error("Failed to refresh download link.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyLink = (token) => {
    const dlUrl = bookOrderService.getDownloadUrl(token);
    navigator.clipboard.writeText(dlUrl);
    toast.success("Download link copied!");
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    try {
      setBulkUpdating(true);
      const res = await bookOrderService.bulkUpdatePaidDownload({
        all_books: true,
        is_download_paid: bulkIsPaid,
        download_price: Number(bulkPrice)
      });
      toast.success(res.message || "Bulk update completed!");
      setShowBulkModal(false);
    } catch (err) {
      toast.error("Failed to execute bulk update.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircleIcon className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircleIcon className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ClockIcon className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#002147] tracking-tight">
            Book Download Orders & UPI Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage buyer purchases, verify UPI UTR references, and manage secure tokenized download links.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#002147] border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <QrCodeIcon className="w-4 h-4 text-blue-600" />
            UPI & QR Settings
          </button>
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#002147] border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <BanknotesIcon className="w-4 h-4 text-emerald-600" />
            Bulk Pricing / Toggle
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-3.5 py-2 bg-[#002147] hover:bg-[#003166] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 🌟 1-CLICK GLOBAL MASTER TOGGLE BANNER */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        masterEnabled
          ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white border-emerald-200/90'
          : 'bg-gradient-to-r from-amber-50/90 via-rose-50/40 to-white border-amber-200/90'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold shadow-xs ${
            masterEnabled ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}>
            <BanknotesIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Global Paid Download System
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                masterEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {masterEnabled ? '● ACTIVE (Paid Rules Enabled)' : '○ PAUSED (100% Free Downloads)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {masterEnabled
                ? 'Paid downloads are currently enforced according to individual book prices and UPI checkout.'
                : 'Master switch is OFF. All readers can download any book directly for FREE without any payment.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleMaster}
          disabled={togglingMaster}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap ${
            masterEnabled
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {togglingMaster ? 'Updating...' : (
            masterEnabled ? 'Turn OFF (Make Everything Free)' : 'Turn ON (Enforce Paid Downloads)'
          )}
        </button>
      </div>

      {/* Filters Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by buyer, email, order, UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#002147] outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#002147] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Order Code</th>
                <th className="px-4 py-3">Book Title</th>
                <th className="px-4 py-3">Buyer Info</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">UTR Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Downloads</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#002147] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No book download orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/75 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {order.order_code}
                      <p className="text-[10px] text-slate-400 font-sans font-normal">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-bold text-slate-800 truncate" title={order.book_title}>
                        {order.book_title || `Book #${order.book_id}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{order.buyer_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{order.buyer_email}</p>
                      {order.buyer_phone && (
                        <p className="text-[10px] text-slate-400">{order.buyer_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      ₹{order.amount}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-700 select-all">
                      {order.transaction_ref || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {order.download_count} / {order.max_downloads}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {order.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(order.id)}
                            disabled={actionLoading === order.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-2xs disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            disabled={actionLoading === order.id}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition border border-rose-200 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {order.status === 'APPROVED' && (
                        <>
                          <button
                            onClick={() => handleCopyLink(order.download_token)}
                            title="Copy Download URL"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            Copy Link
                          </button>
                          <button
                            onClick={() => handleResendLink(order)}
                            title="Extend 48h & Reset Count"
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1 border border-indigo-200"
                          >
                            <ArrowPathIcon className="w-3.5 h-3.5" />
                            Resend Link
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#002147]">Bulk Paid Download Configuration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apply paid download rules across all existing digital books in one action.
            </p>

            <form onSubmit={handleBulkUpdate} className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Require Paid Download</span>
                <input
                  type="checkbox"
                  checked={bulkIsPaid}
                  onChange={(e) => setBulkIsPaid(e.target.checked)}
                  className="w-5 h-5 accent-[#002147] rounded cursor-pointer"
                />
              </div>

              {bulkIsPaid && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Download Price (₹ INR) for All Books
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#002147]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUpdating}
                  className="px-5 py-2 bg-[#002147] hover:bg-[#003166] text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {bulkUpdating ? "Applying..." : "Apply to All Books"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI & CUSTOM QR CODE MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCodeIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-[#002147]">UPI & QR Code Configuration</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your official bank / merchant UPI QR Code image and customize default payment instructions.
            </p>

            <form onSubmit={handleSavePaymentSettings} className="space-y-4">
              {/* QR Image Upload & Preview */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Custom QR Code Image
                </label>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-white border border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
                    {paymentSettings.qr_image_url ? (
                      <img
                        src={paymentSettings.qr_image_url}
                        alt="Uploaded QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition">
                      <ArrowUpTrayIcon className="w-3.5 h-3.5 text-blue-600" />
                      {uploadingQr ? "Uploading..." : "Upload New QR Image"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        disabled={uploadingQr}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Supports PNG, JPG, JPEG. Leave empty to use auto-generated dynamic QR.
                    </p>
                    {paymentSettings.qr_image_url && (
                      <button
                        type="button"
                        onClick={() => setPaymentSettings(prev => ({ ...prev, qr_image_url: '' }))}
                        className="text-[10px] font-semibold text-rose-600 hover:underline block cursor-pointer"
                      >
                        Remove custom QR (use auto-generated)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Default UPI ID / VPA
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. markaz@upi or 9876543210@paytm"
                  value={paymentSettings.default_upi_id}
                  onChange={(e) => setPaymentSettings(prev => ({ ...prev, default_upi_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-[#002147]"
                />
              </div>

              {/* Default Price */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Default Download Price (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={paymentSettings.default_price}
                  onChange={(e) => setPaymentSettings(prev => ({ ...prev, default_price: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#002147]"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Instructions for User
                </label>
                <textarea
                  rows={2}
                  value={paymentSettings.instructions}
                  onChange={(e) => setPaymentSettings(prev => ({ ...prev, instructions: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-[#002147] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 bg-[#002147] hover:bg-[#003166] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save UPI Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookOrdersPage;
