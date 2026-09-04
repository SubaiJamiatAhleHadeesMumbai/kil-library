// src/pages/UserManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    UserGroupIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    XMarkIcon,
    NoSymbolIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';
import { userService } from '../api/userService';
import bulkActionService from '../api/bulkActionService';
import Modal from '../components/common/Modal';
import UserForm from '../components/user/UserForm';

const PAGE_SIZE = 10;

// Deterministic avatar color palette from username
const AVATAR_PALETTE = [
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-violet-100 text-violet-700 border-violet-200',
];

const avatarColorFor = (str = '') => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

// Safe Role Name Extractor (Handles Objects or Strings)
const getRoleName = (u) => {
    if (!u || !u.role) return 'Member';
    if (typeof u.role === 'object') {
        return u.role.name || u.role.title || 'Member';
    }
    return String(u.role);
};

const getRoleBadgeColor = (roleName) => {
    const r = (roleName || '').toLowerCase();
    if (r.includes('admin')) return 'bg-purple-50 text-purple-700 border-purple-200/80';
    if (r.includes('student')) return 'bg-blue-50 text-blue-700 border-blue-200/80';
    if (r.includes('editor')) return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    if (r.includes('member')) return 'bg-slate-100 text-slate-700 border-slate-200/80';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
};

// --- Table Skeleton Loader ---
const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-3 w-10 bg-slate-200 rounded-md" /></td>
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                    <div className="h-3 w-28 bg-slate-200 rounded-md" />
                    <div className="h-2.5 w-36 bg-slate-100 rounded-md" />
                </div>
            </div>
        </td>
        <td className="px-6 py-4 text-center"><div className="h-6 w-20 bg-slate-200 rounded-full mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded-full" /></td>
        <td className="px-6 py-4"><div className="h-7 w-16 bg-slate-200 rounded-xl ml-auto" /></td>
    </tr>
);

