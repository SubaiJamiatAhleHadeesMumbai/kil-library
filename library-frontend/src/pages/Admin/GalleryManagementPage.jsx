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
  MoonIcon,
  StarIcon,
  CheckIcon,
  FilmIcon,
  EyeIcon,
  CalendarDaysIcon,
  PlayIcon,
  LinkIcon,
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

const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const ISLAMIC_MONTHS = [
  { key: 'muharram', label: '1. محرم الحرام (Muharram)' },
  { key: 'safar', label: '2. صفر المظفر (Safar)' },
  { key: 'rabi_al_awwal', label: '3. ربيع الأول (Rabi-ul-Awwal)' },
  { key: 'rabi_al_thani', label: '4. ربيع الثاني (Rabi-us-Sani)' },
  { key: 'jumada_al_awwal', label: '5. جمادى الأولى (Jumada al-Ula)' },
  { key: 'jumada_al_thani', label: '6. جمادى الثانية (Jumada al-Thani)' },
  { key: 'rajab', label: '7. رجب المرجب (Rajab)' },
  { key: 'shaban', label: '8. شعبان المعظم (Sha\'ban)' },
  { key: 'ramadan', label: '9. رمضان المبارك (Ramadan)' },
  { key: 'shawwal', label: '10. شوال المکرم (Shawwal)' },
  { key: 'dhul_qadah', label: '11. ذو القعدة (Dhul Qi\'dah)' },
  { key: 'dhul_hijjah', label: '12. ذو الحجة (Dhul Hijjah)' },
];

const GREGORIAN_MONTHS = [
  { index: 1, key: 'january', ur: 'جنوری', en: 'January' },
  { index: 2, key: 'february', ur: 'فروری', en: 'February' },
  { index: 3, key: 'march', ur: 'مارچ', en: 'March' },
  { index: 4, key: 'april', ur: 'اپریل', en: 'April' },
  { index: 5, key: 'may', ur: 'مئی', en: 'May' },
  { index: 6, key: 'june', ur: 'جون', en: 'June' },
  { index: 7, key: 'july', ur: 'جولائی', en: 'July' },
  { index: 8, key: 'august', ur: 'اگست', en: 'August' },
  { index: 9, key: 'september', ur: 'ستمبر', en: 'September' },
  { index: 10, key: 'october', ur: 'اکتوبر', en: 'October' },
  { index: 11, key: 'november', ur: 'نومبر', en: 'November' },
  { index: 12, key: 'december', ur: 'دسمبر', en: 'December' },
];

const FRIDAY_WEEK_NAMES = {
  1: { en: '1st Friday', ur: 'یکم جمعہ (پہلا)', ar: 'الجمعة الأولى' },
  2: { en: '2nd Friday', ur: 'دوسرا جمعہ', ar: 'الجمعة الثانية' },
  3: { en: '3rd Friday', ur: 'تیسرا جمعہ', ar: 'الجمعة الثالثة' },
  4: { en: '4th Friday', ur: 'چوتھا جمعہ', ar: 'الجمعة الرابعة' },
  5: { en: '5th Friday', ur: 'پانچواں جمعہ', ar: 'الجمعة الخامسة' },
};

