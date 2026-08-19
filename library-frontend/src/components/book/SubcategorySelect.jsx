/**
 * ✅ FIXED BookFormUI.jsx - Category Selection Fix
 * 
 * ISSUES FIXED:
 * 1. Category dropdown click handler not working (event bubbling issue)
 * 2. Missing z-index layering on mobile
 * 3. Poor touch interaction on mobile devices
 * 4. Animation performance issues
 * 5. Accessibility improvements
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon, ArrowPathIcon, XCircleIcon, CheckCircleIcon,
  DocumentTextIcon, PhotoIcon, DocumentIcon,
  BookOpenIcon, AdjustmentsHorizontalIcon, TagIcon,
  CloudArrowUpIcon, ShieldCheckIcon, LockClosedIcon,
  ComputerDesktopIcon, CheckIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://kil2-backend.onrender.com' : 'http://127.0.0.1:8000');

// ✅ FIXED: Multi-select subcategories with proper event handling
const SubcategorySelect = ({ subcategories, selectedIds, onChange, loading }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  // ✅ FIX: Improved click outside detection
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    
    if (open) {
      // Delay to prevent immediate closing
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 50);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  // ✅ FIX: Prevent event propagation
  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(prev => !prev);
  };

  const toggle = (id) => {
    const numId = Number(id);
    const next = selectedIds.includes(numId)
      ? selectedIds.filter(x => x !== numId)
      : [...selectedIds, numId];
    
    onChange({ 
      target: { 
        name: 'subcategory_ids', 
        value: next 
      } 
    });
  };

  const selected = subcategories.filter(s => selectedIds.includes(Number(s.id)));

  const base = 'w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-[#002147] focus:shadow-[0_0_0_4px_rgba(0,33,71,0.07)] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

  return (
    <div className="col-span-2 relative" ref={ref}>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
        Categories & Genres <span className="text-rose-400">*</span>
      </label>
      
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className={`${base} flex items-center justify-between gap-2 text-left min-h-[48px] focus:ring-2 focus:ring-[#002147] focus:ring-offset-2`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-slate-400 font-normal">Select categories…</span>
          ) : (
            selected.map(s => (
              <span 
                key={s.id} 
                className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
              >
                {s.name}
                <button
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    toggle(s.id); 
                  }}
                  className="hover:text-rose-500 transition-colors flex-shrink-0"
                  aria-label={`Remove ${s.name}`}
                >
                  <XCircleIcon className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </span>
        <ChevronDownIcon 
          className={`w-5 h-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 z-50 mt-0 bg-white border-2 border-slate-200 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="max-h-56 overflow-y-auto p-2">
              {loading && (
                <p className="text-xs text-center text-slate-400 py-6 font-medium">Loading categories…</p>
              )}
              
              {!loading && subcategories.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-6 font-medium">No categories found</p>
              )}
              
              {!loading && subcategories.map(sub => {
                const checked = selectedIds.includes(Number(sub.id));
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(sub.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                      checked 
                        ? 'bg-[#002147] text-white shadow-sm' 
                        : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                    }`}
                    role="option"
                    aria-selected={checked}
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      checked 
                        ? 'bg-white border-white' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {checked && <CheckIcon className="w-3.5 h-3.5 text-[#002147]" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`text-xs ${checked ? 'text-white/70' : 'text-slate-400'}`}>
                        {sub.category?.name} › 
                      </span>
                      <div className="font-medium">{sub.name}</div>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubcategorySelect;
