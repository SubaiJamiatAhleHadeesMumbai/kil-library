// src/pages/BookManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast'; // ✅ Better Notifications
import { bookService } from '../api/bookService';

// Components
import BookForm from '../components/book/BookForm';
import Modal from '../components/common/Modal';
import BookDetailsModal from '../components/book/BookDetailsModal'; // Ensure path is correct

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
    CheckBadgeIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';

// --- SKELETON LOADER COMPONENT ---
const TableSkeleton = () => (
    <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-1/12"></div>
                <div className="h-4 bg-gray-200 rounded w-3/12"></div>
                <div className="h-4 bg-gray-200 rounded w-2/12"></div>
                <div className="h-4 bg-gray-200 rounded w-2/12"></div>
                <div className="h-4 bg-gray-200 rounded w-2/12"></div>
                <div className="h-4 bg-gray-200 rounded w-2/12"></div>
            </div>
        ))}
    </div>
);

const BookManagement = () => {
    const navigate = useNavigate();

    // --- State ---
    const [allBooks, setAllBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState(null); // null = Add, object = Edit
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingBook, setDeletingBook] = useState(null);
    
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedBookForView, setSelectedBookForView] = useState(null);

    // Filter/Search
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // --- Data Fetching ---
    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const data = await bookService.getAllBooks({ approved_only: false });
            setAllBooks(data || []);
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

    // --- Filtering & Pagination ---
    const filteredBooks = useMemo(() => {
        if (!searchTerm) return allBooks;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return allBooks.filter(book =>
            book.title.toLowerCase().includes(lowerCaseSearch) ||
            (book.author && book.author.toLowerCase().includes(lowerCaseSearch)) ||
            (book.isbn && book.isbn.toLowerCase().includes(lowerCaseSearch))
        );
    }, [allBooks, searchTerm]);

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
        setEditingBook(book);
        setIsEditModalOpen(true);
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
        const toastId = toast.loading("Deleting book...");
        try {
            await bookService.deleteBook(deletingBook.id);
            toast.success("Book deleted successfully", { id: toastId });
            setAllBooks(prev => prev.filter(b => b.id !== deletingBook.id)); // Optimistic update
            closeDeleteModal();
        } catch (err) {
            toast.error(err.detail || "Could not delete book", { id: toastId });
        }
    };

    // Callback from BookForm (Child)
    const handleFormSuccess = () => {
        setIsEditModalOpen(false);
        fetchData(true); // Silent refresh
        toast.success(editingBook ? "Book updated!" : "Book added successfully!");
    };

    const closeDeleteModal = () => { setIsDeleteModalOpen(false); setDeletingBook(null); };
    const closeEditModal = () => { setIsEditModalOpen(false); setEditingBook(null); };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
            <Toaster position="top-right" />

            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        📚 Library Management
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {allBooks.length} Total
                        </span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage books, files, and access permissions.</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="inline-flex items-center px-5 py-2.5 bg-[#002147] hover:bg-[#003366] text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Book
                </button>
            </div>

            {/* --- Controls --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search books..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
                <button onClick={() => fetchData(false)} className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors" title="Refresh">
                    <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* --- Table Section --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-6">
                        <TableSkeleton />
                    </div>
                ) : filteredBooks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Book Info</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ISBN / Lang</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Files</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedBooks.map((book) => (
                                    <tr key={book.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100">
                                                    {book.id}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-900 line-clamp-1">{book.title}</div>
                                                    <div className="text-sm text-gray-500">{book.author || 'Unknown Author'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{book.isbn || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{book.language?.name || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                {book.pdf_url ? (
                                                    <span title="PDF Available" className="p-1 bg-red-50 text-red-600 rounded">
                                                        <DocumentIcon className="w-4 h-4" />
                                                    </span>
                                                ) : <span className="w-6" />}
                                                
                                                {book.txt_file_url ? (
                                                    <span title="Text/Research Available" className="p-1 bg-blue-50 text-blue-600 rounded">
                                                        <DocumentTextIcon className="w-4 h-4" />
                                                    </span>
                                                ) : <span className="w-6" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full ${ book.is_restricted ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800' }`}>
                                                    {book.is_restricted ? 'Restricted' : 'Public'}
                                                </span>
                                                {book.is_digital && (
                                                    <span className="text-[10px] text-gray-400 font-medium">Digital Only</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleViewClick(book)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View Details">
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleEditClick(book)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteClick(book)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-gray-50 p-4 rounded-full mb-3">
                            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No books found</h3>
                        <p className="text-gray-500 max-w-sm mt-1">
                            {searchTerm ? `No results for "${searchTerm}". Try different keywords.` : "Get started by adding a new book to the library."}
                        </p>
                        {!searchTerm && (
                            <button onClick={handleAddClick} className="mt-4 text-blue-600 hover:underline text-sm font-medium">
                                Add your first book
                            </button>
                        )}
                    </div>
                )}

                {/* --- Pagination --- */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600 font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* ================= MODALS ================= */}

            {/* 1. Add/Edit Form Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                title={editingBook ? "Edit Book Details" : "Add New Book"}
                size="max-w-5xl"
            >
                <BookForm
                    initialData={editingBook}
                    isEditing={!!editingBook}
                    onBookAdded={handleFormSuccess}
                    onBookUpdated={handleFormSuccess}
                    onCancel={closeEditModal}
                />
            </Modal>

            {/* 2. View Details Modal (Optional but Recommended) */}
            {selectedBookForView && (
                <BookDetailsModal 
                    book={selectedBookForView}
                    onClose={() => setIsViewModalOpen(false)}
                    // Pass isOpen if your modal component expects it, 
                    // otherwise keeping it conditional {selectedBookForView && ...} mounts/unmounts it.
                />
            )}

            {/* 3. Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Deletion" size="max-w-md">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-start gap-3">
                        <NoSymbolIcon className="w-6 h-6 text-red-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-800">Warning: Irreversible Action</h4>
                            <p className="text-xs text-red-600 mt-1">
                                Are you sure you want to delete <strong>"{deletingBook?.title}"</strong>? This will remove it from the public catalog.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={closeDeleteModal}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
                        >
                            Delete Book
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default BookManagement;