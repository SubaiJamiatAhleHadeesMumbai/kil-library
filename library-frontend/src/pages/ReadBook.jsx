import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon, 
  BookOpenIcon, 
  BookmarkIcon, 
  ShareIcon 
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import apiClient from '../api/apiClient';
import { getCoverUrl, getPdfUrl } from '../utils/cover';
import PdfViewer from '../components/book/PdfViewer';
import { interactionService } from '../api/interactionService'; // Ensure correct import
import analyticsService from '../api/analyticsService';
import toast from 'react-hot-toast';

const ReadBook = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // --- State Management ---
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('pdf'); // 'pdf' | 'text'
    
    // Research Toolkit States
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [textContent, setTextContent] = useState('');
    const [textLoading, setTextLoading] = useState(false);

    // Refs for scroll tracking
    const textContainerRef = useRef(null);

    // --- 1. Initial Load (Book + User Status) ---
    useEffect(() => {
        const initReader = async () => {
            try {
                setLoading(true);
                
                // A. Fetch Book Details
                const bookRes = await apiClient.get(`/api/books/${id}`);
                const bookData = bookRes.data;
                setBook(bookData);

                // B. Fetch User Interaction (Last Read, Bookmark)
                // Note: Only if user is logged in (Error handle inside service)
                const status = await interactionService.getBookStatus(id);
                if (status) {
                    setIsBookmarked(status.is_bookmarked);
                    // Future: We can scroll to status.last_page_read here
                }

                try {
                    const recentReadsRaw = localStorage.getItem("bookNest_recent_reads");
                    const recentReads = recentReadsRaw ? JSON.parse(recentReadsRaw) : [];
                    const nextEntry = {
                        book_id: Number(id),
                        title: bookData?.title,
                        cover_image_url: bookData?.cover_image_url || bookData?.cover_image,
                        last_page_read: status?.last_page_read || 1,
                        total_pages: status?.total_pages || 0,
                        updated_at: new Date().toISOString(),
                    };

                    const filtered = Array.isArray(recentReads)
                      ? recentReads.filter((entry) => String(entry.book_id) !== String(id))
                      : [];

                    filtered.unshift(nextEntry);
                    localStorage.setItem("bookNest_recent_reads", JSON.stringify(filtered.slice(0, 8)));

                    await analyticsService.trackVisit({
                        visitor_id: analyticsService.getVisitorId(),
                        path: `/read/${id}`,
                        event_type: 'book_read',
                        book_id: Number(id),
                        referrer: document.referrer || null,
                        user_agent: navigator.userAgent,
                    });
                } catch (storageError) {
                    console.warn("Could not store recent read:", storageError);
                }

                // C. Default to PDF URL fix
                if (!bookData.pdf_url && !bookData.pdf_file) {
                    toast.error("No reading material available.");
                }

            } catch (err) {
                console.error("Error initializing reader:", err);
                toast.error("Failed to load book.");
            } finally {
                setLoading(false);
            }
        };

        if (id) initReader();
    }, [id]);

    // --- 2. Text Mode Logic (Lazy Fetch) ---
    useEffect(() => {
        if (viewMode === 'text' && !textContent && book?.txt_file_url) {
            const fetchText = async () => {
                try {
                    setTextLoading(true);
                    // Cloudinary URL se text fetch karein
                    const response = await axios.get(book.txt_file_url); 
                    setTextContent(response.data);
                } catch (err) {
                    console.error("Failed to load text content:", err);
                    toast.error("Could not load text mode.");
                } finally {
                    setTextLoading(false);
                }
            };
            fetchText();
        }
    }, [viewMode, book]);

    // --- PDF viewer states ---
    const [scale, setScale] = useState(1.0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    // --- 3. Actions ---
    const toggleBookmark = async () => {
        const newState = !isBookmarked;
        setIsBookmarked(newState);
        try {
            await interactionService.toggleBookmark(id, newState);
            toast.success(newState ? "Bookmarked!" : "Bookmark removed");
        } catch (err) {
            setIsBookmarked(!newState); // Revert on error
            toast.error("Failed to save bookmark");
        }
    };

    const handleCopyText = () => {
        navigator.clipboard.writeText(textContent);
        toast.success("Full text copied to clipboard!");
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 animate-pulse">Loading Library...</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
            
            {/* ================= HEADER TOOLBAR ================= */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 shadow-sm z-20 shrink-0">
                
                {/* Left: Back & Title */}
                <div className="flex items-center gap-4 overflow-hidden">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800 text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                            {book?.title}
                        </h1>
                        <p className="text-xs text-slate-500 hidden md:block">
                            {viewMode === 'pdf' ? 'Original PDF View' : 'Research / Text View'}
                        </p>
                    </div>
                </div>

                {/* Center: Mode Toggle (Pill) */}
                {book?.txt_file_url && (
                    <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                        <button
                            onClick={() => setViewMode('pdf')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                viewMode === 'pdf' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <BookOpenIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">PDF View</span>
                        </button>
                        <button
                            onClick={() => setViewMode('text')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                viewMode === 'text' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Text View</span>
                        </button>
                    </div>
                )}

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={toggleBookmark}
                        className="p-2 rounded-full hover:bg-slate-100 transition text-slate-600"
                        title="Bookmark"
                    >
                        {isBookmarked ? (
                            <BookmarkSolid className="w-6 h-6 text-amber-500" />
                        ) : (
                            <BookmarkIcon className="w-6 h-6" />
                        )}
                    </button>
                    <button className="p-2 rounded-full hover:bg-slate-100 transition text-slate-600 md:block hidden">
                        <ShareIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* ================= MAIN CONTENT AREA ================= */}
            <div className="flex-1 relative bg-slate-200/50 overflow-hidden">
                
                {/* --- MODE A: PDF VIEWER --- */}
                {viewMode === 'pdf' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        {(book?.pdf_url || book?.pdf_file) ? (
                            <PdfViewer 
                                pdfUrl={getPdfUrl(book.pdf_url || book.pdf_file)}
                                viewMode={'scroll'}
                                scale={scale}
                                setScale={setScale}
                                setTotalPages={setTotalPages}
                                setCurrentPage={setCurrentPage}
                                totalPages={totalPages}
                                currentPage={currentPage}
                            />
                        ) : (
                            <div className="text-center p-8 text-slate-400">
                                <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>PDF not available for this book.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- MODE B: TEXT RESEARCHER --- */}
                {viewMode === 'text' && (
                    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 md:p-8 flex justify-center">
                        <div className="max-w-3xl w-full bg-white min-h-full shadow-xl rounded-xl p-8 md:p-12 border border-slate-200">
                            
                            {/* Text Header */}
                            <div className="flex justify-between items-end mb-8 border-b pb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Extracted Text</h2>
                                    <p className="text-xs text-slate-500">
                                        Best for copying citations and research notes.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleCopyText}
                                    className="text-xs bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition"
                                >
                                    Copy All Text
                                </button>
                            </div>

                            {/* Content Body */}
                            {textLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                </div>
                            ) : (
                                <div 
                                    ref={textContainerRef}
                                    className="prose prose-slate max-w-none font-serif leading-relaxed whitespace-pre-wrap text-slate-800"
                                >
                                    {textContent || "No text content found for this file."}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ReadBook;