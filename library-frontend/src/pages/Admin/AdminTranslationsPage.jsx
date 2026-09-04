import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LanguageIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import translationService from '../../api/translationService';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORIES = [
  { id: 'all', label: 'All Pages & UI', icon: '🌐' },
  { id: 'navbar', label: 'Header & Navbar', icon: '🏠' },
  { id: 'hero', label: 'Home & Hero', icon: '🌟' },
  { id: 'about', label: 'About Us', icon: '🏛️' },
  { id: 'gallery', label: 'Photo & Event Gallery', icon: '📸' },
  { id: 'fatawa', label: 'Fatawa & Dar-ul-Ifta', icon: '📜' },
  { id: 'social_work', label: 'Social Work & Welfare', icon: '🤝' },
  { id: 'education', label: 'Education (Taleem)', icon: '🎓' },
  { id: 'activities', label: 'Activities & Events', icon: '🎪' },
  { id: 'clippings', label: 'Newspaper Clippings', icon: '📰' },
  { id: 'books', label: 'Books & Library', icon: '📚' },
  { id: 'authors_publishers', label: 'Authors & Publishers', icon: '✍️' },
  { id: 'profile', label: 'User Profile & History', icon: '👤' },
  { id: 'auth', label: 'Auth & Login', icon: '🔐' },
  { id: 'common', label: 'Buttons & Common', icon: '⚙️' }
];

