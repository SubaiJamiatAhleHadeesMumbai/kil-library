import StandardFormattedText from "../components/common/StandardFormattedText";
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookService } from '../api/bookService';
import { getBookCover } from '../utils/cover';
import { Toaster, toast } from 'react-hot-toast';

// Icons
import { 
    DocumentTextIcon, 
    DocumentIcon, 
    ArrowDownTrayIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    ArrowLeftIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    BookOpenIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// PDF Viewer Imports
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import BookPurchaseModal from '../components/book/BookPurchaseModal';
import CommentSection from '../components/book/CommentSection';

const BookDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    
    // --- Reader States ---
    const [viewMode, setViewMode] = useState("pdf"); // 'pdf' or 'text'
    const [textContent, setTextContent] = useState("");
    const [textLoading, setTextLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAllPages, setShowAllPages] = useState(false);
    const [fontSize, setFontSize] = useState("normal"); // 'normal', 'large', 'xl'

    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    useEffect(() => {
        if (!id || id === 'null' || id === 'undefined') {
            navigate('/books', { replace: true });
            return;
        }
        const fetchDetails = async () => {
            try {
                const data = await bookService.getBookById(id);
                if (data) {
                    setBook(data);
                    // Smart Default: If no PDF but Text exists, switch to Text mode
                    if (!data.pdf_url && data.txt_file_url) {
                        setViewMode("text");
                    }
                }
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    // Fetch Text Content when 'Text View' is active
    useEffect(() => {
        if (viewMode === "text" && book?.txt_file_url && !textContent) {
            fetchTextContent();
        }
    }, [viewMode, book]);

    const fetchTextContent = async () => {
        setTextLoading(true);
        try {
            const fileUrl = book.txt_file_url.startsWith("http") 
                ? book.txt_file_url 
                : `${import.meta.env.VITE_API_BASE_URL || ''}${book.txt_file_url}`;
            const response = await fetch(fileUrl);
            const text = await response.text();
            setTextContent(text);
        } catch (error) {
            console.error("Error fetching text:", error);
            toast.error("Failed to load text content.");
        } finally {
            setTextLoading(false);
        }
    };

    // Split text by PAGE_SEPARATOR
    const pages = useMemo(() => {
        if (!textContent) return [];
        if (textContent.includes("PAGE_SEPARATOR")) {
            return textContent.split(/PAGE_SEPARATOR/i).map(p => p.trim()).filter(Boolean);
        }
        return [textContent.trim()];
    }, [textContent]);

    const totalPages = pages.length;
    const activePageContent = pages[currentPage - 1] || "";

    const handleCopy = (textToCopy, msg = "Copied to clipboard!") => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast.success(msg);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!book) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full space-y-4">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                        <BookOpenIcon className="w-8 h-8 stroke-1" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Book Not Found</h2>
                    <p className="text-xs text-slate-500">
                        This book ID ({id}) either does not exist, has been removed, or is awaiting admin approval.
                    </p>
                    <Link
                        to="/books"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#002147] text-white text-xs font-bold hover:bg-slate-900 transition shadow-sm"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span>Return to Library</span>
                    </Link>
                </div>
            </div>
        );
    }

    // --- SMART STYLING LOGIC ---
    const isRTL = ['arabic', 'urdu', 'persian'].includes(book.language?.name?.toLowerCase());
    const langClass = isRTL ? 'font-arabic text-right dir-rtl' : 'font-sans text-left';

    const fontSizeClass = {
        normal: 'text-base sm:text-lg leading-[2.2]',
        large: 'text-lg sm:text-xl leading-[2.4]',
        xl: 'text-xl sm:text-2xl leading-[2.6]'
    }[fontSize] || 'text-base sm:text-lg leading-[2.2]';

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-slate-800">
            <Toaster position="top-right" />

            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-200 py-4 px-4 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Link to="/books" className="hover:text-emerald-600 flex items-center gap-1.5 transition-colors">
                            <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" /> Library
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-md">{book.title}</span>
                    </div>

                    {/* View Mode Toggles */}
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-xs border border-gray-200">
                        {book.pdf_url && (
                            <button
                                onClick={() => setViewMode("pdf")}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    viewMode === "pdf" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <DocumentIcon className="w-4 h-4" /> PDF
                            </button>
                        )}
                        {book.txt_file_url && (
                            <button
                                onClick={() => setViewMode("text")}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    viewMode === "text" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <DocumentTextIcon className="w-4 h-4" /> Research Text {totalPages > 1 && `(${totalPages} Pages)`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    
                    {/* LEFT: Cover & Actions (4 Cols) */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-24">
                            <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 mb-6">
                                <img 
                                    src={getBookCover(book)} 
                                    alt={book.title}
                                    className="w-full h-auto rounded-xl object-cover aspect-[2/3] shadow-inner"
                                />
                            </div>

                            {/* Download / Read Actions */}
                            <div className="space-y-2.5">
                                {(book.pdf_url || book.txt_file_url) && (
                                    <Link
                                        to={`/read/${book.id}`}
                                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm"
                                    >
                                        <BookOpenIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Read Free Online (Split Reader)
                                    </Link>
                                )}

                                {book.pdf_url && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowPurchaseModal(true)}
                                        className="w-full bg-[#002147] text-white py-3 rounded-xl font-bold hover:bg-[#003166] transition-all flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm cursor-pointer"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                                        {book.is_download_paid ? `Download Offline PDF (₹${book.download_price || 49})` : 'Download PDF'}
                                    </button>
                                )}
                            </div>

                            {/* Publication Details in Left Column */}
                            <div className="mt-6 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Publication Info</h4>
                                <div className="text-xs text-slate-700 space-y-2">
                                    <div className="flex justify-between"><span className="text-slate-400">Publisher:</span> <span className="font-semibold text-right">{book.publisher || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Translator:</span> <span className="font-semibold text-right">{book.translator || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Pages:</span> <span className="font-semibold">{book.page_count || totalPages || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Edition:</span> <span className="font-semibold">{book.edition || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Published:</span> <span className="font-semibold">{book.published_date || book.publication_year || 'N/A'}</span></div>
                                    {book.price && <div className="flex justify-between"><span className="text-slate-400">Price:</span> <span className="font-semibold">₹ {book.price}</span></div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Content Area (8 Cols) */}
                    <div className="lg:col-span-8">
                        
                        {/* Book Metadata Header */}
                        <div className="mb-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-xs">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {book.language && (
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-full border border-emerald-200">
                                        {book.language.name}
                                    </span>
                                )}
                                {book.edition && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest rounded-full">
                                        {book.edition}
                                    </span>
                                )}
                                {totalPages > 0 && (
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                                        📄 {totalPages} Pages Text
                                    </span>
                                )}
                            </div>
                            
                            <h1 className={`text-xl sm:text-2xl font-bold text-slate-900 leading-snug mb-2 ${langClass}`} style={{ fontFamily: isRTL ? '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif' : 'inherit' }}>
                                {book.title}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-600 font-normal">
                                تالیف / Author: <span className="text-slate-900 font-bold underline decoration-slate-300 decoration-1 underline-offset-4">{book.author || "فضیلۃ الشیخ"}</span>
                            </p>
                            {book.translator && (
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    ترجمہ / Translator: <span className="text-slate-800 font-semibold">{book.translator}</span>
                                </p>
                            )}
                        </div>

                        {/* 🅱️ TEXT RESEARCH MODE (RENDERED FIRST IN TEXT MODE) */}
                        {viewMode === "text" && (
                            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden min-h-[650px] flex flex-col mb-8">
                                {/* Top Controls Toolbar */}
                                <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                            📄
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                                Research Text Reader
                                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-900 font-black">
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Actions: Text Size & Copy */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                            <button
                                                onClick={() => setFontSize('normal')}
                                                className={`px-2 py-1 text-xs rounded font-bold transition ${fontSize === 'normal' ? 'bg-emerald-500 text-slate-900' : 'text-slate-300 hover:text-white'}`}
                                                title="Normal Text"
                                            >
                                                A
                                            </button>
                                            <button
                                                onClick={() => setFontSize('large')}
                                                className={`px-2 py-1 text-xs rounded font-bold transition ${fontSize === 'large' ? 'bg-emerald-500 text-slate-900' : 'text-slate-300 hover:text-white'}`}
                                                title="Large Text"
                                            >
                                                A+
                                            </button>
                                            <button
                                                onClick={() => setFontSize('xl')}
                                                className={`px-2 py-1 text-xs rounded font-bold transition ${fontSize === 'xl' ? 'bg-emerald-500 text-slate-900' : 'text-slate-300 hover:text-white'}`}
                                                title="Extra Large Text"
                                            >
                                                A++
                                            </button>
                                        </div>

                                        <button 
                                            onClick={() => handleCopy(showAllPages ? textContent : activePageContent, showAllPages ? "Copied whole book!" : `Copied page ${currentPage}!`)}
                                            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            {copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                                            {copied ? "Copied!" : (showAllPages ? "Copy All" : "Copy Page")}
                                        </button>

                                        <button
                                            onClick={() => setShowAllPages(!showAllPages)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition border ${showAllPages ? 'bg-amber-400 text-slate-900 border-amber-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'}`}
                                        >
                                            {showAllPages ? "Single Page View" : "View All Pages"}
                                        </button>
                                    </div>
                                </div>

                                {/* Page Navigation Bar (when not viewing all pages) */}
                                {!showAllPages && totalPages > 1 && (
                                    <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 sm:px-6 py-2.5 flex items-center justify-between">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage <= 1}
                                            className="flex items-center gap-1 text-xs font-bold text-emerald-900 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-xs hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        >
                                            <ChevronLeftIcon className="w-4 h-4" /> Previous Page
                                        </button>

                                        {/* Dropdown Page Selector */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-emerald-900">Jump to Page:</span>
                                            <select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
                                                className="bg-white border border-emerald-300 text-emerald-950 font-bold text-xs rounded-lg px-2.5 py-1 outline-none shadow-xs focus:ring-2 focus:ring-emerald-500"
                                            >
                                                {pages.map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>
                                                        Page {i + 1} of {totalPages}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage >= totalPages}
                                            className="flex items-center gap-1 text-xs font-bold text-emerald-900 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-xs hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        >
                                            Next Page <ChevronRightIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* Text Content Area */}
                                <div className="p-6 sm:p-10 lg:p-14 overflow-y-auto max-h-[800px] bg-slate-50/50">
                                    {textLoading ? (
                                        <div className="space-y-4 animate-pulse">
                                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-5 bg-gray-200 rounded w-full"></div>
                                            <div className="h-5 bg-gray-200 rounded w-5/6"></div>
                                            <div className="h-5 bg-gray-200 rounded w-4/6"></div>
                                        </div>
                                    ) : showAllPages ? (
                                        <div className="space-y-12">
                                            {pages.map((pageText, idx) => (
                                                <div key={idx} className="relative bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs">
                                                    <div className="absolute top-4 left-4 bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                                                        Page {idx + 1}
                                                    </div>
                                                    <div className="pt-6">
                                                        <StandardFormattedText text={pageText} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-gray-200 shadow-xs">
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-6">
                                                <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {activePageContent.length} characters
                                                </span>
                                            </div>
                                            <div 
                                                className={`prose prose-slate max-w-none text-slate-800 whitespace-pre-wrap ${langClass} ${fontSizeClass}`}
                                                style={{ fontFamily: isRTL ? '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif' : 'inherit' }}
                                            >
                                                {activePageContent || "No text content available for this page."}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Page Navigation */}
                                {!showAllPages && totalPages > 1 && (
                                    <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage <= 1}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition"
                                        >
                                            ← Previous
                                        </button>
                                        <span className="text-xs font-bold text-slate-600">
                                            Page {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage >= totalPages}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🅰️ PDF / DOCUMENT VIEWER MODE */}
                        {viewMode === "pdf" && book.pdf_url ? (
                            book.pdf_url.toLowerCase().includes('.doc') ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                                    <DocumentIcon className="w-16 h-16 text-indigo-500 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">Microsoft Word Document</h3>
                                    <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
                                        This book is available in Word (.docx) format. Click below to download and read.
                                    </p>
                                    <a
                                        href={book.pdf_url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#002147] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#003166] transition-all"
                                    >
                                        <ArrowDownTrayIcon className="w-5 h-5" /> Download Document (.docx)
                                    </a>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{height: 'calc(100vh - 240px)'}}>
                                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                                        <Viewer fileUrl={book.pdf_url} plugins={[defaultLayoutPluginInstance]} />
                                    </Worker>
                                </div>
                            )
                        ) : viewMode === "pdf" ? (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mb-4 shadow-sm border border-amber-100">
                                    ⏳
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 mb-2 font-serif" style={{ fontFamily: '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif' }}>
                                    عنقریب...
                                </h3>
                                <p className="text-lg text-slate-600 max-w-md leading-relaxed font-serif" style={{ fontFamily: '"Jameel Noori Nastaleeq", "Noto Naskh Arabic", serif' }}>
                                    اس کتاب کی پی ڈی ایف جلد ہی دستیاب ہوگی ان شاء اللہ
                                </p>
                            </div>
                        ) : null}

                    </div>
                </div>

                {/* Comments & Reviews Section */}
                {book?.id && (
                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <CommentSection entityType="book" entityId={book.id} isRTL={isRTL} />
                    </div>
                )}
            </div>

            {/* Paid Download & UPI Purchase Modal */}
            <BookPurchaseModal
                key="book-detail-purchase-modal"
                book={book}
                pdfUrl={book?.pdf_url || book?.pdf_file}
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
            />
        </div>
    );
};

export default BookDetail;