const getMonthFridays = (yearStr, monthIndex) => {
  const y = parseInt(yearStr, 10) || 2026;
  const m = monthIndex - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const fridays = [];

  const monthsUr = [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
  ];
  const monthsEn = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(y, m, d);
    if (dateObj.getDay() === 5) {
      const weekIndex = fridays.length + 1;
      const dateStr = `${y}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      fridays.push({
        weekIndex,
        day: d,
        dateStr,
        formattedEn: `${d} ${monthsEn[m]} ${y}`,
        formattedUr: `${d}؍ ${monthsUr[m]} ${y}`,
        labelEn: FRIDAY_WEEK_NAMES[weekIndex]?.en || `${weekIndex}th Friday`,
        labelUr: FRIDAY_WEEK_NAMES[weekIndex]?.ur || `${weekIndex}واں جمعہ`,
        labelAr: FRIDAY_WEEK_NAMES[weekIndex]?.ar || `الجمعة ${weekIndex}`,
      });
    }
  }
  return fridays;
};

const resolveAdminText = (val, fallback = '') => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.ur || val.en || val.ar || fallback;
  }
  return String(val);
};

const getFridaySlotLabel = (eventDate) => {
  if (!eventDate) return null;
  try {
    const parts = eventDate.trim().split(/[-/]/);
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      if (parts[2].length === 4) {
        y = parseInt(parts[2], 10);
        m = parseInt(parts[1], 10);
      }
      if (y && m) {
        const fridays = getMonthFridays(y, m);
        const matched = fridays.find((f) => f.dateStr === eventDate.trim() || eventDate.trim().includes(f.dateStr));
        if (matched) return matched;
      }
    }
  } catch {
    // fallback
  }
  return null;
};

const GalleryManagementPage = () => {
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'videos' | 'jumah' | 'moon' | 'albums'

  const [albums, setAlbums] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Preview Modals
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // Selected Photos for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [albumFilter, setAlbumFilter] = useState('all');

  // Multi-upload Dropzone (Photos)
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState('general');
  const [uploadYear, setUploadYear] = useState('2026');

  // Video Form State
  const [videoForm, setVideoForm] = useState({
    video_url: '',
    title_en: '',
    title_ur: '',
    title_ar: '',
    caption_en: '',
    caption_ur: '',
    caption_ar: '',
    album_id: 'general',
    year: '2026',
    show_on_home: true,
  });
  const [videoSaving, setVideoSaving] = useState(false);

  // Jumah Schedule Form State
  const jumahFileInputRef = useRef(null);
  const [jumahSelectedMonth, setJumahSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [jumahSelectedYear, setJumahSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [jumahFilterMonth, setJumahFilterMonth] = useState('all');

  const currentMonthFridays = useMemo(() => {
    return getMonthFridays(jumahSelectedYear, jumahSelectedMonth);
  }, [jumahSelectedYear, jumahSelectedMonth]);

  const [jumahForm, setJumahForm] = useState({
    file: null,
    event_date: new Date().toISOString().split('T')[0],
    title_en: '',
    title_ur: '',
    album_id: 'general',
    year: '2026',
    show_on_home: true,
  });
  const [jumahSaving, setJumahSaving] = useState(false);

  // Moon Date Form State
  const moonFileInputRef = useRef(null);
  const [moonForm, setMoonForm] = useState({
    file: null,
    event_date: new Date().toISOString().split('T')[0],
    hijri_year: '1448',
    hijri_month: 'rabi_al_awwal',
    title_en: '',
    title_ur: '',
    album_id: 'general',
    year: '1448',
    show_on_home: true,
  });
  const [moonSaving, setMoonSaving] = useState(false);

  // Calendar Form State (12 Months)
  const calendarFileInputRef = useRef(null);
  const [calendarForm, setCalendarForm] = useState({
    file: null,
    hijri_month: 'ramadan',
    year: '1448',
    title_en: '',
    title_ur: '',
    show_on_home: true,
  });
  const [calendarSaving, setCalendarSaving] = useState(false);

  // Edit Photo Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    album_id: 'general',
    item_type: 'photo',
    event_date: '',
    title_en: '',
    title_ur: '',
    title_ar: '',
    caption_en: '',
    caption_ur: '',
    caption_ar: '',
    year: '2026',
    video_url: '',
    is_active: true,
    show_on_home: true,
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

  const getDisplayAlbumTitle = (albumId) => {
    if (!albumId || albumId === 'general') {
      return activeLang === 'ur' ? 'عمومی البم (ڈیفالٹ)' : 'General Album (Default)';
    }
    const found = albums.find((a) => a.id === albumId);
    return found?.title?.ur || found?.title_ur || found?.title?.en || found?.title_en || albumId;
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
      payload.append('show_on_home', 'true');

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

  // --- 1-CLICK TOGGLE SHOW ON HOMEPAGE ---
  const handleToggleHome = async (itemId, e) => {
    e?.stopPropagation();
    try {
      const res = await galleryService.toggleShowOnHome(itemId);
      showNotification(res.message || 'Updated homepage status.');
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, show_on_home: res.show_on_home } : it))
      );
    } catch {
      showNotification('Failed to toggle homepage status.', true);
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
    if (targetIndex < 0 || targetIndex >= filteredPhotos.length) return;

    const updated = [...filteredPhotos];
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
    if (selectedIds.length === filteredPhotos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPhotos.map((i) => i.id));
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

  // --- EDIT PHOTO / ITEM MODAL ---
  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      album_id: item.album_id || 'general',
      item_type: item.item_type || (item.video_url ? 'video' : 'photo'),
      event_date: item.event_date || '',
      hijri_month: item.hijri_month || '',
      title_en: item.title?.en || '',
      title_ur: item.title?.ur || '',
      title_ar: item.title?.ar || '',
      caption_en: item.caption?.en || '',
      caption_ur: item.caption?.ur || '',
      caption_ar: item.caption?.ar || '',
      year: item.year || '2026',
      video_url: item.video_url || '',
      is_active: item.is_active !== false,
      show_on_home: Boolean(item.show_on_home),
    });
  };

  const handleSaveItem = async () => {
    setItemSaving(true);
    try {
      const payload = new FormData();
      payload.append('album_id', itemForm.album_id);
      payload.append('item_type', itemForm.item_type || 'photo');
      payload.append('event_date', itemForm.event_date || '');
      payload.append('hijri_month', itemForm.hijri_month || '');
      payload.append('title_en', itemForm.title_en);
      payload.append('title_ur', itemForm.title_ur);
      payload.append('title_ar', itemForm.title_ar);
      payload.append('caption_en', itemForm.caption_en);
      payload.append('caption_ur', itemForm.caption_ur);
      payload.append('caption_ar', itemForm.caption_ar);
      payload.append('year', itemForm.year);
      payload.append('video_url', itemForm.video_url);
      payload.append('is_active', String(itemForm.is_active));
      payload.append('show_on_home', String(itemForm.show_on_home));

      await galleryService.updateGalleryItem(editingItem.id, payload);
      showNotification('Item details saved successfully.');
      setEditingItem(null);
      fetchAdminGallery();
    } catch {
      showNotification('Failed to save item details.', true);
    } finally {
      setItemSaving(false);
    }
  };

  // --- ADD YOUTUBE VIDEO ---
  const handleAddVideo = async (e) => {
    e?.preventDefault();
    if (!videoForm.video_url.trim()) {
      showNotification('Please provide a YouTube video URL.', true);
      return;
    }
    const ytId = extractYouTubeId(videoForm.video_url);
    if (!ytId) {
      showNotification('Could not extract a valid YouTube video ID from the link.', true);
      return;
    }

    setVideoSaving(true);
    try {
      const payload = new FormData();
      payload.append('video_url', videoForm.video_url.trim());
      payload.append('title_en', videoForm.title_en.trim() || 'YouTube Video');
      payload.append('title_ur', videoForm.title_ur.trim() || videoForm.title_en.trim() || 'ویڈیو');
      payload.append('title_ar', videoForm.title_ar.trim());
      payload.append('album_id', videoForm.album_id);
      payload.append('year', videoForm.year);
      payload.append('show_on_home', String(videoForm.show_on_home));

      await galleryService.addVideo(payload);
      showNotification('YouTube video added successfully to gallery!');
      setVideoForm({
        video_url: '',
        title_en: '',
        title_ur: '',
        title_ar: '',
        album_id: 'general',
        year: '2026',
        show_on_home: false,
      });
      fetchAdminGallery();
    } catch {
      showNotification('Failed to add YouTube video.', true);
    } finally {
      setVideoSaving(false);
    }
  };

  // --- UPLOAD JUMAH LIST ---
  const handleUploadJumah = async (e) => {
    e?.preventDefault();
    if (!jumahForm.file) {
      showNotification('Please select an image file for the Jumah list.', true);
      return;
    }
    if (!jumahForm.event_date) {
      showNotification('Please select the Jumah Date.', true);
      return;
    }

    setJumahSaving(true);
    try {
      const payload = new FormData();
      payload.append('file', jumahForm.file);
      payload.append('item_type', 'jumah');
      payload.append('event_date', jumahForm.event_date);
      payload.append('title_en', jumahForm.title_en.trim() || `Jumah Schedule - ${jumahForm.event_date}`);
      payload.append('title_ur', jumahForm.title_ur.trim() || `جمعہ شیڈول - ${jumahForm.event_date}`);
      payload.append('album_id', jumahForm.album_id);
      payload.append('year', jumahForm.year);
      payload.append('show_on_home', String(jumahForm.show_on_home));

      await galleryService.uploadDatedItem(payload);
      showNotification('Jumah List poster uploaded successfully!');
      setJumahForm((prev) => ({
        file: null,
        event_date: '',
        title_en: '',
        title_ur: '',
        album_id: prev.album_id,
        year: jumahSelectedYear,
        show_on_home: true,
      }));
      if (jumahFileInputRef.current) jumahFileInputRef.current.value = '';
      fetchAdminGallery();
    } catch {
      showNotification('Failed to upload Jumah List poster.', true);
    } finally {
      setJumahSaving(false);
    }
  };

  // --- UPLOAD MOON DATE ---
  const handleUploadMoon = async (e) => {
    e?.preventDefault();
    if (!moonForm.file) {
      showNotification('Please select an image file for the Moon Date announcement.', true);
      return;
    }
    if (!moonForm.event_date) {
      showNotification('Please select the Moon announcement date.', true);
      return;
    }

    setMoonSaving(true);
    try {
      const payload = new FormData();
      payload.append('file', moonForm.file);
      payload.append('item_type', 'moon');
      payload.append('event_date', moonForm.event_date);
      payload.append('hijri_month', moonForm.hijri_month || 'rabi_al_awwal');
      payload.append('title_en', moonForm.title_en.trim() || `Moon Sighting - ${moonForm.event_date}`);
      payload.append('title_ur', moonForm.title_ur.trim() || `چاند کی تاریخ کا اعلان - ${moonForm.event_date}`);
      payload.append('album_id', moonForm.album_id);
      payload.append('year', moonForm.hijri_year || moonForm.year || '1448');
      payload.append('show_on_home', String(moonForm.show_on_home));

      await galleryService.uploadDatedItem(payload);
      showNotification('Moon Date announcement poster uploaded successfully!');
      setMoonForm({
        file: null,
        event_date: new Date().toISOString().split('T')[0],
        hijri_year: '1448',
        hijri_month: 'rabi_al_awwal',
        title_en: '',
        title_ur: '',
        album_id: 'general',
        year: '1448',
        show_on_home: true,
      });
      if (moonFileInputRef.current) moonFileInputRef.current.value = '';
      fetchAdminGallery();
    } catch {
      showNotification('Failed to upload Moon Date announcement poster.', true);
    } finally {
      setMoonSaving(false);
    }
  };

  // --- UPLOAD ISLAMIC CALENDAR (12 MONTHS) ---
  const handleUploadCalendar = async (e) => {
    e?.preventDefault();
    if (!calendarForm.file) {
      showNotification('Please select a calendar poster image file.', true);
      return;
    }

    setCalendarSaving(true);
    try {
      const payload = new FormData();
      payload.append('file', calendarForm.file);
      payload.append('item_type', 'calendar');
      payload.append('hijri_month', calendarForm.hijri_month);
      payload.append('year', calendarForm.year || '1448');
      payload.append('show_on_home', String(calendarForm.show_on_home));

      const foundMonth = ISLAMIC_MONTHS.find(m => m.key === calendarForm.hijri_month);
      const rawMonth = foundMonth ? foundMonth.label.replace(/^\d+\.\s*/, '') : '';
      const urduName = rawMonth.split('(')[0]?.trim() || '';
      const engName = rawMonth.split('(')[1]?.replace(')', '')?.trim() || '';

      payload.append('title_en', calendarForm.title_en.trim() || `Islamic Calendar ${engName} ${calendarForm.year || '1448'}`);
      payload.append('title_ur', calendarForm.title_ur.trim() || `اسلامی کیلنڈر ${urduName} ${calendarForm.year || '1448'}ھ`);

      await galleryService.uploadDatedItem(payload);
      showNotification('Islamic Calendar poster uploaded successfully! 📅');
      setCalendarForm({
        file: null,
        hijri_month: 'ramadan',
        year: '1448',
        title_en: '',
        title_ur: '',
        show_on_home: true,
      });
      if (calendarFileInputRef.current) calendarFileInputRef.current.value = '';
      fetchAdminGallery();
    } catch {
      showNotification('Failed to upload Islamic Calendar poster.', true);
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleSetLiveCalendar = async (itemId) => {
    try {
      await galleryService.setCurrentCalendar(itemId);
      showNotification('Calendar month is now LIVE on public site! 🟢');
      fetchAdminGallery();
    } catch {
      showNotification('Failed to set calendar as live.', true);
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

  // Categorized items
  const photosList = useMemo(() => {
    return items.filter((i) => (!i.item_type || i.item_type === 'photo') && !i.video_url);
  }, [items]);

  const videosList = useMemo(() => {
    return items.filter((i) => i.item_type === 'video' || Boolean(i.video_url));
  }, [items]);

  const jumahList = useMemo(() => {
    return items.filter((i) => i.item_type === 'jumah');
  }, [items]);

  const filteredJumahList = useMemo(() => {
    if (jumahFilterMonth === 'all') return jumahList;
    const mNum = parseInt(jumahFilterMonth, 10);
    return jumahList.filter((item) => {
      if (!item.event_date) return false;
      const parts = item.event_date.trim().split(/[-/]/);
      if (parts.length === 3) {
        const itemM = parts[0].length === 4 ? parseInt(parts[1], 10) : parseInt(parts[1], 10);
        return itemM === mNum;
      }
      return false;
    });
  }, [jumahList, jumahFilterMonth]);

  const moonList = useMemo(() => {
    return items.filter((i) => i.item_type === 'moon');
  }, [items]);

  const calendarList = useMemo(() => {
    return items.filter((i) => i.item_type === 'calendar');
  }, [items]);

  // Filtered Photos for Photos Grid
  const filteredPhotos = useMemo(() => {
    if (albumFilter === 'home') return photosList.filter((i) => Boolean(i.show_on_home));
    if (albumFilter === 'all') return photosList;
    return photosList.filter((i) => i.album_id === albumFilter);
  }, [photosList, albumFilter]);

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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
            Media Suite
          </span>
          <h2 className="text-xl font-black text-slate-800">
            Markaz Media & Gallery Manager
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage photos, YouTube videos, Jumah schedules with date, Moon announcements, and albums.
          </p>
        </div>

        {/* 5-Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhotoIcon className="w-4 h-4" />
            <span>Photos ({photosList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FilmIcon className="w-4 h-4" />
            <span>Videos ({videosList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jumah')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'jumah'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span>Jumah List ({jumahList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('moon')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'moon'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MoonIcon className="w-4 h-4" />
            <span>Moon Date ({moonList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span>Islamic Calendar ({calendarList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('albums')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'albums'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            <span>Albums ({albums.length})</span>
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
                  Photos ({filteredPhotos.length})
                </h3>

                {/* Filter by Album Dropdown */}
                <select
                  value={albumFilter}
                  onChange={(e) => setAlbumFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-indigo-500"
                >
                  <option value="all">All Albums ({photosList.length})</option>
                  <option value="home">⭐ On Homepage ({photosList.filter((i) => i.show_on_home).length})</option>
                  {albums.map((alb) => (
                    <option key={alb.id} value={alb.id}>
                      {alb.title?.ur || alb.title?.en || alb.id}
                    </option>
                  ))}
                </select>

                {filteredPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {selectedIds.length === filteredPhotos.length ? 'Deselect All' : 'Select All'}
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
            ) : filteredPhotos.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No photos in this album yet. Upload photos using the box above!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredPhotos.map((item, index) => {
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

                        {/* 1-Click Show on Homepage Toggle Badge */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleHome(item.id, e)}
                          className={`absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md transition cursor-pointer border ${
                            item.show_on_home
                              ? 'bg-amber-400 text-slate-900 border-amber-300 ring-2 ring-amber-300/40'
                              : 'bg-black/60 text-white/80 border-white/20 hover:bg-black/80 hover:text-white'
                          }`}
                          title={item.show_on_home ? 'Featured on Homepage (Click to remove)' : 'Click to feature on Homepage'}
                        >
                          <StarIcon className={`w-3 h-3 ${item.show_on_home ? 'text-amber-900' : 'text-white/70'}`} />
                          <span>{item.show_on_home ? 'On Home' : 'Home?'}</span>
                        </button>

                        {/* Ambient Glow */}
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-md opacity-40 scale-110 pointer-events-none"
                          style={{ backgroundImage: `url(${toAbsoluteUrl(item.image_url)})` }}
                        />

                        <img
                          src={toAbsoluteUrl(item.image_url)}
                          alt={item.title?.en || 'Gallery'}
                          className="relative z-10 w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
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
                            {getDisplayAlbumTitle(item.album_id)} · {item.year}
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
                            disabled={index === filteredPhotos.length - 1}
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
      {/* 🎥 TAB: YOUTUBE VIDEOS MANAGER */}
      {/* ============================================================= */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {/* Quick Add YouTube Video Card */}
          <div className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50/70 via-white to-rose-50/40 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 text-rose-700 font-extrabold text-sm mb-3">
              <FilmIcon className="w-5 h-5" />
              <span>Add YouTube Video to Gallery</span>
            </div>
            <form onSubmit={handleAddVideo} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    YouTube Video URL *
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      value={videoForm.video_url}
                      onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-rose-500 shadow-2xs font-mono"
                    />
                  </div>
                  {/* Live YouTube Preview if valid ID */}
                  {extractYouTubeId(videoForm.video_url) && (
                    <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-rose-200 shadow-2xs animate-in fade-in">
                      <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                        <img
                          src={`https://img.youtube.com/vi/${extractYouTubeId(videoForm.video_url)}/hqdefault.jpg`}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <PlayIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckIcon className="w-3.5 h-3.5" /> Valid YouTube Video detected
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          ID: {extractYouTubeId(videoForm.video_url)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    English Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special Lecture by Shaikh..."
                    value={videoForm.title_en}
                    onChange={(e) => setVideoForm({ ...videoForm, title_en: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اردو عنوان (Urdu Title)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: خصوصی خطاب بابت اصلاح معاشرہ"
                    value={videoForm.title_ur}
                    onChange={(e) => setVideoForm({ ...videoForm, title_ur: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-urdu text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {activeLang === 'ur' ? 'البم منتخب کریں' : 'Album'}
                  </label>
                  <select
                    value={videoForm.album_id}
                    onChange={(e) => setVideoForm({ ...videoForm, album_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="general">
                      📁 {activeLang === 'ur' ? 'عمومی ویڈیوز البم (ڈیفالٹ)' : 'General Videos Album (Default)'}
                    </option>
                    {albums
                      .filter((a) => a.id !== 'general')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          📁 {a.title?.ur || a.title_ur || a.title?.en || a.title_en || a.id}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="text"
                    value={videoForm.year}
                    onChange={(e) => setVideoForm({ ...videoForm, year: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={videoForm.show_on_home}
                    onChange={(e) => setVideoForm({ ...videoForm, show_on_home: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>Feature on Homepage (ہوم پیج پر دکھائیں)</span>
                </label>

                <button
                  type="submit"
                  disabled={videoSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-rose-600/20 transition disabled:opacity-60 cursor-pointer"
                >
                  {videoSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Video...</span>
                    </>
                  ) : (
                    <>
                      <FilmIcon className="w-4 h-4" />
                      <span>Add Video to Gallery</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Videos List Grid */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              YouTube Videos in Gallery ({videosList.length})
            </h3>

            {videosList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No YouTube videos added yet. Paste a YouTube link in the form above to add one!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {videosList.map((item) => {
                  const albumObj = albums.find((a) => a.id === item.album_id);
                  const ytId = item.video_url ? extractYouTubeId(item.video_url) : null;
                  const thumb = item.image_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 hover:bg-white hover:shadow-md transition"
                    >
                      <div
                        onClick={() => setPreviewVideoUrl(item.video_url)}
                        className="group relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-200 cursor-pointer"
                        title="Click to play preview"
                      >
                        {thumb ? (
                          <img
                            src={toAbsoluteUrl(thumb)}
                            alt={item.title?.en || 'Video thumbnail'}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                            <FilmIcon className="w-8 h-8 opacity-50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                            <PlayIcon className="w-5 h-5 ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 rounded-full bg-black/70 text-white px-2 py-0.5 text-[9px] font-bold backdrop-blur-xs">
                          YouTube
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-1.5 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={item.title?.ur || item.title?.en}>
                            {item.title?.ur || item.title?.en || 'YouTube Video'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {getDisplayAlbumTitle(item.album_id)} · {item.year}
                          </span>
                        </div>

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

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-slate-500">
                        <button
                          type="button"
                          onClick={(e) => handleToggleHome(item.id, e)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition ${
                            item.show_on_home
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.show_on_home ? '⭐ On Home' : '+ On Home'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete"
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
      {/* 🕌 TAB: JUMAH LIST MANAGER */}
      {/* ============================================================= */}
      {activeTab === 'jumah' && (
        <div className="space-y-6">
          {/* Quick Upload Jumah List Card */}
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/50 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <CalendarDaysIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Upload Jumah Schedule / جمعہ شیڈول
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    Select the Friday slot (1st, 2nd, 3rd, 4th or 5th) to auto-fill dates and bilingual titles.
                  </p>
                </div>
              </div>

              {/* Month & Year Selectors */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <select
                  value={jumahSelectedMonth}
                  onChange={(e) => setJumahSelectedMonth(Number(e.target.value))}
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-600 shadow-2xs"
                >
                  {GREGORIAN_MONTHS.map((m) => (
                    <option key={m.index} value={m.index}>
                      {m.en} ({m.ur})
                    </option>
                  ))}
                </select>

                <select
                  value={jumahSelectedYear}
                  onChange={(e) => {
                    const y = e.target.value;
                    setJumahSelectedYear(y);
                    setJumahForm((prev) => ({ ...prev, year: y }));
                  }}
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-600 shadow-2xs"
                >
                  {['2025', '2026', '2027', '2028'].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 1: Friday Slots Selector (4 or 5 Fridays) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span>Step 1: Choose Friday Slot</span>
                  <span className="text-[11px] font-normal text-emerald-600">
                    ({currentMonthFridays.length} Fridays in {GREGORIAN_MONTHS.find(m => m.index === jumahSelectedMonth)?.en} {jumahSelectedYear})
                  </span>
                </span>
                <span className="text-[11px] font-urdu text-emerald-800 font-bold">
                  ہر مہینے کے ۴ یا ۵ جمعہ
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {currentMonthFridays.map((friday) => {
                  const isSelected = jumahForm.event_date === friday.dateStr;
                  const existing = jumahList.find((it) => {
                    if (!it.event_date) return false;
                    const d = it.event_date.trim();
                    return d === friday.dateStr || d.includes(friday.dateStr);
                  });

                  return (
                    <button
                      key={friday.weekIndex}
                      type="button"
                      onClick={() => {
                        setJumahForm((prev) => ({
                          ...prev,
                          event_date: friday.dateStr,
                          year: jumahSelectedYear,
                          title_en: `Jumah Schedule - ${friday.labelEn} (${friday.formattedEn})`,
                          title_ur: `خطبہ جمعہ شیڈول - ${friday.labelUr} (${friday.formattedUr})`,
                        }));
                      }}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 text-slate-800 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-100/70 ring-2 ring-emerald-500 shadow-sm scale-[1.02]'
                          : existing
                          ? 'border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {friday.labelEn}
                        </span>
                        {existing ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                            <CheckIcon className="w-2.5 h-2.5 stroke-3" /> Done
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Empty
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-urdu text-xs text-emerald-800 font-bold leading-tight">
                          {friday.labelUr}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 font-bold mt-1">
                          📅 {friday.formattedEn}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="text-[9px] font-bold text-emerald-700 bg-emerald-200/70 rounded-md py-0.5 px-1.5 text-center">
                          ✓ Slot Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Upload Form */}
            <form onSubmit={handleUploadJumah} className="space-y-4 pt-2 border-t border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                  Step 2: Attach Flyer & Confirm Details
                </span>
                {jumahForm.event_date && (
                  <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-100/70 px-2.5 py-0.5 rounded-lg">
                    Target Date: {jumahForm.event_date}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumah Poster Image *
                  </label>
                  <input
                    type="file"
                    ref={jumahFileInputRef}
                    required
                    accept="image/*"
                    onChange={(e) => setJumahForm({ ...jumahForm, file: e.target.files?.[0] || null })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-emerald-600"
                  />
                  {jumahForm.file && (
                    <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                      Selected: {jumahForm.file.name}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumah Date (جمعہ کی تاریخ) *
                  </label>
                  <input
                    type="date"
                    required
                    value={jumahForm.event_date}
                    onChange={(e) => setJumahForm({ ...jumahForm, event_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="text"
                    value={jumahForm.year}
                    onChange={(e) => setJumahForm({ ...jumahForm, year: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-emerald-600"
                    placeholder="2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    English Title / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jumah Schedule - 1st Friday (06 Mar 2026)"
                    value={jumahForm.title_en}
                    onChange={(e) => setJumahForm({ ...jumahForm, title_en: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اردو عنوان (Urdu Title)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: خطبہ جمعہ شیڈول - یکم جمعہ"
                    value={jumahForm.title_ur}
                    onChange={(e) => setJumahForm({ ...jumahForm, title_ur: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Album</label>
                  <select
                    value={jumahForm.album_id}
                    onChange={(e) => setJumahForm({ ...jumahForm, album_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-emerald-600"
                  >
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>{resolveAdminText(a.title?.ur) || resolveAdminText(a.title?.en) || a.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={jumahForm.show_on_home}
                    onChange={(e) => setJumahForm({ ...jumahForm, show_on_home: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Feature on Homepage (ہوم پیج پر دکھائیں)</span>
                </label>

                <button
                  type="submit"
                  disabled={jumahSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-emerald-700/20 transition disabled:opacity-60 cursor-pointer"
                >
                  {jumahSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading Jumah Poster...</span>
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-4 h-4" />
                      <span>Upload Jumah Schedule Poster</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Jumah List Posters Grid with Month Filter */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Uploaded Jumah Posters ({filteredJumahList.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Manage weekly Friday sermon schedules and bayan announcements
                </p>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filter Month:</span>
                <select
                  value={jumahFilterMonth}
                  onChange={(e) => setJumahFilterMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-emerald-600"
                >
                  <option value="all">All Months ({jumahList.length})</option>
                  {GREGORIAN_MONTHS.map((m) => {
                    const count = jumahList.filter((it) => {
                      if (!it.event_date) return false;
                      const parts = it.event_date.trim().split(/[-/]/);
                      if (parts.length === 3) {
                        return parseInt(parts[1], 10) === m.index;
                      }
                      return false;
                    }).length;
                    return (
                      <option key={m.index} value={m.index}>
                        {m.en} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {filteredJumahList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm space-y-2">
                <div className="text-3xl">🕌</div>
                <div className="font-semibold">No Jumah posters found for this filter.</div>
                <div className="text-xs text-slate-400">Choose a Friday slot above to upload a schedule!</div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredJumahList.map((item) => {
                  const fridaySlot = getFridaySlotLabel(item.event_date);
                  const displayTitle = resolveAdminText(item.title_ur) || resolveAdminText(item.title_en) || resolveAdminText(item.title?.ur) || resolveAdminText(item.title?.en) || 'Jumah Schedule';

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5 hover:bg-white hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Poster Image */}
                        <div
                          onClick={() => setPreviewImageUrl(toAbsoluteUrl(item.image_url))}
                          className="group relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer"
                          title="Click to view full poster"
                        >
                          <img
                            src={toAbsoluteUrl(item.image_url)}
                            alt={displayTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                            }}
                          />

                          {/* Friday Slot Badge */}
                          {fridaySlot ? (
                            <div className="absolute top-2 left-2 rounded-full bg-emerald-700/90 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs">
                              <CalendarDaysIcon className="w-3 h-3" />
                              <span>{fridaySlot.labelEn}</span>
                            </div>
                          ) : (
                            <div className="absolute top-2 left-2 rounded-full bg-slate-800/80 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs">
                              <CalendarDaysIcon className="w-3 h-3" />
                              <span>{item.event_date || item.year}</span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <EyeIcon className="w-6 h-6 text-white drop-shadow-md" />
                          </div>
                        </div>

                        {/* Title & Friday Label */}
                        <div className="flex items-start justify-between gap-1.5 min-w-0">
                          <div className="min-w-0 flex-1">
                            {fridaySlot && (
                              <div className="font-urdu text-[11px] text-emerald-800 font-bold truncate">
                                {fridaySlot.labelUr}
                              </div>
                            )}
                            <h4 className="text-xs font-bold text-slate-800 truncate" title={displayTitle}>
                              {displayTitle}
                            </h4>
                            <span className="text-[10px] text-emerald-700 font-bold font-mono block">
                              📅 {fridaySlot ? fridaySlot.formattedEn : (item.event_date || item.year)}
                            </span>
                          </div>

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
                      </div>

                      {/* Controls Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-slate-500">
                        <button
                          type="button"
                          onClick={(e) => handleToggleHome(item.id, e)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition ${
                            item.show_on_home
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {item.show_on_home ? '⭐ On Home' : '+ On Home'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Details"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete"
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
      {/* 🌙 TAB: MOON DATE MANAGER */}
      {/* ============================================================= */}
      {activeTab === 'moon' && (
        <div className="space-y-6">
          {/* Quick Upload Moon Date Card */}
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 text-amber-900 font-extrabold text-sm mb-3">
              <MoonIcon className="w-5 h-5 text-amber-600" />
              <span>Upload Moon Date (Chand Ki Tareekh) Announcement Poster</span>
            </div>
            <form onSubmit={handleUploadMoon} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Moon Poster Image *
                  </label>
                  <input
                    type="file"
                    ref={moonFileInputRef}
                    required
                    accept="image/*"
                    onChange={(e) => setMoonForm({ ...moonForm, file: e.target.files?.[0] || null })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                  {moonForm.file && (
                    <span className="text-[11px] text-amber-700 font-medium mt-1 block">
                      Selected: {moonForm.file.name}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Announcement Date (چاند کی تاریخ) *
                  </label>
                  <input
                    type="date"
                    required
                    value={moonForm.event_date}
                    onChange={(e) => setMoonForm({ ...moonForm, event_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hijri Year (ہجری سال) *
                  </label>
                  <input
                    type="text"
                    required
                    value={moonForm.hijri_year}
                    onChange={(e) => setMoonForm({ ...moonForm, hijri_year: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                    placeholder="1448"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Islamic Month (اسلامی مہینہ) *
                  </label>
                  <select
                    value={moonForm.hijri_month}
                    onChange={(e) => {
                      const mVal = e.target.value;
                      const selectedMonth = ISLAMIC_MONTHS.find(m => m.key === mVal);
                      const monthCleanName = selectedMonth ? selectedMonth.label.replace(/^\d+\.\s*/, '') : '';
                      const urduName = monthCleanName.split('(')[0]?.trim() || '';
                      const engName = monthCleanName.split('(')[1]?.replace(')', '')?.trim() || '';
                      setMoonForm({
                        ...moonForm,
                        hijri_month: mVal,
                        title_ur: `رویت ہلال ${urduName} ${moonForm.hijri_year}ھ`,
                        title_en: `Moon Sighting ${engName} ${moonForm.hijri_year}H`,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-urdu text-slate-800"
                  >
                    {ISLAMIC_MONTHS.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    English Title (e.g. Ramadan 1447 Moon Sighting)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramadan 1447 Hilal Sighting"
                    value={moonForm.title_en}
                    onChange={(e) => setMoonForm({ ...moonForm, title_en: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اردو عنوان (Urdu Title)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: رویت ہلال رمضان المبارک ۱۴۴۷ھ"
                    value={moonForm.title_ur}
                    onChange={(e) => setMoonForm({ ...moonForm, title_ur: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-urdu text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Album</label>
                  <select
                    value={moonForm.album_id}
                    onChange={(e) => setMoonForm({ ...moonForm, album_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  >
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>{a.title?.ur || a.title?.en || a.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={moonForm.show_on_home}
                    onChange={(e) => setMoonForm({ ...moonForm, show_on_home: e.target.checked })}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Feature on Homepage (ہوم پیج پر دکھائیں)</span>
                </label>

                <button
                  type="submit"
                  disabled={moonSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-amber-600/20 transition disabled:opacity-60 cursor-pointer"
                >
                  {moonSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading Moon Poster...</span>
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-4 h-4" />
                      <span>Upload Moon Date Poster</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Moon Posters Grid */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              Uploaded Moon Date Posters ({moonList.length})
            </h3>

            {moonList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No Moon Date posters uploaded yet. Choose an image and date above to upload one!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {moonList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 hover:bg-white hover:shadow-md transition"
                  >
                    <div
                      onClick={() => setPreviewImageUrl(toAbsoluteUrl(item.image_url))}
                      className="group relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer"
                      title="Click to view full poster"
                    >
                      <img
                        src={toAbsoluteUrl(item.image_url)}
                        alt={item.title?.en || 'Moon Poster'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2 left-2 rounded-full bg-amber-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-md flex items-center gap-1">
                        <MoonIcon className="w-3 h-3" />
                        <span>{item.event_date || item.year}</span>
                      </div>
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <EyeIcon className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-1.5 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 truncate" title={item.title?.ur || item.title?.en}>
                          {item.title?.ur || item.title?.en || 'Moon Announcement'}
                        </h4>
                        <span className="text-[10px] text-amber-700 font-semibold font-mono">
                          🌙 {item.event_date || item.year}
                        </span>
                      </div>

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

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-slate-500">
                      <button
                        type="button"
                        onClick={(e) => handleToggleHome(item.id, e)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition ${
                          item.show_on_home
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {item.show_on_home ? '⭐ On Home' : '+ On Home'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditItem(item)}
                          className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 📅 TAB: ISLAMIC CALENDAR (12 MONTHS) MANAGER */}
      {/* ============================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Quick Upload Calendar Poster Card */}
          <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50/70 via-white to-emerald-50/40 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 text-teal-900 font-extrabold text-sm">
                <CalendarDaysIcon className="w-5 h-5 text-teal-600" />
                <span>Upload 12-Month Islamic Calendar (سالانہ اسلامی تقویم و کیلنڈر)</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total Uploaded: {calendarList.length} / 12 Months
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              یہاں آپ سال کے بارہ مہینوں کے الگ الگ کیلنڈر پوسٹرز اپلوڈ کر سکتے ہیں۔ جس ماہ کو آپ "Make Live" کریں گے، پبلک ویب سائٹ پر سب سے پہلے وہی پوسٹر نمایاں دکھائی دے گا۔
            </p>

            <form onSubmit={handleUploadCalendar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Calendar Poster Image (HD) *
                  </label>
                  <input
                    type="file"
                    ref={calendarFileInputRef}
                    required
                    accept="image/*"
                    onChange={(e) => setCalendarForm({ ...calendarForm, file: e.target.files?.[0] || null })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                  {calendarForm.file && (
                    <span className="text-[11px] text-teal-700 font-medium mt-1 block">
                      Selected: {calendarForm.file.name}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Islamic Month (اسلامی مہینہ) *
                  </label>
                  <select
                    value={calendarForm.hijri_month}
                    onChange={(e) => setCalendarForm({ ...calendarForm, hijri_month: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  >
                    {ISLAMIC_MONTHS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hijri Year (ہجری سال) *
                  </label>
                  <input
                    type="text"
                    required
                    value={calendarForm.year}
                    onChange={(e) => setCalendarForm({ ...calendarForm, year: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                    placeholder="1448"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={calendarForm.show_on_home}
                    onChange={(e) => setCalendarForm({ ...calendarForm, show_on_home: e.target.checked })}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>Make Live on Public Site Immediately (شائقین کو یہ ماہ لائیو دکھائیں)</span>
                </label>

                <button
                  type="submit"
                  disabled={calendarSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-teal-700/20 transition disabled:opacity-60 cursor-pointer"
                >
                  {calendarSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading Calendar...</span>
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-4 h-4" />
                      <span>Upload Month Poster</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 12-Month Calendar Grid */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  12 Islamic Months Calendar Overview (سالانہ بارہ مہینے)
                </h3>
                <p className="text-xs text-slate-500">
                  جس ماہ کے پوسٹر پر "Live" کا نشان ہوگا، پبلک ویب سائٹ پر سب سے پہلے وہی دکھائی دے گا۔ آپ 1-کلک میں کسی بھی مہینے کو لائیو کر سکتے ہیں۔
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {ISLAMIC_MONTHS.map((m) => {
                const uploadedItem = calendarList.find(
                  (it) => String(it.hijri_month || '').toLowerCase() === m.key
                );
                const isLive = uploadedItem && Boolean(uploadedItem.show_on_home);

                return (
                  <div
                    key={m.key}
                    className={`rounded-2xl border p-3.5 space-y-2.5 transition flex flex-col justify-between ${
                      isLive
                        ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20 shadow-sm'
                        : uploadedItem
                        ? 'border-slate-200 bg-white hover:shadow-md'
                        : 'border-dashed border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div>
                      {/* Month Header */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs font-bold text-slate-800 font-urdu truncate" dir="rtl">
                          {m.label}
                        </span>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            LIVE NOW
                          </span>
                        )}
                      </div>

                      {/* Poster Preview or Placeholder */}
                      {uploadedItem ? (
                        <div
                          onClick={() => setPreviewImageUrl(toAbsoluteUrl(uploadedItem.image_url))}
                          className="group relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer"
                          title="Click to view full poster"
                        >
                          <img
                            src={toAbsoluteUrl(uploadedItem.image_url)}
                            alt={uploadedItem.title?.en || m.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <EyeIcon className="w-6 h-6 text-white drop-shadow-md" />
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setCalendarForm((prev) => ({ ...prev, hijri_month: m.key }));
                            if (calendarFileInputRef.current) calendarFileInputRef.current.focus();
                          }}
                          className="aspect-4/3 w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-100/50 flex flex-col items-center justify-center text-slate-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/30 transition cursor-pointer p-3 text-center"
                        >
                          <CalendarDaysIcon className="w-7 h-7 mb-1 stroke-1" />
                          <span className="text-[11px] font-bold">+ Upload Poster</span>
                        </div>
                      )}
                    </div>

                    {/* Controls Footer */}
                    {uploadedItem ? (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        {isLive ? (
                          <span className="text-[11px] font-bold text-teal-700">
                            ✓ Currently Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetLiveCalendar(uploadedItem.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 text-[10px] font-bold transition cursor-pointer"
                            title="Make this month's calendar live on public site"
                          >
                            <span>Set as Live 🟢</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            type="button"
                            onClick={() => openEditItem(uploadedItem)}
                            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(uploadedItem.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center italic">
                        Not uploaded yet
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 📂 TAB: ALBUMS & EVENTS MANAGER */}
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
              {/* Category / Type & Album & Year */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Category / Type</label>
                  <select
                    value={itemForm.item_type || 'photo'}
                    onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="photo">📸 Photo (تصویر)</option>
                    <option value="video">🎥 YouTube Video (ویڈیو)</option>
                    <option value="jumah">🕌 Jumah List (جمعہ لسٹ)</option>
                    <option value="moon">🌙 Moon Date (چاند کی تاریخ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {activeLang === 'ur' ? 'البم منتخب کریں' : 'Album'}
                  </label>
                  <select
                    value={itemForm.album_id}
                    onChange={(e) => setItemForm({ ...itemForm, album_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="general">
                      📁 {activeLang === 'ur' ? 'عمومی البم (ڈیفالٹ)' : 'General Album (Default)'}
                    </option>
                    {albums
                      .filter((alb) => alb.id !== 'general')
                      .map((alb) => (
                        <option key={alb.id} value={alb.id}>
                          📁 {alb.title?.ur || alb.title_ur || alb.title?.en || alb.title_en || alb.id}
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Event Date for Jumah & Moon */}
              {(itemForm.item_type === 'jumah' || itemForm.item_type === 'moon') && (
                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    {itemForm.item_type === 'jumah' ? 'Jumah Date (جمعہ کی تاریخ) *' : 'Moon Announcement Date (چاند کی تاریخ) *'}
                  </label>
                  <input
                    type="date"
                    value={itemForm.event_date || ''}
                    onChange={(e) => setItemForm({ ...itemForm, event_date: e.target.value })}
                    className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>
              )}

              {/* Islamic Month for Moon Sighting */}
              {itemForm.item_type === 'moon' && (
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Islamic Month (اسلامی مہینہ) *
                  </label>
                  <select
                    value={itemForm.hijri_month || 'rabi_al_awwal'}
                    onChange={(e) => setItemForm({ ...itemForm, hijri_month: e.target.value })}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-urdu text-slate-800"
                  >
                    {ISLAMIC_MONTHS.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  <span>{itemForm.is_active ? 'Active' : 'Hidden'}</span>
                </button>
              </div>

              {/* Show on Homepage Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <div>
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <StarIcon className="w-4 h-4 text-amber-600" />
                    Show on Homepage (ہوم پیج پر دکھائیں)
                  </span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Only photos with this checked will be displayed on the landing homepage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, show_on_home: !itemForm.show_on_home })}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                    itemForm.show_on_home
                      ? 'bg-amber-400 text-slate-900 border-amber-300 ring-2 ring-amber-300/40'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <StarIcon className={`w-3.5 h-3.5 ${itemForm.show_on_home ? 'text-amber-900' : 'text-slate-400'}`} />
                  <span>{itemForm.show_on_home ? '⭐ On Home' : 'Not on Home'}</span>
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

      {/* ============================================================= */}
      {/* 🎥 FULLSCREEN VIDEO PREVIEW MODAL */}
      {/* ============================================================= */}
      {previewVideoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewVideoUrl(null)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewVideoUrl(null)}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 hover:bg-black text-white transition cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <iframe
              src={previewVideoUrl}
              title="YouTube Preview"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 🖼️ FULLSCREEN IMAGE / POSTER PREVIEW MODAL */}
      {/* ============================================================= */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <img
              src={previewImageUrl}
              alt="Poster preview"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryManagementPage;
