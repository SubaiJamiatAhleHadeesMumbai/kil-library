import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Download, Copy, Check, Share2, BookOpen,
    ChevronDown, FileWarning, ExternalLink, Loader2, Lock,
    Maximize2, Minimize2, X, ChevronLeft, ChevronRight,
    ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, Download as DownloadIcon
} from 'lucide-react';
import { bookService } from "../../api/bookService";
import { getBookCover, getCoverUrl } from "../../utils/cover";

// --- react-pdf-viewer Imports ---
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { fullScreenPlugin } from '@react-pdf-viewer/full-screen';
import '@react-pdf-viewer/full-screen/lib/styles/index.css';

// --- Import Styles ---
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// --- Compact Info Item ---
const InfoItem = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-baseline gap-2 py-1.5 border-b border-gray-50">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[80px] shrink-0">
                {label}
            </span>
            <span className="text-sm text-gray-800 font-medium truncate">
                {value}
            </span>
        </div>
    );
};

// --- Loading Skeleton (mirrors final layout to avoid layout shift) ---
const LoadingSkeleton = () => (
    <div className="p-3 md:p-4 max-w-7xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-28"></div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 bg-gray-200 h-[420px] rounded-xl"></div>
            <div className="lg:col-span-3 space-y-4">
                <div className="bg-gray-200 h-[220px] rounded-xl"></div>
                <div className="bg-gray-200 h-[400px] rounded-xl"></div>
            </div>
        </div>
    </div>
);

// --- PDF area loading state (shown while embedded viewer boots) ---
const PdfLoadingState = () => (
    <div className="flex flex-col items-center justify-center gap-2 h-full text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-xs font-medium">Loading preview…</span>
    </div>
);

// --- PDF failed-to-render fallback ---
const PdfErrorState = ({ pdfUrl }) => (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-center px-4">
        <FileWarning className="w-8 h-8 text-amber-500" />
        <p className="text-sm text-gray-600">Preview couldn't load in-browser.</p>
        <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
            Open PDF directly <ExternalLink className="w-3 h-3" />
        </a>
    </div>
);

