import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  NewspaperIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  PhotoIcon,
  CalendarIcon,
  TagIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
  ListBulletIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import newspaperService from "../../api/newspaperService";

const CATEGORY_PRESETS = [
  "Markaz News & Events",
  "Education & Guidance (تعلیم و تربیت)",
  "Social & Welfare Relief (سماجی خدمات)",
  "Statements & Press Releases (بیانات)",
  "Community & Reform (اصلاح معاشرہ)",
  "Historical & Archives (تاریخی دستاویزات)",
  "General Coverage"
];

const NEWSPAPER_PRESETS = [
  "Roznama Inquilab (انقلاب)",
  "Urdu Times (اردو ٹائمز)",
  "Roznama Rashtriya Sahara (راشٹریہ سہارا)",
  "Munsif Daily (منصف)",
  "The Siasat Daily (سیاست)",
  "Times of India",
  "The Indian Express",
  "Hindustan Times",
  "Other"
];

const NewspaperClippingsManager = () => {
  const [clippings, setClippings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClipping, setEditingClipping] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [previewClipping, setPreviewClipping] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-Image Form State
  const [formData, setFormData] = useState({
    title: "",
    newspaper_name: "",
    edition_date: new Date().toISOString().split("T")[0],
    category: "Markaz News & Events",
    description: "",
    is_active: true,
    image_url: "",
    pdf_url: ""
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);

  const fileInputRef = useRef(null);

  const fetchClippings = async () => {
    try {
      setLoading(true);
      const data = await newspaperService.getAdminClippings({
        search: search.trim() || undefined,
        status_filter: statusFilter,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        limit: 100
      });
      setClippings(data.items || []);
    } catch (err) {
      console.error("Error fetching clippings:", err);
      toast.error("Failed to load newspaper clippings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClippings();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClippings();
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = clippings.length;
    const active = clippings.filter((c) => c.is_active).length;
    const inactive = total - active;
    const newspapers = new Set(clippings.map((c) => c.newspaper_name)).size;
    return { total, active, inactive, newspapers };
  }, [clippings]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingClipping(null);
    setFormData({
      title: "",
      newspaper_name: "Roznama Inquilab (انقلاب)",
      edition_date: new Date().toISOString().split("T")[0],
      category: "Markaz News & Events",
      description: "",
      is_active: true,
      image_url: "",
      pdf_url: ""
    });
    setImageFiles([]);
    setExistingImages([]);
    setPdfFile(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (clipping) => {
    setEditingClipping(clipping);
    setFormData({
      title: clipping.title || "",
      newspaper_name: clipping.newspaper_name || "",
      edition_date: clipping.edition_date || "",
      category: clipping.category || "General",
      description: clipping.description || "",
      is_active: clipping.is_active !== false,
      image_url: clipping.image_url || "",
      pdf_url: clipping.pdf_url || ""
    });

    let currentImages = [];
    if (Array.isArray(clipping.images) && clipping.images.length > 0) {
      currentImages = clipping.images;
    } else if (typeof clipping.images === "string") {
      try {
        const parsed = JSON.parse(clipping.images);
        if (Array.isArray(parsed)) currentImages = parsed;
      } catch (e) {
        currentImages = [clipping.image_url].filter(Boolean);
      }
    } else if (clipping.image_url) {
      currentImages = [clipping.image_url];
    }

    setExistingImages(currentImages);
    setImageFiles([]);
    setPdfFile(null);
    setIsModalOpen(true);
  };

  // Handle Multi-Image Selection
  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles((prev) => [...prev, ...files]);
    }
  };

  // Remove Selected Image File
  const handleRemoveNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove Existing Image URL
  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle PDF Selection
  const handlePdfChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
    }
  };

  // Save / Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a headline / title.");
      return;
    }
    if (!formData.newspaper_name.trim()) {
      toast.error("Please enter newspaper name.");
      return;
    }
    if (imageFiles.length === 0 && existingImages.length === 0 && !formData.image_url) {
      toast.error("Please select at least one image for the newspaper clipping.");
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = new FormData();
      submitData.append("title", formData.title.trim());
      submitData.append("newspaper_name", formData.newspaper_name.trim());
      if (formData.edition_date) submitData.append("edition_date", formData.edition_date);
      submitData.append("category", formData.category.trim());
      if (formData.description) submitData.append("description", formData.description.trim());
      submitData.append("is_active", String(formData.is_active));

      // Append all new image files
      imageFiles.forEach((file) => {
        submitData.append("images", file);
      });

      // Pass remaining existing image URLs
      if (existingImages.length > 0) {
        submitData.append("images_json", JSON.stringify(existingImages));
      }

      if (pdfFile) {
        submitData.append("pdf_file", pdfFile);
      } else if (formData.pdf_url) {
        submitData.append("pdf_url", formData.pdf_url.trim());
      }

      if (editingClipping) {
        await newspaperService.updateClipping(editingClipping.id, submitData);
        toast.success("Newspaper clipping updated successfully!");
      } else {
        await newspaperService.createClipping(submitData);
        toast.success("Newspaper clipping uploaded successfully!");
      }

      setIsModalOpen(false);
      fetchClippings();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.detail || "Failed to save clipping.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Active / Deactive Toggle
  const handleToggleActive = async (clipping) => {
    const originalStatus = clipping.is_active;
    const newStatus = !originalStatus;

    // Optimistic UI Update
    setClippings((prev) =>
      prev.map((item) => (item.id === clipping.id ? { ...item, is_active: newStatus } : item))
    );

    try {
      await newspaperService.toggleActiveStatus(clipping.id);
      toast.success(
        newStatus
          ? "✅ Clipping is now LIVE (Public)"
          : "🔒 Clipping is now DEACTIVATED (Hidden from Public)",
        { duration: 2500 }
      );
    } catch (err) {
      // Rollback on failure
      setClippings((prev) =>
        prev.map((item) => (item.id === clipping.id ? { ...item, is_active: originalStatus } : item))
      );
      toast.error("Failed to toggle status.");
    }
  };

  // Delete Clipping
  const handleDelete = async (id) => {
    try {
      await newspaperService.deleteClipping(id);
      setClippings((prev) => prev.filter((item) => item.id !== id));
      toast.success("Clipping deleted successfully.");
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete clipping.");
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0B1120] via-[#002147] to-[#0A2540] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold border border-white/10">
            <NewspaperIcon className="w-4 h-4" />
            <span>Press Archives Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Newspaper Clippings (اخباری تراشے)</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Upload, organize, and control live publication status for newspaper press cuttings and archives.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <PlusIcon className="w-5 h-5 stroke-[2.5]" />
            <span>Add New Clipping</span>
          </button>
        </div>
      </div>

      {/* ================= METRIC STATS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clippings</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <NewspaperIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active (Public)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{stats.active}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Drafts (Hidden)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <XCircleIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{stats.inactive}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Newspapers</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BuildingOffice2Icon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">{stats.newspapers}</p>
        </div>
      </div>

      {/* ================= CONTROLS & FILTERS ================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 w-full md:w-96">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search headline, newspaper, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium placeholder:text-slate-400"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(""); fetchClippings(); }} className="text-slate-400 hover:text-slate-600">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Filter dropdowns & view toggle */}
          <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none hover:border-emerald-500 cursor-pointer"
            >
              <option value="all">🔘 All Status</option>
              <option value="active">🟢 Active Only (Live)</option>
              <option value="inactive">🔴 Inactive Only (Hidden)</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none hover:border-emerald-500 cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">📁 All Categories</option>
              {CATEGORY_PRESETS.map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={fetchClippings}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* View Mode */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition ${viewMode === "grid" ? "bg-white shadow-2xs text-emerald-600 font-bold" : "text-slate-400"}`}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition ${viewMode === "table" ? "bg-white shadow-2xs text-emerald-600 font-bold" : "text-slate-400"}`}
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CONTENT LIST / GRID ================= */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider">Loading Clippings...</p>
        </div>
      ) : clippings.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200 text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <NewspaperIcon className="w-8 h-8 stroke-1" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Newspaper Clippings Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || statusFilter !== "all" || categoryFilter !== "all"
              ? "No clippings match your current filter criteria."
              : "Start by uploading your first newspaper cutting to the digital archive."}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#002147] text-white font-bold text-xs hover:bg-slate-900 transition"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Upload Clipping</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {clippings.map((clipping) => (
            <div
              key={clipping.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-lg flex flex-col group ${
                clipping.is_active ? "border-slate-200" : "border-amber-300 bg-amber-50/20"
              }`}
            >
              {/* Image Box */}
              <div className="relative aspect-4/3 bg-slate-100 overflow-hidden border-b border-slate-100 cursor-pointer" onClick={() => setPreviewClipping(clipping)}>
                <img
                  src={clipping.image_url}
                  alt={clipping.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                
                {/* Status Pill Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm backdrop-blur-md ${
                    clipping.is_active
                      ? "bg-emerald-500/90 text-white"
                      : "bg-amber-500/90 text-white"
                  }`}>
                    {clipping.is_active ? "LIVE" : "DRAFT"}
                  </span>
                </div>

                {/* Date Badge */}
                {clipping.edition_date && (
                  <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {clipping.edition_date}
                  </div>
                )}
              </div>

              {/* Info Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="text-emerald-700 font-extrabold truncate max-w-[140px]">{clipping.newspaper_name}</span>
                    <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[100px]">{clipping.category}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug" title={clipping.title}>
                    {clipping.title}
                  </h3>
                </div>

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* 1-Click Toggle Active Switch */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={clipping.is_active}
                        onChange={() => handleToggleActive(clipping)}
                        className="sr-only"
                      />
                      <div className={`w-9 h-5 rounded-full transition-colors ${clipping.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${clipping.is_active ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{clipping.is_active ? "Live" : "Hidden"}</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewClipping(clipping)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                      title="View High-Res"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(clipping)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(clipping.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Headline / Title</th>
                  <th className="py-3 px-4">Newspaper</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Publish Date</th>
                  <th className="py-3 px-4 text-center">Status (Control)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clippings.map((clipping) => (
                  <tr key={clipping.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-4">
                      <img
                        src={clipping.image_url}
                        alt={clipping.title}
                        onClick={() => setPreviewClipping(clipping)}
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-105 transition"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {clipping.title}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-700">{clipping.newspaper_name}</td>
                    <td className="py-2.5 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">{clipping.category}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{clipping.edition_date || "—"}</td>
                    <td className="py-2.5 px-4 text-center">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={clipping.is_active}
                            onChange={() => handleToggleActive(clipping)}
                            className="sr-only"
                          />
                          <div className={`w-8 h-4.5 rounded-full transition-colors ${clipping.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                          <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${clipping.is_active ? "translate-x-3.5" : ""}`} />
                        </div>
                        <span className={`text-[10px] font-extrabold ${clipping.is_active ? "text-emerald-700" : "text-slate-400"}`}>
                          {clipping.is_active ? "Active" : "Inactive"}
                        </span>
                      </label>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setPreviewClipping(clipping)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                          title="Preview"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(clipping)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(clipping.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT MODAL ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                    <NewspaperIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {editingClipping ? "Edit Newspaper Clipping" : "Upload Newspaper Clipping"}
                    </h3>
                    <p className="text-xs text-slate-500">Provide press release details & high-res image</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Headline / Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Headline / Title (سرخی یا عنوان) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Markaz Dawah Educational Conference Report"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Newspaper & Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Newspaper Name (اخبار کا نام) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="newspaper-suggestions"
                      placeholder="e.g. Roznama Inquilab"
                      value={formData.newspaper_name}
                      onChange={(e) => setFormData({ ...formData, newspaper_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 transition"
                    />
                    <datalist id="newspaper-suggestions">
                      {NEWSPAPER_PRESETS.map((name, i) => (
                        <option key={i} value={name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Edition / Publish Date (اشاعت کی تاریخ)
                    </label>
                    <input
                      type="date"
                      value={formData.edition_date}
                      onChange={(e) => setFormData({ ...formData, edition_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category (زمرہ)
                    </label>
                    <input
                      type="text"
                      list="category-suggestions"
                      placeholder="Select or enter category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 transition"
                    />
                    <datalist id="category-suggestions">
                      {CATEGORY_PRESETS.map((cat, i) => (
                        <option key={i} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Publish Control (پبلک کنٹرول)
                    </label>
                    <div className="flex items-center gap-3 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          {formData.is_active ? "🟢 Live (Visible on Public Website)" : "🔴 Draft (Hidden from Public)"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Multiple Images Upload Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Clipping Images / Pages (اخباری کٹنگ کی تصاویر) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {existingImages.length + imageFiles.length} image{existingImages.length + imageFiles.length !== 1 ? "s" : ""} selected
                    </span>
                  </div>

                  {/* Previews Grid */}
                  {(existingImages.length > 0 || imageFiles.length > 0) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                      {/* Existing Images */}
                      {existingImages.map((url, idx) => (
                        <div key={`existing-${idx}`} className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-2xs">
                          <img src={url} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              COVER
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 text-white rounded-md opacity-90 hover:opacity-100 hover:scale-110 transition cursor-pointer"
                            title="Remove"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* New Image Files */}
                      {imageFiles.map((file, idx) => (
                        <div key={`new-${idx}`} className="relative aspect-4/3 rounded-xl overflow-hidden border border-emerald-300 bg-white group shadow-2xs">
                          <img src={URL.createObjectURL(file)} alt={`New ${idx}`} className="w-full h-full object-cover" />
                          {existingImages.length === 0 && idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              COVER
                            </span>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            NEW
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 text-white rounded-md opacity-90 hover:opacity-100 hover:scale-110 transition cursor-pointer"
                            title="Remove"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dropzone Button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/30 flex flex-col items-center justify-center space-y-1.5"
                  >
                    <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-700">
                      <PhotoIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {existingImages.length + imageFiles.length > 0 ? "+ Click to add more images / pages" : "Click to upload one or multiple clipping images"}
                    </p>
                    <p className="text-[11px] text-slate-400">Select multiple JPG, PNG, or WebP files together</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImagesChange}
                    className="hidden"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Summary / Description (خلاصہ یا تفصیل)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Short summary of the newspaper report..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* PDF Document Attachment (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Optional PDF Document (پی ڈی ایف دستاویز)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {formData.pdf_url && !pdfFile && (
                    <p className="text-[11px] text-emerald-600 mt-1">Existing PDF attached.</p>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#002147] text-white font-bold text-xs hover:bg-slate-900 shadow-md transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>{editingClipping ? "Update Clipping" : "Upload & Save"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= LIGHTBOX PREVIEW MODAL ================= */}
      <AnimatePresence>
        {previewClipping && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{previewClipping.title}</h3>
                  <p className="text-xs text-slate-500">
                    {previewClipping.newspaper_name} • {previewClipping.edition_date || "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewClipping.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    <span>Open Full HD</span>
                  </a>
                  <button
                    onClick={() => setPreviewClipping(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Image */}
              <div className="flex-1 overflow-auto p-4 bg-slate-900 flex items-center justify-center">
                <img
                  src={previewClipping.image_url}
                  alt={previewClipping.title}
                  className="max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4 text-center border border-slate-200"
            >
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <TrashIcon className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Newspaper Clipping?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete this clipping? This action is permanent and cannot be undone.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewspaperClippingsManager;
