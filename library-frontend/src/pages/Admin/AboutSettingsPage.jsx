import React, { useEffect, useMemo, useState } from 'react';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import aboutService from '../../api/aboutService';
import apiClient from '../../api/apiClient';

const emptyQuote = () => ({
  name: '',
  designation: '',
  quote: '',
  source_text: '',
  source_url: '',
  image_url: '',
});

const emptyGalleryItem = () => ({
  title: '',
  caption: '',
  image_url: '',
});

const defaultSettings = {
  hero: {
    enabled: true,
    title: 'About the Markaz Library',
    subtitle: '',
    description: '',
    cta_label: 'Explore the collection',
    cta_url: '/books',
    image_url: '',
  },
  intro: {
    enabled: true,
    title: 'Introduction',
    description: '',
    paragraphs: ['', ''],
  },
  display: {
    gallery_preview_count: 4,
    ulma_preview_count: 4,
  },
  ulma_quotes: [emptyQuote()],
  gallery: [emptyGalleryItem()],
};

const GALLERY_PAGE_SIZE = 12;
const QUOTE_PAGE_SIZE = 8;
const ABOUT_SECTIONS = [
  { id: 'hero-settings', label: 'Hero Section' },
  { id: 'intro-settings', label: 'Introduction + Display' },
  { id: 'ulma-settings', label: 'Ulma Cards' },
  { id: 'gallery-settings', label: 'Markaz Gallery' },
];