// --- Compact toolbar bar — reuses the viewer's real slot logic (page nav, zoom, download)
// but renders it in our own slim, single-row layout instead of the library's default bulky bar
const toolBtnClass = "p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600";
const renderCompactToolbar = (Toolbar) => (
    <Toolbar>
        {(slots) => {
            const { CurrentPageInput, GoToNextPage, GoToPreviousPage, NumberOfPages, ZoomIn, ZoomOut, Download } = slots;
            return (
                <div className="flex items-center justify-between w-full px-2 py-1 gap-2">
                    <div className="flex items-center gap-1">
                        <GoToPreviousPage>
                            {(props) => (
                                <button onClick={props.onClick} disabled={props.isDisabled} className={toolBtnClass} title="Previous page">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )}
                        </GoToPreviousPage>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="w-9 [&_input]:w-9 [&_input]:h-6 [&_input]:text-xs [&_input]:text-center [&_input]:rounded [&_input]:border [&_input]:border-gray-300">
                                <CurrentPageInput />
                            </span>
                            <span>/ <NumberOfPages /></span>
                        </div>
                        <GoToNextPage>
                            {(props) => (
                                <button onClick={props.onClick} disabled={props.isDisabled} className={toolBtnClass} title="Next page">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </GoToNextPage>
                    </div>

                    <div className="flex items-center gap-1">
                        <ZoomOut>
                            {(props) => (
                                <button onClick={props.onClick} className={toolBtnClass} title="Zoom out">
                                    <ZoomOutIcon className="w-4 h-4" />
                                </button>
                            )}
                        </ZoomOut>
                        <ZoomIn>
                            {(props) => (
                                <button onClick={props.onClick} className={toolBtnClass} title="Zoom in">
                                    <ZoomInIcon className="w-4 h-4" />
                                </button>
                            )}
                        </ZoomIn>
                    </div>

                    <Download>
                        {(props) => (
                            <button onClick={props.onClick} className={toolBtnClass} title="Download">
                                <DownloadIcon className="w-4 h-4" />
                            </button>
                        )}
                    </Download>
                </div>
            );
        }}
    </Toolbar>
);

// --- Main Component ---
const BookDetail = () => {
    const { id } = useParams();
    const location = useLocation();

    const isAdminPath = location.pathname.startsWith('/admin');
    const backPath = isAdminPath ? "/admin/books" : "/books";

    const [book, setBook] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPdf, setShowPdf] = useState(false);
    const [pdfFailed, setPdfFailed] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    const [isScrolled, setIsScrolled] = useState(false);
    const [resumePage, setResumePage] = useState(0);
    const [showResumeBanner, setShowResumeBanner] = useState(false);
    const [focusMode, setFocusMode] = useState(false);

    // Initialize plugins at top level
    const defaultLayoutPluginInstance = defaultLayoutPlugin({ renderToolbar: renderCompactToolbar });
    const fullScreenPluginInstance = fullScreenPlugin();

    // Lock page scroll while Focus Mode is active, so the book never
    // drags the footer or rest of the page along with it
    useEffect(() => {
        document.body.style.overflow = focusMode ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [focusMode]);

    // Let Escape close Focus Mode
    useEffect(() => {
        if (!focusMode) return;
        const onKey = (e) => { if (e.key === 'Escape') setFocusMode(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [focusMode]);

    // Track viewport for mobile-aware PDF handling
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Sticky compact header once the hero section scrolls out of view
    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 260);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const fetchBookDetails = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        setError(null);
        setPdfFailed(false);
        setDescExpanded(false);

        try {
            const data = await bookService.getBookById(id);
            setBook(data);
            setTimeout(() => setShowPdf(true), 200);

            // Restore last-read page for this book, if any
            const saved = Number(localStorage.getItem(`book-progress-${id}`)) || 0;
            if (saved > 0) {
                setResumePage(saved);
                setShowResumeBanner(true);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.detail || `Could not fetch details for book ID ${id}.`);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    // Fetch book data
    useEffect(() => {
        fetchBookDetails();
        return () => setShowPdf(false);
    }, [fetchBookDetails]);

    const handlePageChange = useCallback((e) => {
        if (id) localStorage.setItem(`book-progress-${id}`, String(e.currentPage));
    }, [id]);

    const handleCopyLink = useCallback(async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: book?.title, url: window.location.href });
                return;
            }
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // user cancelled share or clipboard blocked — ignore silently
        }
    }, [book]);

    const handleCopyIsbn = useCallback(async (isbn) => {
        try {
            await navigator.clipboard.writeText(isbn);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // clipboard blocked — ignore silently
        }
    }, []);

    if (isLoading) return <LoadingSkeleton />;

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block p-6 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                    <h2 className="text-lg font-bold mb-2">Error Loading Book</h2>
                    <p className="text-sm">{error}</p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <button
                            onClick={fetchBookDetails}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                            Try Again
                        </button>
                        <Link to={backPath} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-700 hover:bg-red-50 text-sm">
                            <ArrowLeft className="w-4 h-4" /> Return
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block p-8 rounded-2xl bg-gray-50 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-700">Book Not Found</h2>
                    <Link to={backPath} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                </div>
            </div>
        );
    }

    const coverImageUrl = getBookCover(book);
    const pdfUrl = getCoverUrl(book.pdf_url || book.pdf_file);
    const hasValidPdf = pdfUrl && !pdfUrl.includes("No+Cover");
    const description = book.description?.trim();
    const isLongDesc = description && description.length > 220;

    // Restricted books are gated on the public site; admins always see the full preview
    const isGated = book.is_restricted && !isAdminPath;

    // Rough estimate: ~1.2 min per page, shown as a friendly "reading time" badge
    const readingMinutes = book.page_count ? Math.round(book.page_count * 1.2) : null;
    const readingTimeLabel = readingMinutes
        ? readingMinutes >= 60
            ? `~${Math.round(readingMinutes / 60)} hr read`
            : `~${readingMinutes} min read`
        : null;

    return (
        <div className="p-3 md:p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
            {/* Sticky mini header — appears once the hero scrolls away */}
            <AnimatePresence>
                {isScrolled && (
                    <motion.div
                        initial={{ y: -48, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -48, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm"
                    >
                        <div className="max-w-7xl mx-auto flex items-center gap-3 px-3 py-2">
                            <Link to={backPath} aria-label="Back" className="text-slate-500 hover:text-indigo-600">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <span className="text-sm font-semibold text-gray-800 truncate">{book.title}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Breadcrumb */}
            <nav className="text-xs text-gray-500 mb-2 flex items-center gap-1.5 flex-wrap">
                <Link to="/" className="hover:text-indigo-600">Home</Link>
                <span>/</span>
                <Link to={backPath} className="hover:text-indigo-600">Books</Link>
                {book.subcategories?.[0]?.name && (
                    <>
                        <span>/</span>
                        <span className="hover:text-indigo-600">{book.subcategories[0].name}</span>
                    </>
                )}
                <span>/</span>
                <span className="text-gray-700 font-medium truncate max-w-[200px]">{book.title}</span>
            </nav>

            {/* Top bar: back + share */}
            <div className="flex items-center justify-between mb-3">
                <Link
                    to={backPath}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Link>

                <button
                    onClick={handleCopyLink}
                    aria-label="Share this book"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {copied ? (
                            <motion.span
                                key="copied"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="inline-flex items-center gap-1.5 text-emerald-600"
                            >
                                <Check className="w-3.5 h-3.5" /> Copied
                            </motion.span>
                        ) : (
                            <motion.span
                                key="share"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="inline-flex items-center gap-1.5"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Share
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left: Cover */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:sticky lg:top-4">
                        <img
                            src={coverImageUrl}
                            alt={`Cover of ${book.title}`}
                            className="w-full h-auto object-cover aspect-[3/4]"
                            loading="lazy"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/300x400/6366f1/ffffff?text=No+Cover";
                            }}
                        />
                        {hasValidPdf && !isGated && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
                            >
                                <Download className="w-4 h-4" /> Download PDF
                            </a>
                        )}
                        {hasValidPdf && isGated && (
                            <div className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-gray-100 text-gray-500 font-semibold text-sm">
                                <Lock className="w-4 h-4" /> Restricted Access
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Right: Book Details + PDF */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="lg:col-span-3 space-y-4"
                >
                    {/* Book Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <h1 className="text-lg font-bold text-gray-900 leading-snug">{book.title}</h1>
                            <p className="text-sm text-gray-600 mt-0.5">{book.author || 'Unknown Author'}</p>
                        </div>

                        <div className="p-3">
                            {/* Status Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                    book.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {book.is_approved ? '✓ Approved' : '⏳ Pending'}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                    book.is_restricted ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {book.is_restricted ? '🔒 Restricted' : '🌐 Public'}
                                </span>
                                {readingTimeLabel && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-600">
                                        ⏱ {readingTimeLabel}
                                    </span>
                                )}
                            </div>

                            {/* Compact Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0">
                                <InfoItem label="Publisher" value={book.publisher} />
                                <InfoItem label="Year" value={book.publication_year} />
                                <InfoItem label="Edition" value={book.edition} />
                                <InfoItem label="Language" value={book.language?.name} />
                                <InfoItem label="Pages" value={book.page_count} />
                                <InfoItem label="Volumes" value={book.parts_or_volumes} />
                                <InfoItem label="Translator" value={book.translator} />
                                <InfoItem label="Price" value={book.price ? `₹${book.price}` : null} />
                            </div>

                            {/* ISBN with copy */}
                            {book.isbn && (
                                <div className="flex items-center gap-2 py-1.5 border-b border-gray-50">
                                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[80px] shrink-0">
                                        ISBN
                                    </span>
                                    <span className="text-sm text-gray-800 font-medium">{book.isbn}</span>
                                    <button
                                        onClick={() => handleCopyIsbn(book.isbn)}
                                        aria-label="Copy ISBN"
                                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Categories */}
                            {book.subcategories?.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                    {book.subcategories.map((cat) => (
                                        <span
                                            key={cat.id ?? cat.name}
                                            className="px-2 py-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 rounded-full"
                                        >
                                            {cat.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Description - expand/collapse (no clamp bug) */}
                            {description && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className={`text-sm text-gray-700 leading-relaxed ${!descExpanded && isLongDesc ? 'line-clamp-3' : ''}`}>
                                        {description}
                                    </p>
                                    {isLongDesc && (
                                        <button
                                            onClick={() => setDescExpanded((v) => !v)}
                                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                        >
                                            {descExpanded ? 'Show less' : 'Read more'}
                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${descExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Remarks */}
                            {book.remarks && (
                                <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                    <span className="font-semibold">📌 Remarks:</span> {book.remarks}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PDF Viewer */}
                    {hasValidPdf && isGated && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-gray-700" />
                                <span className="text-sm font-semibold text-gray-700">PDF Preview</span>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center bg-slate-50">
                                <div className="p-3 rounded-full bg-rose-100">
                                    <Lock className="w-6 h-6 text-rose-600" />
                                </div>
                                <p className="text-sm font-semibold text-gray-700">This book is restricted</p>
                                <p className="text-xs text-gray-500 max-w-xs">
                                    Access to the full preview and download is limited. Please contact the library admin for access.
                                </p>
                            </div>
                        </div>
                    )}

                    {hasValidPdf && !isGated && (() => {
                        const panel = (
                            <div
                                className={
                                    focusMode
                                        ? "fixed inset-0 z-50 bg-white flex flex-col"
                                        : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                                }
                            >
                            <div className="px-2.5 py-1 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5" /> {focusMode ? '' : 'PDF Preview'}
                                </span>
                                <div className="flex items-center gap-2.5">
                                    {!isMobile && showPdf && !pdfFailed && (
                                        <fullScreenPluginInstance.EnterFullScreenButton />
                                    )}
                                    {!isMobile && showPdf && !pdfFailed && (
                                        <button
                                            onClick={() => setFocusMode((v) => !v)}
                                            title={focusMode ? "Exit focus mode" : "Enter focus mode"}
                                            aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
                                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 font-medium"
                                        >
                                            {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                            {!focusMode && 'Focus mode'}
                                        </button>
                                    )}
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open in new tab"
                                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        {focusMode ? <ExternalLink className="w-3.5 h-3.5" /> : <>Open in new tab <ExternalLink className="w-3 h-3" /></>}
                                    </a>
                                    {focusMode && (
                                        <button
                                            onClick={() => setFocusMode(false)}
                                            aria-label="Close focus mode"
                                            title="Close (Esc)"
                                            className="text-slate-400 hover:text-rose-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Resume-reading banner */}
                            <AnimatePresence>
                                {showResumeBanner && !isMobile && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-indigo-50 border-b border-indigo-100 shrink-0"
                                    >
                                        <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                                            <span className="text-indigo-700 font-medium">
                                                Resuming from page {resumePage}
                                            </span>
                                            <button
                                                onClick={() => setShowResumeBanner(false)}
                                                className="text-indigo-400 hover:text-indigo-600 font-semibold"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* On small screens, embedded viewers are fiddly to use — nudge toward opening it instead */}
                            {isMobile ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center bg-slate-50">
                                    <BookOpen className="w-8 h-8 text-indigo-400" />
                                    <p className="text-sm text-gray-600">Preview works best on desktop.<br />Open or download to read comfortably.</p>
                                    <div className="flex gap-2">
                                        <a
                                            href={pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" /> Open PDF
                                        </a>
                                    </div>
                                </div>
                            ) : !showPdf ? (
                                <div
                                    className="w-full flex items-center justify-center"
                                    style={{ height: focusMode ? undefined : '80vh', minHeight: focusMode ? undefined : '500px', maxHeight: focusMode ? undefined : '850px', flex: focusMode ? 1 : undefined }}
                                >
                                    <PdfLoadingState />
                                </div>
                            ) : pdfFailed ? (
                                <div
                                    className="w-full flex items-center justify-center"
                                    style={{ height: focusMode ? undefined : '80vh', minHeight: focusMode ? undefined : '500px', maxHeight: focusMode ? undefined : '850px', flex: focusMode ? 1 : undefined }}
                                >
                                    <PdfErrorState pdfUrl={pdfUrl} />
                                </div>
                            ) : (
                                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                                    <style>{`
                                        .pdf-compact .rpv-default-layout__toolbar {
                                            padding: 0 !important;
                                            min-height: unset !important;
                                        }
                                        .pdf-compact .rpv-default-layout__sidebar-headers {
                                            min-height: 30px !important;
                                        }
                                    `}</style>
                                    <div
                                        className="pdf-compact w-full bg-slate-100"
                                        style={{
                                            height: focusMode ? undefined : '80vh',
                                            minHeight: focusMode ? undefined : '500px',
                                            maxHeight: focusMode ? undefined : '850px',
                                            flex: focusMode ? 1 : undefined,
                                            overflow: 'auto',
                                            overscrollBehavior: 'contain'
                                        }}
                                    >
                                        <Viewer
                                            fileUrl={pdfUrl}
                                            plugins={[defaultLayoutPluginInstance, fullScreenPluginInstance]}
                                            theme="light"
                                            defaultScale={SpecialZoomLevel.PageWidth}
                                            initialPage={resumePage > 0 ? resumePage - 1 : 0}
                                            onPageChange={handlePageChange}
                                            renderError={() => {
                                                setPdfFailed(true);
                                                return <PdfErrorState pdfUrl={pdfUrl} />;
                                            }}
                                        />
                                    </div>
                                </Worker>
                            )}
                            </div>
                        );
                        return focusMode ? createPortal(panel, document.body) : panel;
                    })()}

                    {/* No PDF */}
                    {!hasValidPdf && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                            <FileWarning className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                            <span className="text-sm text-gray-500">PDF not available for this book</span>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default BookDetail;