const AdminTranslationsPage = () => {
  const { reloadTranslations } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [missingFilter, setMissingFilter] = useState('all'); // 'all' | 'ur' | 'ar'
  const [search, setSearch] = useState('');
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [translatingId, setTranslatingId] = useState(null);

  // Modal for new key
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newCategory, setNewCategory] = useState('navbar');
  const [newEn, setNewEn] = useState('');
  const [newUr, setNewUr] = useState('');
  const [newAr, setNewAr] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalTranslating, setModalTranslating] = useState(false);

  const fetchTranslations = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (missingFilter !== 'all') params.missing_in = missingFilter;
      if (search.trim()) params.search = search.trim();
      const res = await translationService.listAdminTranslations(params);
      setItems(res || []);
      setDirtyIds(new Set());
    } catch (err) {
      console.error("Failed to load translations:", err);
      toast.error("Failed to load translations.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, missingFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTranslations();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTranslations]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: items.length };
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  const handleCellChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
    setDirtyIds((prev) => new Set(prev).add(id));
  };

  // 1-Click Auto Translate Row
  const handleAutoTranslateRow = async (item, targetLang) => {
    if (!item.en?.trim()) {
      toast.error("English text is empty.");
      return;
    }
    try {
      setTranslatingId(`${item.id}-${targetLang}`);
      const res = await translationService.autoTranslate(item.en, targetLang, 'en');
      if (res?.translated_text) {
        handleCellChange(item.id, targetLang, res.translated_text);
        toast.success(`Auto-translated to ${targetLang === 'ur' ? 'Urdu' : 'Arabic'}!`);
      }
    } catch (err) {
      toast.error("Auto-translation failed.");
    } finally {
      setTranslatingId(null);
    }
  };

  // Modal Auto-Translate
  const handleModalAutoTranslate = async () => {
    if (!newEn.trim()) {
      toast.error("Please enter English text first.");
      return;
    }
    try {
      setModalTranslating(true);
      const [urRes, arRes] = await Promise.all([
        translationService.autoTranslate(newEn, 'ur', 'en'),
        translationService.autoTranslate(newEn, 'ar', 'en')
      ]);
      if (urRes?.translated_text) setNewUr(urRes.translated_text);
      if (arRes?.translated_text) setNewAr(arRes.translated_text);
      toast.success("Generated Urdu and Arabic translations!");
    } catch {
      toast.error("Auto-translation service unavailable.");
    } finally {
      setModalTranslating(false);
    }
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `translations_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Translations exported successfully!");
    } catch {
      toast.error("Failed to export translations.");
    }
  };

  const handleSaveAll = async () => {
    if (dirtyIds.size === 0) {
      toast("No unsaved changes.", { icon: 'ℹ️' });
      return;
    }

    try {
      setSaving(true);
      const changedItems = items
        .filter((item) => dirtyIds.has(item.id))
        .map((item) => ({
          id: item.id,
          en: item.en,
          ur: item.ur,
          ar: item.ar
        }));
      await translationService.bulkUpdateTranslations(changedItems);
      toast.success(`Saved ${changedItems.length} translation(s) successfully!`);
      setDirtyIds(new Set());
      if (reloadTranslations) reloadTranslations();
    } catch (err) {
      console.error("Bulk save error:", err);
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !newEn.trim()) {
      toast.error("Key and English text are required.");
      return;
    }

    try {
      setCreating(true);
      await translationService.createTranslation({
        key: newKey.trim(),
        category: newCategory,
        en: newEn.trim(),
        ur: newUr.trim() || null,
        ar: newAr.trim() || null
      });

      toast.success("Translation key created!");
      setShowAddModal(false);
      setNewKey('');
      setNewEn('');
      setNewUr('');
      setNewAr('');
      fetchTranslations();
      if (reloadTranslations) reloadTranslations();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create key.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, keyName) => {
    if (!window.confirm(`Delete translation key "${keyName}"?`)) return;
    try {
      await translationService.deleteTranslation(id);
      toast.success("Key deleted.");
      fetchTranslations();
      if (reloadTranslations) reloadTranslations();
    } catch (err) {
      toast.error("Failed to delete key.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#002147] flex items-center justify-center border border-blue-200 shadow-2xs">
              <LanguageIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#002147] tracking-tight">
                Dynamic Translation CMS & Localization
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Live multi-lingual control for every page across English, Urdu, and Arabic. Zero glitches.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportJSON}
            title="Download JSON Backup"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-slate-500" />
            Export
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#002147] border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 text-blue-600" />
            Add Key
          </button>
          
          <button
            onClick={handleSaveAll}
            disabled={saving || dirtyIds.size === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-40 ${
              dirtyIds.size > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-[#002147] hover:bg-[#003166] text-white'
            }`}
          >
            <CheckCircleIcon className="w-4 h-4" />
            {saving ? "Saving..." : dirtyIds.size > 0 ? `Save Changes (${dirtyIds.size})` : "All Saved"}
          </button>
        </div>
      </div>

      {/* Filter & Category Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by key, English, Urdu, or Arabic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#002147] outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Missing Filter Pills */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <button
                onClick={() => setMissingFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  missingFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setMissingFilter('ur')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                  missingFilter === 'ur' ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                Missing Urdu
              </button>
              <button
                onClick={() => setMissingFilter('ar')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                  missingFilter === 'ar' ? 'bg-indigo-100 text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ExclamationCircleIcon className="w-3.5 h-3.5 text-indigo-600" />
                Missing Arabic
              </button>
            </div>

            <button
              onClick={fetchTranslations}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </button>
          </div>
        </div>

        {/* Categories Strip Covering ALL Pages */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#002147] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Translations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-48">Key & Page</th>
                <th className="px-4 py-3 min-w-[240px]">English (Master)</th>
                <th className="px-4 py-3 min-w-[240px]">Urdu (اردو - Nastaleeq)</th>
                <th className="px-4 py-3 min-w-[240px]">Arabic (العربية)</th>
                <th className="px-3 py-3 text-center w-14">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#002147] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading dynamic translations...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No translations found matching your search or filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isDirty = dirtyIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/75 transition ${
                        isDirty ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="font-mono font-bold text-slate-900 text-[11px] break-all">
                          {item.key}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {item.category}
                        </span>
                        {isDirty && (
                          <span className="ml-1 inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" title="Unsaved changes" />
                        )}
                      </td>

                      {/* English Master */}
                      <td className="px-4 py-2.5 align-top">
                        <textarea
                          rows={2}
                          value={item.en || ''}
                          onChange={(e) => handleCellChange(item.id, 'en', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-[#002147] outline-none transition resize-none"
                        />
                      </td>

                      {/* Urdu Nastaleeq */}
                      <td className="px-4 py-2.5 align-top" dir="rtl">
                        <div className="relative">
                          <textarea
                            rows={2}
                            value={item.ur || ''}
                            onChange={(e) => handleCellChange(item.id, 'ur', e.target.value)}
                            placeholder="اردو ترجمہ درج کریں..."
                            style={{ fontFamily: '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif' }}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-900 focus:bg-white focus:border-[#002147] outline-none transition resize-none text-right"
                          />
                          {!item.ur && (
                            <button
                              type="button"
                              onClick={() => handleAutoTranslateRow(item, 'ur')}
                              disabled={translatingId === `${item.id}-ur`}
                              className="absolute left-2 bottom-3 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="Auto-translate via AI"
                            >
                              <SparklesIcon className="w-3 h-3 text-amber-600" />
                              {translatingId === `${item.id}-ur` ? "..." : "✨ Auto"}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Arabic */}
                      <td className="px-4 py-2.5 align-top" dir="rtl">
                        <div className="relative">
                          <textarea
                            rows={2}
                            value={item.ar || ''}
                            onChange={(e) => handleCellChange(item.id, 'ar', e.target.value)}
                            placeholder="الترجمة العربية..."
                            style={{ fontFamily: '"Noto Naskh Arabic", serif' }}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-900 focus:bg-white focus:border-[#002147] outline-none transition resize-none text-right"
                          />
                          {!item.ar && (
                            <button
                              type="button"
                              onClick={() => handleAutoTranslateRow(item, 'ar')}
                              disabled={translatingId === `${item.id}-ar`}
                              className="absolute left-2 bottom-3 px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="Auto-translate via AI"
                            >
                              <SparklesIcon className="w-3 h-3 text-indigo-600" />
                              {translatingId === `${item.id}-ar` ? "..." : "✨ Auto"}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.key)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Delete translation key"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#002147] flex items-center justify-center">
                  <PlusIcon className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-[#002147]">Add New Translation Key</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Key Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. gallery.view_more"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Page / Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#002147]"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    English Master Text <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleModalAutoTranslate}
                    disabled={modalTranslating || !newEn.trim()}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <SparklesIcon className="w-3.5 h-3.5 text-blue-600" />
                    {modalTranslating ? "Translating..." : "✨ Auto-Translate to Urdu & Arabic"}
                  </button>
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Explore Full Gallery"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#002147] resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Urdu Translation (اردو)
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  placeholder="مثال: مکمل نگارخانہ دیکھیں"
                  value={newUr}
                  onChange={(e) => setNewUr(e.target.value)}
                  style={{ fontFamily: '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif' }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-900 outline-none focus:bg-white focus:border-[#002147] resize-none text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Arabic Translation (العربية)
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  placeholder="مثال: استعراض معرض الصور بالكامل"
                  value={newAr}
                  onChange={(e) => setNewAr(e.target.value)}
                  style={{ fontFamily: '"Noto Naskh Arabic", serif' }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-900 outline-none focus:bg-white focus:border-[#002147] resize-none text-right"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#002147] hover:bg-[#003166] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Creating..." : "Save Translation Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTranslationsPage;
