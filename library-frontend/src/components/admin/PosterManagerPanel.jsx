import React, { useEffect, useMemo, useState, useRef } from 'react';
import posterService from '../../api/posterService';
import {
  CloudArrowUpIcon,
  TrashIcon,
  PencilSquareIcon,
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  LinkIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ClockIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const toAbsoluteUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('http')) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const PosterManagerPanel = () => {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Selected Posters for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Device Simulator Mode: 'desktop' | 'mobile'
  const [simulatorMode, setSimulatorMode] = useState('desktop');
  const [previewPosterId, setPreviewPosterId] = useState(null);

  // Quick Edit Modal State
  const [editingPoster, setEditingPoster] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    program_name: '',
    event_date: '',
    location_name: '',
    location_url: '',
    description: '',
    is_active: true,
    enable_share: true,
    enable_download: true,
    enable_link: false,
    external_link: '',
    enable_expiry: false,
    expires_at: '',
  });
  const [editMobileFile, setEditMobileFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Multi-upload Dropzone Ref
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchPosters = async () => {
    try {
      setLoading(true);
      const data = await posterService.getAllPosters();
      const list = Array.isArray(data) ? data : [];
      setPosters(list);
      if (list.length > 0 && !previewPosterId) {
        setPreviewPosterId(list[0].id);
      }
    } catch {
      setMessage('Failed to load posters.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosters();
  }, []);

  const showNotification = (msg, err = false) => {
    setMessage(msg);
    setIsError(err);
    setTimeout(() => setMessage(''), 5000);
  };

  // --- MULTI-IMAGE BATCH UPLOAD ---
  const handleBatchFiles = async (files) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (validFiles.length === 0) {
      showNotification('Please select valid image files (JPG, PNG, WebP).', true);
      return;
    }

    setUploading(true);
    try {
      await posterService.uploadBatchPosters(validFiles);
      showNotification(`Successfully uploaded ${validFiles.length} poster(s)!`);
      await fetchPosters();
    } catch {
      showNotification('Error uploading posters. Please try again.', true);
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

  // --- REORDERING (MOVE UP / DOWN) ---
  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= posters.length) return;

    const updated = [...posters];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setPosters(updated);

    try {
      const ids = updated.map((p) => p.id);
      await posterService.reorderPosters(ids);
    } catch {
      showNotification('Failed to update sort order.', true);
      fetchPosters();
    }
  };

  // --- TOGGLE ACTIVE STATUS DIRECTLY ---
  const togglePosterActive = async (poster) => {
    try {
      const newStatus = !poster.is_active;
      await posterService.bulkUpdateStatus([poster.id], newStatus);
      setPosters((prev) =>
        prev.map((p) => (p.id === poster.id ? { ...p, is_active: newStatus } : p))
      );
      showNotification(`Poster ${newStatus ? 'activated' : 'hidden'}.`);
    } catch {
      showNotification('Unable to update status.', true);
    }
  };

  // --- DELETE POSTER ---
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this poster?')) return;
    try {
      await posterService.deletePoster(id);
      setPosters((prev) => prev.filter((p) => p.id !== id));
      if (previewPosterId === id) setPreviewPosterId(null);
      showNotification('Poster deleted successfully.');
    } catch {
      showNotification('Unable to delete poster.', true);
    }
  };

  // --- BULK ACTIONS ---
  const toggleSelectAll = () => {
    if (selectedIds.length === posters.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(posters.map((p) => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected posters?`)) return;
    try {
      await posterService.bulkDeletePosters(selectedIds);
      setSelectedIds([]);
      showNotification(`${selectedIds.length} posters deleted.`);
      fetchPosters();
    } catch {
      showNotification('Bulk delete failed.', true);
    }
  };

  const handleBulkStatus = async (isActive) => {
    if (!selectedIds.length) return;
    try {
      await posterService.bulkUpdateStatus(selectedIds, isActive);
      showNotification(`Updated ${selectedIds.length} posters.`);
      setSelectedIds([]);
      fetchPosters();
    } catch {
      showNotification('Failed to update posters.', true);
    }
  };

  // --- OPEN EDIT MODAL ---
  const openEdit = (poster) => {
    const trans = poster.translations || {};
    const en = trans.en || {};
    const settings = trans.settings || {};

    setEditingPoster(poster);
    setEditForm({
      title: poster.title || '',
      program_name: en.program_name || poster.program_name || '',
      event_date: en.event_date || poster.event_date || '',
      location_name: en.location_name || poster.location_name || '',
      location_url: en.location_url || poster.location_url || '',
      description: en.description || poster.description || '',
      is_active: Boolean(poster.is_active),
      enable_share: settings.enable_share !== false,
      enable_download: settings.enable_download !== false,
      enable_link: Boolean(settings.enable_link),
      external_link: settings.external_link || '',
      enable_expiry: Boolean(settings.enable_expiry),
      expires_at: settings.expires_at || '',
    });
    setEditMobileFile(null);
  };

  // --- SAVE EDIT MODAL ---
  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) {
      alert('Poster title is required.');
      return;
    }

    setEditSaving(true);
    try {
      const payload = new FormData();
      payload.append('title', editForm.title.trim());
      payload.append('program_name', editForm.program_name.trim());
      payload.append('event_date', editForm.event_date.trim());
      payload.append('location_name', editForm.location_name.trim());
      payload.append('location_url', editForm.location_url.trim());
      payload.append('description', editForm.description.trim());
      payload.append('is_active', String(editForm.is_active));

      // Pack settings & language cleanly into translations JSON
      const translationsObj = {
        en: {
          title: editForm.title.trim(),
          program_name: editForm.program_name.trim(),
          event_date: editForm.event_date.trim(),
          location_name: editForm.location_name.trim(),
          location_url: editForm.location_url.trim(),
          description: editForm.description.trim(),
        },
        settings: {
          enable_share: editForm.enable_share,
          enable_download: editForm.enable_download,
          enable_link: editForm.enable_link,
          external_link: editForm.external_link.trim(),
          enable_expiry: editForm.enable_expiry,
          expires_at: editForm.expires_at.trim(),
        },
      };
      payload.append('translations', JSON.stringify(translationsObj));

      if (editMobileFile) {
        payload.append('mobile_image', editMobileFile);
      }

      await posterService.updatePoster(editingPoster.id, payload);
      showNotification('Poster details saved successfully.');
      setEditingPoster(null);
      fetchPosters();
    } catch {
      showNotification('Failed to update poster.', true);
    } finally {
      setEditSaving(false);
    }
  };

  const currentPreviewPoster = useMemo(() => {
    return posters.find((p) => p.id === previewPosterId) || posters[0] || null;
  }, [posters, previewPosterId]);

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

      {/* 🚀 MULTI-IMAGE DRAG & DROP UPLOAD ZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all p-6 sm:p-8 text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
            : 'border-slate-300 bg-white hover:border-slate-400'
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
              Drag & Drop Multiple Posters Here
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select or drop <strong>1, 5, 10 or more images</strong> at once (JPG, PNG, WebP).
              Images automatically adapt to mobile and desktop screens.
            </p>
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
                  <span>Uploading Posters...</span>
                </>
              ) : (
                <>
                  <PhotoIcon className="w-4 h-4" />
                  <span>Choose Images to Upload</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 💻📱 LIVE DEVICE SIMULATOR (Desktop vs Mobile Preview) */}
      {currentPreviewPoster && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
                Live Simulator
              </span>
              <h3 className="text-base font-bold text-slate-800">
                Preview: {currentPreviewPoster.title}
              </h3>
            </div>

            {/* Toggle Simulator Mode */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setSimulatorMode('desktop')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  simulatorMode === 'desktop'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ComputerDesktopIcon className="w-4 h-4" />
                <span>Desktop (16:9)</span>
              </button>
              <button
                type="button"
                onClick={() => setSimulatorMode('mobile')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  simulatorMode === 'mobile'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DevicePhoneMobileIcon className="w-4 h-4" />
                <span>Mobile (Phone)</span>
              </button>
            </div>
          </div>

          {/* Simulator Canvas Frame */}
          <div className="flex items-center justify-center p-4 bg-slate-900 rounded-2xl overflow-hidden min-h-[360px]">
            <div
              className={`transition-all duration-300 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl flex items-center justify-center ${
                simulatorMode === 'mobile'
                  ? 'w-[320px] sm:w-[360px] h-[520px]'
                  : 'w-full max-w-4xl h-[420px]'
              }`}
            >
              {/* Ambient Glow Backdrop */}
              {currentPreviewPoster.desktop_image_url && (
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-125 pointer-events-none"
                  style={{
                    backgroundImage: `url(${toAbsoluteUrl(currentPreviewPoster.desktop_image_url)})`,
                  }}
                />
              )}

              {/* Foreground Poster Image */}
              <img
                src={toAbsoluteUrl(
                  simulatorMode === 'mobile' && currentPreviewPoster.mobile_image_url
                    ? currentPreviewPoster.mobile_image_url
                    : currentPreviewPoster.desktop_image_url
                )}
                alt={currentPreviewPoster.title}
                className="relative z-10 max-h-full max-w-full object-contain p-2 rounded-xl"
              />

              {/* Badges on Simulator */}
              <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-bold text-white border border-slate-700">
                <SparklesIcon className="w-3 h-3 text-emerald-400" />
                <span>{simulatorMode === 'mobile' ? 'Mobile View' : 'Desktop View'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📋 POSTERS MANAGEMENT GRID & BULK ACTIONS */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {/* Header & Bulk Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-800">
              All Posters ({posters.length})
            </h3>
            {posters.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                {selectedIds.length === posters.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {/* Bulk Action Buttons (shown when posters are selected) */}
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

        {/* Poster Cards List */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading posters...</div>
        ) : posters.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No posters uploaded yet. Use the upload box above to add posters!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posters.map((poster, index) => {
              const trans = poster.translations || {};
              const settings = trans.settings || {};
              const isSelected = selectedIds.includes(poster.id);
              const isPreviewing = previewPosterId === poster.id;

              return (
                <div
                  key={poster.id}
                  className={`rounded-2xl border transition-all p-3.5 space-y-3 bg-slate-50/50 hover:bg-white hover:shadow-md ${
                    isPreviewing
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white shadow-xs'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Thumbnail & Select Checkbox */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 group">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedIds((prev) =>
                          prev.includes(poster.id)
                            ? prev.filter((id) => id !== poster.id)
                            : [...prev, poster.id]
                        );
                      }}
                      className="absolute top-2 left-2 z-20 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />

                    {/* Ambient Glow */}
                    {poster.desktop_image_url && (
                      <div
                        className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110 pointer-events-none"
                        style={{
                          backgroundImage: `url(${toAbsoluteUrl(poster.desktop_image_url)})`,
                        }}
                      />
                    )}

                    <img
                      src={toAbsoluteUrl(poster.desktop_image_url || poster.mobile_image_url)}
                      alt={poster.title}
                      className="relative z-10 w-full h-full object-contain"
                    />

                    {/* Quick Preview Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewPosterId(poster.id)}
                      className="absolute bottom-2 right-2 z-20 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white px-2 py-1 text-[10px] font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      {isPreviewing ? 'Viewing in Simulator' : 'Preview in Simulator'}
                    </button>
                  </div>

                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800 truncate" title={poster.title}>
                        {poster.title}
                      </h4>
                      {poster.program_name && (
                        <p className="text-xs text-slate-500 truncate">{poster.program_name}</p>
                      )}
                    </div>

                    {/* Active/Hidden Badge Button */}
                    <button
                      type="button"
                      onClick={() => togglePosterActive(poster)}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer border ${
                        poster.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                      }`}
                      title="Click to toggle Active / Hidden"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          poster.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{poster.is_active ? 'Active' : 'Hidden'}</span>
                    </button>
                  </div>

                  {/* Feature Status Chips (WhatsApp, Download, Link, Expiry) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 text-[10px] font-semibold text-slate-500">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        settings.enable_share !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                      title="WhatsApp Share"
                    >
                      WA: {settings.enable_share !== false ? 'ON' : 'OFF'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        settings.enable_download !== false
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                      title="Direct Download"
                    >
                      DL: {settings.enable_download !== false ? 'ON' : 'OFF'}
                    </span>
                    {settings.enable_link && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800" title="Custom Link">
                        Link: ON
                      </span>
                    )}
                    {settings.enable_expiry && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="Auto Expiry">
                        Exp: {settings.expires_at || 'Set'}
                      </span>
                    )}
                  </div>

                  {/* Card Controls Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    {/* Order buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, -1)}
                        className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        title="Move Up / Earlier"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === posters.length - 1}
                        onClick={() => handleMove(index, 1)}
                        className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        title="Move Down / Later"
                      >
                        <ArrowDownIcon className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">#{index + 1}</span>
                    </div>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(poster)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="Edit Details & Toggles"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(poster.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Poster"
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

      {/* 🛠️ QUICK EDIT MODAL WITH CLEAN TOGGLES */}
      {editingPoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Poster Settings</h3>
                <p className="text-xs text-slate-500">Configure toggles, event info, and links.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPoster(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Poster Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              {/* Program Name & Date */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Program / Event Name (Optional)</label>
                  <input
                    type="text"
                    value={editForm.program_name}
                    onChange={(e) => setEditForm({ ...editForm, program_name: e.target.value })}
                    placeholder="e.g. Annual Daurah Ilmiyyah"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Date (Optional)</label>
                  <input
                    type="text"
                    value={editForm.event_date}
                    onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                    placeholder="e.g. 15 Shawwal 1447"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Location Name & Map Link */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location Venue (Optional)</label>
                  <input
                    type="text"
                    value={editForm.location_name}
                    onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                    placeholder="e.g. Markaz Hall, Chiplun"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Google Maps Link (Optional)</label>
                  <input
                    type="text"
                    value={editForm.location_url}
                    onChange={(e) => setEditForm({ ...editForm, location_url: e.target.value })}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* 🎛️ ON/OFF TOGGLES SUITE */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Feature Switches & Controls
                </p>

                {/* WhatsApp Share Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs">WhatsApp Share Button</span>
                    <p className="text-[11px] text-slate-500">Allow users to share poster on WhatsApp</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, enable_share: !editForm.enable_share })}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border transition cursor-pointer ${
                      editForm.enable_share
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-200 text-slate-500 border-slate-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${editForm.enable_share ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {editForm.enable_share ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Direct Download Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs">Download High-Res Button</span>
                    <p className="text-[11px] text-slate-500">Allow users to download flyer directly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, enable_download: !editForm.enable_download })}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border transition cursor-pointer ${
                      editForm.enable_download
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-200 text-slate-500 border-slate-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${editForm.enable_download ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {editForm.enable_download ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Click Action / External Link Toggle */}
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-xs">Custom Link / Registration Click</span>
                      <p className="text-[11px] text-slate-500">When clicked, open website instead of Lightbox</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, enable_link: !editForm.enable_link })}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border transition cursor-pointer ${
                        editForm.enable_link
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-200 text-slate-500 border-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${editForm.enable_link ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {editForm.enable_link ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {editForm.enable_link && (
                    <input
                      type="text"
                      value={editForm.external_link}
                      onChange={(e) => setEditForm({ ...editForm, external_link: e.target.value })}
                      placeholder="https://forms.google.com/... or https://youtube.com/..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-indigo-500"
                    />
                  )}
                </div>

                {/* Auto-Expiry Toggle */}
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-xs">Auto-Expire & Hide</span>
                      <p className="text-[11px] text-slate-500">Automatically hide poster after event date passes</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, enable_expiry: !editForm.enable_expiry })}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border transition cursor-pointer ${
                        editForm.enable_expiry
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-200 text-slate-500 border-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${editForm.enable_expiry ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {editForm.enable_expiry ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {editForm.enable_expiry && (
                    <input
                      type="date"
                      value={editForm.expires_at}
                      onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-indigo-500"
                    />
                  )}
                </div>
              </div>

              {/* Optional Custom Mobile Image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Custom Mobile Image (Leave empty to use main image automatically)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditMobileFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPoster(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={handleSaveEdit}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-60 transition cursor-pointer"
              >
                {editSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosterManagerPanel;