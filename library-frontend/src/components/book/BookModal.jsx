 // src/components/book/BookModal.jsx
import React, { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { 
  XMarkIcon, 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  PhotoIcon 
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

const BookModal = ({ isOpen, onClose, onSave, book = null, categories = [], languages = [] }) => {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    language_id: "",
    category_id: "", // For subcategory logic if needed
    subcategory_ids: [],
    description: "",
    is_restricted: false,
    
    // Files
    cover_image: null,
    pdf_file: null,
    txt_file: null, // ✅ NEW: Text File
  });

  // Reset or Populate on Open
  useEffect(() => {
    if (isOpen) {
      if (book) {
        // Edit Mode
        setFormData({
          title: book.title || "",
          author: book.author || "",
          isbn: book.isbn || "",
          language_id: book.language?.id || "",
          category_id: "", 
          subcategory_ids: book.subcategories?.map(s => s.id) || [],
          description: book.description || "",
          is_restricted: book.is_restricted || false,
          cover_image: null, 
          pdf_file: null,
          txt_file: null,
        });
      } else {
        // Create Mode (Reset)
        setFormData({
          title: "", author: "", isbn: "", language_id: "",
          category_id: "", subcategory_ids: [], description: "",
          is_restricted: false, cover_image: null, pdf_file: null, txt_file: null
        });
      }
    }
  }, [isOpen, book]);

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === "file") {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic Validation
    if (!formData.title || !formData.language_id) {
      toast.error("Title and Language are required.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(book ? "Updating Book..." : "Uploading Book...");

    try {
      // Create FormData object for Multipart upload
      const data = new FormData();
      data.append("title", formData.title);
      data.append("author", formData.author);
      data.append("isbn", formData.isbn);
      data.append("language_id", formData.language_id);
      data.append("description", formData.description);
      data.append("is_restricted", formData.is_restricted);

      // Files (Only append if selected)
      if (formData.cover_image) data.append("cover_image", formData.cover_image);
      if (formData.pdf_file) data.append("pdf_file", formData.pdf_file);
      
      // ✅ NEW: Text File
      if (formData.txt_file) data.append("txt_file", formData.txt_file);

      // Subcategories (Array handling)
      // Backend expects: subcategory_ids (list of ints)
      // FormData sends as multiple fields with same name or JSON string depends on backend
      // Fastapi List[int] = Form() supports multiple appends:
      // formData.subcategory_ids.forEach(id => data.append("subcategory_ids", id));
      
      // Call Parent Save Function
      await onSave(book?.id, data);
      
      toast.success(book ? "Book Updated!" : "Book Uploaded Successfully!", { id: toastId });
      onClose(); // Close Modal
    } catch (err) {
      console.error(err);
      toast.error("Operation failed. Check inputs.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
                  <Dialog.Title as="h3" className="text-lg font-bold text-slate-800">
                    {book ? "Edit Book Details" : "Upload New Book"}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  
                  {/* Row 1: Title & Author */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Book Title *</label>
                      <input 
                        name="title" 
                        value={formData.title} 
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Sahih Al-Bukhari"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Author</label>
                      <input 
                        name="author" 
                        value={formData.author} 
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Imam Bukhari"
                      />
                    </div>
                  </div>

                  {/* Row 2: Language & ISBN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Language *</label>
                      <select 
                        name="language_id" 
                        value={formData.language_id} 
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        required
                      >
                        <option value="">Select Language</option>
                        {languages.map(lang => (
                          <option key={lang.id} value={lang.id}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ISBN</label>
                      <input 
                        name="isbn" 
                        value={formData.isbn} 
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea 
                      name="description" 
                      value={formData.description} 
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      rows="3"
                      placeholder="Brief summary..."
                    />
                  </div>

                  {/* FILE UPLOADS SECTION */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <CloudArrowUpIcon className="w-5 h-5 text-blue-600" />
                      Upload Files
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1. Cover Image */}
                      <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-100 transition cursor-pointer">
                        <input type="file" name="cover_image" onChange={handleChange} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                        <PhotoIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-xs text-slate-500 block">
                          {formData.cover_image ? formData.cover_image.name : "Cover Image"}
                        </span>
                      </div>

                      {/* 2. PDF File */}
                      <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-100 transition cursor-pointer">
                        <input type="file" name="pdf_file" onChange={handleChange} accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" />
                        <DocumentTextIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <span className="text-xs text-slate-500 block">
                          {formData.pdf_file ? formData.pdf_file.name : "PDF File"}
                        </span>
                      </div>

                      {/* 3. Text File (NEW) */}
                      <div className="relative border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-lg p-4 text-center hover:bg-blue-100 transition cursor-pointer">
                        <input type="file" name="txt_file" onChange={handleChange} accept=".txt,.md,.docx" className="absolute inset-0 opacity-0 cursor-pointer" />
                        <DocumentTextIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <span className="text-xs text-blue-600 font-bold block">
                          {formData.txt_file ? formData.txt_file.name : "Research Text"}
                        </span>
                        <span className="text-[10px] text-blue-400 block mt-1">(For Copy/Paste Mode)</span>
                      </div>
                    </div>
                  </div>

                  {/* Restricted Toggle */}
                  <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                    <input 
                      type="checkbox" 
                      name="is_restricted" 
                      id="restricted"
                      checked={formData.is_restricted} 
                      onChange={handleChange}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    <label htmlFor="restricted" className="text-sm font-medium text-red-800 cursor-pointer">
                      Restricted Access (Requires Approval to Read)
                    </label>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button 
                      type="button" 
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="px-6 py-2.5 rounded-lg bg-[#002147] text-white font-bold hover:bg-[#003366] transition shadow-lg disabled:opacity-70 flex items-center gap-2"
                    >
                      {loading ? "Saving..." : "Save Book"}
                    </button>
                  </div>

                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BookModal;