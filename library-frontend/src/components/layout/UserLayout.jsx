import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import Footer from './Footer'; // ✅ Import Footer

const UserLayout = () => {
  const { pathname } = useLocation();
  const authPagePaths = new Set(['/login', '/register', '/forgot-password', '/reset-password']);
  const isAuthPage = authPagePaths.has(pathname);

  return (
    <div className="flex flex-col min-h-screen bg-[#fafaf9] text-slate-900 relative selection:bg-emerald-200 selection:text-emerald-950">
      {/* Serene Ambient Top Glow (Noor & Forest Emerald) */}
      <div 
        className="fixed top-0 inset-x-0 h-96 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Navbar at the top */}
      {!isAuthPage && <div className="relative z-20"><UserNavbar /></div>}
      
      {/* Main Content Area (Grows to fill space) */}
      <main className="flex-grow min-w-0 relative z-10">
        <Outlet />
      </main>

      {/* Footer at the bottom */}
      {!isAuthPage && <div className="relative z-10"><Footer /></div>}
    </div>
  );
};

export default UserLayout;