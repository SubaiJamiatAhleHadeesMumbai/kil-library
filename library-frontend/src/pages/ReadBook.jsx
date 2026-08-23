import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import SmartReader from '../components/book/SmartReader';
import { interactionService } from '../api/interactionService';
import analyticsService from '../api/analyticsService';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const ReadBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initReader = async () => {
      try {
        setLoading(true);
        const bookRes = await apiClient.get(`/api/books/${id}`);
        const bookData = bookRes.data;
        setBook(bookData);

        // Interaction / History Tracking
        try {
          const status = await interactionService.getBookStatus(id);
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
      } catch (err) {
        console.error("Error initializing reader:", err);
        toast.error("Failed to load book.");
      } finally {
        setLoading(false);
      }
    };

    if (id) initReader();
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider text-slate-300">Loading Smart Reader...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100 p-4 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Book Not Found</h2>
        <p className="text-sm text-slate-500 mb-4">The requested book could not be loaded.</p>
        <button
          onClick={() => navigate('/books')}
          className="px-6 py-2.5 bg-[#002147] text-white font-bold text-sm rounded-xl shadow-md hover:bg-[#003366] transition"
        >
          Back to Library
        </button>
      </div>
    );
  }

  const hasPdf = Boolean(book?.pdf_url || book?.pdf_file);
  const hasTxt = Boolean(book?.txt_file_url || book?.txt_file);

  // Use Same-Origin Proxy Stream endpoints for Zero CORS issues + fallback to direct URLs
  const pdfUrl = hasPdf ? `${API_BASE_URL}/api/books/${book.id}/stream-pdf` : null;
  const txtUrl = hasTxt ? `${API_BASE_URL}/api/books/${book.id}/stream-text` : null;

  return (
    <SmartReader
      pdfUrl={pdfUrl}
      txtUrl={txtUrl}
      directTxtUrl={book?.txt_file_url || book?.txt_file}
      onClose={() => navigate(-1)}
      onBackToSearch={() => navigate('/books')}
      initialPage={1}
      initialSearchText=""
      bookTitle={book?.title}
    />
  );
};

export default ReadBook;