const UserManagement = () => {
    // --- Data state ---
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Filter / search state ---
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'staff' | 'public'
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'asc' });
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [serverTotalPages, setServerTotalPages] = useState(1);

    // --- Modal state ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [actionError, setActionError] = useState(null);

    // --- Delete confirmation state ---
    const [userPendingDelete, setUserPendingDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    
    // --- Password Reset Modal state ---
    const [userPendingPasswordReset, setUserPendingPasswordReset] = useState(null);
    const [newPasswordValue, setNewPasswordValue] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);

    // --- Bulk Action State ---
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        if (!userPendingPasswordReset || !newPasswordValue.trim()) return;
        if (newPasswordValue.trim().length < 4) {
            toast.error("Password must be at least 4 characters.");
            return;
        }

        try {
            setResettingPassword(true);
            const res = await userService.adminResetPassword(userPendingPasswordReset.id, newPasswordValue.trim());
            toast.success(res.message || `Password for ${userPendingPasswordReset.username} updated!`);
            setUserPendingPasswordReset(null);
            setNewPasswordValue('');
        } catch (err) {
            toast.error(err?.detail || "Failed to update password.");
        } finally {
            setResettingPassword(false);
        }
    };

    // Debounce search input
    useEffect(() => {
        const handle = setTimeout(() => setSearchTerm(searchInput), 250);
        return () => clearTimeout(handle);
    }, [searchInput]);

    // Reset pagination on filter change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, filterStatus, activeTab]);

    // --- Fetch Data ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                paginated: true,
                page,
                limit: PAGE_SIZE,
                search: searchTerm.trim() || undefined,
                status: filterStatus !== 'All' ? filterStatus : undefined,
            };
            const [usersRes, rolesData] = await Promise.all([
                userService.getAllUsers(params),
                userService.getAllRoles(),
            ]);

            if (usersRes && usersRes.items) {
                setUsers(usersRes.items);
                setTotalUsers(usersRes.total);
                setServerTotalPages(usersRes.total_pages);
            } else if (Array.isArray(usersRes)) {
                setUsers(usersRes);
                setTotalUsers(usersRes.length);
                setServerTotalPages(Math.ceil(usersRes.length / PAGE_SIZE) || 1);
            }
            setRoles(rolesData || []);
        } catch (err) {
            console.error('Error fetching users/roles:', err);
            setError('Failed to load user identity data. Please verify your connection.');
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm, filterStatus]);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    // --- Sorting (applied on current page) ---
    const sortedUsers = useMemo(() => {
        const data = [...users];
        const { key, direction } = sortConfig;
        data.sort((a, b) => {
            let aVal, bVal;
            if (key === 'role') { 
                aVal = getRoleName(a).toLowerCase(); 
                bVal = getRoleName(b).toLowerCase(); 
            } else { 
                aVal = (a[key] || '').toString().toLowerCase(); 
                bVal = (b[key] || '').toString().toLowerCase(); 
            }
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [users, sortConfig]);

    const toggleSort = (key) => {
        setSortConfig(prev => prev.key === key
            ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: 'asc' });
    };

    // --- Pagination ---
    const totalPages = serverTotalPages || 1;
    const pagedUsers = sortedUsers;

    // --- Stats ---
    const stats = useMemo(() => {
        const total = totalUsers || users.length;
        const active = users.filter(u => u.status === 'Active').length;
        const staffUsers = users.filter(u => getRoleName(u).toLowerCase() !== 'member').length;
        return { total, active, staffUsers };
    }, [users, totalUsers]);

    const hasActiveFilters = searchTerm || filterStatus !== 'All' || activeTab !== 'all';
    
    const resetFilters = () => {
        setSearchInput('');
        setSearchTerm('');
        setFilterStatus('All');
        setActiveTab('all');
    };

    // --- Handlers ---
    const handleAddUser = () => {
        setEditingUser(null);
        setActionError(null);
        setIsEditModalOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setActionError(null);
        setIsEditModalOpen(true);
    };

    const requestDeleteUser = (user) => setUserPendingDelete(user);

    const confirmDeleteUser = async () => {
        if (!userPendingDelete) return;
        const { id, username } = userPendingDelete;
        setDeletingId(id);
        const toastId = toast.loading(`Revoking identity for ${username}...`);
        try {
            await userService.deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            toast.success(`Access revoked for ${username}.`, { id: toastId });
        } catch (err) {
            toast.error(err?.detail || 'Failed to revoke user access.', { id: toastId });
        } finally {
            setDeletingId(null);
            setUserPendingDelete(null);
        }
    };

    const handleBulkAction = async (action) => {
        if (!selectedUsers.size) return;
        const confirmMsg = `Are you sure you want to ${action} ${selectedUsers.size} users?`;
        if (!window.confirm(confirmMsg)) return;
        setBulkActionLoading(true);
        try {
            const result = await bulkActionService.bulkUserAction(action, [...selectedUsers]);
            toast.success(result.message);
            setSelectedUsers(new Set());
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Bulk action failed');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(new Set(pagedUsers.map(u => u.id)));
        } else {
            setSelectedUsers(new Set());
        }
    };

    const toggleSelectUser = (id) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const SortHeader = ({ label, sortKey, className = '' }) => (
        <th
            className={`px-6 py-4 cursor-pointer select-none group ${className}`}
            onClick={() => toggleSort(sortKey)}
        >
            <span className="inline-flex items-center gap-1.5">
                {label}
                <span className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <ChevronUpIcon className={`h-3 w-3 ${sortConfig.key === sortKey && sortConfig.direction === 'asc' ? 'opacity-100 text-indigo-600 font-bold' : ''}`} />
                    <ChevronDownIcon className={`h-3 w-3 ${sortConfig.key === sortKey && sortConfig.direction === 'desc' ? 'opacity-100 text-indigo-600 font-bold' : ''}`} />
                </span>
            </span>
        </th>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50/50 min-h-screen font-sans">
            
            {/* --- HEADER SECTION --- */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-slate-900 to-slate-800 text-indigo-400 rounded-2xl shadow-md border border-slate-800">
                            <UserGroupIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                User Identity Management
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                Control system roles, user credentials, and permission access privileges.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <button
                        onClick={fetchData}
                        className="p-3 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-2xl transition-all shadow-xs border border-slate-200/60 active:scale-95"
                        title="Refresh Users"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>

                    <button
                        onClick={handleAddUser}
                        className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-slate-900/15 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-slate-700/50"
                    >
                        <PlusIcon className="w-5 h-5 mr-2 text-indigo-400" />
                        Provision New User
                    </button>
                </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
                <div className="flex items-center justify-between gap-4 p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-rose-700 shadow-xs">
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
                        <ShieldExclamationIcon className="h-5 w-5 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 text-xs font-bold text-rose-800 hover:underline shrink-0"
                    >
                        <ArrowPathIcon className="h-4 w-4" /> Retry
                    </button>
                </div>
            )}

            {/* --- STATS SUMMARY CARDS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Accounts</p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{loading ? '—' : stats.total}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs border-l-4 border-l-emerald-500 space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sessions</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600">{loading ? '—' : stats.active}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs border-l-4 border-l-indigo-500 space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff & Admin Users</p>
                    <p className="text-2xl sm:text-3xl font-black text-indigo-600">{loading ? '—' : stats.staffUsers}</p>
                </div>
            </div>

            {/* --- MAIN USER TABLE & FILTERS --- */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">

                {/* Toolbar */}
                <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-slate-50/50">

                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-200/70 rounded-2xl w-full md:w-auto overflow-x-auto">
                        {[
                            { id: 'all', label: 'Global List' },
                            { id: 'staff', label: 'Staff / Admin' },
                            { id: 'public', label: 'Public Members' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                    ? 'bg-slate-900 text-indigo-400 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Filter Dropdown */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-grow min-w-[200px]">
                            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by username, email..."
                                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 text-xs font-medium text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <select
                            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shrink-0"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
                {selectedUsers.size > 0 && (
                  <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-indigo-50 border-b border-indigo-100">
                    <span className="text-sm font-bold text-indigo-700">{selectedUsers.size} selected</span>
                    <button disabled={bulkActionLoading} onClick={() => handleBulkAction('suspend')} className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition disabled:opacity-50">Suspend</button>
                    <button disabled={bulkActionLoading} onClick={() => handleBulkAction('activate')} className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition disabled:opacity-50">Activate</button>
                    <button disabled={bulkActionLoading} onClick={() => handleBulkAction('delete')} className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition disabled:opacity-50">Delete Selected</button>
                    <button disabled={bulkActionLoading} onClick={() => setSelectedUsers(new Set())} className="ml-auto px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition disabled:opacity-50">Clear</button>
                  </div>
                )}

                {/* Table (Desktop) */}
                <div className="overflow-x-auto max-h-[700px] hidden md:block">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50/95 z-10 backdrop-blur-xs shadow-2xs">
                            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={pagedUsers.length > 0 && selectedUsers.size === pagedUsers.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4">Security ID</th>
                                <SortHeader label="User Account" sortKey="username" />
                                <SortHeader label="Role Level" sortKey="role" className="text-center" />
                                <SortHeader label="Account Status" sortKey="status" />
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : pagedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                                        <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 opacity-20 text-slate-500" />
                                        {hasActiveFilters ? (
                                            <>
                                                <p className="font-bold text-slate-800">No users match your filters.</p>
                                                <button onClick={resetFilters} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
                                                    Reset filters
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-bold text-slate-800">No user accounts found.</p>
                                                <button onClick={handleAddUser} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
                                                    Provision first user
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                pagedUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={selectedUsers.has(user.id)}
                                                onChange={() => toggleSelectUser(user.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">
                                            #{String(user.id).padStart(3, '0')}
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-xs" />
                                                ) : (
                                                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center font-extrabold text-sm uppercase shadow-xs ${avatarColorFor(user.username)}`}>
                                                        {(user.username || '?').charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                                        {user.username}
                                                    </p>
                                                    <p className="text-slate-400 text-xs truncate">
                                                        {user.email || 'No email associated'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-extrabold border uppercase tracking-wider ${getRoleBadgeColor(getRoleName(user))}`}>
                                                {getRoleName(user).toUpperCase()}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                <span className={`h-2 w-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                {user.status || 'Active'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setUserPendingPasswordReset(user);
                                                        setNewPasswordValue('');
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                                    title="Reset / Change Password"
                                                    aria-label={`Reset password for ${user.username}`}
                                                >
                                                    <KeyIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                                    title="Edit user details"
                                                    aria-label={`Edit ${user.username}`}
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => requestDeleteUser(user)}
                                                    disabled={deletingId === user.id}
                                                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-40"
                                                    title="Revoke access"
                                                    aria-label={`Revoke access for ${user.username}`}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-4 animate-pulse flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-1/2 bg-slate-200 rounded" />
                                    <div className="h-2.5 w-1/3 bg-slate-100 rounded" />
                                </div>
                            </div>
                        ))
                    ) : pagedUsers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-bold text-slate-800">No user accounts found.</p>
                        </div>
                    ) : (
                        pagedUsers.map(user => (
                            <div key={user.id} className="p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                                    ) : (
                                        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center font-bold text-sm uppercase shrink-0 ${avatarColorFor(user.username)}`}>
                                            {(user.username || '?').charAt(0)}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900 text-xs truncate">{user.username}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase border ${getRoleBadgeColor(getRoleName(user))}`}>
                                                {getRoleName(user)}
                                            </span>
                                            <span className={`text-[10px] font-bold ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                • {user.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => {
                                            setUserPendingPasswordReset(user);
                                            setNewPasswordValue('');
                                        }}
                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl"
                                        title="Reset Password"
                                    >
                                        <KeyIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleEditUser(user)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl">
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => requestDeleteUser(user)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* --- PAGINATION FOOTER --- */}
                {!loading && sortedUsers.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500 font-medium">
                            Showing <span className="font-bold text-slate-800">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedUsers.length)}</span> of <span className="font-bold text-slate-800">{sortedUsers.length}</span>
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200/80 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                            >
                                <ChevronLeftIcon className="h-3.5 w-3.5" /> Previous
                            </button>
                            <span className="text-xs font-bold text-slate-700 px-2">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200/80 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                            >
                                Next <ChevronRightIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- ADD / EDIT USER MODAL --- */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={editingUser ? 'Identity Update' : 'New User Provisioning'}
                size="max-w-2xl"
            >
                <UserForm
                    key={editingUser?.id || 'new'}
                    initialData={editingUser}
                    roles={roles}
                    isEditing={!!editingUser}
                    onError={(message) => setActionError(message)}
                    onSubmitSuccess={() => {
                        fetchData();
                        setIsEditModalOpen(false);
                        toast.success(editingUser ? 'User updated successfully.' : 'User created successfully.');
                    }}
                    onCancel={() => setIsEditModalOpen(false)}
                />

                {actionError && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl text-center font-bold">
                        ⚠️ {actionError}
                    </div>
                )}
            </Modal>

            {/* --- DELETE CONFIRMATION MODAL --- */}
            <Modal
                isOpen={!!userPendingDelete}
                onClose={() => setUserPendingDelete(null)}
                title="Revoke Access"
                size="max-w-md"
            >
                <div className="space-y-4">
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3">
                        <NoSymbolIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Warning: Revoke Access</h4>
                            <p className="text-xs text-rose-700 leading-relaxed">
                                Are you sure you want to remove user account <strong className="font-bold">{userPendingDelete?.username}</strong>?
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setUserPendingDelete(null)}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteUser}
                            disabled={deletingId === userPendingDelete?.id}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md disabled:opacity-60"
                        >
                            {deletingId === userPendingDelete?.id ? 'Removing...' : 'Remove User'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- ADMIN PASSWORD RESET MODAL --- */}
            <Modal
                isOpen={!!userPendingPasswordReset}
                onClose={() => {
                    setUserPendingPasswordReset(null);
                    setNewPasswordValue('');
                }}
                title={`Change Password: ${userPendingPasswordReset?.username || ''}`}
                size="max-w-md"
            >
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
                        <KeyIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 leading-relaxed">
                            Set a new password for <strong className="font-bold">{userPendingPasswordReset?.username}</strong> ({userPendingPasswordReset?.email}). The user can log in immediately with this new password.
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            New Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Enter new password (e.g. admin123)"
                            value={newPasswordValue}
                            onChange={(e) => setNewPasswordValue(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:border-[#002147] outline-none transition"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Minimum 4 characters.</p>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setUserPendingPasswordReset(null);
                                setNewPasswordValue('');
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={resettingPassword || !newPasswordValue.trim()}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#002147] hover:bg-[#003166] transition shadow-md disabled:opacity-40 cursor-pointer"
                        >
                            {resettingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
};

export default UserManagement;