import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import apiClient from '../api/apiClient';
import SmartReader from '../components/book/SmartReader';
import { interactionService } from '../api/interactionService';
import analyticsService from '../api/analyticsService';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const READ_I18N = {
  en: {
    loading: "Loading Smart Reader...",
    notFound: "Book Not Found",
    notFoundDesc: "The requested book could not be loaded.",
    backToLibrary: "Back to Library",
    restrictedTitle: "Restricted Academic Book",
    restrictedDesc: "This book is restricted to approved scholars and researchers. Please log in to your account and submit an access request.",
    requestAccess: "Request Access",
  },
  ur: {
    loading: "اسمارٹ ریڈر لوڈ ہو رہا ہے...",
    notFound: "کتاب نہیں مل سکی",
    notFoundDesc: "مطلوبہ کتاب دستیاب نہیں ہے۔",
    backToLibrary: "واپس لائبریری",
    restrictedTitle: "مخصوص علمی کتاب",
    restrictedDesc: "یہ کتاب مخصوص اساتذہ اور منظور شدہ محققین کے لیے مختص ہے۔ براہ کرم اپنے اکاؤنٹ سے لاگ ان ہو کر رسائی کی درخواست جمع کروائیں۔",
    requestAccess: "رسائی کی درخواست دیں",
  },
  ar: {
    loading: "جاري تحميل القارئ الذكي...",
    notFound: "الكتاب غير موجود",
    notFoundDesc: "تعذر تحميل الكتاب المطلوب.",
    backToLibrary: "العودة إلى المكتبة",
    restrictedTitle: "كتاب علمي مقيد",
    restrictedDesc: "هذا الكتاب مخصص للباحثين والمشايخ المصرح لهم فقط. يرجى تسجيل الدخول وإرسال طلب إذن للاطلاع عليه.",
    requestAccess: "طلب إذن الوصول",
  }
};

const ReadBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentLang = 'ur', isRTL = true } = useLanguage();
  const loc = READ_I18N[currentLang] || READ_I18N.ur;

  const targetPage = parseInt(searchParams.get('page') || '1', 10);
  const targetQuery = searchParams.get('q') || '';

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
          let status = null;
          const hasToken = Boolean(
            localStorage.getItem("access_token") || 
            sessionStorage.getItem("access_token")
          );
          if (hasToken) {
            try {
              status = await interactionService.getBookStatus(id);
            } catch (err) {
              console.warn("Could not load user interaction status:", err);
            }
          }
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
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white" dir={isRTL ? "rtl" : "ltr"}>
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider text-slate-300">{loc.loading}</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100 p-4 text-center" dir={isRTL ? "rtl" : "ltr"}>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{loc.notFound}</h2>
        <p className="text-sm text-slate-500 mb-4">{loc.notFoundDesc}</p>
        <button
          onClick={() => navigate('/books')}
          className="px-6 py-2.5 bg-[#002147] text-white font-bold text-sm rounded-xl shadow-md hover:bg-[#003366] transition cursor-pointer"
        >
          {loc.backToLibrary}
        </button>
      </div>
    );
  }

  const hasPdf = Boolean(book?.pdf_url || book?.pdf_file);
  const hasTxt = Boolean(book?.txt_file_url || book?.txt_file);

  // Restricted Access Screen (for non-authenticated or unauthorized users)
  if (book.is_restricted && !book.user_has_access) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 sm:p-6 text-center text-white" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-800/90 border border-slate-700 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black mb-1 text-white">{book.title}</h2>
          <p className="text-xs text-amber-400 font-bold mb-3">{loc.restrictedTitle}</p>
          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            {loc.restrictedDesc}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/books/${book.id}`)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-md cursor-pointer"
            >
              {loc.requestAccess}
            </button>
            <button
              onClick={() => navigate('/books')}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              {loc.backToLibrary}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use Same-Origin Proxy Stream endpoints for Zero CORS issues + fallback to direct URLs
  const pdfUrl = hasPdf ? `${API_BASE_URL}/api/books/${book.id}/stream-pdf` : null;
  const txtUrl = hasTxt ? `${API_BASE_URL}/api/books/${book.id}/stream-text` : null;

  return (
    <SmartReader
      book={book}
      bookId={book?.id}
      bookTitle={book?.title}
      pdfUrl={pdfUrl}
      txtUrl={txtUrl}
      directTxtUrl={book?.txt_file_url || book?.txt_file}
      onClose={() => navigate(-1)}
      onBackToSearch={() => navigate('/books')}
      initialPage={targetPage}
      initialSearchText={targetQuery}
    />
  );
};

export default ReadBook;
