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
  const [isParsing, setIsParsing] = useState(false);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [booksList, setBooksList] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [unmatchedHeaders, setUnmatchedHeaders] = useState([]);

  // --- Pagination State (10 items per page) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load staged books from Database on open
  const loadStagedFromDB = async () => {
    try {
      const dbStaged = await bookService.getStagedBooks();
      if (dbStaged && dbStaged.length > 0) {
        setBooksList(dbStaged);
        setSelectedFileName(dbStaged[0]?.file_name || 'Cloud Staged Spreadsheet');
      }
    } catch (err) {
      console.warn("Staged books check:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStagedFromDB();
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

    setIsParsing(true);
    setSelectedFileName(file.name);

    try {
      const result = await parseExcelFile(file);
      if (result.books.length === 0) {
        toast.error("No book records found in this file.");
        return;
      }

      setUnmatchedHeaders(result.unmatchedHeaders || []);
      setBooksList(result.books);
      setCurrentPage(1);

      // Save to Staged Cloud DB in background
      bookService.saveBulkStagedBooks({
        file_name: file.name,
        books: result.books
      }).catch(e => console.warn("Background staged save:", e));

      toast.success(`Extracted ${result.books.length} books from ${file.name}!`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to parse Excel file. Please check format.");
    } finally {
      setIsParsing(false);
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

  // 🚀 DIRECT DATABASE IMPORT: Inserts all books into MySQL `books` table
  const handleImportAllToDatabase = async () => {
    if (booksList.length === 0) return;

    setIsImportingAll(true);
    const toastId = toast.loading(`Saving ${booksList.length} books directly to database catalog...`);

    try {
      const savedBooks = await bookService.bulkImportBooks(booksList);
      toast.success(`🎉 Successfully saved ${savedBooks.length} books to the database! Visible across all computers & phones.`, { id: toastId, duration: 5000 });
      
      // Cleanup staged books
      bookService.clearAllStagedBooks().catch(() => {});

      if (onStagedUpdated) {
        await onStagedUpdated();
      }
      onClose();
    } catch (err) {
      console.error("Bulk import failed:", err);
      toast.error("Failed to save books to database. Please check connection.", { id: toastId });
    } finally {
      setIsImportingAll(false);
    }
  };

  const handleSelectBook = (book) => {
    navigate('/admin/books/add', {
      state: {
        prefillData: book,
        stagedId: book.id || null,
        source: 'excel_import',
        fileName: selectedFileName
      }
    });
    onClose();
  };

  const handleDeleteStaged = async (bookId, index, e) => {
    e.stopPropagation();
    if (bookId) {
      await bookService.deleteStagedBook(bookId);
    }
    setBooksList(prev => prev.filter((b, i) => (b.id ? b.id !== bookId : i !== index)));
    toast.success("Removed book from preview.");
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
              <h2 className="text-xl font-bold text-slate-900">Import Books from Excel / CSV</h2>
              <p className="text-xs text-slate-500 font-medium">
                Saves directly to Database — permanently accessible across all laptops & mobile devices.
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
              <div className="w-14 h-14 rounded-2xl bg-white text-emerald-600 shadow-sm border border-slate-200 flex items-center justify-center">
                <DocumentArrowUpIcon className="w-7 h-7" />
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

              {isParsing && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 pt-2 animate-pulse">
                  <SparklesIcon className="w-4 h-4" />
                  Extracting book metadata from spreadsheet...
                </div>
              )}
            </div>
          </div>

          {/* UNMATCHED HEADERS NOTICE IF PRESENT */}
          {unmatchedHeaders.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 flex items-center justify-between">
              <div>
                <strong>Admin Record (Extra Columns):</strong> {unmatchedHeaders.join(', ')} will be saved in the admin-only metadata record.
              </div>
            </div>
          )}

          {/* PARSED BOOKS LIST */}
          {booksList.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Meta & Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/80">
                <div className="flex items-center gap-2 text-emerald-900 flex-wrap">
                  <CloudArrowUpIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">
                    <span className="font-black text-emerald-950">{booksList.length}</span> Books Extracted.
                  </span>
                  <span className="text-[11px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md font-semibold">
                    Ready to Save in DB
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter preview..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 font-medium outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleImportAllToDatabase}
                    disabled={isImportingAll}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>{isImportingAll ? "Saving..." : `Save All (${booksList.length}) to DB`}</span>
                  </button>
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
                              {b.serial_number || b.book_number || startIndex + idx + 1}
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
                                {b.language_name && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium">
                                    {b.language_name}
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
                              {b.quantity > 1 && (
                                <div className="text-[10px] text-emerald-600 font-bold">Qty: {b.quantity}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-600">
                              <div>{b.page_count ? `${b.page_count} pp` : '-'}</div>
                              {b.price && (
                                <div className="text-[10px] text-slate-500 font-semibold">₹{b.price}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSelectBook(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#002147] hover:bg-[#003166] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-md hover:scale-[1.02] active:scale-95"
                                >
                                  <span>Fill Form</span>
                                  <ArrowRightIcon className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteStaged(b.id, idx, e)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Dismiss Row"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                <span>Tip: Click <strong>"Save All to DB"</strong> to insert all records immediately into the Database.</span>
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

          {booksList.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImportAllToDatabase}
                disabled={isImportingAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>{isImportingAll ? "Saving..." : `Save All (${booksList.length}) Books to DB Catalog`}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ExcelImportModal;
