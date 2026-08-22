import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckIcon,
  ChevronDownIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  TagIcon
} from '@heroicons/react/24/outline';

const SubcategorySelect = ({ subcategories = [], selectedIds = [], onChange, loading = false }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    
    if (open) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 50);
      
      // Auto-focus search input when opening
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

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

  // Selected items list
  const selected = useMemo(() => {
    return subcategories.filter(s => selectedIds.includes(Number(s.id)));
  }, [subcategories, selectedIds]);

  // Filtered subcategories based on search
  const filteredSubcategories = useMemo(() => {
    if (!searchQuery.trim()) return subcategories;
    const q = searchQuery.toLowerCase().trim();
    return subcategories.filter(s => {
      const nameMatch = s.name?.toLowerCase().includes(q);
      const catMatch = s.category?.name?.toLowerCase().includes(q);
      return nameMatch || catMatch;
    });
  }, [subcategories, searchQuery]);

  // Group filtered items by parent Category name
  const groupedSubcategories = useMemo(() => {
    const groups = {};
    filteredSubcategories.forEach(sub => {
      const parentName = sub.category?.name || 'General / متفرقات';
      if (!groups[parentName]) {
        groups[parentName] = [];
      }
      groups[parentName].push(sub);
    });
    return groups;
  }, [filteredSubcategories]);

  const baseInputStyle = 'w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-[#002147] focus:shadow-[0_0_0_4px_rgba(0,33,71,0.07)] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

  return (
    <div className="col-span-2 relative" ref={ref}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          Categories & Genres <span className="text-rose-500">*</span>
        </label>
        {selected.length > 0 && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {selected.length} selected
          </span>
        )}
      </div>
      
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className={`${baseInputStyle} flex items-center justify-between gap-2 text-left min-h-[50px] cursor-pointer hover:border-slate-300`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex flex-wrap gap-1.5 flex-1 min-w-0 py-0.5">
          {selected.length === 0 ? (
            <span className="text-slate-400 font-normal">Select categories / زمرہ جات منتخب کریں...</span>
          ) : (
            selected.map(s => (
              <span 
                key={s.id} 
                className="inline-flex items-center gap-1.5 bg-[#002147]/5 text-[#002147] border border-[#002147]/15 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs"
              >
                <TagIcon className="w-3 h-3 text-[#002147]/60" />
                <span>{s.name}</span>
                <button
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    toggle(s.id); 
                  }}
                  className="hover:text-rose-600 transition-colors flex-shrink-0 ml-0.5"
                  aria-label={`Remove ${s.name}`}
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              </span>
            ))
          )}
        </span>
        <ChevronDownIcon 
          className={`w-5 h-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-[#002147]' : ''}`} 
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث کریں / Search category (e.g. قرآن, فقہ, حدیث, سیرت)..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Categories List */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-4">
              {loading && (
                <p className="text-xs text-center text-slate-400 py-8 font-medium">زمرہ جات لوڈ ہو رہے ہیں / Loading categories...</p>
              )}
              
              {!loading && Object.keys(groupedSubcategories).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400 font-medium">کوئی زمرہ نہیں ملا / No matching categories found</p>
                </div>
              )}
              
              {!loading && Object.entries(groupedSubcategories).map(([parentName, items]) => (
                <div key={parentName} className="space-y-1">
                  {/* Category Section Header */}
                  <div className="px-3 py-1 bg-slate-100/80 rounded-lg flex items-center justify-between text-xs font-black text-slate-700 tracking-wide border border-slate-200/60">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#002147]" />
                      {parentName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Subcategory Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                    {items.map(sub => {
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
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                            checked 
                              ? 'bg-[#002147] text-white shadow-xs' 
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200'
                          }`}
                          role="option"
                          aria-selected={checked}
                        >
                          <span className={`flex-shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            checked 
                              ? 'bg-white border-white' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {checked && <CheckIcon className="w-3 h-3 text-[#002147] stroke-[3]" />}
                          </span>
                          <span className="flex-1 truncate text-xs font-medium">
                            {sub.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary / Done button */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium px-2">
                Total available: <strong className="text-slate-700">{subcategories.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 bg-[#002147] text-white rounded-lg font-bold hover:bg-[#003166] transition shadow-xs"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubcategorySelect;
