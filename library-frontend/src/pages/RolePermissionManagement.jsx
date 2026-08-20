import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    PencilIcon,
    TrashIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    ListBulletIcon,
    NoSymbolIcon,
    KeyIcon,
    MapPinIcon,
    XMarkIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { rolePermissionService } from '../api/rolePermissionService';
import { getPermissionLabel } from '../utils/permissionLabels';

// --- Config: Pinned/Featured Homepage Permissions ---
const PINNED_PERMISSIONS = [
    {
        name: 'HOMEPAGE_BRANDING_MANAGE',
        icon: KeyIcon,
        highlightClass: 'ring-2 ring-cyan-400/40 border-cyan-300 bg-cyan-50/50',
        description: 'Allows editing homepage visual identity such as theme, title, language, and hero badge.',
    },
    {
        name: 'HOMEPAGE_CONTENT_MANAGE',
        icon: PencilIcon,
        highlightClass: 'ring-2 ring-indigo-400/40 border-indigo-300 bg-indigo-50/50',
        description: 'Allows editing homepage section text, headings, order, and featured books.',
    },
    {
        name: 'HOMEPAGE_LAYOUT_MANAGE',
        icon: AdjustmentsHorizontalIcon,
        highlightClass: 'ring-2 ring-emerald-400/40 border-emerald-300 bg-emerald-50/50',
        description: 'Allows editing layout extras like stats cards, strip visibility, and optional blocks.',
    },
    {
        name: 'HOMEPAGE_VISIBILITY_MANAGE',
        icon: ShieldCheckIcon,
        highlightClass: 'ring-2 ring-purple-400/40 border-purple-300 bg-purple-50/50',
        description: 'Allows showing or hiding homepage sections from public users.',
    },
    {
        name: 'HOMEPAGE_SEARCH_MANAGE',
        icon: MapPinIcon,
        highlightClass: 'ring-2 ring-amber-400/40 border-amber-300 bg-amber-50/50',
        description: 'Allows editing homepage search behavior (hint, voice, deep search, suggestions, placeholder).',
    },
];

