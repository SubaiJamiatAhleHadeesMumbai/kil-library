import React, { useEffect, useState, useRef } from 'react';
import {
  XMarkIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { fatawaService } from '../../api/fatawaService';

const DEFAULT_VERDICTS = [
  'Jaaiz (جائز)',
  'Mustahab (مستحب)',
  'Sunnah (سنت)',
  'Mubah (مباح)',
  'Makrooh (مکروہ)',
  'Na-Jaaiz (ناجائز)',
  'Haram (حرام)'
];

const QuestionEditorModal = ({ open, onClose, question, categories = [], onSave, onDelete, loading = false }) => {
  const [form, setForm] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Dynamic Customizable Verdict Tags
  const [verdictChips, setVerdictChips] = useState(() => {
    try {
      const stored = localStorage.getItem('kil_verdict_chips');
      return stored ? JSON.parse(stored) : DEFAULT_VERDICTS;
    } catch {
      return DEFAULT_VERDICTS;
    }
  });
  const [newChipText, setNewChipText] = useState('');
  const [showAddChipInput, setShowAddChipInput] = useState(false);

  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (open && question) {
      setForm({
        category_id: question.category_id || '',
        question_text: question.question_text || '',
        visibility: question.visibility || 'public',
        is_anonymous: Boolean(question.is_anonymous),
        display_name: question.display_name || '',
        guest_email: question.guest_email || '',
        status: question.status || 'pending',
        answer_text: question.answer_text || '',
        verdict_summary: question.verdict_summary || '',
        mufti_name: question.mufti_name || '',
        darul_ifta_reference_no: question.darul_ifta_reference_no || '',
        pdf_url: question.pdf_url || '',
        images: Array.isArray(question.images) ? question.images : [],
      });
    }
  }, [open, question]);

  if (!open || !question || !form) return null;

  // Add new Custom Verdict Chip
  const handleAddVerdictChip = () => {
    const trimmed = newChipText.trim();
    if (!trimmed) {
      setShowAddChipInput(false);
      return;
    }
    if (!verdictChips.includes(trimmed)) {
      const updated = [...verdictChips, trimmed];
      setVerdictChips(updated);
      localStorage.setItem('kil_verdict_chips', JSON.stringify(updated));
      toast.success(`Added "${trimmed}" to quick options`);
    }
    setNewChipText('');
    setShowAddChipInput(false);
  };

  // Remove Verdict Chip
  const handleRemoveVerdictChip = (chipToRemove, e) => {
    e.stopPropagation();
    const updated = verdictChips.filter((c) => c !== chipToRemove);
    setVerdictChips(updated);
    localStorage.setItem('kil_verdict_chips', JSON.stringify(updated));
  };

  // Handle PDF Upload
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a valid PDF file.');
      return;
    }

    try {
      setUploadingPdf(true);
      const res = await fatawaService.uploadAttachment(file);
      if (res?.url) {
        setForm((prev) => ({ ...prev, pdf_url: res.url }));
        toast.success('Official Fatwa PDF attached!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to upload PDF.');
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // Handle Multiple Images Upload
  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      setUploadingImages(true);
      const uploadedList = [];
      for (const file of files) {
        const res = await fatawaService.uploadAttachment(file);
        if (res?.url) {
          uploadedList.push({
            url: res.url,
            caption: file.name.replace(/\.[^/.]+$/, "") || 'Kitab Reference'
          });
        }
      }
      setForm((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedList]
      }));
      toast.success(`${uploadedList.length} reference photo(s) added!`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to upload images.');
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleImageCaptionChange = (index, newCaption) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? { ...img, caption: newCaption } : img)
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const ans = (form.answer_text || '').trim();
    onSave(question.id, {
      ...form,
      answer_text: ans,
      category_id: form.category_id ? Number(form.category_id) : null,
      status: ans || form.pdf_url ? (form.status === 'pending' ? 'answered' : form.status) : form.status
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm px-4 py-6 overflow-y-auto flex items-start justify-center">
      <div className="mx-auto my-4 w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100/80 px-2.5 py-0.5 rounded-md">
              Dar-ul-Ifta Control • ID #{question.id}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Fatwa & Scholarly Answer Editor
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={submit} className="overflow-y-auto p-5 sm:p-7 space-y-5 flex-1 text-sm">
          
          {/* 1. Category & Visibility Info */}
          <div className="grid gap-3 sm:grid-cols-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-600">Category</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#002147]"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-600">Visibility</span>
              <select
                value={form.visibility}
                onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#002147]"
              >
                <option value="public">Public (Visible to everyone)</option>
                <option value="private">Private (Asker only)</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-600">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#002147]"
              >
                <option value="pending">Pending Review</option>
                <option value="answered">Answered / Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>

          {/* 2. Original Question (Sawal) */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <DocumentTextIcon className="w-4 h-4 text-blue-700" />
              Sawal / Question Text
            </span>
            <textarea
              value={form.question_text}
              onChange={(e) => setForm((prev) => ({ ...prev, question_text: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#002147] resize-none leading-relaxed"
            />
          </div>

          {/* 3. Verdict Summary & Mufti Info (All Optional) */}
          <div className="space-y-3 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950">
                    Verdict / Hukm Summary
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Optional</span>
                </div>
                <input
                  type="text"
                  value={form.verdict_summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, verdict_summary: e.target.value }))}
                  placeholder="e.g. Jaaiz / Mustahab / Haram"
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-900 outline-none focus:border-blue-700"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950">
                    Mufti / Board Name
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Optional</span>
                </div>
                <input
                  type="text"
                  value={form.mufti_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, mufti_name: e.target.value }))}
                  placeholder="e.g. Dar-ul-Ifta, Markaz Ahle Hadees"
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-700"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950">
                    Fatwa Ref. Number
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Optional</span>
                </div>
                <input
                  type="text"
                  value={form.darul_ifta_reference_no}
                  onChange={(e) => setForm((prev) => ({ ...prev, darul_ifta_reference_no: e.target.value }))}
                  placeholder="e.g. FATWA-2026/04"
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-700"
                />
              </div>
            </div>

            {/* Quick Verdict Chips (Customizable: Add / Delete via ✕) */}
            <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Select:</span>
              {verdictChips.map((chip, idx) => (
                <div
                  key={idx}
                  onClick={() => setForm((prev) => ({ ...prev, verdict_summary: chip }))}
                  className="group/chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-900 transition-colors cursor-pointer"
                >
                  <span>{chip}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveVerdictChip(chip, e)}
                    className="opacity-40 group-hover/chip:opacity-100 hover:text-red-600 rounded-full p-0.5"
                    title="Remove this option"
                  >
                    <XMarkIcon className="w-3 h-3 stroke-2" />
                  </button>
                </div>
              ))}

              {/* Add New Custom Chip */}
              {showAddChipInput ? (
                <div className="inline-flex items-center gap-1 bg-white p-0.5 rounded-md border border-blue-300">
                  <input
                    type="text"
                    value={newChipText}
                    onChange={(e) => setNewChipText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVerdictChip(); } }}
                    placeholder="New verdict..."
                    className="text-xs px-2 py-0.5 outline-none w-24 font-semibold"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddVerdictChip}
                    className="text-[11px] font-bold text-white bg-blue-700 px-2 py-0.5 rounded cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddChipInput(false); setNewChipText(''); }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddChipInput(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100/70 hover:bg-blue-200/80 text-blue-800 text-xs font-bold transition-colors cursor-pointer border border-blue-200"
                >
                  <PlusIcon className="w-3 h-3 stroke-2" />
                  <span>Add Option</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. Tafseeli Jawab / Detailed Answer */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              Tafseeli Jawab / Detailed Scholarly Answer
            </span>
            <textarea
              value={form.answer_text}
              onChange={(e) => setForm((prev) => ({ ...prev, answer_text: e.target.value }))}
              rows={6}
              placeholder="Write the complete answer with Quranic verses, Hadith citations, and explanation..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal outline-none focus:border-[#002147] resize-y leading-relaxed"
            />
          </div>

          {/* 5. Optional Attachments Section */}
          <div className="grid gap-4 sm:grid-cols-2 pt-1 border-t border-slate-100">
            
            {/* A. Official Signed PDF Upload */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <DocumentArrowUpIcon className="w-4 h-4 text-red-600" />
                  Official Signed Fatwa (PDF)
                </span>
                {form.pdf_url && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, pdf_url: '' }))}
                    className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Remove PDF
                  </button>
                )}
              </div>

              {form.pdf_url ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-red-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded bg-red-50 text-red-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                      PDF
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-800 truncate">Official_Fatwa_Document.pdf</p>
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                        <CheckCircleIcon className="w-3 h-3" /> Attached
                      </span>
                    </div>
                  </div>
                  <a
                    href={form.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    title="View PDF"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-red-400 rounded-lg p-3 text-center cursor-pointer transition-colors bg-white"
                >
                  <DocumentArrowUpIcon className="w-5 h-5 text-slate-400 mx-auto mb-0.5" />
                  <p className="text-xs font-semibold text-slate-700">
                    {uploadingPdf ? 'Uploading PDF...' : 'Click to Upload Official Fatwa PDF'}
                  </p>
                  <p className="text-[10px] text-slate-400">Optional letterhead / stamped PDF</p>
                </div>
              )}
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </div>

            {/* B. Kitab Reference Scans & Multiple Images */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <PhotoIcon className="w-4 h-4 text-blue-600" />
                  Reference Book Photos ({form.images?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  <PlusIcon className="w-3 h-3" /> Add Photo
                </button>
              </div>

              {form.images?.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200">
                      <img src={img.url} alt="Ref" className="w-8 h-8 rounded object-cover border shrink-0" />
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={(e) => handleImageCaptionChange(idx, e.target.value)}
                        placeholder="Caption (e.g. Bukhari Vol 1)"
                        className="w-full text-xs rounded border border-slate-200 px-2 py-0.5 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-3 text-center cursor-pointer transition-colors bg-white"
                >
                  <PhotoIcon className="w-5 h-5 text-slate-400 mx-auto mb-0.5" />
                  <p className="text-xs font-semibold text-slate-700">
                    {uploadingImages ? 'Uploading Photos...' : 'Upload Reference Book Scans'}
                  </p>
                  <p className="text-[10px] text-slate-400">Optional reference photos</p>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImagesUpload}
                className="hidden"
              />
            </div>

          </div>

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onDelete(question.id)}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={loading || uploadingPdf || uploadingImages}
                type="submit"
                className="rounded-xl bg-[#002147] hover:bg-blue-900 px-6 py-2 text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Saving...' : 'Save & Publish Fatwa'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default QuestionEditorModal;
