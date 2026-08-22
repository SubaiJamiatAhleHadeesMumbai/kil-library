// src/pages/BookManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { bookService } from '../api/bookService';

// Components
import Modal from '../components/common/Modal';
import BookDetailsModal from '../components/book/BookDetailsModal';
import ExcelImportModal from '../components/book/ExcelImportModal';

// Icons
import { 
    PlusIcon, 
    PencilSquareIcon, 
    TrashIcon, 
    EyeIcon, 
    MagnifyingGlassIcon, 
    ArrowPathIcon,
    DocumentTextIcon,
    DocumentIcon,
    BookOpenIcon,
    LockClosedIcon,
    CheckCircleIcon,
    NoSymbolIcon,
    XMarkIcon,
    ComputerDesktopIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    TableCellsIcon
} from '@heroicons/react/24/outline';

// --- SKELETON LOADER COMPONENT ---
const TableSkeleton = () => (
    <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl animate-pulse border border-slate-100">
                <div className="flex items-center space-x-4 w-1/3">
                    <div className="h-12 w-12 bg-slate-200 rounded-xl" />
                    <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                    </div>
                </div>
                <div className="h-4 bg-slate-200 rounded-md w-1/6 hidden sm:block" />
                <div className="h-6 bg-slate-200 rounded-full w-1/6" />
                <div className="h-6 bg-slate-200 rounded-full w-1/12" />
                <div className="h-8 bg-slate-200 rounded-xl w-24" />
            </div>
        ))}
    </div>
);

