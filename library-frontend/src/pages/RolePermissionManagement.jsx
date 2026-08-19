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
} from '@heroicons/react/24/outline';
import { rolePermissionService } from '../api/rolePermissionService';
import { getPermissionLabel } from '../utils/permissionLabels';
import '../assets/css/ManagementPages.css';

// --- Config: pinned/featured permissions ------------------------------
// Extracted so "special" permissions are data, not hardcoded UI branches.
// Add more entries here instead of copy-pasting bespoke buttons per permission.
const PINNED_PERMISSIONS = [
    {
        name: 'HOMEPAGE_BRANDING_MANAGE',
        icon: KeyIcon,
        highlightClass: 'ring-2 ring-cyan-200 border-cyan-300',
        description: 'Allows editing homepage visual identity such as theme, title, language, and hero badge.',
    },
    {
        name: 'HOMEPAGE_CONTENT_MANAGE',
        icon: PencilIcon,
        highlightClass: 'ring-2 ring-indigo-200 border-indigo-300',
        description: 'Allows editing homepage section text, headings, order, and featured books.',
    },
    {
        name: 'HOMEPAGE_LAYOUT_MANAGE',
        icon: AdjustmentsHorizontalIcon,
        highlightClass: 'ring-2 ring-emerald-200 border-emerald-300',
        description: 'Allows editing layout extras like stats cards, strip visibility, and optional blocks.',
    },
    {
        name: 'HOMEPAGE_VISIBILITY_MANAGE',
        icon: ShieldCheckIcon,
        highlightClass: 'ring-2 ring-purple-200 border-purple-300',
        description: 'Allows showing or hiding homepage sections from public users.',
    },
    {
        name: 'HOMEPAGE_SEARCH_MANAGE',
        icon: MapPinIcon,
        highlightClass: 'ring-2 ring-yellow-200 border-yellow-300',
        description: 'Allows editing homepage search behavior (hint, voice, deep search, suggestions, placeholder).',
    },
];

