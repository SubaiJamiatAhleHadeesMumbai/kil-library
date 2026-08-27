// ✅ src/components/book/BookFormUI.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon, ArrowPathIcon, XCircleIcon, CheckCircleIcon,
  DocumentTextIcon, PhotoIcon, DocumentIcon,
  BookOpenIcon, AdjustmentsHorizontalIcon, TagIcon,
  CloudArrowUpIcon, ShieldCheckIcon, LockClosedIcon,
  ComputerDesktopIcon, CheckIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import SubcategorySelect from './SubcategorySelect';
import GoogleDocsEditorModal from './GoogleDocsEditorModal';

const API_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

// --- Base Input Styling ---
const baseInputStyle =
  'w-full bg-white border-2 border-slate-200/90 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all duration-200 focus:border-[#002147] focus:shadow-[0_0_0_4px_rgba(0,33,71,0.08)] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

// --- Tailwind ColSpan Mapping (Prevents Tailwind JIT purge issues) ---
const colSpanMap = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  full: 'col-span-full'
};

// --- Section Header Component ---
const SectionHeader = ({ step, icon: Icon, title, subtitle, color = 'blue' }) => {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100',   ring: 'bg-blue-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', ring: 'bg-violet-600' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100',  ring: 'bg-amber-600' },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   border: 'border-teal-100',   ring: 'bg-teal-600' },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   border: 'border-rose-100',   ring: 'bg-rose-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`relative flex-shrink-0 w-11 h-11 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center shadow-xs`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
        <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full ${c.ring} text-white text-[10px] font-black flex items-center justify-center shadow-xs`}>
          {step}
        </span>
      </div>
      <div>
        <h3 className="text-base font-black text-slate-800 leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};

// --- Input Field ---
const InputField = ({ label, id, type = 'text', required, colSpan = 1, ...props }) => (
  <div className={colSpanMap[colSpan] || 'col-span-1'}>
    <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
      {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <input id={id} type={type} className={baseInputStyle} {...props} />
  </div>
);

// --- Select Field ---
const SelectField = ({ label, id, options = [], loading, placeholder = 'Select...', required, colSpan = 1, ...props }) => (
  <div className={colSpanMap[colSpan] || 'col-span-1'}>
    <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
      {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select id={id} className={`${baseInputStyle} appearance-none pr-10`} disabled={loading} {...props}>
        {loading ? <option>Loading options...</option> : <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  </div>
);

// --- Text Area Field ---
const TextAreaField = ({ label, id, rows = 3, colSpan = 2, ...props }) => (
  <div className={colSpanMap[colSpan] || 'col-span-2'}>
    <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
      {label}
    </label>
    <textarea id={id} rows={rows} className={`${baseInputStyle} resize-none`} {...props} />
  </div>
);

// --- Toggle Switch Card ---
const ToggleCard = ({ id, checked, onChange, disabled, icon: Icon, title, desc }) => {
  const [localChecked, setLocalChecked] = useState(!!checked);

  useEffect(() => { setLocalChecked(!!checked); }, [checked]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const next = !localChecked;
    setLocalChecked(next);
    console.debug('ToggleCard click', id, next);
    try {
      if (onChange) onChange({ target: { name: id, type: 'checkbox', checked: next } });
    } catch (err) {
      console.error('ToggleCard onChange error', err);
    }
  };

  return (
    <label
      htmlFor={id}
      onClick={handleClick}
      className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none ${
        localChecked ? 'border-[#002147] bg-[#002147]/5 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${localChecked ? 'bg-[#002147] text-white shadow-xs' : 'bg-slate-100 text-slate-400'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-bold text-sm transition-colors ${localChecked ? 'text-[#002147]' : 'text-slate-700'}`}>{title}</span>
          <div className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${localChecked ? 'bg-[#002147]' : 'bg-slate-200'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${localChecked ? 'translate-x-5' : ''}`} />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <input id={id} name={id} type="checkbox" checked={localChecked} onChange={() => {}} disabled={disabled} className="sr-only" />
    </label>
  );
};

const FileDropZone = ({
  label,
  id,
  accept,
  onChange,
  onOpenGoogleDocs,
  currentUrl,
  newFileName,
  fileSizeMb,
  uploadProgress,
  isLoading,
  icon: Icon,
  accent = 'blue'
}) => {
  const [dragging, setDragging] = useState(false);
  const [localName, setLocalName] = useState('');
  const inputRef = useRef();

  useEffect(() => { setLocalName(newFileName || ''); }, [newFileName]);

  const handleFile = (file) => {
    if (!file) return;
    setLocalName(file.name);
    const syntheticEvent = { target: { files: [file], name: id } };
    if (onChange) onChange(syntheticEvent);
    // If it's a text file, automatically open Google Docs Editor!
    if (id === 'txtFile' && onOpenGoogleDocs) {
      onOpenGoogleDocs(file);
    }
  };

  const accentMap = {
    blue:   { border: 'border-blue-300',   bg: 'bg-blue-50',   icon: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700' },
    violet: { border: 'border-violet-300', bg: 'bg-violet-50', icon: 'text-violet-500', badge: 'bg-violet-100 text-violet-700' },
    teal:   { border: 'border-teal-300',   bg: 'bg-teal-50',   icon: 'text-teal-500',   badge: 'bg-teal-100 text-teal-700' },
  };
  const a = accentMap[accent] || accentMap.blue;

  const isCurrentUploading = typeof uploadProgress === 'number' && uploadProgress > 0 && localName;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
        {id === 'txtFile' && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Google Docs Mode
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !isLoading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-6 cursor-pointer transition-all duration-200 group relative overflow-hidden
          ${dragging
            ? `${a.border} ${a.bg} scale-[1.02]`
            : localName
              ? 'border-emerald-300 bg-emerald-50/70'
              : `border-slate-200 bg-slate-50 hover:${a.border} hover:${a.bg}`
          }`}
      >
        <input ref={inputRef} id={id} name={id} type="file" accept={accept} className="sr-only" disabled={isLoading}
          onChange={(e) => { const f = e.target.files[0]; if (f) { handleFile(f); } }}
        />

        {isCurrentUploading ? (
          /* Circular Progress (1% to 100%) inside the Box */
          <div className="flex flex-col items-center justify-center py-2 animate-in zoom-in-90 duration-300">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#002147] transition-all duration-300 ease-out"
                  strokeDasharray={`${uploadProgress}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-[#002147] font-mono leading-none">
                  {uploadProgress}%
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                  {uploadProgress >= 100 ? "Saving" : "Upload"}
                </span>
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-700 max-w-[200px] truncate mt-2">{localName}</p>
          </div>
        ) : (
          <>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xs border
              ${localName ? 'bg-emerald-100 border-emerald-200' : `bg-white border-slate-200 group-hover:${a.bg}`}`}>
              {localName
                ? <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                : <Icon className={`w-6 h-6 ${a.icon} group-hover:scale-110 transition-transform duration-200`} />
              }
            </div>

            {localName ? (
              <div className="text-center">
                <p className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${a.badge} max-w-[180px] truncate`}>{localName}</p>
                {typeof fileSizeMb === 'number' && (
                  <div className="mt-1.5">
                    {fileSizeMb <= 100 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        🟢 {fileSizeMb} MB (Original HD - No Compression)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        ⚡ {fileSizeMb} MB (&gt;100MB - Smart HD Compression)
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1">Click to replace file</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">Drop file here</p>
                <p className="text-xs text-slate-400 mt-0.5">or <span className={`font-bold ${a.icon}`}>click to browse</span></p>
              </div>
            )}

            {currentUrl && !localName && (
              <a
                href={currentUrl.startsWith("http") ? currentUrl : `${API_URL}${currentUrl.startsWith('/') ? currentUrl : `/${currentUrl}`}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full ${a.badge} hover:opacity-80 transition-opacity`}
              >
                View Existing File
              </a>
            )}
          </>
        )}
      </div>

      {/* ✍️ Google Docs Open / Edit Button for Research Text */}
      {id === 'txtFile' && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onOpenGoogleDocs) onOpenGoogleDocs(null);
          }}
          className="mt-1 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-98"
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span>{localName || currentUrl ? "✏️ Edit in Google Docs" : "✍️ Open Google Docs Editor"}</span>
        </button>
      )}
    </div>
  );
};

// --- MAIN FORM UI COMPONENT ---
const BookFormUI = ({
  formData = {},
  languages = [],
  subcategories = [],
  fatawaCategories = [],
  initialData,
  isEditing,
  isLoading,
  isDropdownLoading,
  error,
  successMessage,
  coverImageName,
  pdfFileName,
  pdfFileSizeMb,
  txtFileName,
  uploadProgress,
  uploadStatusText,
  onChange,
  onSubcategoryChange,
  onFileChange,
  onGoogleDocsSave,
  onSubmit,
  onCancel,
}) => {
  // Google Docs Editor Modal State
  const [isGoogleDocsOpen, setIsGoogleDocsOpen] = useState(false);
  const [googleDocsFile, setGoogleDocsFile] = useState(null);

  const handleOpenGoogleDocs = (file = null) => {
    setGoogleDocsFile(file);
    setIsGoogleDocsOpen(true);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col h-full bg-white">

      {/* Status Banner */}
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 sm:p-8 space-y-10">

          {/* 1. CORE INFO */}
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

          {/* 2. SPECIFICATIONS */}
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
                value={formData.parts_or_volumes || ''} onChange={onChange} disabled={isLoading} placeholder="e.g. Vol. 1-3" />
              <InputField id="price" name="price" label="Price (PKR)" type="number"
                value={formData.price || ''} onChange={onChange} disabled={isLoading} min="0" placeholder="0.00" />
            </div>
          </section>

          {/* 3. LIBRARY CLASSIFICATION */}
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
              <SelectField
                id="fatawa_category_id"
                name="fatawa_category_id"
                label="Fatawa Category"
                options={fatawaCategories}
                value={formData.fatawa_category_id || ''}
                onChange={onChange}
                loading={isDropdownLoading}
                placeholder="Link to a fatawa topic"
              />
              <TextAreaField id="description" name="description" label="Description / Summary" rows={3} colSpan={2}
                value={formData.description || ''} onChange={onChange} disabled={isLoading}
                placeholder="Brief synopsis or notes about this book..." />
              <TextAreaField id="remarks" name="remarks" label="Remarks" rows={2} colSpan={2}
                value={formData.remarks || ''} onChange={onChange} disabled={isLoading}
                placeholder="Internal notes, condition, source, etc." />
            </div>
          </section>

          {/* 4. DIGITAL ASSETS */}
          <section>
            <SectionHeader step="4" icon={CloudArrowUpIcon} title="Digital Assets" subtitle="Upload cover image, PDF and research text (drag & drop supported)" color="teal" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <FileDropZone id="coverImageFile" label="Book Cover" accept="image/*"
                onChange={onFileChange} currentUrl={initialData?.cover_image_url}
                newFileName={coverImageName} isLoading={isLoading} icon={PhotoIcon} accent="violet" />
              <FileDropZone id="pdfFile" label="PDF Document" accept="application/pdf"
                onChange={onFileChange} currentUrl={initialData?.pdf_url}
                newFileName={pdfFileName} fileSizeMb={pdfFileSizeMb}
                uploadProgress={uploadProgress} isLoading={isLoading} icon={DocumentIcon} accent="blue" />
              <FileDropZone id="txtFile" label="Research Text" accept=".txt,.text,.md,.docx,.doc,.rtf,text/plain,text/*"
                onChange={onFileChange} onOpenGoogleDocs={handleOpenGoogleDocs} currentUrl={initialData?.txt_file_url}
                newFileName={txtFileName} isLoading={isLoading} icon={DocumentTextIcon} accent="teal" />
            </div>
          </section>

          {/* 5. ACCESS CONTROL */}
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
                desc="No physical copy - online access only." />
            </div>
          </section>

          {/* 6. LIVE UPLOAD & COMPRESSION PROGRESS PANEL (1% to 100%) */}
          <AnimatePresence>
            {typeof uploadProgress === 'number' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border border-slate-700/80"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
                      <CloudArrowUpIcon className="w-5 h-5 text-sky-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">
                        {uploadProgress < 100 ? "Uploading Book Assets..." : "Optimizing & Saving Book..."}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {uploadStatusText || `${uploadProgress}% processed`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-sky-400 font-mono tracking-tight">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full bg-slate-950/80 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
                  <motion.div
                    className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                    style={{ width: `${Math.max(2, Math.min(100, uploadProgress))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400 font-semibold">
                  <span>
                    {pdfFileSizeMb
                      ? (pdfFileSizeMb <= 100
                          ? `🟢 Original HD Quality Preserved (${pdfFileSizeMb} MB <= 100MB)`
                          : `⚡ Smart HD Optimization Active (${pdfFileSizeMb} MB > 100MB)`)
                      : "Multi-storage auto sync (R2 / Cloudinary / Local)"}
                  </span>
                  <span className="text-slate-300 font-mono">
                    {uploadProgress < 100 ? "Step 1 of 2: Upload" : "Step 2 of 2: Process"}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 sm:px-8 py-5 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-400 hidden sm:block">
          Fields marked <span className="text-rose-500 font-bold">*</span> are required
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
                {typeof uploadProgress === 'number' ? `Saving (${uploadProgress}%)...` : 'Saving...'}
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
      {/* 📝 GOOGLE DOCS STYLE URDU & ENGLISH TEXT EDITOR MODAL */}
      <GoogleDocsEditorModal
        isOpen={isGoogleDocsOpen}
        onClose={() => setIsGoogleDocsOpen(false)}
        onSave={(data) => {
          if (onGoogleDocsSave) onGoogleDocsSave(data);
        }}
        bookTitle={formData.title}
        initialFile={googleDocsFile}
        initialUrl={initialData?.txt_file_url}
      />
    </form>
  );
};

export default BookFormUI;