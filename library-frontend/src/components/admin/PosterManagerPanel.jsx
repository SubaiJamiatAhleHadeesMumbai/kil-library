import React, { useEffect, useMemo, useState } from 'react';
import posterService from '../../api/posterService';

const defaultTranslations = `{
  "en": {
    "title": "",
    "program_name": "",
    "event_date": "",
    "location_name": "",
    "location_url": "",
    "description": ""
  },
  "ur": {
    "title": "",
    "program_name": "",
    "event_date": "",
    "location_name": "",
    "location_url": "",
    "description": ""
  },
  "ar": {
    "title": "",
    "program_name": "",
    "event_date": "",
    "location_name": "",
    "location_url": "",
    "description": ""
  }
}`;

const emptyForm = {
  id: null,
  title: '',
  media_type: 'image',
  program_name: '',
  event_date: '',
  location_name: '',
  location_url: '',
  description: '',
  desktop_image_size: '800 x 500 px',
  mobile_image_size: '800 x 500 px',
  desktop_frame_width: 800,
  mobile_frame_width: 800,
  desktop_fit: 'cover',
  mobile_fit: 'cover',
  desktop_height: 520,
  mobile_height: 380,
  caption_alignment: 'bottom',
  sort_order: 0,
  is_active: true,
  translationsText: defaultTranslations,
};

