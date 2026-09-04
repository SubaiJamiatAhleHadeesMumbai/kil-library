import React, { useState, useEffect, useRef, useMemo } from 'react';
import galleryService from '../../api/galleryService';
import {
  CloudArrowUpIcon,
  TrashIcon,
  PencilSquareIcon,
  FolderPlusIcon,
  PhotoIcon,
  FolderIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon,
  SparklesIcon,
  CheckIcon,
  FilmIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const toAbsoluteUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const clean = value.startsWith('/') ? value : `/${value}`;
  return `${API_BASE_URL}${clean}`;
};

const GalleryManagementPage = () => {
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'albums'

  const [albums, setAlbums] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Selected Photos for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [albumFilter, setAlbumFilter] = useState('all');

  // Multi-upload Dropzone
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState('general');
  const [uploadYear, setUploadYear] = useState('2026');

  // Edit Photo Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    album_id: 'general',
    title_en: '',
    title_ur: '',
    title_ar: '',
    caption_en: '',
    caption_ur: '',
    caption_ar: '',
    year: '2026',
    video_url: '',
    is_active: true,
  });
  const [itemSaving, setItemSaving] = useState(false);

  // Create / Edit Album Modal State
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [albumForm, setAlbumForm] = useState({
    id: '',
    title_en: '',
    title_ur: '',
    title_ar: '',
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    year: '2026',
    sort_order: 0,
    is_active: true,
  });
  const [albumCoverFile, setAlbumCoverFile] = useState(null);
  const [albumSaving, setAlbumSaving] = useState(false);

  const fetchAdminGallery = async () => {
    try {
      setLoading(true);
      const res = await galleryService.getAdminGallery();
      setAlbums(res.albums || []);
      setItems(res.items || []);
    } catch {
      showNotification('Failed to load gallery data.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminGallery();
  }, []);

  const showNotification = (msg, err = false) => {
    setMessage(msg);
    setIsError(err);
    setTimeout(() => setMessage(''), 5000);
  };

  // --- BATCH PHOTO UPLOAD ---
  const handleBatchFiles = async (files) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (validFiles.length === 0) {
      showNotification('Please select valid image files.', true);
      return;
    }

    setUploading(true);
    try {
      const payload = new FormData();
      validFiles.forEach((file) => payload.append('files', file));
      payload.append('album_id', uploadAlbumId);
      payload.append('year', uploadYear);

      await galleryService.batchUploadPhotos(payload);
      showNotification(`Uploaded ${validFiles.length} photo(s) successfully!`);
      await fetchAdminGallery();
    } catch {
      showNotification('Failed to upload photos.', true);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleBatchFiles(e.dataTransfer.files);
    }
  };

  // --- TOGGLE ACTIVE STATUS FOR PHOTO ---
  const toggleItemActive = async (item) => {
    try {
      const newStatus = !item.is_active;
      await galleryService.bulkUpdateStatus([item.id], newStatus);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: newStatus } : i))
      );
      showNotification(`Photo ${newStatus ? 'activated' : 'hidden'}.`);
    } catch {
      showNotification('Could not update status.', true);
    }
  };

  // --- DELETE PHOTO ---
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    try {
      await galleryService.deleteGalleryItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      showNotification('Photo deleted successfully.');
    } catch {
      showNotification('Could not delete photo.', true);
    }
  };

  // --- REORDER PHOTOS ---
  const handleMoveItem = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filteredItems.length) return;

    const updated = [...filteredItems];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setItems(updated);

    try {
      const ids = updated.map((i) => i.id);
      await galleryService.reorderItems(ids);
    } catch {
      showNotification('Failed to update order.', true);
      fetchAdminGallery();
    }
  };

  // --- BULK PHOTO ACTIONS ---
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected photos?`)) return;
    try {
      await galleryService.bulkDeleteItems(selectedIds);
      setSelectedIds([]);
      showNotification(`Deleted ${selectedIds.length} photos.`);
      fetchAdminGallery();
    } catch {
      showNotification('Bulk delete failed.', true);
    }
  };

  const handleBulkStatus = async (isActive) => {
    if (!selectedIds.length) return;
    try {
      await galleryService.bulkUpdateStatus(selectedIds, isActive);
      setSelectedIds([]);
      showNotification(`Updated ${selectedIds.length} photos.`);
      fetchAdminGallery();
    } catch {
      showNotification('Failed to update status.', true);
    }
  };

  // --- EDIT PHOTO MODAL ---
  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      album_id: item.album_id || 'general',
      title_en: item.title?.en || '',
      title_ur: item.title?.ur || '',
      title_ar: item.title?.ar || '',
      caption_en: item.caption?.en || '',
      caption_ur: item.caption?.ur || '',
      caption_ar: item.caption?.ar || '',
      year: item.year || '2026',
      video_url: item.video_url || '',
      is_active: item.is_active !== false,
    });
  };

  const handleSaveItem = async () => {
    setItemSaving(true);
    try {
      const payload = new FormData();
      payload.append('album_id', itemForm.album_id);
      payload.append('title_en', itemForm.title_en);
      payload.append('title_ur', itemForm.title_ur);
      payload.append('title_ar', itemForm.title_ar);
      payload.append('caption_en', itemForm.caption_en);
      payload.append('caption_ur', itemForm.caption_ur);
      payload.append('caption_ar', itemForm.caption_ar);
      payload.append('year', itemForm.year);
      payload.append('video_url', itemForm.video_url);
      payload.append('is_active', String(itemForm.is_active));

      await galleryService.updateGalleryItem(editingItem.id, payload);
      showNotification('Photo details saved successfully.');
      setEditingItem(null);
      fetchAdminGallery();
    } catch {
      showNotification('Failed to save photo.', true);
    } finally {
      setItemSaving(false);
    }
  };

  // --- ALBUM EDIT / CREATE MODAL ---
  const openCreateAlbum = () => {
    setEditingAlbum({ isNew: true });
    setAlbumForm({
      id: '',
      title_en: '',
      title_ur: '',
      title_ar: '',
      desc_en: '',
      desc_ur: '',
      desc_ar: '',
      year: '2026',
      sort_order: albums.length,
      is_active: true,
    });
    setAlbumCoverFile(null);
  };

  const openEditAlbum = (album) => {
    setEditingAlbum(album);
    setAlbumForm({
      id: album.id,
      title_en: album.title?.en || '',
      title_ur: album.title?.ur || '',
      title_ar: album.title?.ar || '',
      desc_en: album.description?.en || '',
      desc_ur: album.description?.ur || '',
      desc_ar: album.description?.ar || '',
      year: album.year || '2026',
      sort_order: album.sort_order || 0,
      is_active: album.is_active !== false,
    });
    setAlbumCoverFile(null);
  };

  const handleSaveAlbum = async () => {
    if (!albumForm.title_ur.trim() && !albumForm.title_en.trim()) {
      alert('Please provide an album title in at least one language.');
      return;
    }

    setAlbumSaving(true);
    try {
      const payload = new FormData();
      if (albumForm.id) payload.append('album_id', albumForm.id);
      payload.append('title_en', albumForm.title_en);
      payload.append('title_ur', albumForm.title_ur);
      payload.append('title_ar', albumForm.title_ar);
      payload.append('desc_en', albumForm.desc_en);
      payload.append('desc_ur', albumForm.desc_ur);
      payload.append('desc_ar', albumForm.desc_ar);
      payload.append('year', albumForm.year);
      payload.append('sort_order', String(albumForm.sort_order));
      payload.append('is_active', String(albumForm.is_active));
      if (albumCoverFile) payload.append('cover_image', albumCoverFile);

      await galleryService.saveAlbum(payload);
      showNotification('Album saved successfully.');
      setEditingAlbum(null);
      fetchAdminGallery();
    } catch {
      showNotification('Failed to save album.', true);
    } finally {
      setAlbumSaving(false);
    }
  };

  const handleDeleteAlbum = async (albumId) => {
    if (albumId === 'general') {
      alert('Default General Album cannot be deleted.');
      return;
    }
    if (!window.confirm('Delete this album? Photos inside will be moved to General Gallery.')) return;
    try {
      await galleryService.deleteAlbum(albumId);
      showNotification('Album deleted successfully.');
      fetchAdminGallery();
    } catch {
      showNotification('Failed to delete album.', true);
    }
  };

  // Filtered Photos for Admin Grid
  const filteredItems = useMemo(() => {
    if (albumFilter === 'all') return items;
    return items.filter((i) => i.album_id === albumFilter);
  }, [items, albumFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message && (
        <div
          className={`rounded-2xl p-4 text-sm font-semibold flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
            isError
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
            Media Suite
          </span>
          <h2 className="text-xl font-black text-slate-800">
            Markaz Photo & Event Gallery Manager
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage trilingual albums, event photos, and video clips across English, Urdu, and Arabic.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhotoIcon className="w-4 h-4" />
            <span>Photos & Videos ({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('albums')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'albums'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            <span>Albums & Events ({albums.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 📸 TAB 1: PHOTOS & VIDEOS MANAGER */}
      {/* ============================================================= */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* Multi-Image Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all p-6 sm:p-8 text-center bg-white ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleBatchFiles(e.target.files)}
            />

            <div className="max-w-xl mx-auto space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <CloudArrowUpIcon className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Drag & Drop Multiple Photos Here
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Select 1, 5, 10 or 20+ photos at once (JPG, PNG, WebP).
                </p>
              </div>

              {/* Target Album & Year Selection for Upload */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600">Assign to Album:</span>
                  <select
                    value={uploadAlbumId}
                    onChange={(e) => setUploadAlbumId(e.target.value)}
                    className="bg-white rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-indigo-500"
                  >
                    {albums.map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.title?.ur || alb.title?.en || alb.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600">Year:</span>
                  <input
                    type="text"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="w-20 bg-white rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-indigo-500"
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition disabled:opacity-60 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading Photos...</span>
                    </>
                  ) : (
                    <>
                      <PhotoIcon className="w-4 h-4" />
                      <span>Choose Photos to Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Photos Grid & Controls */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            {/* Header & Bulk Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-bold text-slate-800">
                  Photos ({filteredItems.length})
                </h3>

                {/* Filter by Album Dropdown */}
                <select
                  value={albumFilter}
                  onChange={(e) => setAlbumFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-indigo-500"
                >
                  <option value="all">All Albums ({items.length})</option>
                  {albums.map((alb) => (
                    <option key={alb.id} value={alb.id}>
                      {alb.title?.ur || alb.title?.en || alb.id}
                    </option>
                  ))}
                </select>

                {filteredItems.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {selectedIds.length === filteredItems.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Bulk Action Buttons */}
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {selectedIds.length} Selected
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkStatus(true)}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition cursor-pointer"
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStatus(false)}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1 rounded-lg transition cursor-pointer"
                  >
                    Hide
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-lg transition cursor-pointer"
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>

            {/* Photo Cards Grid */}
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">Loading gallery photos...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No photos in this album yet. Upload photos using the box above!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  const albumObj = albums.find((a) => a.id === item.album_id);

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 hover:bg-white hover:shadow-md transition"
                    >
                      {/* Thumbnail & Select Checkbox */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          className="absolute top-2 left-2 z-20 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />

                        {/* Ambient Glow */}
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110 pointer-events-none"
                          style={{ backgroundImage: `url(${toAbsoluteUrl(item.image_url)})` }}
                        />

                        <img
                          src={toAbsoluteUrl(item.image_url)}
                          alt={item.title?.en || 'Gallery'}
                          className="relative z-10 w-full h-full object-contain"
                        />

                        {/* Video Badge */}
                        {item.video_url && (
                          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 rounded-md bg-rose-600/90 text-white px-2 py-0.5 text-[9px] font-bold">
                            <FilmIcon className="w-3 h-3" />
                            <span>Video</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Status */}
                      <div className="flex items-start justify-between gap-1.5 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={item.title?.ur || item.title?.en}>
                            {item.title?.ur || item.title?.en || 'Gallery Photo'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {albumObj?.title?.ur || albumObj?.title?.en || item.album_id} · {item.year}
                          </span>
                        </div>

                        {/* Active/Hidden Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleItemActive(item)}
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase transition cursor-pointer border ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{item.is_active ? 'Active' : 'Hidden'}</span>
                        </button>
                      </div>

                      {/* Controls Bar */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-slate-500">
                        {/* Order arrows */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveItem(index, -1)}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUpIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === filteredItems.length - 1}
                            onClick={() => handleMoveItem(index, 1)}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDownIcon className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                        </div>

                        {/* Edit & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Trilingual Details"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Photo"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 📂 TAB 2: ALBUMS & EVENTS MANAGER */}
      {/* ============================================================= */}
      {activeTab === 'albums' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              Gallery Albums & Programs ({albums.length})
            </h3>
            <button
              type="button"
              onClick={openCreateAlbum}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition cursor-pointer"
            >
              <FolderPlusIcon className="w-4 h-4" />
              <span>Create New Album</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => {
              const photoCount = items.filter((i) => i.album_id === album.id).length;

              return (
                <div
                  key={album.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs hover:shadow-md transition"
                >
                  {/* Album Cover Thumbnail */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                    {album.cover_image ? (
                      <img
                        src={toAbsoluteUrl(album.cover_image)}
                        alt={album.title?.en || 'Album cover'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                        <FolderIcon className="w-8 h-8 opacity-40" />
                        <span className="text-[10px] mt-1 font-semibold">No cover image</span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 rounded-full bg-slate-900/80 text-white px-2 py-0.5 text-[10px] font-bold backdrop-blur-md">
                      {photoCount} Photos
                    </div>
                  </div>

                  {/* Album Details */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 truncate">
                      {album.title?.ur || album.title?.en || album.id}
                    </h4>
                    {album.title?.en && album.title?.ur && (
                      <p className="text-xs text-slate-500 truncate">{album.title?.en}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Year: {album.year} · Status: {album.is_active ? 'Active' : 'Hidden'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openEditAlbum(album)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                      <span>Edit Album</span>
                    </button>

                    {album.id !== 'general' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAlbum(album.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Album"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 🛠️ EDIT PHOTO MODAL (TRILINGUAL) */}
      {/* ============================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Photo Details</h3>
                <p className="text-xs text-slate-500">Provide titles and captions in English, Urdu, and Arabic.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              {/* Album & Year */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Album</label>
                  <select
                    value={itemForm.album_id}
                    onChange={(e) => setItemForm({ ...itemForm, album_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  >
                    {albums.map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.title?.ur || alb.title?.en || alb.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="text"
                    value={itemForm.year}
                    onChange={(e) => setItemForm({ ...itemForm, year: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Trilingual Titles */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Titles (Trilingual)
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اردو عنوان (Urdu Title)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={itemForm.title_ur}
                    onChange={(e) => setItemForm({ ...itemForm, title_ur: e.target.value })}
                    placeholder="مثال: دورۂ علمیہ کا افتتاحی اجلاس"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-urdu text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">English Title</label>
                  <input
                    type="text"
                    value={itemForm.title_en}
                    onChange={(e) => setItemForm({ ...itemForm, title_en: e.target.value })}
                    placeholder="e.g. Inaugural Session of Daurah Ilmiyyah"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان بالعربية (Arabic Title)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={itemForm.title_ar}
                    onChange={(e) => setItemForm({ ...itemForm, title_ar: e.target.value })}
                    placeholder="مثال: الجلسة الافتتاحية للدورة العلمية"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-arabic text-slate-800"
                  />
                </div>
              </div>

              {/* Trilingual Captions */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Captions (Trilingual)
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اردو تفصیل (Urdu Caption)</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={itemForm.caption_ur}
                    onChange={(e) => setItemForm({ ...itemForm, caption_ur: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-urdu text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">English Caption</label>
                  <textarea
                    rows={2}
                    value={itemForm.caption_en}
                    onChange={(e) => setItemForm({ ...itemForm, caption_en: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوصف بالعربية (Arabic Caption)</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={itemForm.caption_ar}
                    onChange={(e) => setItemForm({ ...itemForm, caption_ar: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-arabic text-slate-800"
                  />
                </div>
              </div>

              {/* Video URL (optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Video Embed URL (YouTube/MP4)
                </label>
                <input
                  type="text"
                  value={itemForm.video_url}
                  onChange={(e) => setItemForm({ ...itemForm, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                />
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">Display on Public Site</span>
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, is_active: !itemForm.is_active })}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border transition cursor-pointer ${
                    itemForm.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-200 text-slate-500 border-slate-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${itemForm.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {itemForm.is_active ? 'Active' : 'Hidden'}
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={itemSaving}
                onClick={handleSaveItem}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-60 transition cursor-pointer"
              >
                {itemSaving ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 📁 EDIT ALBUM MODAL (TRILINGUAL) */}
      {/* ============================================================= */}
      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingAlbum.isNew ? 'Create New Album' : 'Edit Album'}
                </h3>
                <p className="text-xs text-slate-500">Configure album details and cover photo.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAlbum(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm text-slate-700">
              {/* Urdu Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البم کا نام (اردو) *</label>
                <input
                  type="text"
                  dir="rtl"
                  value={albumForm.title_ur}
                  onChange={(e) => setAlbumForm({ ...albumForm, title_ur: e.target.value })}
                  placeholder="مثال: نادر نسخہ جات کی نمائش"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-urdu text-slate-800"
                />
              </div>

              {/* English Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Album Title (English)</label>
                <input
                  type="text"
                  value={albumForm.title_en}
                  onChange={(e) => setAlbumForm({ ...albumForm, title_en: e.target.value })}
                  placeholder="e.g. Rare Manuscripts Exhibition"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                />
              </div>

              {/* Arabic Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الألبوم (العربية)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={albumForm.title_ar}
                  onChange={(e) => setAlbumForm({ ...albumForm, title_ar: e.target.value })}
                  placeholder="مثال: معرض المخطوطات النادرة"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-arabic text-slate-800"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year / Timeline</label>
                <input
                  type="text"
                  value={albumForm.year}
                  onChange={(e) => setAlbumForm({ ...albumForm, year: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Album Cover Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAlbumCoverFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAlbum(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={albumSaving}
                onClick={handleSaveAlbum}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-60 transition cursor-pointer"
              >
                {albumSaving ? 'Saving...' : 'Save Album'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryManagementPage;
