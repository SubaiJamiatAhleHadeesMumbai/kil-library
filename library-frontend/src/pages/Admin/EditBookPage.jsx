import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import BookForm from '../../components/book/BookForm';
import { bookService } from '../../api/bookService';

const EditBookPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBook = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const data = await bookService.getBookById(id);
        setBook(data);
      } catch (error) {
        console.error('Unable to load book for editing', error);
        toast.error('Failed to load book details.');
        navigate('/admin/books');
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [id, navigate]);

  const handleSuccess = () => {
    navigate('/admin/books');
  };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/books')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Books
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-cyan-700">
            <PencilSquareIcon className="h-4 w-4" />
            Full Page Editor
          </div>
        </div>

        <div className="flex-1 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h1 className="text-3xl font-bold text-slate-900">Edit Book</h1>
            <p className="mt-2 text-sm text-slate-500">
              Update the book metadata, files, permissions, and linked content.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              Loading book details...
            </div>
          ) : book ? (
            <BookForm
              initialData={book}
              isEditing={true}
              onBookAdded={handleSuccess}
              onBookUpdated={handleSuccess}
              onCancel={() => navigate('/admin/books')}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EditBookPage;