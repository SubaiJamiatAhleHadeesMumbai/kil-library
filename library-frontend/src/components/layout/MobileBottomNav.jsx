import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid';
import useAuth from '../../hooks/useAuth';

const MobileBottomNav = ({ config = null, onOpenSearch }) => {
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
  const showProfile = mobileConfig.show_profile !== false;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#051c14]/95 backdrop-blur-xl border-t border-amber-500/25 shadow-[0_-4px_25px_rgba(0,0,0,0.6)] text-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-15 px-2 max-w-lg mx-auto">
        {/* 1. Home */}
        {showHome && (
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
                isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <HomeIconSolid className="w-5 h-5 text-amber-400" /> : <HomeIcon className="w-5 h-5" />}
                <span className="text-[10px] mt-0.5">Home</span>
              </>
            )}
          </NavLink>
        )}

        {/* 2. Library */}
        {showLibrary && (
          <NavLink
            to="/books"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
                isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <BookOpenIconSolid className="w-5 h-5 text-amber-400" /> : <BookOpenIcon className="w-5 h-5" />}
                <span className="text-[10px] mt-0.5">Library</span>
              </>
            )}
          </NavLink>
        )}

        {/* 3. Center Elevated Quick Search Button */}
        {showSearch && (
          <div className="flex flex-col items-center justify-center flex-1 -mt-4">
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-700 text-slate-950 shadow-lg shadow-amber-950/50 border-2 border-amber-400/60 active:scale-90 transition-transform cursor-pointer"
              title="Search Library & Fatawa"
            >
              <MagnifyingGlassIcon className="w-5 h-5 stroke-[2.5]" />
            </button>
            <span className="text-[9.5px] font-bold text-amber-300 mt-0.5">Search</span>
          </div>
        )}

        {/* 4. Fatawa */}
        {showFatawa && (
          <NavLink
            to="/fatawa"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
                isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <ChatBubbleLeftRightIconSolid className="w-5 h-5 text-amber-400" />
                ) : (
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                )}
                <span className="text-[10px] mt-0.5">Fatawa</span>
              </>
            )}
          </NavLink>
        )}

        {/* 5. Profile / Account */}
        {showProfile && (
          <NavLink
            to={isAuth ? '/profile' : '/login'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
                isActive ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-amber-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <UserCircleIconSolid className="w-5 h-5 text-amber-400" />
                ) : (
                  <UserCircleIcon className="w-5 h-5" />
                )}
                <span className="text-[10px] mt-0.5">{isAuth ? 'Profile' : 'Login'}</span>
              </>
            )}
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