const BookManagement = () => {
    const navigate = useNavigate();

    // --- State ---
    const [allBooks, setAllBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingBook, setDeletingBook] = useState(null);
    
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedBookForView, setSelectedBookForView] = useState(null);

    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [stagedCount, setStagedCount] = useState(0);

    // Filter/Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PUBLIC' | 'RESTRICTED' | 'DIGITAL'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // --- Data Fetching ---
    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [booksData, stagedData] = await Promise.all([
                bookService.getAllBooks({ approved_only: false }),
                bookService.getStagedBooks().catch(() => [])
            ]);
            setAllBooks(booksData || []);
            setStagedCount(Array.isArray(stagedData) ? stagedData.length : 0);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load library data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page to 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    // --- Stats Summary Calculation ---
    const stats = useMemo(() => {
        const total = allBooks.length;
        const restricted = allBooks.filter(b => b.is_restricted).length;
        const publicAccess = total - restricted;
        const digitalOnly = allBooks.filter(b => b.is_digital).length;
        return { total, restricted, publicAccess, digitalOnly };
    }, [allBooks]);

    // --- Filtering & Pagination ---
    const filteredBooks = useMemo(() => {
        return allBooks.filter(book => {
            // Status Filter Check
            if (statusFilter === 'RESTRICTED' && !book.is_restricted) return false;
            if (statusFilter === 'PUBLIC' && book.is_restricted) return false;
            if (statusFilter === 'DIGITAL' && !book.is_digital) return false;

            // Search Term Check
            if (!searchTerm.trim()) return true;
            const lowerCaseSearch = searchTerm.toLowerCase();
            return (
                book.title?.toLowerCase().includes(lowerCaseSearch) ||
                book.author?.toLowerCase().includes(lowerCaseSearch) ||
                book.isbn?.toLowerCase().includes(lowerCaseSearch) ||
                book.language?.name?.toLowerCase().includes(lowerCaseSearch)
            );
        });
    }, [allBooks, searchTerm, statusFilter]);

    const paginatedBooks = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredBooks.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredBooks, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

    // --- Actions ---
    const handleAddClick = () => {
        navigate('/admin/books/add');
    };

    const handleEditClick = (book) => {
        navigate(`/admin/books/${book.id}/edit`);
    };

    const handleDeleteClick = (book) => {
        setDeletingBook(book);
        setIsDeleteModalOpen(true);
    };

    const handleViewClick = (book) => {
        setSelectedBookForView(book);
        setIsViewModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingBook) return;
        const toastId = toast.loading("Deleting book from library catalog...");
        try {
            await bookService.deleteBook(deletingBook.id);
            toast.success("Book deleted successfully", { id: toastId });
            setAllBooks(prev => prev.filter(b => b.id !== deletingBook.id));
            closeDeleteModal();
        } catch (err) {
            toast.error(err.detail || "Could not delete book", { id: toastId });
        }
    };

    const closeDeleteModal = () => { 
        setIsDeleteModalOpen(false); 
        setDeletingBook(null); 
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50/50 min-h-screen font-sans">
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

            {/* --- HEADER SECTION --- */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-slate-900 to-slate-800 text-emerald-400 rounded-2xl shadow-md border border-slate-800">
                            <BookOpenIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                Library Management
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                Manage collection metadata, digital assets, and restricted access privileges.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-10">
                    <button
                        onClick={() => fetchData(false)}
                        className="p-3 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-2xl transition-all shadow-xs border border-slate-200/60 active:scale-95"
                        title="Refresh Catalog Data"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                    </button>

                    <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="inline-flex items-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                        title="Upload Excel (.xlsx, .xls) or CSV to auto-extract books"
                    >
                        <TableCellsIcon className="w-5 h-5 mr-2" />
                        <span>Import from Excel</span>
                        {stagedCount > 0 && (
                            <span className="ml-2 bg-emerald-900 text-white text-[11px] px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                                {stagedCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleAddClick}
                        className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-slate-900/15 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-slate-700/50"
                    >
                        <PlusIcon className="w-5 h-5 mr-2 text-emerald-400" />
                        Add New Book
                    </button>
                </div>
            </div>

            {/* --- PERSISTENT CLOUD STAGED BOOKS BANNER --- */}
            {stagedCount > 0 && (
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
                            <TableCellsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                <span>{stagedCount} Excel Book{stagedCount > 1 ? 's' : ''} Staged in Cloud Database</span>
                                <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md font-semibold">
                                    Ready for PDF Attach
                                </span>
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Your uploaded spreadsheets are saved to the cloud so you can open the form and attach PDFs from any mobile or laptop.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap self-stretch sm:self-auto text-center"
                    >
                        Open Staged Books ({stagedCount})
                    </button>
                </div>
            )}

            {/* --- STATS SUMMARY CARDS --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Total Books</span>
                        <BookOpenIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Public Catalog</span>
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{stats.publicAccess}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Restricted Books</span>
                        <LockClosedIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-amber-600">{stats.restricted}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Digital Only</span>
                        <ComputerDesktopIcon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-indigo-600">{stats.digitalOnly}</p>
                </div>
            </div>

            {/* --- CONTROLS & FILTER TABS --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Search Input */}
                <div className="relative w-full md:w-96">
                    <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search title, author, ISBN, language..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 text-xs font-medium text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Status Quick Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                    {[
                        { key: 'ALL', label: 'All Books' },
                        { key: 'PUBLIC', label: 'Public Access' },
                        { key: 'RESTRICTED', label: 'Restricted' },
                        { key: 'DIGITAL', label: 'Digital Only' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`
                                px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200
                                ${statusFilter === tab.key 
                                    ? 'bg-slate-900 text-emerald-400 shadow-sm border border-slate-800' 
                                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- CATALOG TABLE SECTION --- */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
                {isLoading ? (
                    <div className="p-6">
                        <TableSkeleton />
                    </div>
                ) : filteredBooks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                    <th className="px-6 py-4">Book Information</th>
                                    <th className="px-6 py-4">ISBN & Language</th>
                                    <th className="px-6 py-4 text-center">Files & Media</th>
                                    <th className="px-6 py-4 text-center">Access Level</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium">
                                {paginatedBooks.map((book) => (
                                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors group">
                                        
                                        {/* Book Title & Author */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                {/* Cover Avatar Fallback */}
                                                <div className="h-12 w-12 flex-shrink-0 bg-gradient-to-tr from-slate-900 to-slate-800 text-emerald-400 rounded-xl flex flex-col items-center justify-center font-bold text-xs shadow-md border border-slate-700">
                                                    <span>#{book.id}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                                                        {book.title}
                                                    </h3>
                                                    <p className="text-slate-400 text-xs truncate">
                                                        {book.author || 'Unknown Author'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* ISBN & Language */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-slate-900 font-semibold">{book.isbn || 'N/A'}</div>
                                            <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                                                {book.language?.name || 'Unknown'}
                                            </span>
                                        </td>

                                        {/* File Indicators */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {book.pdf_url ? (
                                                    <span title="PDF File Attached" className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 shadow-2xs">
                                                        <DocumentIcon className="w-4 h-4" />
                                                    </span>
                                                ) : null}
                                                
                                                {book.txt_file_url ? (
                                                    <span title="Text/Research File Attached" className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-2xs">
                                                        <DocumentTextIcon className="w-4 h-4" />
                                                    </span>
                                                ) : null}

                                                {!book.pdf_url && !book.txt_file_url && (
                                                    <span className="text-[10px] text-slate-400 italic">No files</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Status Badges */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`
                                                    inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-full border shadow-2xs uppercase tracking-wider
                                                    ${book.is_restricted 
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200/80' 
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                                    }
                                                `}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${book.is_restricted ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                    {book.is_restricted ? 'Restricted' : 'Public Access'}
                                                </span>
                                                {book.is_digital && (
                                                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">
                                                        Digital Only
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleViewClick(book)} 
                                                    className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors" 
                                                    title="View Book Details"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>

                                                <button 
                                                    onClick={() => handleEditClick(book)} 
                                                    className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors" 
                                                    title="Edit Metadata"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>

                                                <button 
                                                    onClick={() => handleDeleteClick(book)} 
                                                    className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors" 
                                                    title="Delete Book"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="p-4 bg-slate-100 text-slate-400 rounded-3xl mb-4">
                            <MagnifyingGlassIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">No books found in catalog</h3>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                            {searchTerm 
                                ? `No books matching "${searchTerm}". Try searching for another title, author, or ISBN.` 
                                : "Start building your library catalog by adding a new book."
                            }
                        </p>
                        {!searchTerm && (
                            <button 
                                onClick={handleAddClick} 
                                className="mt-5 px-4 py-2 bg-slate-900 text-emerald-400 text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md"
                            >
                                Add First Book
                            </button>
                        )}
                    </div>
                )}

                {/* --- PAGINATION FOOTER --- */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200/80 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                        >
                            <ChevronLeftIcon className="w-4 h-4" /> Previous
                        </button>

                        <span className="text-xs text-slate-600 font-bold">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200/80 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                        >
                            Next <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* ================= MODALS ================= */}

            {/* View Details Modal */}
            {isViewModalOpen && selectedBookForView && (
                <BookDetailsModal 
                    book={selectedBookForView}
                    onClose={() => {
                        setIsViewModalOpen(false);
                        setSelectedBookForView(null);
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Book Deletion" size="max-w-md">
                <div className="space-y-5">
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3">
                        <NoSymbolIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Warning: Irreversible Action</h4>
                            <p className="text-xs text-rose-700 leading-relaxed">
                                Are you sure you want to delete <strong>"{deletingBook?.title}"</strong>? This will permanently remove the record and attached assets.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={closeDeleteModal}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all"
                        >
                            Delete Book
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Excel / CSV Import Modal */}
            <ExcelImportModal 
                isOpen={isExcelModalOpen} 
                onClose={() => setIsExcelModalOpen(false)}
                onStagedUpdated={fetchData}
            />

        </div>
    );
};

export default BookManagement;