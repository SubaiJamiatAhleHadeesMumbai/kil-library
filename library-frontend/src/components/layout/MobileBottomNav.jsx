import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  HeartIcon as HeartIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid';
import useAuth from '../../hooks/useAuth';

const MobileBottomNav = ({ config = null, onOpenSearch, onOpenDonate }) => {
  const { isAuth } = useAuth();
  const location = useLocation();

  const mobileConfig = config || {};
  const mode = mobileConfig.mode || 'both'; // 'bottom_bar' | 'hamburger' | 'both'

  // If admin set mode to 'hamburger' only, hide bottom bar
  if (mode === 'hamburger') return null;

  // Don't show inside reader full-screen paths
  if (location.pathname.startsWith('/reader')) return null;

  const showHome = mobileConfig.show_home !== false;
  const showLibrary = mobileConfig.show_library !== false;
  const showSearch = mobileConfig.show_search !== false;
  const showFatawa = mobileConfig.show_fatawa !== false;
  const showDonate = mobileConfig.show_donate !== false;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E6E2DD] py-2 px-2 flex justify-around items-center shadow-lg pb-[env(safe-area-inset-bottom)] notranslate"
      translate="no"
    >
      <div className="flex items-center justify-around w-full max-w-md mx-auto">
        {/* 1. Home */}
        {showHome && (
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
                isActive ? 'text-[#0F3D2E] font-extrabold' : 'text-slate-500 hover:text-[#0F3D2E] font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <HomeIconSolid className="w-5 h-5 text-[#0F3D2E]" /> : <HomeIcon className="w-5 h-5 text-slate-500" />}
                <span className="text-[10px] mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>صفحہ اول</span>
              </>
            )}
          </NavLink>
        )}

        {/* 2. Library */}
        {showLibrary && (
          <NavLink
            to="/books"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
                isActive ? 'text-[#0F3D2E] font-extrabold' : 'text-slate-500 hover:text-[#0F3D2E] font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <BookOpenIconSolid className="w-5 h-5 text-[#0F3D2E]" /> : <BookOpenIcon className="w-5 h-5 text-slate-500" />}
                <span className="text-[10px] mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>کتب خانہ</span>
              </>
            )}
          </NavLink>
        )}

        {/* 3. Search (Clean uniform button, no misaligned elevated button) */}
        {showSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex flex-col items-center justify-center flex-1 py-1 transition-all text-slate-500 hover:text-[#0F3D2E] active:scale-95 cursor-pointer"
            title="Search Library & Fatawa"
          >
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-500 hover:text-[#0F3D2E]" />
            <span className="text-[10px] mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>تلاش</span>
          </button>
        )}

        {/* 4. Fatawa */}
        {showFatawa && (
          <NavLink
            to="/fatawa"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
                isActive ? 'text-[#0F3D2E] font-extrabold' : 'text-slate-500 hover:text-[#0F3D2E] font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <ChatBubbleLeftRightIconSolid className="w-5 h-5 text-[#0F3D2E]" /> : <ChatBubbleLeftRightIcon className="w-5 h-5 text-slate-500" />}
                <span className="text-[10px] mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>دار الافتاء</span>
              </>
            )}
          </NavLink>
        )}

        {/* 5. Donate / Profile */}
        {showDonate && (
          <button
            type="button"
            onClick={onOpenDonate}
            className="flex flex-col items-center justify-center flex-1 py-1 transition-all text-amber-700 hover:text-[#0F3D2E] active:scale-95 cursor-pointer"
            title="Donate"
          >
            <HeartIcon className="w-5 h-5 text-[#C5A059]" />
            <span className="text-[10px] mt-0.5 font-bold text-amber-800" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>تعاون</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