// --- UI Components ------------------------------------------------------
const Spinner = ({ className = "text-indigo-600" }) => (
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

    // Tracks whether the local permission selection has unsaved edits,
    // so we can warn before any action that would overwrite server state.
    const [isDirty, setIsDirty] = useState(false);

    // Guards against race conditions when a user quickly switches roles:
    // only the response matching the *latest* requested roleId is applied.
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

    useEffect(() => { loadSystemData(); }, [loadSystemData]);

    // --- Filtered Permissions ---
    const filteredPermissions = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return allPermissions.filter(p =>
            p.name.toLowerCase().includes(lowerTerm) ||
            (p.description && p.description.toLowerCase().includes(lowerTerm))
        );
    }, [allPermissions, searchTerm]);

    // Memoized lookup map for pinned permission objects (id/name/description),
    // recomputed only when allPermissions changes, not on every keystroke.
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
            // CSS.escape prevents malformed/unsafe selectors if a permission
            // name ever contains quotes or special characters.
            const safeName = window.CSS && CSS.escape ? CSS.escape(permName) : permName;
            const el = document.querySelector(`[data-perm="${safeName}"]`);
            if (!el) return;
            el.classList.add('perm-flash');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => el.classList.remove('perm-flash'), 1000);
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

        // Warn before switching away from unsaved edits.
        if (isDirty) {
            const proceed = window.confirm(
                'You have unsaved permission changes. Switching roles will discard them. Continue?'
            );
            if (!proceed) return;
        }

        // Record this as the latest in-flight request.
        const requestId = String(roleId);
        latestRoleRequestRef.current = requestId;

        setLoading(prev => ({ ...prev, assignment: true }));
        try {
            const data = await rolePermissionService.getRoleDetails(roleId);

            // If the user has since selected a different role, drop this
            // stale response instead of overwriting newer state.
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
        toast.success("Cleared selection");
    };

    const handleSavePermissions = async () => {
        if (!selectedRole.id) return;

        const toastId = toast.loading("Saving permissions...");
        setLoading(prev => ({ ...prev, assignment: true }));

        try {
            const ids = Array.from(selectedRole.permissions);
            await rolePermissionService.updatePermissionsForRole(selectedRole.id, ids);
            setIsDirty(false);
            toast.success("Permissions updated successfully!", { id: toastId });
        } catch (err) {
            toast.error("Update failed.", { id: toastId });
        } finally {
            setLoading(prev => ({ ...prev, assignment: false }));
        }
    };

    // --- Pinned permission: assign/remove against SERVER state ---
    // Fetches the current server-side permission list fresh, rather than
    // reusing local `selectedRole.permissions`, so this action can never
    // silently commit unrelated unsaved checkbox edits made in the grid.
    const togglePinnedPermission = async (permConfig, shouldAdd) => {
        if (!selectedRole.id) {
            toast.error('Select a role first');
            return;
        }

        const permObj = pinnedPermissionObjects[permConfig.name];
        if (!permObj) {
            toast.error('Permission not loaded yet');
            return;
        }

        if (!shouldAdd) {
            const confirmRemove = window.confirm(
                `Remove ${displayLabel(permObj)} from the selected role?`
            );
            if (!confirmRemove) return;
        }

        const toastId = toast.loading(shouldAdd ? 'Assigning permission...' : 'Removing permission...');
        try {
            // Pull the authoritative, currently-saved permission set for this role.
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
                    ? `Assigned ${displayLabel(permObj)} to role`
                    : `Removed ${displayLabel(permObj)} from role`,
                { id: toastId }
            );

            const updatedRoles = await rolePermissionService.getAllRoles();
            setRoles(updatedRoles);

            // Re-sync local state to match the server (this discards any
            // other unsaved local edits too, but the user is informed via
            // the toast + the grid visibly refreshing).
            setSelectedRole({ id: selectedRole.id, permissions: freshIds });
            setIsDirty(false);
        } catch (err) {
            toast.error(shouldAdd ? 'Could not assign permission' : 'Could not remove permission', { id: toastId });
        }
    };

    // --- Role CRUD Handlers ---
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
                await rolePermissionService.updateRole(roleForm.editing.id, { name: roleForm.name });
                toast.success(`Role "${roleForm.name}" updated.`, { id: toastId });
            } else {
                await rolePermissionService.createRole({ name: roleForm.name });
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

            // FIX: previously compared `selectedRole.id === String(id)` which
            // mixed types (selectedRole.id may be a number, `id` was forced to
            // string) and could silently never match, leaving the permission
            // matrix open on a role that had just been deleted.
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
        <div className="w-full px-2 sm:px-4 lg:px-6 py-2 md:py-4 bg-gray-50 mt-2">
            <header className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheckIcon className="h-8 w-8 text-indigo-600" />
                        Access Control Center
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage system roles and synchronize granular permissions.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* --- Left Column: Role Management --- */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <KeyIcon className="h-4 w-4" /> Role Registry
                        </h3>

                        <form onSubmit={handleRoleSubmit} className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                                placeholder="Enter role title..."
                                value={roleForm.name}
                                onChange={e => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                                disabled={loading.roleAction}
                            />
                            <div className="flex gap-2">
                                {roleForm.editing && (
                                    <button type="button" onClick={() => setRoleForm({ name: '', editing: null })}
                                        className="flex-1 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-300 text-xs transition-colors">
                                        Cancel
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    className={`flex-[2] py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-xs text-white shadow-sm 
                                        ${roleForm.editing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'} 
                                        disabled:opacity-50 disabled:cursor-not-allowed`}
                                    disabled={loading.roleAction || !roleForm.name.trim()}
                                >
                                    {loading.roleAction ? <Spinner className="text-white h-3 w-3" /> : (roleForm.editing ? <PencilIcon className="h-3 w-3" /> : <PlusIcon className="h-3 w-3" />)}
                                    {roleForm.editing ? 'Update' : 'Add Role'}
                                </button>
                            </div>
                        </form>

                        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar space-y-2">
                            {roles.length > 0 ? roles.map(role => (
                                <motion.div
                                    key={role.id}
                                    whileHover={{ x: 2 }}
                                    className={`group p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                        String(selectedRole.id) === String(role.id)
                                        ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                                        : 'bg-white border-gray-100 hover:border-gray-300'
                                    }`}
                                    onClick={() => fetchRolePermissions(role.id)}
                                >
                                    <span className={`font-semibold text-sm ${String(selectedRole.id) === String(role.id) ? 'text-indigo-900' : 'text-gray-700'}`}>
                                        {role.name}
                                        {String(selectedRole.id) === String(role.id) && isDirty && (
                                            <span className="ml-2 text-[10px] font-bold text-amber-600 align-middle">● unsaved</span>
                                        )}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setRoleForm({ name: role.name, editing: role }); }}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                                            <PencilIcon className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.name); }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="p-8 text-center text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-xl">
                                    No roles found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Permission Matrix --- */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full min-h-[600px]">

                        {/* Toolbar — always stacks on narrow widths, never overflows */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl sticky top-0 z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm text-gray-400 shrink-0">
                                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-gray-800">Permission Matrix</h3>
                                    <p className="text-xs text-gray-500 truncate">
                                        {selectedRole.id
                                            ? <span className="text-indigo-600 font-semibold">Editing: {roles.find(r => String(r.id) === String(selectedRole.id))?.name}</span>
                                            : "Select a role to configure"}
                                    </p>
                                </div>
                            </div>

                            {/* flex-wrap so search + action buttons drop to a new line instead of
                                being squeezed/cut off on narrow screens */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Search input: fixed min-height/border via explicit styles so it
                                    can never collapse to just its icon even if Tailwind utility
                                    classes fail to generate in the build. */}
                                <div className="relative flex-1 min-w-[220px]">
                                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search permissions..."
                                        className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm outline-none shadow-sm"
                                        style={{ minHeight: '38px', boxSizing: 'border-box' }}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            title="Clear search"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs leading-none"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Pinned permission quick-actions — styled entirely with Tailwind
                                    utility classes (no dependency on an external .btn/.perm-toolbar
                                    stylesheet), so they can't silently render as bare circles. */}
                                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                    {PINNED_PERMISSIONS.map(cfg => {
                                        const permObj = pinnedPermissionObjects[cfg.name];
                                        const Icon = cfg.icon;
                                        const label = displayLabel({ name: cfg.name });
                                        return (
                                            <React.Fragment key={cfg.name}>
                                                <button
                                                    type="button"
                                                    title={`${label}: ${permObj?.description || cfg.description || ''}`}
                                                    aria-label={`Locate ${label} in the list`}
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setTimeout(() => highlightPermission(cfg.name), 120);
                                                    }}
                                                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-gray-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-sm shrink-0"
                                                >
                                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                                    <span className="sr-only">Locate {label}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => togglePinnedPermission(cfg, true)}
                                                    title={`Assign ${label} to selected role`}
                                                    aria-label={`Assign ${label}`}
                                                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm shrink-0"
                                                >
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                    <span className="sr-only">Assign {label}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => togglePinnedPermission(cfg, false)}
                                                    title={`Remove ${label} from selected role`}
                                                    aria-label={`Remove ${label}`}
                                                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors shadow-sm shrink-0"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                    <span className="sr-only">Remove {label}</span>
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Permissions Grid */}
                        <div className="flex-1 p-6 overflow-y-auto max-h-[600px] custom-scrollbar bg-white">
                            {!selectedRole.id ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                    <ShieldCheckIcon className="h-20 w-20 mb-4 opacity-20" />
                                    <p className="text-gray-400 font-medium">Please select a role from the left registry</p>
                                </div>
                            ) : loading.assignment ? (
                                <div className="h-full flex flex-col items-center justify-center py-20">
                                    <Spinner className="h-8 w-8 text-indigo-600" />
                                    <p className="mt-4 text-sm text-gray-500">Loading access rights...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Permissions</span>
                                        <div className="flex gap-3">
                                            <button onClick={selectAllVisible} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline hover:text-indigo-800 transition-colors">
                                                <ListBulletIcon className="h-3.5 w-3.5" /> Select All
                                            </button>
                                            <button onClick={clearAllVisible} className="text-xs font-bold text-gray-500 flex items-center gap-1 hover:underline hover:text-red-600 transition-colors">
                                                <NoSymbolIcon className="h-3.5 w-3.5" /> Clear All
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                        relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                                        ${isSelected
                                                            ? 'border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-200'
                                                            : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                                                        }
                                                        ${pinnedCfg ? pinnedCfg.highlightClass : ''}
                                                    `}
                                                >
                                                    <div className={`
                                                        flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center mt-0.5 transition-colors
                                                        ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
                                                    `}>
                                                        {isSelected && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                                                    </div>

                                                    <div className="ml-3">
                                                        <span className={`block text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                            {displayLabel(perm)}
                                                        </span>
                                                        <p className="text-xs text-gray-500 mt-1 leading-snug">
                                                            {perm.description || "System permission"}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        }) : (
                                            <div className="col-span-full py-12 text-center text-gray-400 italic">
                                                No permissions found matching "{searchTerm}"
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        {selectedRole.id && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm rounded-b-2xl flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-medium ml-2">
                                    {selectedRole.permissions.size} permissions assigned
                                    {isDirty && <span className="ml-2 text-amber-600 font-bold">(unsaved)</span>}
                                </span>
                                <button
                                    onClick={handleSavePermissions}
                                    disabled={loading.assignment}
                                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 text-sm disabled:opacity-70"
                                >
                                    {loading.assignment ? <Spinner className="text-white h-4 w-4" /> : <CheckCircleIcon className="h-5 w-5" />}
                                    Save Changes
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