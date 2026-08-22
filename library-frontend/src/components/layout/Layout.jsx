import React, { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
    Bars3Icon, 
    BellIcon, 
    PlusIcon,
    HeartIcon,
    MagnifyingGlassIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    UserCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import AdminSidebar from '../admin/AdminSidebar';
import useAuth from '../../hooks/useAuth';

/**
 * 🌟 Ultra-Modern Admin Layout & App Shell
 */
const Layout = () => {
    // --- State & Hooks ---
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarHidden, setIsSidebarHidden] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    
    const { user } = useAuth();
    const navigate = useNavigate();

    // Handlers
    const closeMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(false);
    }, []);

    // Get User Initials for Avatar
    const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'A';
    
    // Get Safe Role Display Name
    const roleDisplayName = typeof user?.role === 'object' 
        ? (user?.role?.name || 'Administrator') 
        : (user?.role || 'Administrator');

    return (
        <div className="flex h-dvh min-h-screen bg-[#0F172A]/5 text-slate-800 overflow-hidden font-sans antialiased notranslate" translate="no">
            
            {/* ==========================================
                1. SIDEBAR SECTION
               ========================================== */}
            
            {/* Desktop Sidebar Container */}
            <div 
                className={`
                    hidden lg:block flex-shrink-0 transition-all duration-300 ease-in-out z-30
                    ${isSidebarHidden ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}
                `}
            >
                {!isSidebarHidden && <AdminSidebar />}
            </div>

            {/* Mobile Sidebar (Overlay & Drawer) */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200" 
                        onClick={closeMobileSidebar}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-[min(86vw,19rem)] bg-[#0B0F19] shadow-2xl animate-in slide-in-from-left duration-300 z-10">
                        <AdminSidebar mobileClose={closeMobileSidebar} />
                    </div>
                </div>
            )}

            {/* ==========================================
                2. MAIN CONTENT AREA
               ========================================== */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
                
                {/* --- HEADER / NAVBAR --- */}
                <header className="min-h-[4.5rem] bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-6 lg:px-8 z-20 sticky top-0 shadow-xs">
                    
                    {/* Left: Mobile Drawer Trigger & Desktop Collapse & Search */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Mobile Toggle Button */}
                        <button 
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                            aria-label="Open Mobile Menu"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>

                        {/* Desktop Sidebar Toggle */}
                        <button
                            onClick={() => setIsSidebarHidden(prev => !prev)}
                            className="hidden lg:inline-flex p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                            title={isSidebarHidden ? 'Show Admin Sidebar' : 'Hide Admin Sidebar'}
                        >
                            {isSidebarHidden ? (
                                <ChevronDoubleRightIcon className="w-5 h-5" />
                            ) : (
                                <ChevronDoubleLeftIcon className="w-5 h-5" />
                            )}
                        </button>
                        
                        {/* Global Search Bar */}
                        <div className="hidden sm:flex items-center gap-2.5 bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200/80 w-full max-w-md focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200 shadow-xs">
                            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <input 
                                type="text" 
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                placeholder="Search admin panels, books, users..." 
                                className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder-slate-400 font-medium"
                            />
                            {globalSearch ? (
                                <button onClick={() => setGlobalSearch('')} className="text-slate-400 hover:text-slate-600">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            ) : (
                                <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/60 rounded border border-slate-300/60">
                                    Ctrl K
                                </kbd>
                            )}
                        </div>
                    </div>

                    {/* Right: Action Shortcuts & Profile */}
                    <div className="flex items-center gap-2 sm:gap-3">

                        {/* Quick Action: ADD POST */}
                        <button 
                            onClick={() => navigate('/admin/posts')}
                            className="hidden md:flex items-center gap-2 bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-slate-800 hover:to-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                        >
                            <PlusIcon className="w-4 h-4 text-emerald-400" />
                            <span>Add Post</span>
                        </button>

                        <div className="h-6 w-px bg-slate-200 hidden md:block" />

                        {/* Donation Upload Shortcut */}
                        <button 
                            onClick={() => navigate('/admin/donation')}
                            className="relative p-2 text-rose-600 bg-rose-50 hover:bg-rose-100/80 rounded-xl border border-rose-100 transition-all group shadow-xs"
                            title="Upload Donation Details"
                        >
                            <HeartIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                            </span>
                        </button>

                        {/* Notifications Menu Trigger */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all shadow-xs"
                                title="Notifications"
                            >
                                <BellIcon className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
                            </button>

                            {/* Notification Dropdown Panel */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <BellIcon className="w-4 h-4 text-emerald-600" /> Notifications
                                        </h3>
                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            System Live
                                        </span>
                                    </div>
                                    <div className="py-6 text-center text-xs text-slate-400">
                                        No new unread notifications.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile Header Badge */}
                        <div className="flex items-center gap-3 pl-2 sm:pl-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                                    {user?.username || 'Admin'}
                                </p>
                                <p className="text-[10px] font-semibold text-emerald-600 tracking-wider truncate max-w-[120px]">
                                    {roleDisplayName}
                                </p>
                            </div>

                            <div 
                                onClick={() => navigate('/admin/dashboard')}
                                className="relative h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md hover:scale-105 transition-transform cursor-pointer"
                                title={user?.username || 'User Profile'}
                            >
                                <div className="h-full w-full bg-slate-900 rounded-[10px] flex items-center justify-center text-emerald-400 font-extrabold text-sm border border-emerald-400/30">
                                    {userInitial}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* --- PAGE CONTENT (Outlet) --- */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
                    
                    {/* Mobile Floating Action Button (Quick Add Post) */}
                    <button 
                        onClick={() => navigate('/admin/posts')}
                        className="md:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-slate-900 to-slate-800 text-emerald-400 p-3.5 rounded-2xl shadow-2xl border border-slate-700 hover:scale-110 active:scale-95 transition-all"
                        aria-label="Add Post"
                    >
                        <PlusIcon className="w-6 h-6" />
                    </button>

                    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
                        <Outlet />
                    </div>
                </main>

            </div>
        </div>
    );
};

// ✅ MEMOIZATION: Prevent unnecessary re-renders
export default React.memo(Layout);