import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PhotoIcon, 
  ArrowUpTrayIcon,
  XMarkIcon, 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  StarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import socialWorkService from '../../api/socialWorkService';

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'education', label: 'Education (Taleem)', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'social_work', label: 'Social Work & Welfare', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'activities', label: 'Activities', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'other', label: 'Other (دیگر)', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const emptyForm = {
  id: null,
  category: 'education',
  title: '',
  subtitle: '',
  content: '',
  location: '',
  event_date: new Date().toISOString().split('T')[0],
  tags: '',
  featured_image: '',
  images: [],
  is_published: true,
};

const SocialWorkManager = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal & Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const categoryFilter = activeTab === 'all' ? '' : activeTab;
      const data = await socialWorkService.getAdminItems(categoryFilter, search);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading items:', err);
      toast.error('Failed to load items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [activeTab, search]);

  const handleOpenCreate = () => {
    setFormData({
      ...emptyForm,
      category: activeTab === 'all' ? 'education' : activeTab,
      event_date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({
      id: item.id,
      category: item.category || 'education',
      title: item.title || '',
      subtitle: item.subtitle || '',
      content: item.content || '',
      location: item.location || '',
      event_date: item.event_date ? new Date(item.event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      tags: item.tags || '',
      featured_image: item.featured_image || '',
      images: Array.isArray(item.images) ? [...item.images] : [],
      is_published: item.is_published !== false,
    });
    setIsModalOpen(true);
  };

  const handleMultiImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const res = await socialWorkService.uploadImages(files);
      if (res && Array.isArray(res.images)) {
        const newImages = [...formData.images, ...res.images];
        setFormData((prev) => ({
          ...prev,
          images: newImages,
          featured_image: prev.featured_image || newImages[0]?.url || '',
        }));
        toast.success(`Successfully uploaded ${res.images.length} images!`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload some images. Please check file size and type.');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => {
      const updatedImages = prev.images.filter((_, idx) => idx !== indexToRemove);
      let updatedFeatured = prev.featured_image;
      if (prev.images[indexToRemove]?.url === prev.featured_image) {
        updatedFeatured = updatedImages[0]?.url || '';
      }
      return {
        ...prev,
        images: updatedImages,
        featured_image: updatedFeatured,
      };
    });
  };

  const handleSetFeaturedImage = (url) => {
    setFormData((prev) => ({ ...prev, featured_image: url }));
    toast.success('Featured cover image updated!');
  };

  const handleImageCaptionChange = (index, newCaption) => {
    setFormData((prev) => {
      const updatedImages = [...prev.images];
      if (typeof updatedImages[index] === 'string') {
        updatedImages[index] = { url: updatedImages[index], caption: newCaption };
      } else {
        updatedImages[index] = { ...updatedImages[index], caption: newCaption };
      }
      return { ...prev, images: updatedImages };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: formData.category,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        content: formData.content || null,
        location: formData.location.trim() || null,
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : new Date().toISOString(),
        tags: formData.tags.trim() || null,
        featured_image: formData.featured_image || (formData.images[0]?.url || formData.images[0] || null),
        images: formData.images,
        is_published: formData.is_published,
      };

      if (formData.id) {
        await socialWorkService.updateItem(formData.id, payload);
        toast.success('Item updated successfully!');
      } else {
        await socialWorkService.createItem(payload);
        toast.success('Item created successfully!');
      }

      setIsModalOpen(false);
      loadItems();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.detail || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await socialWorkService.deleteItem(deleteTarget.id);
      toast.success('Item deleted successfully!');
      setDeleteTarget(null);
      loadItems();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete item.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <TagIcon className="w-4 h-4" />
            <span>Markaz Management Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Education, Activities & Social Work Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Create, edit, and manage rich articles, event records, and social welfare drives with multiple image galleries.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#002147] text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, location, tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 bg-slate-100 rounded-3xl border border-slate-200" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const catBadge = CATEGORIES.find((c) => c.id === item.category)?.badgeClass || 'bg-slate-100 text-slate-700';
            const imagesList = Array.isArray(item.images) ? item.images : [];
            const featured = item.featured_image || imagesList[0]?.url || imagesList[0];

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Image Banner */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  {featured ? (
                    <img src={featured} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <PhotoIcon className="w-12 h-12 stroke-1" />
                    </div>
                  )}
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm ${catBadge}`}>
                      {CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                    </span>
                  </div>

                  {/* Photos count */}
                  {imagesList.length > 0 && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                      <PhotoIcon className="w-3.5 h-3.5" />
                      <span>{imagesList.length} Photos</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mb-1.5">
                      <CalendarDaysIcon className="w-3.5 h-3.5" />
                      <span>{new Date(item.event_date || item.created_at).toLocaleDateString()}</span>
                      {item.location && (
                        <>
                          <span>•</span>
                          <span className="truncate">{item.location}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 line-clamp-2 text-base">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {item.subtitle || item.content || 'No description provided.'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${item.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {item.is_published ? 'Published' : 'Draft'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <PhotoIcon className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-slate-800">No items found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search ? 'Try clearing your search filters.' : 'Click "Add New Item" to create your first entry with text and photos.'}
          </p>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT ITEM ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <h2 className="text-lg font-black text-slate-900">
                {formData.id ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form Form Body */}
            <form onSubmit={handleSave} className="overflow-y-auto p-6 sm:p-8 space-y-6">
              
              {/* Category & Status */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="education">Education (Taleem)</option>
                    <option value="social_work">Social Work & Welfare</option>
                    <option value="activities">Activities</option>
                    <option value="other">Other (دیگر)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Publication Status
                  </label>
                  <select
                    value={formData.is_published ? 'published' : 'draft'}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.value === 'published' })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="published">Published (Visible to Public)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Islamic Research Conference 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Subtitle / Short Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subtitle / Short Summary
                </label>
                <input
                  type="text"
                  placeholder="Brief 1-line summary for card previews..."
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date & Location */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Event / Program Date
                  </label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Markaz Auditorium, Kokan"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Detailed Rich Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed Content / Report / Instructions
                </label>
                <textarea
                  rows={5}
                  placeholder="Write the full report, schedule, speakers, topics, or program overview here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              {/* MULTI-IMAGE UPLOADER ZONE */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Photo Gallery ({formData.images.length} uploaded)
                    </label>
                    <p className="text-xs text-slate-400">
                      Upload multiple images simultaneously. You can set individual captions and select a primary cover.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <ArrowUpTrayIcon className={`w-4 h-4 ${uploadingImages ? 'animate-bounce' : ''}`} />
                    <span>{uploadingImages ? 'Uploading...' : 'Upload Photos'}</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleMultiImageUpload}
                  className="hidden"
                />

                {/* Image Previews Grid */}
                {formData.images.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    {formData.images.map((img, idx) => {
                      const url = typeof img === 'string' ? img : img?.url;
                      const caption = typeof img === 'object' ? (img?.caption || '') : '';
                      const isFeatured = formData.featured_image === url;

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 relative group"
                        >
                          <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                            <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                            {isFeatured && (
                              <div className="absolute top-1 left-1 bg-emerald-500 text-white p-1 rounded-md shadow-md" title="Featured Cover">
                                <StarIcon className="w-3.5 h-3.5 fill-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <input
                              type="text"
                              placeholder="Photo caption (optional)..."
                              value={caption}
                              onChange={(e) => handleImageCaptionChange(idx, e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500"
                            />

                            <div className="flex items-center gap-2">
                              {!isFeatured && (
                                <button
                                  type="button"
                                  onClick={() => handleSetFeaturedImage(url)}
                                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                >
                                  Make Cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer ml-auto"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 bg-slate-50/50"
                  >
                    <PhotoIcon className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
                    <p className="text-xs font-semibold text-slate-600">
                      Click here or drag images to upload multiple photos
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Supports JPG, PNG, WebP up to 10MB each
                    </p>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tags / Keywords
                </label>
                <input
                  type="text"
                  placeholder="e.g. Taleem, Seminar, Youth, Kokan (comma-separated)"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImages}
                  className="px-6 py-2.5 rounded-xl bg-[#002147] hover:bg-blue-900 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (formData.id ? 'Update Item' : 'Create Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM DELETE ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <TrashIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Item?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800 font-semibold">"{deleteTarget.title}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SocialWorkManager;
