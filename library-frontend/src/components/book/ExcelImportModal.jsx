// src/components/book/ExcelImportModal.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { parseExcelFile, generateSampleExcel } from '../../utils/excelParser';

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
  BookOpenIcon
} from '@heroicons/react/24/outline';

const ExcelImportModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

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
        setParsedData(null);
      } else {
        setParsedData(result);
        toast.success(`Successfully parsed ${result.books.length} books from Excel!`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to parse Excel file. Please check format.");
      setParsedData(null);
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

  const handleSelectBook = (book) => {
    // Navigate to Add Book page with pre-filled state
    navigate('/admin/books/add', {
      state: {
        prefillData: book,
        source: 'excel_import',
        fileName: selectedFileName
      }
    });
    onClose();
  };

  const filteredBooks = (parsedData?.books || []).filter(b => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(term)) ||
      (b.author && b.author.toLowerCase().includes(term)) ||
      (b.publisher && b.publisher.toLowerCase().includes(term)) ||
      (b.translator && b.translator.toLowerCase().includes(term)) ||
      (b.serial_number && String(b.serial_number).includes(term))
    );
  });

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
                Upload your spreadsheet to auto-fill book details and streamline catalogue entry.
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
                  Supports Urdu (عنوان، مصنف، ناشر، صفحات), Arabic & English column headers automatically
                </p>
              </div>

              {isParsing && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 pt-2 animate-pulse">
                  <SparklesIcon className="w-4 h-4" />
                  Analyzing and extracting book rows...
                </div>
              )}
            </div>
          </div>

          {/* PARSED BOOKS RESULTS SECTION */}
          {parsedData && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Meta & Stats bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/70">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">
                    Found <span className="font-black text-emerald-900">{parsedData.totalRows}</span> books in spreadsheet.
                  </span>
                  <span className="text-xs bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md font-semibold">
                    {parsedData.matchedFields.length} columns matched
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search in parsed books..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* TABLE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Title (عنوان)</th>
                        <th className="py-3 px-4">Author & Translator (مصنف)</th>
                        <th className="py-3 px-4">Publisher (ناشر)</th>
                        <th className="py-3 px-4 w-28 text-center">Pages / Year</th>
                        <th className="py-3 px-4 w-40 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredBooks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No books match the search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredBooks.map((b, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-slate-400">
                              {b._rowIndex || idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <BookOpenIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className="line-clamp-1">{b.title || <span className="text-slate-400 italic">No Title</span>}</span>
                              </div>
                              {b.edition && (
                                <span className="inline-block mt-0.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                  {b.edition}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              <div className="font-semibold">{b.author || '-'}</div>
                              {b.translator && (
                                <div className="text-[10px] text-slate-500">ترجمہ: {b.translator}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {b.publisher || '-'}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600">
                              <div>{b.page_count ? `${b.page_count} pp` : '-'}</div>
                              <div className="text-[10px] text-slate-400">{b.publication_year || ''}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectBook(b)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002147] hover:bg-[#003166] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-md hover:scale-[1.02] active:scale-95"
                              >
                                <span>Fill & Upload PDF</span>
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between px-1">
                <span>Tip: Click <strong>"Fill & Upload PDF"</strong> on any row to open the Add Book form with all details auto-filled.</span>
                <span>{filteredBooks.length} of {parsedData.totalRows} visible</span>
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

          {parsedData && (
            <button
              type="button"
              onClick={() => {
                if (parsedData.books[0]) handleSelectBook(parsedData.books[0]);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>Fill First Book ({parsedData.books[0]?.title || 'Row 1'})</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ExcelImportModal;