// --- Spinner Component ---
const Spinner = ({ className = "text-purple-600" }) => (
    <svg className={`animate-spin h-5 w-5 ${className}`} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

const RolePermissionManagement = () => {
    // --- State Management ---
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [loading, setLoading] = useState({
        init: true,
        roleAction: false,
        assignment: false,
    });

    const [roleForm, setRoleForm] = useState({ name: '', editing: null });
    const [selectedRole, setSelectedRole] = useState({ id: '', permissions: new Set() });

    // Tracks whether local permissions have unsaved edits
    const [isDirty, setIsDirty] = useState(false);

    // Guard against race conditions when switching roles
    const latestRoleRequestRef = useRef(null);

    // --- Data Fetching ---
    const loadSystemData = useCallback(async () => {
        setLoading(prev => ({ ...prev, init: true }));
        try {
            const [rolesData, permsData] = await Promise.all([
                rolePermissionService.getAllRoles(),
                rolePermissionService.getAllPermissions()
            ]);
            setRoles(rolesData || []);
            setAllPermissions(permsData || []);
        } catch (err) {
            toast.error("Failed to sync security data.");
        } finally {
            setLoading(prev => ({ ...prev, init: false }));
        }
    }, []);

    useEffect(() => { 
        loadSystemData(); 
    }, [loadSystemData]);

    // --- Filtered Permissions ---
    const filteredPermissions = useMemo(() => {
        if (!searchTerm.trim()) return allPermissions;
        const lowerTerm = searchTerm.toLowerCase();
        return allPermissions.filter(p =>
            p.name.toLowerCase().includes(lowerTerm) ||
            (p.description && p.description.toLowerCase().includes(lowerTerm))
        );
    }, [allPermissions, searchTerm]);

    // Lookup map for pinned permissions
    const pinnedPermissionObjects = useMemo(() => {
        const map = {};
        PINNED_PERMISSIONS.forEach(cfg => {
            map[cfg.name] = allPermissions.find(
                p => String(p.name).toUpperCase() === cfg.name
            );
        });
        return map;
    }, [allPermissions]);

    // --- Helpers ---
    const humanize = (name) => {
        if (!name) return '';
        return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    };

    const displayLabel = (perm) => {
        return getPermissionLabel(String(perm.name)) || humanize(perm.name);
    };

    const highlightPermission = (permName) => {
        try {
            const safeName = window.CSS && CSS.escape ? CSS.escape(permName) : permName;
            const el = document.querySelector(`[data-perm="${safeName}"]`);
            if (!el) return;
            el.classList.add('ring-4', 'ring-purple-400', 'transition-all');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => el.classList.remove('ring-4', 'ring-purple-400'), 1500);
        } catch (e) {
            console.warn('Highlight failed', e);
        }
    };

    // --- Role Permissions Handlers ---
    const fetchRolePermissions = async (roleId) => {
        if (!roleId) {
            setSelectedRole({ id: '', permissions: new Set() });
            setIsDirty(false);
            latestRoleRequestRef.current = null;
            return;
        }

        if (isDirty) {
            const proceed = window.confirm(
                'You have unsaved permission changes. Switching roles will discard them. Continue?'
            );
            if (!proceed) return;
        }

        const requestId = String(roleId);
        latestRoleRequestRef.current = requestId;

        setLoading(prev => ({ ...prev, assignment: true }));
        try {
            const data = await rolePermissionService.getRoleDetails(roleId);

            if (latestRoleRequestRef.current !== requestId) return;

            const permissionIds = (data.permissions || []).map(p => p.id);
            setSelectedRole({ id: roleId, permissions: new Set(permissionIds) });
            setIsDirty(false);
        } catch (err) {
            if (latestRoleRequestRef.current === requestId) {
                toast.error("Could not fetch role permissions.");
            }
        } finally {
            if (latestRoleRequestRef.current === requestId) {
                setLoading(prev => ({ ...prev, assignment: false }));
            }
        }
    };

    const togglePermission = (id) => {
        if (!selectedRole.id) return;
        setSelectedRole(prev => {
            const next = new Set(prev.permissions);
            next.has(id) ? next.delete(id) : next.add(id);
            return { ...prev, permissions: next };
        });
        setIsDirty(true);
    };

    const selectAllVisible = () => {
        if (!selectedRole.id) return;
        setSelectedRole(prev => {
            const next = new Set(prev.permissions);
            filteredPermissions.forEach(p => next.add(p.id));
            return { ...prev, permissions: next };
        });
        setIsDirty(true);
        toast.success(`Selected ${filteredPermissions.length} permissions`);
    };

    const clearAllVisible = () => {
        if (!selectedRole.id) return;
        setSelectedRole(prev => {
            const next = new Set(prev.permissions);
            filteredPermissions.forEach(p => next.delete(p.id));
            return { ...prev, permissions: next };
        });
        setIsDirty(true);
        toast.success("Cleared permission selection");
    };

    const handleSavePermissions = async () => {
        if (!selectedRole.id) return;

        const toastId = toast.loading("Syncing role permissions...");
        setLoading(prev => ({ ...prev, assignment: true }));

        try {
            const ids = Array.from(selectedRole.permissions);
            await rolePermissionService.updatePermissionsForRole(selectedRole.id, ids);
            setIsDirty(false);
            toast.success("Role permissions updated successfully!", { id: toastId });
        } catch (err) {
            toast.error("Permission update failed.", { id: toastId });
        } finally {
            setLoading(prev => ({ ...prev, assignment: false }));
        }
    };

    // Toggle Pinned Permission
    const togglePinnedPermission = async (permConfig, shouldAdd) => {
        if (!selectedRole.id) {
            toast.error('Please select a role first');
            return;
        }

        const permObj = pinnedPermissionObjects[permConfig.name];
        if (!permObj) {
            toast.error('Permission not loaded yet');
            return;
        }

        if (!shouldAdd) {
            const confirmRemove = window.confirm(
                `Remove "${displayLabel(permObj)}" from selected role?`
            );
            if (!confirmRemove) return;
        }

        const toastId = toast.loading(shouldAdd ? 'Assigning permission...' : 'Removing permission...');
        try {
            const freshData = await rolePermissionService.getRoleDetails(selectedRole.id);
            const freshIds = new Set((freshData.permissions || []).map(p => p.id));

            if (shouldAdd) {
                freshIds.add(permObj.id);
            } else {
                freshIds.delete(permObj.id);
            }

            const nextIds = Array.from(freshIds);
            await rolePermissionService.updatePermissionsForRole(selectedRole.id, nextIds);

            toast.success(
                shouldAdd
                    ? `Assigned "${displayLabel(permObj)}" to role`
                    : `Removed "${displayLabel(permObj)}" from role`,
                { id: toastId }
            );

            const updatedRoles = await rolePermissionService.getAllRoles();
            setRoles(updatedRoles);
            setSelectedRole({ id: selectedRole.id, permissions: freshIds });
            setIsDirty(false);
        } catch (err) {
            toast.error(shouldAdd ? 'Could not assign permission' : 'Could not remove permission', { id: toastId });
        }
    };

    // Role CRUD Handlers
    const handleRoleSubmit = async (e) => {
        e.preventDefault();

        if (!roleForm.name.trim()) {
            toast.error("Please enter a role name.");
            return;
        }

        const isEdit = !!roleForm.editing;
        const toastId = toast.loading(isEdit ? "Updating role..." : "Creating role...");
        setLoading(prev => ({ ...prev, roleAction: true }));

        try {
            if (isEdit) {
                await rolePermissionService.updateRole(roleForm.editing.id, { name: roleForm.name.trim() });
                toast.success(`Role "${roleForm.name}" updated.`, { id: toastId });
            } else {
                await rolePermissionService.createRole({ name: roleForm.name.trim() });
                toast.success(`Role "${roleForm.name}" created.`, { id: toastId });
            }

            setRoleForm({ name: '', editing: null });
            const newRoles = await rolePermissionService.getAllRoles();
            setRoles(newRoles);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Role operation failed.", { id: toastId });
        } finally {
            setLoading(prev => ({ ...prev, roleAction: false }));
        }
    };

    const handleDeleteRole = async (id, roleName) => {
        if (['admin', 'member', 'superadmin'].includes(roleName.toLowerCase())) {
            toast.error("System protected roles cannot be deleted.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete the "${roleName}" role?`)) return;

        const toastId = toast.loading("Deleting role...");
        try {
            await rolePermissionService.deleteRole(id);
            setRoles(prev => prev.filter(r => r.id !== id));

            if (String(selectedRole.id) === String(id)) {
                setSelectedRole({ id: '', permissions: new Set() });
                setIsDirty(false);
                latestRoleRequestRef.current = null;
            }

            toast.success("Role deleted.", { id: toastId });
        } catch (err) {
            toast.error("Could not delete role.", { id: toastId });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50/50 min-h-screen font-sans">
            
            {/* --- HEADER SECTION --- */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-slate-900 to-slate-800 text-purple-400 rounded-2xl shadow-md border border-slate-800">
                            <ShieldCheckIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Access Control & Roles
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                Configure system roles, user privilege matrix, and security permissions.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <button
                        onClick={loadSystemData}
                        className="p-3 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-2xl transition-all shadow-xs border border-slate-200/60 active:scale-95"
                        title="Sync Security Matrix"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading.init ? 'animate-spin text-purple-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* --- MAIN GRID LAYOUT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- Left Column: Role Registry --- */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-full">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <KeyIcon className="h-4 w-4 text-purple-600" /> Role Registry
                        </h3>

                        {/* Create/Edit Role Form */}
                        <form onSubmit={handleRoleSubmit} className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-xs font-semibold text-slate-800 placeholder-slate-400"
                                placeholder="Enter role title..."
                                value={roleForm.name}
                                onChange={e => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                                disabled={loading.roleAction}
                            />
                            <div className="flex gap-2">
                                {roleForm.editing && (
                                    <button 
                                        type="button" 
                                        onClick={() => setRoleForm({ name: '', editing: null })}
                                        className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 text-xs transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    className={`flex-[2] py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs text-white shadow-md
                                        ${roleForm.editing ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/10'} 
                                        disabled:opacity-50 disabled:cursor-not-allowed`}
                                    disabled={loading.roleAction || !roleForm.name.trim()}
                                >
                                    {loading.roleAction ? <Spinner className="text-white h-3.5 w-3.5" /> : (roleForm.editing ? <PencilIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5 text-purple-400" />)}
                                    {roleForm.editing ? 'Update Role' : 'Add New Role'}
                                </button>
                            </div>
                        </form>

                        {/* Role List */}
                        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar space-y-2">
                            {loading.init ? (
                                <div className="space-y-3 p-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : roles.length > 0 ? roles.map(role => {
                                const isSelected = String(selectedRole.id) === String(role.id);
                                return (
                                    <motion.div
                                        key={role.id}
                                        whileHover={{ x: 2 }}
                                        className={`group relative p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                                            isSelected
                                            ? 'bg-purple-50/80 border-purple-500/50 shadow-xs'
                                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                                        }`}
                                        onClick={() => fetchRolePermissions(role.id)}
                                    >
                                        {/* Left Active Glow Pill */}
                                        {isSelected && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r-full shadow-xs" />
                                        )}

                                        <span className={`font-bold text-xs pl-2 ${isSelected ? 'text-purple-950' : 'text-slate-700'}`}>
                                            {role.name}
                                            {isSelected && isDirty && (
                                                <span className="ml-2 text-[10px] font-extrabold text-amber-600">● unsaved</span>
                                            )}
                                        </span>

                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setRoleForm({ name: role.name, editing: role }); }}
                                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                title="Edit Role Name"
                                            >
                                                <PencilIcon className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.name); }}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete Role"
                                            >
                                                <TrashIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <div className="p-8 text-center text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-2xl">
                                    No roles registered.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Permission Matrix --- */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-full min-h-[600px] overflow-hidden">

                        {/* Toolbar Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs text-purple-600 shrink-0">
                                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-extrabold text-slate-900">Permission Matrix</h3>
                                    <p className="text-xs text-slate-500 truncate font-medium">
                                        {selectedRole.id
                                            ? <span className="text-purple-600 font-bold">Editing Role: {roles.find(r => String(r.id) === String(selectedRole.id))?.name}</span>
                                            : "Select a role from the left registry to configure access permissions."}
                                    </p>
                                </div>
                            </div>

                            {/* Search & Pinned Quick Actions Bar */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search Input */}
                                <div className="relative flex-1 min-w-[220px]">
                                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search permissions..."
                                        className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs font-semibold outline-none shadow-2xs"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            title="Clear search"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Pinned Quick Actions */}
                                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                    {PINNED_PERMISSIONS.map(cfg => {
                                        const permObj = pinnedPermissionObjects[cfg.name];
                                        const Icon = cfg.icon;
                                        const label = displayLabel({ name: cfg.name });
                                        return (
                                            <React.Fragment key={cfg.name}>
                                                <button
                                                    type="button"
                                                    title={`Locate ${label}`}
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setTimeout(() => highlightPermission(cfg.name), 120);
                                                    }}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-all shadow-2xs shrink-0"
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => togglePinnedPermission(cfg, true)}
                                                    title={`Assign ${label} to role`}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all shadow-2xs shrink-0"
                                                >
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => togglePinnedPermission(cfg, false)}
                                                    title={`Remove ${label} from role`}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all shadow-2xs shrink-0"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Permissions Matrix Grid */}
                        <div className="flex-1 p-6 overflow-y-auto max-h-[600px] custom-scrollbar bg-white">
                            {!selectedRole.id ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-16">
                                    <ShieldCheckIcon className="h-16 w-16 mb-3 opacity-20 text-slate-500" />
                                    <p className="text-xs text-slate-400 font-bold">Select a role from the registry to view & edit privileges</p>
                                </div>
                            ) : loading.assignment ? (
                                <div className="h-full flex flex-col items-center justify-center py-20">
                                    <Spinner className="h-8 w-8 text-purple-600" />
                                    <p className="mt-3 text-xs font-bold text-slate-500">Syncing permissions...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            Available Security Permissions ({filteredPermissions.length})
                                        </span>
                                        <div className="flex gap-3">
                                            <button onClick={selectAllVisible} className="text-xs font-bold text-purple-600 flex items-center gap-1 hover:underline">
                                                <ListBulletIcon className="h-4 w-4" /> Select All
                                            </button>
                                            <button onClick={clearAllVisible} className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:underline hover:text-rose-600">
                                                <NoSymbolIcon className="h-4 w-4" /> Clear All
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {filteredPermissions.length > 0 ? filteredPermissions.map(perm => {
                                            const isSelected = selectedRole.permissions.has(perm.id);
                                            const pinnedCfg = PINNED_PERMISSIONS.find(
                                                cfg => cfg.name === String(perm.name).toUpperCase()
                                            );
                                            return (
                                                <motion.div
                                                    key={perm.id}
                                                    data-perm={perm.name}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => togglePermission(perm.id)}
                                                    className={`
                                                        relative flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none
                                                        ${isSelected
                                                            ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                                                            : 'border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-xs'
                                                        }
                                                        ${pinnedCfg ? pinnedCfg.highlightClass : ''}
                                                    `}
                                                >
                                                    <div className={`
                                                        flex-shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-all
                                                        ${isSelected ? 'bg-purple-600 border-purple-600 shadow-2xs' : 'bg-white border-slate-300'}
                                                    `}>
                                                        {isSelected && <CheckCircleIcon className="h-4 w-4 text-white" />}
                                                    </div>

                                                    <div className="ml-3 min-w-0 flex-1">
                                                        <span className={`block text-xs font-bold ${isSelected ? 'text-purple-950' : 'text-slate-800'}`}>
                                                            {displayLabel(perm)}
                                                        </span>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug font-medium">
                                                            {perm.description || "System security permission"}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        }) : (
                                            <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
                                                No permissions found matching "{searchTerm}"
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        {selectedRole.id && (
                            <div className="p-4 border-t border-slate-200/80 bg-slate-50/90 backdrop-blur-md flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-semibold ml-2">
                                    <strong className="text-purple-600 font-extrabold">{selectedRole.permissions.size}</strong> permissions assigned
                                    {isDirty && <span className="ml-2 text-amber-600 font-black">(unsaved edits)</span>}
                                </span>
                                
                                <button
                                    onClick={handleSavePermissions}
                                    disabled={loading.assignment}
                                    className="px-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading.assignment ? <Spinner className="text-white h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4 text-purple-400" />}
                                    <span>Save Permissions</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RolePermissionManagement;