// src/components/book/ExcelImportModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { parseExcelFile, generateSampleExcel } from '../../utils/excelParser';
import { bookService } from '../../api/bookService';

// Icons
import {
  DocumentArrowUpIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  SparklesIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const ExcelImportModal = ({ isOpen, onClose, onStagedUpdated }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [booksList, setBooksList] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [unmatchedHeaders, setUnmatchedHeaders] = useState([]);

  // --- Pagination State (10 items per page) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isOpen) {
      setSaveSuccess(false);
      setBooksList([]);
      setSelectedFileName('');
    }
  }, [isOpen]);

  // Reset page when search or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, booksList]);

  if (!isOpen) return null;

  const handleFileProcess = async (file) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSelectedFileName(file.name);

    const toastId = toast.loading(`Parsing and saving ${file.name} to database...`);

    try {
      // 1. Parse Excel / CSV file
      const result = await parseExcelFile(file);
      if (!result.books || result.books.length === 0) {
        toast.error("No valid book records found in this file.", { id: toastId });
        setIsSaving(false);
        return;
      }

      setUnmatchedHeaders(result.unmatchedHeaders || []);

      // 2. 🚀 AUTOMATIC DIRECT INSERTION TO MYSQL DATABASE
      const savedBooks = await bookService.bulkImportBooks(result.books);
      setBooksList(savedBooks && savedBooks.length > 0 ? savedBooks : result.books);
      setSaveSuccess(true);
      setCurrentPage(1);

      toast.success(`🎉 Successfully saved ${savedBooks.length} books to MySQL Database! Permanent across all devices.`, { id: toastId, duration: 6000 });

      // 3. Immediately refresh main catalog
      if (onStagedUpdated) {
        await onStagedUpdated();
      }
    } catch (err) {
      console.error("Auto import error:", err);
      toast.error(err.response?.data?.detail || err.message || "Failed to save books to database.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSelectBook = (book) => {
    if (book.id) {
      navigate(`/admin/books/${book.id}/edit`);
    } else {
      navigate('/admin/books/add', {
        state: {
          prefillData: book,
          source: 'excel_import',
          fileName: selectedFileName
        }
      });
    }
    onClose();
  };

  const filteredBooks = booksList.filter(b => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(term)) ||
      (b.author && b.author.toLowerCase().includes(term)) ||
      (b.publisher && b.publisher.toLowerCase().includes(term)) ||
      (b.translator && b.translator.toLowerCase().includes(term)) ||
      (b.book_number && String(b.book_number).toLowerCase().includes(term)) ||
      (b.serial_number && String(b.serial_number).includes(term))
    );
  });

  // --- Pagination Calculations ---
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredBooks.length);
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-xs">
              <TableCellsIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Direct Excel / CSV Catalog Import</h2>
              <p className="text-xs text-slate-500 font-medium">
                Automatic MySQL Database saving — persistent across all laptops & mobile devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generateSampleExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-xs"
              title="Download standard template with Urdu & English headers"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-emerald-600" />
              Download Template (.xlsx)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- CONTENT BODY --- */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

          {/* DROPZONE / FILE UPLOAD */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                : saveSuccess
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-emerald-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className={`w-14 h-14 rounded-2xl ${saveSuccess ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600'} shadow-sm border border-slate-200 flex items-center justify-center transition-all`}>
                {saveSuccess ? <CheckIcon className="w-8 h-8 font-black stroke-[2.5]" /> : <DocumentArrowUpIcon className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {selectedFileName ? (
                    <span className="text-emerald-700 font-black">📄 {selectedFileName}</span>
                  ) : (
                    "Click to upload or drag & drop Excel (.xlsx, .xls) / CSV"
                  )}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Matches: نمبر شمار, کتاب نمبر, اسمائے کتب, زبان, تعداد, حصے, صفحات, فن نمبر, مؤلف / مرتب, مترجم, ناشر, قیمت, کیفیات
                </p>
              </div>

              {isSaving && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 pt-2 animate-pulse">
                  <SparklesIcon className="w-5 h-5 animate-spin" />
                  Saving books directly into MySQL database...
                </div>
              )}
            </div>
          </div>

          {/* PERMANENT SUCCESS BANNER */}
          {saveSuccess && (
            <div className="bg-emerald-600 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold flex-shrink-0">
                  <CheckCircleIcon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black">
                    🎉 {booksList.length} Books Successfully Saved in MySQL Database!
                  </h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Data is now 100% permanent. Refresh karein ya kisi bhi mobile/laptop se login karein, sabhi books hamesha visible rahengi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap self-stretch sm:self-auto text-center"
              >
                Go to Catalog & Attach PDFs
              </button>
            </div>
          )}

          {/* UNMATCHED HEADERS NOTICE IF PRESENT */}
          {unmatchedHeaders.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 flex items-center justify-between">
              <div>
                <strong>Admin Record (Extra Columns Saved):</strong> {unmatchedHeaders.join(', ')} were preserved in the internal admin record.
              </div>
            </div>
          )}

          {/* PARSED BOOKS LIST */}
          {booksList.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Meta Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 flex-wrap">
                  <CloudArrowUpIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">
                    Database Catalog: <span className="font-black text-slate-900">{booksList.length}</span> Books Active.
                  </span>
                </div>

                <div className="relative w-full sm:w-56">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search imported books..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 font-medium outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* TABLE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">#</th>
                        <th className="py-3 px-3">Title (اسمائے کتب)</th>
                        <th className="py-3 px-3">Author & Translator (مؤلف / مترجم)</th>
                        <th className="py-3 px-3">Publisher (ناشر)</th>
                        <th className="py-3 px-3 text-center">Vol/Qty</th>
                        <th className="py-3 px-3 text-center">Pages/Price</th>
                        <th className="py-3 px-3 w-36 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedBooks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No books match the search filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedBooks.map((b, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-bold text-slate-400">
                              {b.id ? `#${b.id}` : b.serial_number || b.book_number || startIndex + idx + 1}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 max-w-xs">
                              <div className="flex items-center gap-1.5">
                                <BookOpenIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className="line-clamp-1">{b.title || <span className="text-slate-400 italic">No Title</span>}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {b.book_number && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                    BK: {b.book_number}
                                  </span>
                                )}
                                {(b.language?.name || b.language_name) && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium">
                                    {b.language?.name || b.language_name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-700 max-w-xs">
                              <div className="font-semibold line-clamp-1">{b.author || '-'}</div>
                              {b.translator && (
                                <div className="text-[10px] text-slate-500 line-clamp-1">ترجمہ: {b.translator}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-xs">
                              <span className="line-clamp-1">{b.publisher || '-'}</span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-600">
                              <div>{b.parts_or_volumes ? `Vol ${b.parts_or_volumes}` : '-'}</div>
                              {(b.quantity > 1 || b.total_copies > 1) && (
                                <div className="text-[10px] text-emerald-600 font-bold">Qty: {b.quantity || b.total_copies}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-600">
                              <div>{b.page_count ? `${b.page_count} pp` : '-'}</div>
                              {b.price && (
                                <div className="text-[10px] text-slate-500 font-semibold">₹{b.price}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectBook(b)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-md hover:scale-[1.02] active:scale-95"
                              >
                                <DocumentArrowUpIcon className="w-3.5 h-3.5" />
                                <span>Attach PDF</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* --- 10-ITEM PAGINATION CONTROLS --- */}
                {filteredBooks.length > 0 && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-slate-500 font-medium">
                      Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to <span className="font-bold text-slate-800">{endIndex}</span> of <span className="font-bold text-slate-800">{filteredBooks.length}</span> books
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                      >
                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      {/* Page indicator pills */}
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                currentPage === pageNum
                                  ? 'bg-[#002147] text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <span className="text-slate-400 text-xs px-1">...</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                      >
                        <span>Next</span>
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between px-1">
                <span>All books saved permanently to MySQL database. Click <strong>"Attach PDF"</strong> on any book to upload files.</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </div>
          )}

        </div>

        {/* --- FOOTER --- */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
          >
            Close
          </button>

          {saveSuccess && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>Go to Books List & Attach PDFs</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ExcelImportModal;
