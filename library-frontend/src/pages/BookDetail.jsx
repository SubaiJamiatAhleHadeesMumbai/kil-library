import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookService } from '../api/bookService';
import { getBookCover } from '../utils/cover'; // Assuming this util exists
import { Toaster, toast } from 'react-hot-toast';

// Icons
import { 
    DocumentTextIcon, 
    DocumentIcon, 
    ArrowDownTrayIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

// PDF Viewer Imports
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const BookDetail = () => {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- 🆕 Reader States ---
    const [viewMode, setViewMode] = useState("pdf"); // 'pdf' or 'text'
    const [textContent, setTextContent] = useState("");
    const [textLoading, setTextLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await bookService.getBookById(id);
                setBook(data);
                
                // Smart Default: If no PDF but Text exists, switch to Text mode
                if (!data.pdf_url && data.txt_file_url) {
                    setViewMode("text");
                }
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    // 🆕 Fetch Text Content when 'Text View' is active
    useEffect(() => {
        if (viewMode === "text" && book?.txt_file_url && !textContent) {
            fetchTextContent();
        }
    }, [viewMode, book]);

    const fetchTextContent = async () => {
        setTextLoading(true);
        try {
            const response = await fetch(book.txt_file_url);
            const text = await response.text();
            setTextContent(text);
        } catch (error) {
            console.error("Error fetching text:", error);
            toast.error("Failed to load text content.");
        } finally {
            setTextLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(textContent);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!book) return <div className="p-20 text-center text-xl text-gray-500">Book Not Found</div>;

    // --- SMART STYLING LOGIC ---
    const isRTL = ['arabic', 'urdu', 'persian'].includes(book.language?.name?.toLowerCase());
    const langClass = isRTL ? 'font-arabic text-right dir-rtl' : 'font-sans';

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-slate-800">
            <Toaster position="top-right" />

            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-200 py-4 px-4 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Link to="/" className="hover:text-indigo-600 flex items-center gap-1">
                            <ArrowLeftIcon className="w-4 h-4" /> Library
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-md">{book.title}</span>
                    </div>

                    {/* 🆕 View Mode Toggles */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {book.pdf_url && (
                            <button
                                onClick={() => setViewMode("pdf")}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                    viewMode === "pdf" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <DocumentIcon className="w-4 h-4" /> PDF
                            </button>
                        )}
                        {book.txt_file_url && (
                            <button
                                onClick={() => setViewMode("text")}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                    viewMode === "text" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <DocumentTextIcon className="w-4 h-4" /> Text
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
                            <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-100 mb-6">
                                <img 
                                    src={getBookCover(book)} 
                                    alt={book.title}
                                    className="w-full h-auto rounded-xl object-cover aspect-[2/3]"
                                />
                            </div>

                            {/* Download / Read Actions */}
                            <div className="space-y-3">
                                {book.pdf_url && (
                                    <a 
                                        href={book.pdf_url} 
                                        download 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                                    >
                                        <ArrowDownTrayIcon className="w-5 h-5" /> Download PDF
                                    </a>
                                )}
                                
                                {book.txt_file_url && (
                                    <button 
                                        onClick={() => setViewMode("text")}
                                        className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-3.5 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <DocumentTextIcon className="w-5 h-5" /> Read Research Text
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Content Area (8 Cols) */}
                    <div className="lg:col-span-8">
                        
                        {/* Book Metadata Header */}
                        <div className="mb-10">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {book.language && (
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-widest rounded-full border border-indigo-100">
                                        {book.language.name}
                                    </span>
                                )}
                                {book.edition && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest rounded-full">
                                        {book.edition}
                                    </span>
                                )}
                            </div>
                            
                            <h1 className={`text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-4 ${langClass}`}>
                                {book.title}
                            </h1>
                            <p className="text-xl text-slate-500 font-medium">
                                By <span className="text-slate-800 underline decoration-slate-300 decoration-2 underline-offset-4">{book.author || "Unknown Author"}</span>
                            </p>
                        </div>

                        {/* 🅰️ PDF VIEWER MODE */}
                        {viewMode === "pdf" && book.pdf_url && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{height: 'calc(100vh - 240px)'}}>
                                <Worker workerUrl="/pdf.worker.min.mjs">
                                    <Viewer fileUrl={book.pdf_url} plugins={[defaultLayoutPluginInstance]} />
                                </Worker>
                            </div>
                        )}

                        {/* Additional Metadata (visible to admin for full control) */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                                <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Publication</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                    <div><strong>Publisher:</strong> {book.publisher || 'N/A'}</div>
                                    <div><strong>Published Date:</strong> {book.published_date || 'N/A'}</div>
                                    <div><strong>ISBN:</strong> {book.isbn || 'N/A'}</div>
                                    <div><strong>Edition:</strong> {book.edition || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                                <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Library Details</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                    <div><strong>Pages:</strong> {book.page_count || 'N/A'}</div>
                                    <div><strong>Serial #:</strong> {book.serial_number || 'N/A'}</div>
                                    <div><strong>Book #:</strong> {book.book_number || 'N/A'}</div>
                                    <div><strong>Parts / Volumes:</strong> {book.parts_or_volumes || 'N/A'}</div>
                                    <div><strong>Translator:</strong> {book.translator || 'N/A'}</div>
                                    <div><strong>Price:</strong> {book.price ? `₹ ${book.price}` : 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 🅱️ TEXT RESEARCH MODE */}
                        {viewMode === "text" && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Research Mode</h3>
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-2 text-xs font-bold bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                                    >
                                        {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                                        {copied ? "Copied" : "Copy Text"}
                                    </button>
                                </div>
                                
                                <div className="p-8 lg:p-12 overflow-y-auto max-h-[800px]">
                                    {textLoading ? (
                                        <div className="space-y-4 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                                        </div>
                                    ) : (
                                        <div className={`prose prose-lg max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap ${langClass}`}>
                                            {textContent || "No text content available for this book."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookDetail   ;