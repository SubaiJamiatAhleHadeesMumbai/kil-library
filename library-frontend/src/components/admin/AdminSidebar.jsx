import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import restrictedBookService from '../../api/restrictedBookService';
import { 
    HomeIcon, BookOpenIcon, UsersIcon, ShieldCheckIcon, 
    ArrowLeftOnRectangleIcon, XMarkIcon, ClipboardDocumentListIcon, 
    KeyIcon, CheckBadgeIcon, TagIcon, RectangleStackIcon, 
    LanguageIcon, MapPinIcon, LockClosedIcon, UserCircleIcon, 
    ComputerDesktopIcon, DocumentDuplicateIcon, AdjustmentsHorizontalIcon,
    InformationCircleIcon, ChatBubbleLeftRightIcon, PhotoIcon,
    ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, MagnifyingGlassIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

// ✅ Custom Hooks & Services
import useAuth from '../../hooks/useAuth';
import useUserRole from '../../hooks/useUserRole';

/**
 * 🌟 Premium Ultra-Modern Admin Sidebar
 */
const AdminSidebar = ({ mobileClose = () => {} }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { can } = useUserRole();

    // --- State Management ---
    const [pendingCount, setPendingCount] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedSections, setCollapsedSections] = useState({});

    // 💡 Fix: Safe Role Name Extractor (Prevents "Objects are not valid as React child" error)
    const roleDisplayName = useMemo(() => {
        if (!user?.role) return 'Administrator';
        if (typeof user.role === 'object') {
            return user.role.name || user.role.title || 'Administrator';
        }
        return String(user.role);
    }, [user?.role]);

    // --- 1. Advanced Permission Checker (Handles String & Array Permissions) ---
    const hasPermission = useCallback((permCode) => {
        if (!user) return false;
        if (!permCode) return true; // Public Admin Nav Item

        if (Array.isArray(permCode)) {
            return permCode.some(perm => can(perm));
        }

        return can(permCode);
    }, [user, can]);

    // --- 2. Fetch Pending Requests Count ---
    useEffect(() => {
        let isMounted = true;

        const fetchPendingCount = async () => {
            if (!user || !hasPermission('REQUEST_VIEW')) return;

            try {
                const counts = await restrictedBookService.getRequestsCount();
                if (isMounted && counts) {
                    setPendingCount(Number(counts.pending) || 0);
                }
            } catch (error) {
                console.error("Sidebar Count Error:", error);
            }
        };

        fetchPendingCount();
        const interval = setInterval(fetchPendingCount, 60000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user, hasPermission]);

    // --- 3. Handle Logout ---
    const handleLogout = async () => {
        try {
            await logout(); 
            navigate('/login'); 
        } catch (error) {
            console.error("Logout failed", error);
            navigate('/login'); 
        }
    };

    // --- 4. Section Accordion Toggle ---
    const toggleSection = (sectionTitle) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionTitle]: !prev[sectionTitle]
        }));
    };

    // --- 5. Base Menu Configuration ---
    const menuStructure = useMemo(() => [
        { 
            section: "Overview",
            items: [
                { name: 'Dashboard', path: '/admin/dashboard', icon: HomeIcon, requiredPerm: null },
                { name: 'Access Requests', path: '/admin/access-requests', icon: ShieldCheckIcon, badge: pendingCount, requiredPerm: 'REQUEST_VIEW' },
                { name: 'Approvals', path: '/admin/approvals', icon: CheckBadgeIcon, requiredPerm: 'BOOK_APPROVE' },
            ]
        },
        { 
            section: "Library Management",
            items: [
                { name: 'All Books', path: '/admin/books', icon: BookOpenIcon, requiredPerm: 'BOOK_VIEW' },
                { name: 'Copies & Issuing', path: '/admin/copies', icon: DocumentDuplicateIcon, requiredPerm: 'BOOK_ISSUE' },
                { name: 'Categories', path: '/admin/categories', icon: TagIcon, requiredPerm: 'BOOK_MANAGE' },
                { name: 'Subcategories', path: '/admin/subcategories', icon: RectangleStackIcon, requiredPerm: 'BOOK_MANAGE' },
            ]
        },
        {
            section: "Settings & Users",
            items: [
                { name: 'Users Management', path: '/admin/users', icon: UsersIcon, requiredPerm: 'USER_VIEW' },
                { name: 'Languages', path: '/admin/languages', icon: LanguageIcon, requiredPerm: 'BOOK_MANAGE' },
                { name: 'Locations', path: '/admin/locations', icon: MapPinIcon, requiredPerm: 'BOOK_MANAGE' },
                { name: 'About Page Settings', path: '/admin/about-settings', icon: InformationCircleIcon, requiredPerm: 'HOMEPAGE_CONTENT_MANAGE' },
                { name: 'Posters', path: '/admin/posters', icon: PhotoIcon, requiredPerm: 'HOMEPAGE_CONTENT_MANAGE' },
                { name: 'Fatawa Management', path: '/admin/fatawa', icon: ChatBubbleLeftRightIcon, requiredPerm: 'BOOK_MANAGE' },
                { name: 'Roles & Permissions', path: '/admin/roles-permissions', icon: KeyIcon, requiredPerm: 'ROLE_VIEW' },
            ]
        },
        {
            section: "Security & Analytics",
            items: [
                { name: 'Restricted Books', path: '/admin/book-permissions', icon: LockClosedIcon, requiredPerm: 'PERMISSION_VIEW' },
                { name: 'Digital Access', path: '/admin/digital-access-history', icon: ComputerDesktopIcon, requiredPerm: 'LOG_VIEW' },
                { name: 'Audit Logs', path: '/admin/logs', icon: ClipboardDocumentListIcon, requiredPerm: 'LOG_VIEW' },
                {
                    name: 'Homepage Settings',
                    path: '/admin/homepage-settings',
                    icon: AdjustmentsHorizontalIcon,
                    requiredPerm: [
                        'HOMEPAGE_BRANDING_MANAGE',
                        'HOMEPAGE_CONTENT_MANAGE',
                        'HOMEPAGE_LAYOUT_MANAGE',
                        'HOMEPAGE_VISIBILITY_MANAGE',
                        'HOMEPAGE_SEARCH_MANAGE',
                    ]
                },
            ]
        }
    ], [pendingCount]);

    // --- 6. Permission & Search Filtered Menu ---
    const filteredMenuItems = useMemo(() => {
        return menuStructure
            .map(group => {
                const visibleItems = group.items.filter(item => hasPermission(item.requiredPerm));
                
                if (!searchQuery.trim()) {
                    return { ...group, items: visibleItems };
                }

                const query = searchQuery.toLowerCase();
                const matchedItems = visibleItems.filter(item => 
                    item.name.toLowerCase().includes(query)
                );

                return { ...group, items: matchedItems };
            })
            .filter(group => group.items.length > 0);
    }, [menuStructure, hasPermission, searchQuery]);

    return (
        <aside 
            className={`
                relative h-full bg-[#0B0F19] text-slate-300 flex flex-col 
                border-r border-slate-800/80 shadow-2xl transition-all duration-300 ease-in-out select-none z-30
                ${isCollapsed ? 'w-20' : 'w-72'}
            `}
        >
            {/* Ambient Background Glow Effect */}
            <div className="absolute top-0 left-0 w-full h-48 bg-emerald-500/5 blur-3xl pointer-events-none" />

            {/* --- HEADER --- */}
            <div className="h-20 flex items-center justify-between px-4 bg-[#070A12]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20">
                <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <div className="relative flex-shrink-0 group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur opacity-40 group-hover:opacity-100 transition duration-300" />
                        <div className="relative bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <BookOpenIcon className="w-6 h-6" />
                        </div>
                    </div>

                    {!isCollapsed && (
                        <div className="flex flex-col truncate">
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-white font-bold text-base tracking-tight truncate font-sans">
                                    BookNest
                                </h1>
                                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-400/90 uppercase tracking-widest flex items-center gap-1">
                                <SparklesIcon className="w-3 h-3" /> Admin Suite
                            </span>
                        </div>
                    )}
                </div>

                {/* Mobile Close Button */}
                <button 
                    onClick={mobileClose} 
                    className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                    aria-label="Close Mobile Sidebar"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Desktop Collapse Toggle Button */}
                {!mobileClose && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all duration-200 shadow-md"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* --- QUICK SEARCH BAR (Expanded Only) --- */}
            {!isCollapsed && (
                <div className="px-4 pt-4 pb-2">
                    <div className="relative flex items-center">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Quick search links..."
                            className="w-full bg-slate-900/80 text-xs text-slate-200 placeholder-slate-500 pl-9 pr-8 py-2 rounded-xl border border-slate-800/80 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 text-slate-500 hover:text-slate-300 text-xs p-0.5"
                            >
                                <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- NAVIGATION MENU --- */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
                {filteredMenuItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-500">
                        No navigation items found.
                    </div>
                ) : (
                    filteredMenuItems.map((group, idx) => {
                        const isSectionCollapsed = collapsedSections[group.section];

                        return (
                            <div key={idx} className="space-y-1">
                                {/* Section Header */}
                                {!isCollapsed ? (
                                    <div 
                                        onClick={() => toggleSection(group.section)}
                                        className="flex items-center justify-between px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-400 group/sec transition-colors"
                                    >
                                        <span>{group.section}</span>
                                        <ChevronDownIcon 
                                            className={`w-3 h-3 text-slate-600 group-hover/sec:text-slate-400 transition-transform duration-200 ${isSectionCollapsed ? '-rotate-90' : ''}`} 
                                        />
                                    </div>
                                ) : (
                                    <div className="h-px bg-slate-800/60 my-3 mx-2" />
                                )}

                                {/* Section Items */}
                                {(!isSectionCollapsed || isCollapsed) && (
                                    <div className="space-y-1">
                                        {group.items.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                onClick={mobileClose}
                                                className={({ isActive }) => `
                                                    group relative flex items-center ${isCollapsed ? 'justify-center py-3' : 'justify-between px-3.5 py-2.5'} 
                                                    rounded-xl text-sm font-medium transition-all duration-200 border
                                                    ${isActive 
                                                        ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]' 
                                                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border-transparent hover:border-slate-800'
                                                    }
                                                `}
                                            >
                                                {/* Active Left Pill Indicator */}
                                                {({ isActive }) => (
                                                    <>
                                                        {isActive && (
                                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-r-full shadow-[0_0_10px_#10b981]" />
                                                        )}

                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                                                            {!isCollapsed && (
                                                                <span className="truncate text-xs font-semibold tracking-wide">
                                                                    {item.name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Badge in Expanded Mode */}
                                                        {!isCollapsed && item.badge > 0 && (
                                                            <span className="bg-rose-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-rose-500/20 ring-2 ring-slate-950 animate-pulse">
                                                                {item.badge}
                                                            </span>
                                                        )}

                                                        {/* Floating Tooltip in Collapsed Mode */}
                                                        {isCollapsed && (
                                                            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-slate-100 text-xs font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-2 backdrop-blur-md">
                                                                <span>{item.name}</span>
                                                                {item.badge > 0 && (
                                                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                                        {item.badge}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </nav>

            {/* --- USER PROFILE FOOTER --- */}
            <div className="p-3 border-t border-slate-800/80 bg-[#070A12]/95 backdrop-blur-md sticky bottom-0 z-20">
                {!isCollapsed ? (
                    <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 shadow-lg space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md">
                                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-slate-300">
                                        <UserCircleIcon className="w-6 h-6 text-emerald-400" />
                                    </div>
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" title="Online" />
                            </div>

                            <div className="overflow-hidden flex-1">
                                <p className="text-xs font-bold text-white truncate tracking-wide">
                                    {user?.username || 'Admin User'}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">
                                    {user?.email || 'admin@booknest.com'}
                                </p>
                                <span className="inline-block mt-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                                    {roleDisplayName}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={handleLogout} 
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-all duration-200 text-xs font-semibold group"
                        >
                            <ArrowLeftOnRectangleIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-slate-400 group-hover:text-rose-400" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                ) : (
                    /* Compact User Footer */
                    <div className="flex flex-col items-center gap-3 py-1">
                        <div className="relative group cursor-pointer">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-md">
                                <UserCircleIcon className="w-6 h-6" />
                            </div>
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                            
                            {/* User Tooltip */}
                            <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none backdrop-blur-md">
                                <p className="font-bold">{user?.username || 'Admin User'}</p>
                                <p className="text-[10px] text-emerald-400">{roleDisplayName}</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleLogout}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all duration-200 group"
                            title="Sign Out"
                        >
                            <ArrowLeftOnRectangleIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default AdminSidebar;