import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  PhoneIcon,
  BuildingLibraryIcon,
  ClockIcon,
  ShieldCheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  ChevronUpDownIcon,
  ClipboardDocumentIcon,
  FunnelIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

import restrictedBookService from "../../api/restrictedBookService";
import bulkActionService from "../../api/bulkActionService";
import { FALLBACK_COVER } from "../../utils/cover";

// ✅ CONFIG: API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

// --- HELPERS ---
const normalizeStatus = (s) => String(s || "").toLowerCase();
const safeText = (v, f = "N/A") => (v && String(v).trim() !== "" ? String(v) : f);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

// ✅ NEW: Image URL Helper
const getCoverUrl = (path) => {
    if (!path) return FALLBACK_COVER;
    if (path.startsWith("http")) return path; // Already full URL
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

const AccessRequests = () => {
  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); 
  
  // --- Bulk Action State ---
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkRejectModal, setBulkRejectModal] = useState(false);

  // --- MODALS ---
  const [rejectModal, setRejectModal] = useState({ open: false, requestId: null });
  const [viewModal, setViewModal] = useState({ open: false, data: null }); 
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveModal, setApproveModal] = useState({ open: false, request: null, duration: 30, customDate: "" });

  // --- API ---
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await restrictedBookService.getAllRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // --- ACTIONS ---
  const handleOpenApprove = (request, e) => {
    e?.stopPropagation();
    setApproveModal({
      open: true,
      request,
      duration: request?.duration_days ?? 30,
      customDate: request?.expires_at ? new Date(request.expires_at).toISOString().slice(0, 16) : "",
    });
  };

  const handleApproveConfirm = async () => {
    if (!approveModal.request) return;
    const req = approveModal.request;
    const toastId = toast.loading("Granting access...");

    try {
      let durationDays = null;
      let expiresAt = null;

      if (approveModal.duration === "custom") {
        if (!approveModal.customDate) {
          toast.error("Please select an expiration date", { id: toastId });
          return;
        }
        expiresAt = new Date(approveModal.customDate).toISOString();
      } else if (Number(approveModal.duration) > 0) {
        durationDays = Number(approveModal.duration);
      } else {
        // 0 means Unlimited / Lifetime
        durationDays = null;
        expiresAt = null;
      }

      const updated = await restrictedBookService.updateRequestStatus(
        req.id,
        "approved",
        null,
        durationDays,
        expiresAt
      );

      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, ...updated, status: "approved" } : r))
      );

      toast.success(
        durationDays
          ? `Access granted for ${durationDays} days!`
          : expiresAt
          ? "Access granted until selected deadline!"
          : "Lifetime access granted!",
        { id: toastId }
      );

      setApproveModal({ open: false, request: null, duration: 30, customDate: "" });
      if (viewModal.open) setViewModal({ open: false, data: null });
    } catch (err) {
      toast.error("Failed to approve request", { id: toastId });
    }
  };

  const handleRevoke = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to revoke this user's access?")) return;
    const toastId = toast.loading("Revoking access...");
    try {
      await restrictedBookService.updateRequestStatus(id, "rejected", "Access revoked by administrator");
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "rejected", is_expired: true, can_read: false, rejection_reason: "Access revoked by administrator" }
            : r
        )
      );
      toast.success("Access Revoked", { id: toastId });
      if (viewModal.open) setViewModal({ open: false, data: null });
    } catch (err) {
      toast.error("Failed to revoke access", { id: toastId });
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) return toast.error("Reason required");
    const id = rejectModal.requestId;
    const toastId = toast.loading("Rejecting...");
    try {
      await restrictedBookService.updateRequestStatus(id, "rejected", rejectionReason);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected", rejection_reason: rejectionReason, is_expired: true } : r));
      toast.success("Request Rejected", { id: toastId });
      setRejectModal({ open: false, requestId: null });
      if(viewModal.open) setViewModal({ open: false, data: null });
    } catch (err) {
      toast.error("Failed to reject", { id: toastId });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleBulkAction = async (action, reason = null) => {
    if (!selectedRequests.size) return;
    const confirmMsg = `Are you sure you want to ${action} ${selectedRequests.size} requests?`;
    if (!window.confirm(confirmMsg)) return;
    setBulkActionLoading(true);
    try {
        const result = await bulkActionService.bulkRequestAction(action, [...selectedRequests], reason);
        toast.success(result.message);
        setSelectedRequests(new Set());
        setBulkRejectModal(false);
        setRejectionReason("");
        fetchRequests();
    } catch (err) {
        toast.error(err.response?.data?.detail || 'Bulk action failed');
    } finally {
        setBulkActionLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
      if (e.target.checked) {
          setSelectedRequests(new Set(processedRequests.map(r => r.id)));
      } else {
          setSelectedRequests(new Set());
      }
  };

  const toggleSelectRequest = (id) => {
      const newSet = new Set(selectedRequests);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedRequests(newSet);
  };

  // --- FILTERING & SORTING ---
  const processedRequests = useMemo(() => {
    let data = requests.filter((req) => {
      const status = normalizeStatus(req.status);
      const matchesFilter = filter === "all" || status === normalizeStatus(filter);
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        safeText(req.name).toLowerCase().includes(searchLower) ||
        safeText(req.book_title).toLowerCase().includes(searchLower) ||
        String(req.id).includes(searchLower);
      return matchesFilter && matchesSearch;
    });

    return data.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [requests, filter, searchTerm, sortOrder]);

  // --- STATS ---
  const stats = useMemo(() => ({
      total: requests.length,
      pending: requests.filter(r => normalizeStatus(r.status) === 'pending').length,
      approved: requests.filter(r => normalizeStatus(r.status) === 'approved').length,
      rejected: requests.filter(r => normalizeStatus(r.status) === 'rejected').length,
  }), [requests]);

  // --- BADGE COMPONENT ---
  const StatusBadge = ({ status, isExpired }) => {
    const s = normalizeStatus(status);
    if (s === "approved" && isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-50 text-rose-700 border-rose-200">
          <ClockIcon className="w-3.5 h-3.5" />
          <span>Expired</span>
        </span>
      );
    }
    const config = {
      pending: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: ClockIcon },
      approved: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircleIcon },
      rejected: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircleIcon },
    };
    const active = config[s] || config.pending;
    const Icon = active.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${active.color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="capitalize">{s}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Access Requests</h1>
            <p className="text-slate-500 font-medium">Manage permissions for restricted library content</p>
          </div>
          
          <div className="flex gap-3">
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pending</span>
                <span className="text-xl font-black text-amber-500">{stats.pending}</span>
             </div>
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] uppercase font-bold text-slate-400">Approved</span>
                <span className="text-xl font-black text-emerald-500">{stats.approved}</span>
             </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-4 z-30">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            {["pending", "approved", "rejected", "all"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                  filter === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-64">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, book..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
            <button 
              onClick={fetchRequests} 
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedRequests.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
            <span className="text-sm font-bold text-indigo-700">{selectedRequests.size} selected</span>
            <button disabled={bulkActionLoading} onClick={() => handleBulkAction('approve')} className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition disabled:opacity-50">Approve Selected</button>
            <button disabled={bulkActionLoading} onClick={() => setBulkRejectModal(true)} className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition disabled:opacity-50">Reject Selected</button>
            <button disabled={bulkActionLoading} onClick={() => setSelectedRequests(new Set())} className="ml-auto px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition disabled:opacity-50">Clear</button>
          </div>
        )}

        {/* DATA TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6 w-12 text-center">
                      <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={processedRequests.length > 0 && selectedRequests.size === processedRequests.length}
                          onChange={toggleSelectAll}
                      />
                  </th>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Requested Book</th>
                  <th className="p-4">Purpose & Info</th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
                    <div className="flex items-center gap-1">
                       Date <ChevronUpDownIcon className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Deadline</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="7" className="p-12 text-center text-slate-400">Loading requests...</td></tr>
                ) : processedRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center">
                      <div className="flex flex-col items-center">
                        <FunnelIcon className="w-12 h-12 text-slate-200 mb-3" />
                        <p className="text-slate-500 font-bold">No requests found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedRequests.map((req) => (
                    <tr 
                        key={req.id} 
                        className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => setViewModal({ open: true, data: req })}
                    >
                      <td className="p-4 pl-6 text-center" onClick={e => e.stopPropagation()}>
                          <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={selectedRequests.has(req.id)}
                              onChange={() => toggleSelectRequest(req.id)}
                          />
                      </td>
                      {/* User */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200">
                            {req.name?.[0] || <UserIcon className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{safeText(req.name)}</div>
                            <div 
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(req.whatsapp); }}
                            >
                                <PhoneIcon className="w-3 h-3" /> {safeText(req.whatsapp)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Book Image Fixed */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-10 rounded bg-slate-100 border border-slate-200 overflow-hidden shadow-sm shrink-0">
                               <img 
                                  src={getCoverUrl(req.book_cover)} 
                                  alt="Cover" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => e.target.src = FALLBACK_COVER}
                               />
                           </div>
                           <div className="max-w-[180px]">
                              <div className="font-bold text-slate-800 text-sm truncate" title={req.book_title}>{safeText(req.book_title)}</div>
                              <div className="text-xs text-slate-400">ID: #{req.id}</div>
                           </div>
                        </div>
                      </td>

                      {/* Info */}
                      <td className="p-4">
                        <div className="max-w-[200px]">
                           <div className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                              {req.is_salafi && <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" title="Verified Methodology" />}
                              <span className="truncate">{safeText(req.institution, "No Institution")}</span>
                           </div>
                           <p className="text-sm text-slate-600 truncate">{Array.isArray(req.purpose) ? req.purpose.join(", ") : safeText(req.purpose)}</p>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-sm text-slate-500 font-medium">
                        {formatDate(req.created_at)}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusBadge status={req.status} isExpired={req.is_expired} />
                      </td>

                      {/* Deadline */}
                      <td className="p-4 text-xs font-medium">
                        {normalizeStatus(req.status) === 'approved' ? (
                          req.expires_at ? (
                            req.is_expired ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                ⚠️ Expired
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title={`Expires: ${formatDate(req.expires_at)}`}
                              >
                                ⏳ {req.days_remaining}d left
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              ♾️ Lifetime
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right pr-6">
                        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                           {normalizeStatus(req.status) === 'pending' ? (
                             <>
                               <button 
                                 onClick={(e) => handleOpenApprove(req, e)} 
                                 className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 cursor-pointer"
                                 title="Grant Access & Set Deadline"
                               >
                                  <CheckCircleIcon className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setRejectModal({ open: true, requestId: req.id }); }} 
                                 className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-100 cursor-pointer"
                                 title="Reject"
                               >
                                  <XCircleIcon className="w-5 h-5" />
                               </button>
                             </>
                           ) : normalizeStatus(req.status) === 'approved' ? (
                             <>
                               <button 
                                 onClick={(e) => handleOpenApprove(req, e)} 
                                 className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 cursor-pointer"
                                 title="Extend or Edit Deadline"
                               >
                                  <CalendarIcon className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={(e) => handleRevoke(req.id, e)} 
                                 className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100 cursor-pointer"
                                 title="Revoke Access"
                               >
                                  <XCircleIcon className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => setViewModal({ open: true, data: req })}
                                 className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                 title="View Details"
                               >
                                  <EyeIcon className="w-5 h-5" />
                               </button>
                             </>
                           ) : (
                             <>
                               <button 
                                 onClick={(e) => handleOpenApprove(req, e)} 
                                 className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 cursor-pointer"
                                 title="Grant Access Again"
                               >
                                  <CheckCircleIcon className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => setViewModal({ open: true, data: req })}
                                 className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                 title="View Details"
                               >
                                  <EyeIcon className="w-5 h-5" />
                               </button>
                             </>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
             <span>Showing {processedRequests.length} records</span>
          </div>
        </div>
      </div>

      {/* 1. VIEW DETAILS MODAL */}
      <AnimatePresence>
        {viewModal.open && viewModal.data && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewModal({open:false, data:null})}>
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                 onClick={(e) => e.stopPropagation()}
              >
                 <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Request Details</h2>
                        <p className="text-sm text-slate-500">ID: #{viewModal.data.id} â€¢ {formatDate(viewModal.data.created_at)}</p>
                    </div>
                    <button onClick={() => setViewModal({open:false, data:null})} className="p-1 hover:bg-slate-200 rounded-full text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
                 </div>

                 <div className="p-6 overflow-y-auto space-y-8">
                    <div className="flex items-center justify-between">
                       <StatusBadge status={viewModal.data.status} />
                       {viewModal.data.is_salafi && (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                             <ShieldCheckIcon className="w-4 h-4" /> Methodology Verified
                          </div>
                       )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">User Information</h3>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{viewModal.data.name?.[0]}</div>
                                <span className="font-bold text-slate-800">{safeText(viewModal.data.name)}</span>
                             </div>
                              <div className="flex flex-col gap-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2"><PhoneIcon className="w-4 h-4 text-slate-400" /> {safeText(viewModal.data.whatsapp)}</div>
                                <div className="flex items-center gap-2"><BuildingLibraryIcon className="w-4 h-4 text-slate-400" /> {safeText(viewModal.data.institution)}</div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Age:</span> <span className="font-medium">{safeText(viewModal.data.age, 'N/A')}</span></div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Qualification:</span> <span className="font-medium">{safeText(viewModal.data.qualification, 'N/A')}</span></div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Teachers / References:</span> <span className="font-medium">{safeText(viewModal.data.teachers, 'N/A')}</span></div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Location:</span> <span className="font-medium">{safeText(viewModal.data.location, 'N/A')}</span></div>
                              </div>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Book Requested</h3>
                          <div className="flex gap-4 items-start">
                             {/* ✅ MODAL IMAGE FIXED */}
                             <img 
                                src={getCoverUrl(viewModal.data.book_cover)} 
                                className="w-16 h-24 object-cover rounded-lg shadow-sm bg-slate-100 border border-slate-200" 
                                alt="cover" 
                                onError={(e) => e.target.src = FALLBACK_COVER}
                             />
                             <div>
                                <h4 className="font-bold text-slate-900">{safeText(viewModal.data.book_title)}</h4>
                                <span className="text-xs text-slate-500 block mt-1">Restricted Content</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div>
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Purpose of Study</h3>
                          <div className="p-4 bg-slate-50 rounded-xl text-sm leading-relaxed text-slate-700 border border-slate-100">
                             {safeText(viewModal.data.purpose)}
                          </div>
                       </div>

                       {/* Detailed Book Metadata for Admin */}
                       <div>
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Book Metadata</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm space-y-1.5">
                                <div><strong className="text-slate-600">Author:</strong> <span className="font-semibold text-slate-800 ml-1">{viewModal.data.book_author || 'N/A'}</span></div>
                                <div><strong className="text-slate-600">Publisher:</strong> <span className="font-semibold text-slate-800 ml-1">{viewModal.data.book_publisher || 'N/A'}</span></div>
                                <div><strong className="text-slate-600">ISBN:</strong> <span className="font-semibold text-slate-800 ml-1">{viewModal.data.book_isbn || 'N/A'}</span></div>
                                <div><strong className="text-slate-600">Edition:</strong> <span className="font-semibold text-slate-800 ml-1">{viewModal.data.book_edition || 'N/A'}</span></div>
                             </div>
                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm space-y-1.5">
                                <div><strong className="text-slate-600">Pages:</strong> <span className="font-semibold text-slate-800 ml-1">{viewModal.data.book_pages || 'N/A'}</span></div>
                                <div><strong className="text-slate-600">Price:</strong> <span className="font-semibold text-slate-800 ml-1">{viewModal.data.book_price || 'N/A'}</span></div>
                                <div><strong className="text-slate-600">Location:</strong> <span className="font-semibold text-slate-800 ml-1">{viewModal.data.book_location || 'N/A'}</span></div>
                             </div>
                          </div>
                       </div>

                       <div>
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Previous Work / Background</h3>
                          <div className="p-4 bg-slate-50 rounded-xl text-sm leading-relaxed text-slate-700 border border-slate-100">
                             {viewModal.data.previous_work && viewModal.data.previous_work.trim() && viewModal.data.previous_work.trim().toLowerCase() !== "n/a" ? (
                               viewModal.data.previous_work
                             ) : (
                               <span className="text-slate-400 italic">No previous work submitted</span>
                             )}
                          </div>
                       </div>
                       {viewModal.data.status === 'approved' && (
                           <div className="p-4 rounded-xl border bg-emerald-50/60 border-emerald-100 text-emerald-900 flex items-center justify-between">
                              <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800">Access Status & Deadline</h3>
                                <p className="text-sm font-semibold mt-0.5">
                                  {viewModal.data.expires_at ? (
                                    viewModal.data.is_expired ? (
                                      <span className="text-rose-600 font-bold">⚠️ Access Expired on {formatDate(viewModal.data.expires_at)}</span>
                                    ) : (
                                      <span>Active • Expires on <strong>{formatDate(viewModal.data.expires_at)}</strong> ({viewModal.data.days_remaining} days left)</span>
                                    )
                                  ) : (
                                    <span>Active • Lifetime Access (No Expiry)</span>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => handleOpenApprove(viewModal.data)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                              >
                                Change Deadline
                              </button>
                           </div>
                       )}

                       {viewModal.data.status === 'rejected' && viewModal.data.rejection_reason && (
                           <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                              <h3 className="text-xs font-black text-red-800 uppercase mb-1">Rejection Reason</h3>
                              <p className="text-sm text-red-700">{viewModal.data.rejection_reason}</p>
                           </div>
                       )}
                    </div>
                 </div>

                 {normalizeStatus(viewModal.data.status) === 'pending' ? (
                    <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                       <button 
                          onClick={() => { setRejectModal({ open: true, requestId: viewModal.data.id }); }}
                          className="px-5 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors text-sm cursor-pointer"
                       >
                          Reject
                       </button>
                       <button 
                          onClick={() => handleOpenApprove(viewModal.data)}
                          className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors text-sm cursor-pointer"
                       >
                          Approve & Set Deadline
                       </button>
                    </div>
                 ) : normalizeStatus(viewModal.data.status) === 'approved' ? (
                    <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                       <button 
                          onClick={() => handleRevoke(viewModal.data.id)}
                          className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors text-sm cursor-pointer"
                       >
                          Revoke Access
                       </button>
                       <button 
                          onClick={() => handleOpenApprove(viewModal.data)}
                          className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors text-sm cursor-pointer"
                       >
                          Extend / Edit Deadline
                       </button>
                    </div>
                 ) : (
                    <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                       <button 
                          onClick={() => handleOpenApprove(viewModal.data)}
                          className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors text-sm cursor-pointer"
                       >
                          Grant Access
                       </button>
                    </div>
                 )}
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* 2. APPROVE ACCESS & DEADLINE MODAL */}
      <AnimatePresence>
        {approveModal.open && approveModal.request && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Grant Access / Deadline</h3>
                    <p className="text-xs text-emerald-100 font-medium">Set how long the user can read this book</p>
                  </div>
                </div>
                <button
                  onClick={() => setApproveModal({ open: false, request: null, duration: 30, customDate: "" })}
                  className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Book & User Summary */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-14 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={getCoverUrl(approveModal.request.book_cover)}
                      alt="Cover"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target.src = FALLBACK_COVER)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-sm truncate" title={approveModal.request.book_title}>
                      {safeText(approveModal.request.book_title)}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      User: <strong className="text-slate-700 font-bold">{safeText(approveModal.request.name)}</strong>
                    </p>
                  </div>
                </div>

                {/* Duration Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Access Duration (Deadline)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "7 Days", days: 7, desc: "1 Week" },
                      { label: "15 Days", days: 15, desc: "2 Weeks" },
                      { label: "30 Days", days: 30, desc: "1 Month (Default)" },
                      { label: "90 Days", days: 90, desc: "3 Months" },
                      { label: "Unlimited", days: 0, desc: "Lifetime Access" },
                      { label: "Custom", days: "custom", desc: "Select Date" },
                    ].map((opt) => {
                      const isSelected = approveModal.duration === opt.days;
                      return (
                        <button
                          key={String(opt.days)}
                          type="button"
                          onClick={() => setApproveModal((prev) => ({ ...prev, duration: opt.days }))}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs"
                              : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="text-xs font-black">{opt.label}</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date Picker if selected */}
                {approveModal.duration === "custom" && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-600">Select Expiry Date & Time</label>
                    <input
                      type="datetime-local"
                      value={approveModal.customDate}
                      onChange={(e) => setApproveModal((prev) => ({ ...prev, customDate: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}

                {/* Deadline Preview */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {approveModal.duration === 0
                      ? "User will have permanent lifetime access until manually revoked."
                      : approveModal.duration === "custom"
                      ? approveModal.customDate
                        ? `Access expires on: ${new Date(approveModal.customDate).toLocaleString()}`
                        : "Please select an expiration date above."
                      : `Access will automatically expire after ${approveModal.duration} days.`}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setApproveModal({ open: false, request: null, duration: 30, customDate: "" })}
                  className="flex-1 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveConfirm}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-600/20 text-xs cursor-pointer"
                >
                  Confirm & Grant Access
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. REJECT MODAL */}
      <AnimatePresence>
        {rejectModal.open && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
              >
                 <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                       <XCircleIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Reject Request</h3>
                    <p className="text-slate-500 text-sm mt-1 mb-4">Please provide a reason. This will be visible to the user.</p>
                    
                    <textarea 
                       autoFocus
                       value={rejectionReason}
                       onChange={(e) => setRejectionReason(e.target.value)}
                       className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
                       placeholder="e.g. Incomplete details provided..."
                    />
                 </div>
                 <div className="p-4 bg-slate-50 flex gap-3">
                    <button onClick={() => setRejectModal({open:false, requestId:null})} className="flex-1 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm">Cancel</button>
                    <button onClick={handleRejectConfirm} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm">Confirm Reject</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* 3. BULK REJECT MODAL */}
      <AnimatePresence>
        {bulkRejectModal && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
              >
                 <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                       <XCircleIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Bulk Reject {selectedRequests.size} Requests</h3>
                    <p className="text-slate-500 text-sm mt-1 mb-4">Please provide a reason. This will be visible to all selected users.</p>
                    
                    <textarea 
                       autoFocus
                       value={rejectionReason}
                       onChange={(e) => setRejectionReason(e.target.value)}
                       className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
                       placeholder="e.g. Incomplete details provided..."
                    />
                 </div>
                 <div className="p-4 bg-slate-50 flex gap-3">
                    <button onClick={() => { setBulkRejectModal(false); setRejectionReason(''); }} className="flex-1 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm">Cancel</button>
                    <button onClick={() => {
                        if (!rejectionReason.trim()) return toast.error("Reason required");
                        handleBulkAction('reject', rejectionReason);
                    }} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm">Confirm Reject</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AccessRequests;