import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import Footer from './Footer'; // ✅ Import Footer

const UserLayout = () => {
  const { pathname } = useLocation();
  const authPagePaths = new Set(['/login', '/register', '/forgot-password', '/reset-password']);
  const isAuthPage = authPagePaths.has(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar at the top */}
      {!isAuthPage && <UserNavbar />}
      
      {/* Main Content Area (Grows to fill space) */}
      <main className="flex-grow min-w-0">
        <Outlet />
      </main>

      {/* Footer at the bottom */}
      {!isAuthPage && <Footer />}
    </div>
  );
};

export default UserLayout;