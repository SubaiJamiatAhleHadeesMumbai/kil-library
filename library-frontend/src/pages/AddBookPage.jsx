import React from "react";
import { useNavigate } from "react-router-dom";
import BookForm from "../components/book/BookForm";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const AddBookPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/admin/books");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/admin/books")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Books
          </button>
        </div>

        <div className="flex-1 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h1 className="text-3xl font-bold text-slate-900">Add New Book</h1>
            <p className="mt-2 text-sm text-slate-500">
              Fill in the book details below to add a new item to the library catalog.
            </p>
          </div>

          <div className="w-full">
            <BookForm
              initialData={null}
              isEditing={false}
              onBookAdded={handleSuccess}
              onBookUpdated={handleSuccess}
              onCancel={() => navigate("/admin/books")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBookPage;
