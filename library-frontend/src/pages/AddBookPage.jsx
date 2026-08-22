// src/pages/AddBookPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BookForm from "../components/book/BookForm";
import ExcelImportModal from "../components/book/ExcelImportModal";
import { parseExcelFile, generateSampleExcel } from "../utils/excelParser";
import { toast } from "react-hot-toast";

import { bookService } from "../api/bookService";

// Icons
import {
  ArrowLeftIcon,
  TableCellsIcon,
  SparklesIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon
} from "@heroicons/react/24/outline";

const AddBookPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [prefillData, setPrefillData] = useState(location.state?.prefillData || null);
  const [sourceFileName, setSourceFileName] = useState(location.state?.fileName || "");
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isParsingDirect, setIsParsingDirect] = useState(false);

  useEffect(() => {
    if (location.state?.prefillData) {
      setPrefillData(location.state.prefillData);
      setSourceFileName(location.state.fileName || "Excel Spreadsheet");
    }
  }, [location.state]);

  const handleSuccess = async () => {
    const sId = location.state?.stagedId || prefillData?.id;
    if (sId) {
      await bookService.deleteStagedBook(sId).catch(() => {});
    }
    navigate("/admin/books");
  };

  const handleClearPrefill = () => {
    setPrefillData(null);
    setSourceFileName("");
    toast.success("Form cleared to blank state.");
  };

  // Direct quick Excel upload on this page
  const handleDirectFileSelect = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsParsingDirect(true);

    try {
      const result = await parseExcelFile(file);
      if (!result.books || result.books.length === 0) {
        toast.error("No valid book rows found in file.");
      } else if (result.books.length === 1) {
        // If 1 book, pre-fill form
        setPrefillData(result.books[0]);
        setSourceFileName(file.name);
        toast.success(`Loaded book details from ${file.name}!`);
      } else {
        // If multiple books, automatically insert all to MySQL Database & redirect to catalog!
        const toastId = toast.loading(`Saving ${result.books.length} books to database catalog...`);
        const saved = await bookService.bulkImportBooks(result.books);
        toast.success(`🎉 Successfully saved ${saved.length} books to Database Catalog!`, { id: toastId, duration: 5000 });
        navigate("/admin/books");
      }
    } catch (err) {
      console.error("AddBook error:", err);
      const rawMsg = err.response?.data?.detail || err.message;
      const errorStr = typeof rawMsg === 'string' ? rawMsg : (Array.isArray(rawMsg) ? rawMsg.map(e => e.msg || JSON.stringify(e)).join(', ') : "Failed to parse/save Excel file.");
      toast.error(errorStr);
    } finally {
      setIsParsingDirect(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6 space-y-4">
        
        {/* --- TOP BAR --- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/books")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Books
          </button>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleDirectFileSelect}
            />

            <button
              type="button"
              onClick={generateSampleExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
              title="Download standard sample Excel sheet"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-emerald-600" />
              Sample Template
            </button>

            <button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all active:scale-95"
              title="Upload Excel or pick from spreadsheet"
            >
              <TableCellsIcon className="w-4 h-4" />
              <span>{isParsingDirect ? "Reading Excel..." : "Fill from Excel"}</span>
            </button>
          </div>
        </div>

        {/* --- PREFILL ACTIVE ALERT BANNER --- */}
        {prefillData && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-md">
                    Pre-filled from Excel
                  </span>
                  {sourceFileName && (
                    <span className="text-xs font-medium text-slate-500">
                      ({sourceFileName})
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {prefillData.title || "Untitled Book"}
                </h3>
                <p className="text-xs text-slate-600">
                  Metadata has been populated from your spreadsheet. Please select your <strong>PDF file</strong> or <strong>Cover Image</strong> below and review details before saving.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearPrefill}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all self-end sm:self-center"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear Pre-fill
            </button>
          </div>
        )}

        {/* --- MAIN FORM CONTAINER --- */}
        <div className="flex-1 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Add New Book</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Fill in the book details below or use Excel import to add a new item to the library catalog.
            </p>
          </div>

          <div className="w-full">
            <BookForm
              key={prefillData ? `prefilled-${prefillData._rowIndex || prefillData.title}` : 'blank-form'}
              initialData={prefillData}
              isEditing={false}
              onBookAdded={handleSuccess}
              onBookUpdated={handleSuccess}
              onCancel={() => navigate("/admin/books")}
            />
          </div>
        </div>

      </div>

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />
    </div>
  );
};

export default AddBookPage;