const AboutSettingsPage = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryPage, setGalleryPage] = useState(1);
  const [quotePage, setQuotePage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await aboutService.getAboutSettings();
        setSettings({
          ...defaultSettings,
          ...data,
          hero: { ...defaultSettings.hero, ...(data?.hero || {}) },
          intro: { ...defaultSettings.intro, ...(data?.intro || {}) },
          display: { ...defaultSettings.display, ...(data?.display || {}) },
          ulma_quotes: Array.isArray(data?.ulma_quotes) && data.ulma_quotes.length ? data.ulma_quotes : [emptyQuote()],
          gallery: Array.isArray(data?.gallery) && data.gallery.length ? data.gallery : [emptyGalleryItem()],
        });
      } catch (error) {
        console.error(error);
        toast.error('Unable to load About settings');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const updateHeroField = (field, value) => {
    setSettings((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  };

  const updateIntroField = (field, value) => {
    setSettings((prev) => ({ ...prev, intro: { ...prev.intro, [field]: value } }));
  };

  const updateParagraph = (index, value) => {
    setSettings((prev) => {
      const paragraphs = [...(prev.intro.paragraphs || [])];
      paragraphs[index] = value;
      return { ...prev, intro: { ...prev.intro, paragraphs } };
    });
  };

  const updateDisplayField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      display: {
        ...(prev.display || {}),
        [field]: value,
      },
    }));
  };

  const updateQuoteField = (index, field, value) => {
    setSettings((prev) => {
      const quotes = [...prev.ulma_quotes];
      quotes[index] = { ...(quotes[index] || emptyQuote()), [field]: value };
      return { ...prev, ulma_quotes: quotes };
    });
  };

  const updateGalleryField = (index, field, value) => {
    setSettings((prev) => {
      const gallery = [...prev.gallery];
      gallery[index] = { ...(gallery[index] || emptyGalleryItem()), [field]: value };
      return { ...prev, gallery };
    });
  };

  const uploadImage = async (file) => {
    if (!file) return '';
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data?.url || '';
    } finally {
      setUploading(false);
    }
  };

  const handleHeroImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      if (url) updateHeroField('image_url', url);
      toast.success('Hero image uploaded');
    } catch (error) {
      toast.error(error?.message || 'Image upload failed');
    }
  };

  const handleQuoteImage = async (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      if (url) updateQuoteField(index, 'image_url', url);
      toast.success('Quote image uploaded');
    } catch (error) {
      toast.error(error?.message || 'Image upload failed');
    }
  };

  const handleGalleryImage = async (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      if (url) updateGalleryField(index, 'image_url', url);
      toast.success('Gallery image uploaded');
    } catch (error) {
      toast.error(error?.message || 'Image upload failed');
    }
  };

  const addQuote = () => setSettings((prev) => ({ ...prev, ulma_quotes: [...prev.ulma_quotes, emptyQuote()] }));
  const removeQuote = (index) => setSettings((prev) => ({ ...prev, ulma_quotes: prev.ulma_quotes.filter((_, currentIndex) => currentIndex !== index) || [emptyQuote()] }));
  const addGalleryItem = () => setSettings((prev) => ({ ...prev, gallery: [...prev.gallery, emptyGalleryItem()] }));
  const removeGalleryItem = (index) => setSettings((prev) => ({ ...prev, gallery: prev.gallery.filter((_, currentIndex) => currentIndex !== index) || [emptyGalleryItem()] }));

  const totalGalleryItems = settings.gallery.length;
  const totalGalleryPages = Math.max(1, Math.ceil(totalGalleryItems / GALLERY_PAGE_SIZE));
  const totalQuoteItems = settings.ulma_quotes.length;
  const totalQuotePages = Math.max(1, Math.ceil(totalQuoteItems / QUOTE_PAGE_SIZE));
  const pagedGallery = useMemo(() => {
    const start = (galleryPage - 1) * GALLERY_PAGE_SIZE;
    return settings.gallery.slice(start, start + GALLERY_PAGE_SIZE).map((item, offset) => ({
      item,
      index: start + offset,
    }));
  }, [settings.gallery, galleryPage]);
  const pagedQuotes = useMemo(() => {
    const start = (quotePage - 1) * QUOTE_PAGE_SIZE;
    return settings.ulma_quotes.slice(start, start + QUOTE_PAGE_SIZE).map((item, offset) => ({
      item,
      index: start + offset,
    }));
  }, [settings.ulma_quotes, quotePage]);

  useEffect(() => {
    setGalleryPage((prev) => Math.min(prev, Math.max(1, totalGalleryPages)));
  }, [totalGalleryPages]);

  useEffect(() => {
    setQuotePage((prev) => Math.min(prev, Math.max(1, totalQuotePages)));
  }, [totalQuotePages]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await aboutService.updateAboutSettings(settings);
      toast.success('About settings saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to save About settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading About settings...</div>;
  }

  const jumpToSection = (id) => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Admin Control</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">About Page Settings</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Manage the About page introduction, ulma praise cards, source link text, and markaz gallery images.</p>
          </div>
          <button onClick={handleSave} disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-full bg-[#002147] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#12315a] disabled:opacity-60">
            <ArrowUpTrayIcon className="h-4 w-4" />
            {saving || uploading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Quick Navigation</p>
            <div className="mt-3 grid gap-2">
              {ABOUT_SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToSection(item.id)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-[#002147] hover:text-[#002147]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
        <section id="hero-settings" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Hero Section</h2>
          <div className="mt-4 space-y-4">
            <Field label="Title" value={settings.hero.title} onChange={(e) => updateHeroField('title', e.target.value)} />
            <Field label="Subtitle" value={settings.hero.subtitle} onChange={(e) => updateHeroField('subtitle', e.target.value)} textarea />
            <Field label="Description" value={settings.hero.description} onChange={(e) => updateHeroField('description', e.target.value)} textarea />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button Text" value={settings.hero.cta_label} onChange={(e) => updateHeroField('cta_label', e.target.value)} />
              <Field label="Button Link" value={settings.hero.cta_url} onChange={(e) => updateHeroField('cta_url', e.target.value)} />
            </div>
            <ImageUploadCard label="Hero Image" currentUrl={settings.hero.image_url} onChange={handleHeroImage} />
          </div>
        </section>

        <section id="intro-settings" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Introduction</h2>
          <div className="mt-4 space-y-4">
            <Field label="Intro Title" value={settings.intro.title} onChange={(e) => updateIntroField('title', e.target.value)} />
            <Field label="Intro Description" value={settings.intro.description} onChange={(e) => updateIntroField('description', e.target.value)} textarea />
            {(settings.intro.paragraphs || []).slice(0, 2).map((paragraph, index) => (
              <Field key={`paragraph-${index}`} label={`Paragraph ${index + 1}`} value={paragraph} onChange={(e) => updateParagraph(index, e.target.value)} textarea />
            ))}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">User-side preview controls</p>
              <p className="mt-1 text-xs text-slate-500">Choose how many cards appear before "Open ... Gallery" buttons.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Markaz gallery preview count"
                  value={settings.display?.gallery_preview_count ?? 4}
                  onChange={(e) => updateDisplayField('gallery_preview_count', Number(e.target.value) || 1)}
                  type="number"
                />
                <Field
                  label="Ulma cards preview count"
                  value={settings.display?.ulma_preview_count ?? 4}
                  onChange={(e) => updateDisplayField('ulma_preview_count', Number(e.target.value) || 1)}
                  type="number"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="ulma-settings" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">Ulma Praise Cards</h2>
            <p className="text-sm text-slate-500">Add scholar names, praise text, source link text, and images.</p>
          </div>
          <button onClick={addQuote} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#002147] hover:text-[#002147]">
            <PlusIcon className="h-4 w-4" /> Add Quote
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p>
            Showing <span className="font-bold text-slate-900">{pagedQuotes.length}</span> of <span className="font-bold text-slate-900">{totalQuoteItems}</span> quotes
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuotePage((prev) => Math.max(1, prev - 1))}
              disabled={quotePage <= 1}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4" /> Prev
            </button>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              Page {quotePage} / {totalQuotePages}
            </span>
            <button
              onClick={() => setQuotePage((prev) => Math.min(totalQuotePages, prev + 1))}
              disabled={quotePage >= totalQuotePages}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {pagedQuotes.map(({ item, index }) => (
            <div key={`quote-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-900">Quote {index + 1}</h3>
                <button onClick={() => removeQuote(index)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50">
                  <TrashIcon className="h-4 w-4" /> Remove
                </button>
              </div>
              <div className="mt-4 grid gap-4">
                <Field label="Name" value={item.name} onChange={(e) => updateQuoteField(index, 'name', e.target.value)} />
                <Field label="Designation" value={item.designation} onChange={(e) => updateQuoteField(index, 'designation', e.target.value)} />
                <Field label="Quote" value={item.quote} onChange={(e) => updateQuoteField(index, 'quote', e.target.value)} textarea />
                <Field label="Source Link Text" value={item.source_text} onChange={(e) => updateQuoteField(index, 'source_text', e.target.value)} />
                <Field label="Source URL" value={item.source_url} onChange={(e) => updateQuoteField(index, 'source_url', e.target.value)} />
                <ImageUploadCard label="Scholar Image" currentUrl={item.image_url} onChange={(event) => handleQuoteImage(index, event)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery-settings" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">Markaz Gallery</h2>
            <p className="text-sm text-slate-500">Upload introduction images for the About page gallery. The grid is paginated so large collections stay manageable.</p>
          </div>
          <button onClick={addGalleryItem} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#002147] hover:text-[#002147]">
            <PlusIcon className="h-4 w-4" /> Add Gallery Image
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p>
            Showing <span className="font-bold text-slate-900">{pagedGallery.length}</span> of <span className="font-bold text-slate-900">{totalGalleryItems}</span> items
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGalleryPage((prev) => Math.max(1, prev - 1))}
              disabled={galleryPage <= 1}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4" /> Prev
            </button>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              Page {galleryPage} / {totalGalleryPages}
            </span>
            <button
              onClick={() => setGalleryPage((prev) => Math.min(totalGalleryPages, prev + 1))}
              disabled={galleryPage >= totalGalleryPages}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {pagedGallery.map(({ item, index }) => (
            <div key={`gallery-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-900">Image {index + 1}</h3>
                <button onClick={() => removeGalleryItem(index)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50">
                  <TrashIcon className="h-4 w-4" /> Remove
                </button>
              </div>
              <div className="mt-4 grid gap-4">
                <Field label="Title" value={item.title} onChange={(e) => updateGalleryField(index, 'title', e.target.value)} />
                <Field label="Caption" value={item.caption} onChange={(e) => updateGalleryField(index, 'caption', e.target.value)} textarea />
                <ImageUploadCard label="Gallery Image" currentUrl={item.image_url} onChange={(event) => handleGalleryImage(index, event)} />
              </div>
            </div>
          ))}
        </div>
      </section>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, textarea = false, type = 'text' }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    {textarea ? (
      <textarea value={value} onChange={onChange} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#002147]" />
    ) : (
      <input type={type} value={value} onChange={onChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#002147]" />
    )}
  </label>
);

const ImageUploadCard = ({ label, currentUrl, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white">
      {currentUrl ? <img src={currentUrl} alt={label} className="h-44 w-full object-cover" /> : <div className="flex h-44 items-center justify-center text-sm text-slate-400">No image selected</div>}
      <div className="border-t border-slate-200 p-3">
        <input type="file" accept="image/*" onChange={onChange} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-[#002147] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-[#12315a]" />
      </div>
    </div>
  </label>
);

export default AboutSettingsPage;