// src/pages/DigitalAccessHistory.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { digitalAccessService } from '../api/digitalAccessService';
import { userService } from '../api/userService';
import toast from 'react-hot-toast';

import { 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    UserIcon, 
    BookOpenIcon, 
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    FunnelIcon,
    DocumentTextIcon,
    UserGroupIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';

// --- Helper: Status Badge ---
const AccessBadge = ({ granted }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black capitalize ${
        granted 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border border-rose-200'
    }`}>
        {granted ? <CheckCircleIcon className="h-4 w-4 text-emerald-600" /> : <XCircleIcon className="h-4 w-4 text-rose-600" />}
        {granted ? '200 OK (Granted)' : '403 Blocked (Denied)'}
    </span>
);

const DigitalAccessHistory = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryUserId = searchParams.get('userId');

    // --- State ---
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(queryUserId || '');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState({ users: true, history: false });
    const [error, setError] = useState(null);
    
    // Filters & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'granted' | 'denied'
    const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7d' | '30d'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Fetch Users ---
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await userService.getAllUsers();
                const safeUsers = Array.isArray(data) ? data : [];
                setUsers(safeUsers);

                // If no user selected yet and users exist, default to first or keep empty
                if (!selectedUserId && queryUserId) {
                    setSelectedUserId(queryUserId);
                }
            } catch (err) {
                setError("Failed to load user list.");
            } finally {
                setLoading(prev => ({ ...prev, users: false }));
            }
        };
        loadUsers();
    }, [queryUserId, selectedUserId]);

    // Keep URL in sync when selected user changes
    useEffect(() => {
        if (selectedUserId) {
            setSearchParams({ userId: selectedUserId });
        }
    }, [selectedUserId, setSearchParams]);

    // Selected user object
    const selectedUser = useMemo(() => {
        const uid = parseInt(selectedUserId, 10);
        return users.find(u => u.id === uid) || null;
    }, [users, selectedUserId]);

    // Filtered users for user picker search
    const filteredUsers = useMemo(() => {
        if (!userSearchTerm.trim()) return users;
        const q = userSearchTerm.toLowerCase();
        return users.filter(u => 
            u.username?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q) ||
            u.phone?.includes(q)
        );
    }, [users, userSearchTerm]);

    // --- Fetch History ---
    const fetchHistory = useCallback(async () => {
        if (!selectedUserId) {
            setHistory([]);
            return;
        }
        setLoading(prev => ({ ...prev, history: true }));
        setError(null);
        try {
            const data = await digitalAccessService.getAccessHistoryForUser(parseInt(selectedUserId, 10));
            setHistory(Array.isArray(data) ? data : []);
            setCurrentPage(1);
        } catch (err) {
            setError(`Could not fetch logs for user ID ${selectedUserId}.`);
            setHistory([]);
        } finally {
            setLoading(prev => ({ ...prev, history: false }));
        }
    }, [selectedUserId]);

    useEffect(() => { 
        fetchHistory(); 
    }, [fetchHistory]);

    // --- Forensic KPI Calculation ---
    const stats = useMemo(() => {
        if (!history.length) return null;
        const total = history.length;
        const success = history.filter(h => h.access_granted).length;
        const denied = total - success;
        const successRate = Math.round((success / total) * 100);
        return { total, success, denied, successRate };
    }, [history]);

    // --- Date Filtering Helper ---
    const isWithinDateRange = (timestamp, range) => {
        if (range === 'all' || !timestamp) return true;
        const logDate = new Date(timestamp);
        const now = new Date();
        const diffMs = now - logDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (range === 'today') return diffDays <= 1;
        if (range === '7d') return diffDays <= 7;
        if (range === '30d') return diffDays <= 30;
        return true;
    };

    // --- Filtering & Pagination ---
    const filteredHistory = useMemo(() => {
        return history.filter(log => {
            // 1. Search Query
            const q = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                log.book?.title?.toLowerCase().includes(q) ||
                log.book?.author?.toLowerCase().includes(q) ||
                log.id?.toString().includes(q) ||
                log.client_id?.toLowerCase().includes(q);

            // 2. Status Filter
            const matchesStatus = 
                statusFilter === 'all' ? true :
                statusFilter === 'granted' ? log.access_granted :
                statusFilter === 'denied' ? !log.access_granted : true;

            // 3. Date Filter
            const matchesDate = isWithinDateRange(log.access_timestamp, dateFilter);

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [history, searchTerm, statusFilter, dateFilter]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredHistory.slice(start, start + itemsPerPage);
    }, [filteredHistory, currentPage]);

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

    // --- CSV Export Action ---
    const handleExportCSV = () => {
        if (!filteredHistory.length) {
            toast.error("No log rows available to export.");
            return;
        }

        const headers = ["Log ID", "Timestamp", "User ID", "Username", "Book ID", "Book Title", "Author", "Status", "Client Identifier"];
        const rows = filteredHistory.map(log => [
            log.id,
            log.access_timestamp ? new Date(log.access_timestamp).toISOString() : "N/A",
            selectedUserId,
            selectedUser?.username || "Unknown",
            log.book?.id || "N/A",
            `"${(log.book?.title || "").replace(/"/g, '""')}"`,
            `"${(log.book?.author || "").replace(/"/g, '""')}"`,
            log.access_granted ? "GRANTED_200" : "DENIED_403",
            `"${(log.client_id || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `digital_access_audit_user_${selectedUserId}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Audit log CSV exported successfully!");
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-8">
            
            {/* 1. TOP HEADER */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                            <ClockIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                    Digital Access Logs & Forensics
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black">
                                    Audit Trail
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Audit, monitor, and trace digital book consumption, reading sessions, and 403 access flags.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/admin/restricted-permissions"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition shadow-2xs"
                        >
                            <ShieldCheckIcon className="w-4 h-4 text-slate-500" />
                            Manage Permissions
                        </Link>
                    </div>
                </div>

                {/* USER INSPECTION SELECTOR STRIP */}
                <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <UserIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider shrink-0">
                            Inspect User:
                        </span>
                        
                        <div className="relative flex-1 max-w-md">
                            <select 
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                disabled={loading.history}
                            >
                                <option value="">-- Choose User to Audit --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.username} • {u.full_name || u.email || `User #${u.id}`} ({u.role?.name || u.role || 'Member'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedUser && (
                        <div className="flex items-center gap-3 self-end md:self-center">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>{selectedUser.username}</span>
                                <span className="text-slate-400">({selectedUser.email || "No Email"})</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-sm font-bold flex items-center gap-2">
                    <ShieldExclamationIcon className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* 2. FORENSIC KPI METRICS (If user selected) */}
            {selectedUserId && stats && !loading.history && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <BookOpenIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Total Access Events
                            </span>
                            <p className="text-2xl font-black text-slate-900">
                                {stats.total}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircleIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Authorized Reads (200)
                            </span>
                            <p className="text-2xl font-black text-emerald-600">
                                {stats.success}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <XCircleIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Denied Attempts (403)
                            </span>
                            <p className="text-2xl font-black text-rose-600">
                                {stats.denied}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldCheckIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Authorization Rate
                            </span>
                            <p className="text-2xl font-black text-indigo-600">
                                {stats.successRate}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. LOGS WORKSPACE & DETAILED AUDIT TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                
                {/* TOOLBAR */}
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            Detailed Access History
                        </h3>
                        {selectedUserId && (
                            <span className="text-xs font-bold text-slate-400">
                                ({filteredHistory.length} logs)
                            </span>
                        )}
                    </div>

                    {selectedUserId && (
                        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                            {/* Search */}
                            <div className="relative flex-1 sm:w-48">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search book / ID..." 
                                    className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none w-full shadow-2xs"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-2xs"
                            >
                                <option value="all">All Status</option>
                                <option value="granted">Granted (200)</option>
                                <option value="denied">Blocked (403)</option>
                            </select>

                            {/* Date Filter */}
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-2xs"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                            </select>

                            {/* Export CSV */}
                            <button
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                                title="Export CSV Report"
                            >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Export CSV</span>
                            </button>

                            {/* Refresh */}
                            <button 
                                onClick={fetchHistory} 
                                className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition shadow-2xs cursor-pointer"
                                title="Refresh Logs"
                            >
                                <ArrowPathIcon className={`h-4 w-4 ${loading.history ? 'animate-spin text-indigo-600' : ''}`} />
                            </button>
                        </div>
                    )}
                </div>

                {/* LOGS TABLE VIEW */}
                <div className="relative">
                    {!selectedUserId ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                            <UserIcon className="h-16 w-16 mb-3 opacity-25 text-slate-300" />
                            <p className="text-sm font-bold text-slate-600">
                                Select a user from above to inspect digital access logs
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                You can track which book was streamed, download requests, and unauthorized blocks.
                            </p>
                        </div>
                    ) : loading.history ? (
                        <div className="py-20 text-center text-slate-400 text-xs font-bold animate-pulse">
                            Loading audit logs from security ledger...
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="py-20 text-center text-slate-500">
                            <DocumentTextIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-600">No records found for the selected criteria.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/80 text-[11px] uppercase text-slate-500 font-black border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3.5">Timestamp</th>
                                            <th className="px-6 py-3.5">Book Details</th>
                                            <th className="px-6 py-3.5">Access Channel</th>
                                            <th className="px-6 py-3.5 text-center">Status</th>
                                            <th className="px-6 py-3.5 text-right">Audit ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {paginatedData.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold">
                                                    {log.access_timestamp ? (
                                                        <>
                                                            <div className="font-bold text-slate-800">
                                                                {new Date(log.access_timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                {new Date(log.access_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        "N/A"
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link 
                                                        to={`/books/${log.book?.id}`} 
                                                        className="font-extrabold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2 group"
                                                    >
                                                        <BookOpenIcon className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
                                                        <span className="truncate max-w-xs">{log.book?.title || 'Unknown Book'}</span>
                                                    </Link>
                                                    <span className="text-[10.5px] text-slate-400 block mt-0.5 ml-6">
                                                        Author: {log.book?.author || 'N/A'} • Book ID: #{log.book?.id}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                        <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        Smart Reader Web
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <AccessBadge granted={log.access_granted} />
                                                </td>
                                                <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">
                                                    #{log.id}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <span className="text-xs font-bold text-slate-500">
                                        Showing page {currentPage} of {totalPages}
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DigitalAccessHistory;