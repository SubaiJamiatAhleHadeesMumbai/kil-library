// src/pages/UserManagement.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
} from '@heroicons/react/24/outline';
import { userService } from '../api/userService';
import Modal from '../components/common/Modal';
import UserForm from '../components/user/UserForm';
import '../assets/css/ManagementPages.css';

const PAGE_SIZE = 10;

// Deterministic avatar color from username, so the same person always
// gets the same color instead of everyone looking identical in indigo.
const AVATAR_PALETTE = [
    'bg-indigo-100 text-indigo-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
    'bg-rose-100 text-rose-600',
    'bg-sky-100 text-sky-600',
    'bg-violet-100 text-violet-600',
];
const avatarColorFor = (str = '') => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const getRoleBadgeColor = (roleName) => {
    const r = roleName?.toLowerCase() || '';
    if (r.includes('admin')) return 'bg-purple-100 text-purple-700 ring-purple-600/20';
    if (r === 'student') return 'bg-blue-100 text-blue-700 ring-blue-600/20';
    if (r === 'editor') return 'bg-indigo-100 text-indigo-700 ring-indigo-600/20';
    if (r === 'member') return 'bg-slate-100 text-slate-700 ring-slate-600/20';
    return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
};

// --- Skeleton row shown while loading, matches real row height so there's
// no layout jump once data arrives.
const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-3 w-10 bg-slate-200 rounded" /></td>
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="space-y-2">
                    <div className="h-3 w-28 bg-slate-200 rounded" />
                    <div className="h-2.5 w-36 bg-slate-100 rounded" />
                </div>
            </div>
        </td>
        <td className="px-6 py-4 text-center"><div className="h-5 w-16 bg-slate-200 rounded mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-3 w-14 bg-slate-200 rounded" /></td>
        <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-100 rounded ml-auto" /></td>
    </tr>
);