const PosterManagerPanel = () => {
  const [posters, setPosters] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [desktopImage, setDesktopImage] = useState(null);
  const [mobileImage, setMobileImage] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      const data = await posterService.getAllPosters();
      setPosters(Array.isArray(data) ? data : []);
    } catch {
      setPosters([]);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const reset = () => {
    setForm(emptyForm);
    setDesktopImage(null);
    setMobileImage(null);
    setMessage('');
  };

  const save = async () => {
    if (!form.title.trim()) {
      setMessage('Poster title is required.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('translations', form.translationsText);
      payload.append('media_type', form.media_type);
      payload.append('program_name', form.program_name);
      payload.append('event_date', form.event_date);
      payload.append('location_name', form.location_name);
      payload.append('location_url', form.location_url);
      payload.append('description', form.description);
      payload.append('desktop_image_size', form.desktop_image_size);
      payload.append('mobile_image_size', form.mobile_image_size);
      payload.append('desktop_frame_width', String(form.desktop_frame_width || 0));
      payload.append('mobile_frame_width', String(form.mobile_frame_width || 0));
      payload.append('desktop_fit', form.desktop_fit);
      payload.append('mobile_fit', form.mobile_fit);
      payload.append('desktop_height', String(form.desktop_height || 0));
      payload.append('mobile_height', String(form.mobile_height || 0));
      payload.append('caption_alignment', form.caption_alignment);
      payload.append('sort_order', String(form.sort_order || 0));
      payload.append('is_active', String(Boolean(form.is_active)));
      if (desktopImage) payload.append('desktop_image', desktopImage);
      if (mobileImage) payload.append('mobile_image', mobileImage);

      if (form.id) {
        await posterService.updatePoster(form.id, payload);
      } else {
        await posterService.createPoster(payload);
      }

      await refresh();
      reset();
      setMessage('Poster saved successfully.');
    } catch {
      setMessage('Unable to save poster right now.');
    } finally {
      setSaving(false);
    }
  };

  const editPoster = (poster) => {
    setForm({
      id: poster.id,
      title: poster.title || '',
      media_type: poster.media_type || 'image',
      program_name: poster.program_name || '',
      event_date: poster.event_date || '',
      location_name: poster.location_name || '',
      location_url: poster.location_url || '',
      description: poster.description || '',
      desktop_image_size: poster.desktop_image_size || '1200 x 630 px',
      mobile_image_size: poster.mobile_image_size || '800 x 500 px',
      desktop_frame_width: poster.desktop_frame_width ?? 800,
      mobile_frame_width: poster.mobile_frame_width ?? 800,
      desktop_fit: poster.desktop_fit || 'cover',
      mobile_fit: poster.mobile_fit || 'cover',
      desktop_height: poster.desktop_height ?? 520,
      mobile_height: poster.mobile_height ?? 380,
      caption_alignment: poster.caption_alignment || 'bottom',
      sort_order: poster.sort_order ?? 0,
      is_active: Boolean(poster.is_active),
      translationsText: JSON.stringify(poster.translations || {}, null, 2),
    });
  };

  const deletePoster = async (posterId) => {
    try {
      await posterService.deletePoster(posterId);
      await refresh();
    } catch {
      setMessage('Unable to delete poster right now.');
    }
  };

  const posterCount = useMemo(() => posters.length, [posters]);
  const adjustHeight = (field, delta) => {
    setForm((prev) => ({
      ...prev,
      [field]: Math.max(220, Math.min(1600, Number(prev[field] || 0) + delta)),
    }));
  };

  const updateFrameDimension = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: Math.max(220, Math.min(2200, Number(value) || 0)),
    }));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Homepage Poster Manager</p>
          <p className="text-xs text-slate-500">Manage rotating posters, language versions, sizes, and program metadata.</p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">{posterCount} posters</div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Poster Title</span>
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="Example poster title" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Media Type</span>
          <select value={form.media_type} onChange={(e) => setForm((prev) => ({ ...prev, media_type: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="image">Image + Text</option>
            <option value="text">Text Only</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Program Name</span>
          <input value={form.program_name} onChange={(e) => setForm((prev) => ({ ...prev, program_name: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="Program name" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Event Date</span>
          <input value={form.event_date} onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="15 / صفر / 1448" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Location Name</span>
          <input value={form.location_name} onChange={(e) => setForm((prev) => ({ ...prev, location_name: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="Masjid / Hall / Venue" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Location Link</span>
          <input value={form.location_url} onChange={(e) => setForm((prev) => ({ ...prev, location_url: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="https://maps.google.com/..." />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Desktop Size</span>
          <input value={form.desktop_image_size} onChange={(e) => setForm((prev) => ({ ...prev, desktop_image_size: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="1200 x 630 px" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Mobile Size</span>
          <input value={form.mobile_image_size} onChange={(e) => setForm((prev) => ({ ...prev, mobile_image_size: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="1080 x 1350 px" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Desktop Frame Width</span>
          <input type="number" min="220" max="2200" value={form.desktop_frame_width} onChange={(e) => updateFrameDimension('desktop_frame_width', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="1200" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Mobile Frame Width</span>
          <input type="number" min="220" max="2200" value={form.mobile_frame_width} onChange={(e) => updateFrameDimension('mobile_frame_width', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="1080" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700">Desktop Frame Height</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => adjustHeight('desktop_height', -60)} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">-</button>
              <button type="button" onClick={() => adjustHeight('desktop_height', 60)} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">+</button>
            </div>
          </div>
          <input type="range" min="220" max="1600" step="10" value={form.desktop_height} onChange={(e) => setForm((prev) => ({ ...prev, desktop_height: Number(e.target.value) }))} className="mt-3 w-full" />
          <div className="mt-2 text-xs text-slate-500">This changes the full poster frame width/height balance on desktop.</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700">Mobile Frame Height</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => adjustHeight('mobile_height', -40)} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">-</button>
              <button type="button" onClick={() => adjustHeight('mobile_height', 40)} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">+</button>
            </div>
          </div>
          <input type="range" min="220" max="1600" step="10" value={form.mobile_height} onChange={(e) => setForm((prev) => ({ ...prev, mobile_height: Number(e.target.value) }))} className="mt-3 w-full" />
          <div className="mt-2 text-xs text-slate-500">This changes the full poster frame height on mobile.</div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Live Frame Preview</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Desktop</span>
              <span>{form.desktop_height}px</span>
            </div>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: `${Math.max(220, Number(form.desktop_height || 0)) * 0.35}px` }}>
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Desktop poster frame
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Mobile</span>
              <span>{form.mobile_height}px</span>
            </div>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: `${Math.max(220, Number(form.mobile_height || 0)) * 0.32}px` }}>
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Mobile poster frame
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Desktop Fit</span>
          <select value={form.desktop_fit} onChange={(e) => setForm((prev) => ({ ...prev, desktop_fit: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Mobile Fit</span>
          <select value={form.mobile_fit} onChange={(e) => setForm((prev) => ({ ...prev, mobile_fit: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-600">
        <span className="mb-1 block font-medium text-slate-700">Caption Alignment</span>
        <select value={form.caption_alignment} onChange={(e) => setForm((prev) => ({ ...prev, caption_alignment: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="top">Top</option>
          <option value="center">Center</option>
          <option value="bottom">Bottom</option>
        </select>
      </label>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Sort Order</span>
          <input type="number" value={form.sort_order} onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <span>Active</span>
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} className="h-4 w-4" />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Desktop Image</span>
          <input type="file" accept="image/*" onChange={(e) => setDesktopImage(e.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium text-slate-700">Mobile Image</span>
          <input type="file" accept="image/*" onChange={(e) => setMobileImage(e.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" />
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-600">
        <span className="mb-1 block font-medium text-slate-700">Translations JSON</span>
        <textarea value={form.translationsText} onChange={(e) => setForm((prev) => ({ ...prev, translationsText: e.target.value }))} rows={8} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-700" />
      </label>

      <label className="mt-3 block text-sm text-slate-600">
        <span className="mb-1 block font-medium text-slate-700">Description</span>
        <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" placeholder="Program details and notes" />
      </label>

      {message ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div> : null}

      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : form.id ? 'Update Poster' : 'Save Poster'}</button>
        <button type="button" onClick={reset} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Reset</button>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Existing Posters</p>
        <div className="grid gap-3">
          {posters.length === 0 ? (
            <div className="text-sm text-slate-500">No posters yet.</div>
          ) : posters.map((poster) => (
            <div key={poster.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{poster.title}</p>
                  <p className="text-xs text-slate-500">{poster.program_name || 'No program name'} · {poster.is_active ? 'Active' : 'Hidden'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editPoster(poster)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">Edit</button>
                  <button type="button" onClick={() => deletePoster(poster.id)} className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PosterManagerPanel;