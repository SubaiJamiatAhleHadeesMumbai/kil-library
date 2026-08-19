// ✅ src/components/book/BookFormUI.jsx - All JSX syntax fixed
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

// â”€â”€â”€ Design tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const base =
  'w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-200 focus:border-[#002147] focus:shadow-[0_0_0_4px_rgba(0,33,71,0.07)] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

// â”€â”€â”€ Section header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SectionHeader = ({ step, icon: Icon, title, subtitle, color = 'blue' }) => {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100',   ring: 'bg-blue-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', ring: 'bg-violet-600' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100',  ring: 'bg-amber-600' },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   border: 'border-teal-100',   ring: 'bg-teal-600' },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   border: 'border-rose-100',   ring: 'bg-rose-600' },
  };
  const c = colors[color];
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`relative flex-shrink-0 w-11 h-11 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center shadow-sm`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
        <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full ${c.ring} text-white text-[10px] font-black flex items-center justify-center shadow`}>{step}</span>
      </div>
      <div>
        <h3 className="text-base font-black text-slate-800 leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};

// â”€â”€â”€ Input Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const InputField = ({ label, id, type = 'text', required, colSpan = 1, ...props }) => (
  <div className={`col-span-${colSpan}`}>
    <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
      {label} {required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    <input id={id} type={type} className={base} {...props} />
  </div>
);

// â”€â”€â”€ Select Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SelectField = ({ label, id, options = [], loading, placeholder = 'Selectâ€¦', required, colSpan = 1, ...props }) => (
  <div className={`col-span-${colSpan}`}>
    <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
      {label} {required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select id={id} className={`${base} appearance-none pr-10`} disabled={loading} {...props}>
        {loading ? <option>Loadingâ€¦</option> : <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  </div>
);

// â”€â”€â”€ TextArea Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TextAreaField = ({ label, id, rows = 3, colSpan = 2, ...props }) => (
  <div className={`col-span-${colSpan}`}>
    <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
    <textarea id={id} rows={rows} className={`${base} resize-none`} {...props} />
  </div>
);

// â”€â”€â”€ Multi-select subcategories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ✅ FIXED: Multi-select subcategories with proper event handling & mobile support
const SubcategorySelect = ({ subcategories, selectedIds, onChange, loading }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // ✅ FIX: Improved click-outside detection with proper timing
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    // Small delay to prevent immediate closing on same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchend', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, [open]);

  // ✅ FIX: Proper event delegation and propagation handling
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
    
    // ✅ CRITICAL FIX: Send proper event structure
    onChange({ 
      target: { 
        name: 'subcategory_ids', 
        value: next  // Ensure value is the array, not selectedOptions
      } 
    });
    
    console.log("✅ Category toggled. New selection:", next);
  };

  const selected = subcategories.filter(s => selectedIds.includes(Number(s.id)));

  return (
    <div className="col-span-2 relative" ref={ref}>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
        Categories & Genres <span className="text-rose-400">*</span>
      </label>
      
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className={`${base} flex items-center justify-between gap-2 text-left min-h-[48px] focus:ring-2 focus:ring-[#002147]`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select categories"
      >
        <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-slate-400 font-normal">Select categories…</span>
          ) : selected.map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
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
          ))}
        </span>
        <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="max-h-56 overflow-y-auto p-2">
              {loading && <p className="text-xs text-center text-slate-400 py-4">Loading…</p>}
              {!loading && subcategories.length === 0 && <p className="text-xs text-center text-slate-400 py-4">No categories found</p>}
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${checked ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    role="option"
                    aria-selected={checked}
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#002147] border-[#002147]' : 'border-slate-300'}`}>
                      {checked && <CheckIcon className="w-3 h-3 text-white" />}
                    </span>
                    <span>
                      <span className="text-slate-400 text-xs">{sub.category?.name} › </span>
                      {sub.name}
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

// â”€â”€â”€ Toggle switch card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ToggleCard = ({ id, checked, onChange, disabled, icon: Icon, title, desc }) => (
  <label
    htmlFor={id}
    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none ${
      checked ? 'border-[#002147] bg-[#002147]/5' : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${checked ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-400'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className={`font-bold text-sm transition-colors ${checked ? 'text-[#002147]' : 'text-slate-700'}`}>{title}</span>
        <div className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-[#002147]' : 'bg-slate-200'}`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </div>
    <input id={id} name={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
  </label>
);

// â”€â”€â”€ Drag & Drop File Zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FileDropZone = ({ label, id, accept, onChange, currentUrl, newFileName, icon: Icon, accent = 'blue' }) => {
  const [dragging, setDragging] = useState(false);
  const [localName, setLocalName] = useState('');
  const inputRef = useRef();

  useEffect(() => { setLocalName(newFileName || ''); }, [newFileName]);

  const handleFile = (file) => {
    if (!file) return;
    setLocalName(file.name);
    const syntheticEvent = { target: { files: [file], name: id } };
    if (onChange) onChange(syntheticEvent);
  };

  const accentMap = {
    blue:   { border: 'border-blue-300',   bg: 'bg-blue-50',   icon: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700' },
    violet: { border: 'border-violet-300', bg: 'bg-violet-50', icon: 'text-violet-500', badge: 'bg-violet-100 text-violet-700' },
    teal:   { border: 'border-teal-300',   bg: 'bg-teal-50',   icon: 'text-teal-500',   badge: 'bg-teal-100 text-teal-700' },
  };
  const a = accentMap[accent] || accentMap.blue;

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all duration-200 group
          ${dragging
            ? `${a.border} ${a.bg} scale-[1.02]`
            : localName
              ? 'border-emerald-300 bg-emerald-50'
              : `border-slate-200 bg-slate-50 hover:${a.border} hover:${a.bg}`
          }`}
      >
        <input ref={inputRef} id={id} name={id} type="file" accept={accept} className="sr-only"
          onChange={(e) => { const f = e.target.files[0]; if (f) { setLocalName(f.name); if (onChange) onChange(e); } }}
        />

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm border
          ${localName ? 'bg-emerald-100 border-emerald-200' : `bg-white border-slate-200 group-hover:${a.bg}`}`}>
          {localName
            ? <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
            : <Icon className={`w-6 h-6 ${a.icon} group-hover:scale-110 transition-transform duration-200`} />
          }
        </div>

        {localName ? (
          <div className="text-center">
            <p className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${a.badge} max-w-[180px] truncate`}>{localName}</p>
            <p className="text-[10px] text-slate-400 mt-1">Click to change</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">Drop file here</p>
            <p className="text-xs text-slate-400 mt-0.5">or <span className={`font-bold ${a.icon}`}>click to browse</span></p>
          </div>
        )}

        {currentUrl && !localName && (
          <a href={`${API_URL}${currentUrl}`} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full ${a.badge} hover:opacity-80 transition-opacity`}>
            View existing file
          </a>
        )}
      </div>
    </div>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//   MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const BookFormUI = ({
  formData = {},
  languages = [],
  subcategories = [],
  initialData,
  isEditing,
  isLoading,
  isDropdownLoading,
  error,
  successMessage,
  coverImageName,
  pdfFileName,
  txtFileName,
  onChange,
  onSubcategoryChange,
  onFileChange,
  onSubmit,
  onCancel,
}) => {

  return (
    <form onSubmit={onSubmit} className="flex flex-col h-full bg-white">

      {/* â”€â”€ Status Banner â”€â”€ */}
      <AnimatePresence>
        {(error || successMessage) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-3 px-6 py-3.5 border-b text-sm font-semibold flex-shrink-0
              ${error ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}
          >
            {error
              ? <XCircleIcon className="w-5 h-5 text-rose-500 flex-shrink-0" />
              : <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            {error || successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Scrollable body â”€â”€ */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 sm:p-8 space-y-10">

          {/* â”€â”€â”€ 1. CORE INFO â”€â”€â”€ */}
          <section>
            <SectionHeader step="1" icon={BookOpenIcon} title="Core Details" subtitle="Title, author, publisher and language" color="blue" />
            <div className="grid grid-cols-2 gap-5">
              <InputField id="title" name="title" label="Book Title" required colSpan={2}
                value={formData.title || ''} onChange={onChange} disabled={isLoading}
                placeholder="e.g. Sahih Al-Bukhari" />
              <InputField id="author" name="author" label="Author / Compiler"
                value={formData.author || ''} onChange={onChange} disabled={isLoading} placeholder="Author name" />
              <InputField id="publisher" name="publisher" label="Publisher"
                value={formData.publisher || ''} onChange={onChange} disabled={isLoading} placeholder="Publisher name" />
              <SelectField id="language_id" name="language_id" label="Language" required
                options={languages.map(l => ({ id: l.LanguageID ?? l.id, name: l.LanguageName ?? l.name }))}
                value={formData.language_id || ''} onChange={onChange}
                loading={isDropdownLoading} disabled={isLoading} />
              <InputField id="translator" name="translator" label="Translator"
                value={formData.translator || ''} onChange={onChange} disabled={isLoading} placeholder="Translator (if any)" />
            </div>
          </section>

          {/* â”€â”€â”€ 2. SPECIFICATIONS â”€â”€â”€ */}
          <section>
            <SectionHeader step="2" icon={AdjustmentsHorizontalIcon} title="Specifications" subtitle="ISBN, edition, year, pages and pricing" color="violet" />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <InputField id="isbn" name="isbn" label="ISBN"
                value={formData.isbn || ''} onChange={onChange} disabled={isLoading} placeholder="e.g. 978-0-06-112008-4" />
              <InputField id="publication_year" name="publication_year" label="Publication Year" type="number"
                value={formData.publication_year || ''} onChange={onChange} disabled={isLoading} min="1000" max="2100" placeholder="e.g. 2023" />
              <InputField id="edition" name="edition" label="Edition"
                value={formData.edition || ''} onChange={onChange} disabled={isLoading} placeholder="e.g. 3rd Edition" />
              <InputField id="page_count" name="page_count" label="Pages" type="number"
                value={formData.page_count || ''} onChange={onChange} disabled={isLoading} min="1" placeholder="e.g. 450" />
              <InputField id="parts_or_volumes" name="parts_or_volumes" label="Parts / Volumes"
                value={formData.parts_or_volumes || ''} onChange={onChange} disabled={isLoading} placeholder="e.g. Vol. 1â€“3" />
              <InputField id="price" name="price" label="Price (PKR)" type="number"
                value={formData.price || ''} onChange={onChange} disabled={isLoading} min="0" placeholder="0.00" />
            </div>
          </section>

          {/* â”€â”€â”€ 3. LIBRARY CLASSIFICATION â”€â”€â”€ */}
          <section>
            <SectionHeader step="3" icon={TagIcon} title="Library Classification" subtitle="Catalog numbers, categories and notes" color="amber" />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 mb-5">
              <InputField id="serial_number" name="serial_number" label="Serial No."
                value={formData.serial_number || ''} onChange={onChange} disabled={isLoading} placeholder="Library serial number" />
              <InputField id="book_number" name="book_number" label="Book No."
                value={formData.book_number || ''} onChange={onChange} disabled={isLoading} placeholder="Accession number" />
              <InputField id="subject_number" name="subject_number" label="Subject No."
                value={formData.subject_number || ''} onChange={onChange} disabled={isLoading} placeholder="Dewey / subject code" />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <SubcategorySelect
                subcategories={subcategories}
                selectedIds={formData.subcategory_ids || []}
                onChange={onSubcategoryChange}
                loading={isDropdownLoading}
              />
              <TextAreaField id="description" name="description" label="Description / Summary" rows={3} colSpan={2}
                value={formData.description || ''} onChange={onChange} disabled={isLoading}
                placeholder="Brief synopsis or notes about this bookâ€¦" />
              <TextAreaField id="remarks" name="remarks" label="Remarks" rows={2} colSpan={2}
                value={formData.remarks || ''} onChange={onChange} disabled={isLoading}
                placeholder="Internal notes, condition, source, etc." />
            </div>
          </section>

          {/* â”€â”€â”€ 4. DIGITAL ASSETS â”€â”€â”€ */}
          <section>
            <SectionHeader step="4" icon={CloudArrowUpIcon} title="Digital Assets" subtitle="Upload cover image, PDF and research text (drag & drop supported)" color="teal" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FileDropZone id="coverImageFile" label="Book Cover" accept="image/*"
                onChange={onFileChange} currentUrl={initialData?.cover_image_url}
                newFileName={coverImageName} icon={PhotoIcon} accent="violet" />
              <FileDropZone id="pdfFile" label="PDF Document" accept="application/pdf"
                onChange={onFileChange} currentUrl={initialData?.pdf_url}
                newFileName={pdfFileName} icon={DocumentIcon} accent="blue" />
              <FileDropZone id="txtFile" label="Research Text" accept=".txt,.md,.docx"
                onChange={onFileChange} currentUrl={initialData?.txt_file_url}
                newFileName={txtFileName} icon={DocumentTextIcon} accent="teal" />
            </div>
          </section>

          {/* â”€â”€â”€ 5. ACCESS CONTROL â”€â”€â”€ */}
          <section>
            <SectionHeader step="5" icon={ShieldCheckIcon} title="Access Control" subtitle="Set borrowing and visibility permissions" color="rose" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ToggleCard id="is_restricted" checked={formData.is_restricted || false}
                onChange={onChange} disabled={isLoading}
                icon={LockClosedIcon} title="Restricted Access"
                desc="Users must request approval to view or download." />
              <ToggleCard id="is_digital" checked={formData.is_digital || false}
                onChange={onChange} disabled={isLoading}
                icon={ComputerDesktopIcon} title="Digital Only"
                desc="No physical copy â€” online access only." />
            </div>
          </section>

        </div>
      </div>

      {/* â”€â”€ Footer Actions â”€â”€ */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 sm:px-8 py-5 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-400 hidden sm:block">
          Fields marked <span className="text-rose-400 font-bold">*</span> are required
        </p>
        <div className="flex items-center gap-3 ml-auto">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all">
              Cancel
            </button>
          )}
          <motion.button
            whileHover={{ scale: (isLoading || isDropdownLoading) ? 1 : 1.02, y: (isLoading || isDropdownLoading) ? 0 : -1 }}
            whileTap={{ scale: (isLoading || isDropdownLoading) ? 1 : 0.98 }}
            type="submit"
            disabled={isLoading || isDropdownLoading}
            className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-[#002147] text-white text-sm font-bold shadow-lg shadow-[#002147]/20 hover:bg-[#003166] hover:shadow-[#002147]/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Savingâ€¦
              </>
            ) : (
              <>
                {isEditing ? <ArrowPathIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                {isEditing ? 'Update Book' : 'Add to Library'}
              </>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  );
};

export default BookFormUI;