const UserManagement = () => {
    // --- Data state ---
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Filter / search state ---
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'staff', 'public'
    const [searchInput, setSearchInput] = useState(''); // raw input, updates instantly
    const [searchTerm, setSearchTerm] = useState('');   // debounced value used for filtering
    const [filterStatus, setFilterStatus] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'asc' });
    const [page, setPage] = useState(1);

    // --- Modal state ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null = new user
    const [actionError, setActionError] = useState(null);

    // --- Delete confirmation state (replaces window.confirm for a consistent UI) ---
    const [userPendingDelete, setUserPendingDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Debounce search input -> searchTerm, avoids re-filtering on every keystroke
    useEffect(() => {
        const handle = setTimeout(() => setSearchTerm(searchInput), 250);
        return () => clearTimeout(handle);
    }, [searchInput]);

    // Reset to page 1 whenever the effective result set could change shape
    useEffect(() => {
        setPage(1);
    }, [searchTerm, filterStatus, activeTab]);

    // --- Fetch data ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersData, rolesData] = await Promise.all([
                userService.getAllUsers(),
                userService.getAllRoles(),
            ]);
            setUsers(usersData || []);
            setRoles(rolesData || []);
        } catch (err) {
            console.error('Error fetching users/roles:', err);
            setError('Failed to load user data. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Filtering ---
    const roleNameOf = (u) => (u.role?.name || u.role || '').toLowerCase();

    const filteredUsers = useMemo(() => {
        let data = users;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(u =>
                (u.username || '').toLowerCase().includes(lowerTerm) ||
                (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
                (u.full_name && u.full_name.toLowerCase().includes(lowerTerm))
            );
        }

        if (filterStatus !== 'All') {
            data = data.filter(u => u.status === filterStatus);
        }

        if (activeTab === 'staff') {
            data = data.filter(u => roleNameOf(u) !== 'member');
        } else if (activeTab === 'public') {
            data = data.filter(u => roleNameOf(u) === 'member');
        }

        return data;
    }, [users, searchTerm, filterStatus, activeTab]);

    // --- Sorting ---
    const sortedUsers = useMemo(() => {
        const data = [...filteredUsers];
        const { key, direction } = sortConfig;
        data.sort((a, b) => {
            let aVal, bVal;
            if (key === 'role') { aVal = roleNameOf(a); bVal = roleNameOf(b); }
            else { aVal = (a[key] || '').toString().toLowerCase(); bVal = (b[key] || '').toString().toLowerCase(); }
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [filteredUsers, sortConfig]);

    const toggleSort = (key) => {
        setSortConfig(prev => prev.key === key
            ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: 'asc' });
    };

    // --- Pagination ---
    const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
    const pagedUsers = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return sortedUsers.slice(start, start + PAGE_SIZE);
    }, [sortedUsers, page]);

    // --- Stats ---
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.status === 'Active').length;
        const restricted = users.filter(u => roleNameOf(u) !== 'member').length;
        return { total, active, restricted };
    }, [users]);

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
        const toastId = toast.loading(`Removing ${username}...`);
        try {
            await userService.deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            toast.success(`${username} was removed.`, { id: toastId });
        } catch (err) {
            toast.error(err?.detail || 'Failed to delete user.', { id: toastId });
        } finally {
            setDeletingId(null);
            setUserPendingDelete(null);
        }
    };

    const SortHeader = ({ label, sortKey, className = '' }) => (
        <th
            className={`px-6 py-4 cursor-pointer select-none group ${className}`}
            onClick={() => toggleSort(sortKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <span className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-80">
                    <ChevronUpIcon className={`h-3 w-3 ${sortConfig.key === sortKey && sortConfig.direction === 'asc' ? 'opacity-100 text-indigo-600' : ''}`} />
                    <ChevronDownIcon className={`h-3 w-3 ${sortConfig.key === sortKey && sortConfig.direction === 'desc' ? 'opacity-100 text-indigo-600' : ''}`} />
                </span>
            </span>
        </th>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header & Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <UserGroupIcon className="h-8 w-8 text-indigo-600" />
                        Identity Management
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Control system access levels and user accounts.</p>
                </div>
                <button
                    onClick={handleAddUser}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all active:scale-95 shrink-0"
                >
                    <PlusIcon className="h-5 w-5" /> Provision New User
                </button>
            </div>

            {/* Error banner — was previously captured in state but never shown */}
            {error && (
                <div className="flex items-center justify-between gap-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <ShieldExclamationIcon className="h-5 w-5 shrink-0" />
                        {error}
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 text-sm font-bold text-rose-700 hover:text-rose-900 shrink-0"
                    >
                        <ArrowPathIcon className="h-4 w-4" /> Retry
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Entities</p>
                    <p className="text-3xl font-black text-slate-800">{loading ? '—' : stats.total}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
                    <p className="text-xs font-bold text-slate-400 uppercase">Active Sessions</p>
                    <p className="text-3xl font-black text-emerald-600">{loading ? '—' : stats.active}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
                    <p className="text-xs font-bold text-slate-400 uppercase">Managed Users (Staff/Students)</p>
                    <p className="text-3xl font-black text-orange-600">{loading ? '—' : stats.restricted}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-slate-50/50">

                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-200/60 rounded-xl w-full md:w-auto overflow-x-auto">
                        {['all', 'staff', 'public'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all whitespace-nowrap ${
                                    activeTab === tab
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {tab === 'all' ? 'Global List' : tab === 'staff' ? 'Staff / Managed' : 'Public Members'}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-grow min-w-[180px]">
                            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Identify by username..."
                                className="w-full pl-10 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs leading-none"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <select
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">Any Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Table (md and up) */}
                <div className="overflow-x-auto hidden md:block flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Security ID</th>
                                <SortHeader label="Account Profile" sortKey="username" />
                                <SortHeader label="Authorization Level" sortKey="role" className="text-center" />
                                <SortHeader label="Status" sortKey="status" />
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : pagedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                        <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        {hasActiveFilters ? (
                                            <>
                                                <p className="font-medium">No users match your current filters.</p>
                                                <button onClick={resetFilters} className="mt-3 text-sm font-bold text-indigo-600 hover:underline">
                                                    Clear filters
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium">No users yet.</p>
                                                <button onClick={handleAddUser} className="mt-3 text-sm font-bold text-indigo-600 hover:underline">
                                                    Provision your first user
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                pagedUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                            #{String(user.id).padStart(3, '0')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg uppercase ${avatarColorFor(user.username)}`}>
                                                        {(user.username || '?').charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 truncate">{user.username}</p>
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getRoleBadgeColor(user.role?.name || user.role)}`}>
                                                {(user.role?.name || user.role || 'N/A').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                <span className={`h-2 w-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit identity"
                                                    aria-label={`Edit ${user.username}`}
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => requestDeleteUser(user)}
                                                    disabled={deletingId === user.id}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                                                    title="Revoke access"
                                                    aria-label={`Revoke access for ${user.username}`}
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Card list (below md) — avoids forcing a wide table into horizontal scroll on phones */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-4 animate-pulse flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-200" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-1/2 bg-slate-200 rounded" />
                                    <div className="h-2.5 w-1/3 bg-slate-100 rounded" />
                                </div>
                            </div>
                        ))
                    ) : pagedUsers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            {hasActiveFilters ? (
                                <>
                                    <p className="font-medium">No users match your current filters.</p>
                                    <button onClick={resetFilters} className="mt-3 text-sm font-bold text-indigo-600 hover:underline">Clear filters</button>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium">No users yet.</p>
                                    <button onClick={handleAddUser} className="mt-3 text-sm font-bold text-indigo-600 hover:underline">Provision your first user</button>
                                </>
                            )}
                        </div>
                    ) : (
                        pagedUsers.map(user => (
                            <div key={user.id} className="p-4 flex items-center gap-3">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-lg uppercase shrink-0 ${avatarColorFor(user.username)}`}>
                                        {(user.username || '?').charAt(0)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 truncate">{user.username}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getRoleBadgeColor(user.role?.name || user.role)}`}>
                                            {(user.role?.name || user.role || 'N/A').toUpperCase()}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                            {user.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                    <button onClick={() => handleEditUser(user)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" aria-label={`Edit ${user.username}`}>
                                        <PencilSquareIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => requestDeleteUser(user)}
                                        disabled={deletingId === user.id}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-40"
                                        aria-label={`Revoke access for ${user.username}`}
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {!loading && sortedUsers.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedUsers.length)}</span> of <span className="font-semibold text-slate-700">{sortedUsers.length}</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-600 px-2">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Add / Edit User Modal --- */}
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
                        toast.success(editingUser ? 'User updated.' : 'User created.');
                    }}
                    onCancel={() => setIsEditModalOpen(false)}
                />

                {actionError && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl text-center font-medium">
                        ⚠️ {actionError}
                    </div>
                )}
            </Modal>

            {/* --- Delete Confirmation Modal (replaces window.confirm for visual consistency) --- */}
            <Modal
                isOpen={!!userPendingDelete}
                onClose={() => setUserPendingDelete(null)}
                title="Revoke Access"
                size="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Are you sure you want to remove{' '}
                        <span className="font-bold text-slate-900">{userPendingDelete?.username}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setUserPendingDelete(null)}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteUser}
                            disabled={deletingId === userPendingDelete?.id}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-60"
                        >
                            {deletingId === userPendingDelete?.id ? 'Removing...' : 'Remove User'}
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default UserManagement;  