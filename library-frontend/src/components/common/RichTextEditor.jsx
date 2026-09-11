import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Video as VideoIcon,
  Minus,
  Eraser,
  Code as CodeIcon,
  Upload,
  X,
  Check,
  Globe,
  Maximize2,
  Minimize2,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/apiClient';

const FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Noto Nastaliq (Urdu)', value: '"Noto Nastaliq Urdu", serif' },
  { label: 'Amiri (Arabic)', value: '"Amiri", serif' },
  { label: 'Inter (System)', value: 'Inter, sans-serif' },
];

const FONT_SIZES = [
  { label: '1 (10px)', value: '1' },
  { label: '2 (13px)', value: '2' },
  { label: '3 (16px Normal)', value: '3' },
  { label: '4 (18px Medium)', value: '4' },
  { label: '5 (24px Large)', value: '5' },
  { label: '6 (32px X-Large)', value: '6' },
  { label: '7 (48px XX-Large)', value: '7' },
];

const BLOCK_FORMATS = [
  { label: 'Normal (Paragraph)', value: 'p' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
  { label: 'Blockquote', value: 'blockquote' },
  { label: 'Code Block', value: 'pre' },
];

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write or format your content here...',
  minHeight = '380px',
  label = 'Content Editor',
  initialRTL = false,
  extraToolbar = null,
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedSelectionRef = useRef(null);

  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [activeFormats, setActiveFormats] = useState({});
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [currentSize, setCurrentSize] = useState('3');
  const [currentBlock, setCurrentBlock] = useState('p');
  const [foreColor, setForeColor] = useState('#0f172a');
  const [hiliteColor, setHiliteColor] = useState('#ffffff');
  const [isRTL, setIsRTL] = useState(initialRTL);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selected media inside editor (for inline floating action bar)
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaTray, setShowMediaTray] = useState(true);

  // Modals
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(true);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageTab, setImageTab] = useState('upload'); // 'upload' | 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageAlign, setImageAlign] = useState('center'); // 'center' | 'full' | 'left' | 'right'
  const [imageUploading, setImageUploading] = useState(false);

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  // Sync incoming value to editor
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    setSourceCode(value || '');
  }, [value, isSourceMode]);

  // Sync RTL prop if it changes
  useEffect(() => {
    if (initialRTL !== undefined) {
      setIsRTL(initialRTL);
    }
  }, [initialRTL]);

  // Save selection
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore selection
  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  // Update active formatting states
  const updateToolbarStates = useCallback(() => {
    if (isSourceMode || !editorRef.current) return;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        subscript: document.queryCommandState('subscript'),
        superscript: document.queryCommandState('superscript'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        justifyFull: document.queryCommandState('justifyFull'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });

      const blockVal = document.queryCommandValue('formatBlock');
      if (blockVal) setCurrentBlock(blockVal.toLowerCase().replace(/[<>]/g, ''));

      const fontVal = document.queryCommandValue('fontName');
      if (fontVal) setCurrentFont(fontVal.replace(/['"]/g, ''));

      const sizeVal = document.queryCommandValue('fontSize');
      if (sizeVal) setCurrentSize(sizeVal);
    } catch {
      // Ignore query errors
    }
  }, [isSourceMode]);

  const exec = (command, val = null) => {
    if (isSourceMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    updateToolbarStates();
    handleContentChange();
  };

  const handleContentChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setSourceCode(html);
    if (onChange) onChange(html);
  };

  const handleSourceCodeChange = (e) => {
    const newHtml = e.target.value;
    setSourceCode(newHtml);
    if (onChange) onChange(newHtml);
  };

  const toggleSourceMode = () => {
    if (!isSourceMode) {
      setSourceCode(editorRef.current?.innerHTML || '');
      setIsSourceMode(true);
      setSelectedMedia(null);
    } else {
      setIsSourceMode(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = sourceCode;
          editorRef.current.focus();
        }
      }, 50);
    }
  };

  // -------------------------------------------------------------
  // MEDIA MANAGEMENT: Real-time scan of inserted images & videos
  // -------------------------------------------------------------
  const mediaItems = useMemo(() => {
    const html = isSourceMode ? sourceCode : (editorRef.current?.innerHTML || sourceCode);
    if (!html) return [];

    const list = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Images
      const imgs = doc.querySelectorAll('img');
      imgs.forEach((img, i) => {
        const src = img.getAttribute('src');
        if (src) {
          list.push({
            id: `img-${i}-${src.slice(-10)}`,
            type: 'image',
            src,
            alt: img.getAttribute('alt') || 'Inserted Image',
          });
        }
      });

      // Videos (iframes)
      const iframes = doc.querySelectorAll('iframe');
      iframes.forEach((iframe, i) => {
        const src = iframe.getAttribute('src');
        if (src) {
          list.push({
            id: `video-${i}-${src.slice(-10)}`,
            type: 'video',
            src,
            title: iframe.getAttribute('title') || 'Embedded Video',
          });
        }
      });
    } catch {
      // Ignore parse errors
    }

    return list;
  }, [sourceCode, isSourceMode]);

  // Handle clicking inside the editor (detect clicking on an image or video)
  const handleEditorClick = (e) => {
    if (isSourceMode) return;
    const target = e.target;

    if (target.tagName === 'IMG') {
      setSelectedMedia({
        element: target,
        type: 'image',
        src: target.getAttribute('src') || '',
        alt: target.getAttribute('alt') || '',
      });
      return;
    }

    const videoWrapper = target.closest('.aspect-video');
    if (videoWrapper) {
      const iframe = videoWrapper.querySelector('iframe');
      setSelectedMedia({
        element: videoWrapper,
        type: 'video',
        src: iframe?.getAttribute('src') || '',
        title: iframe?.getAttribute('title') || 'Video',
      });
      return;
    }

    // Deselect media if clicking elsewhere
    setSelectedMedia(null);
  };

  // Delete currently selected media from editor
  const handleDeleteCurrentSelectedMedia = () => {
    if (!selectedMedia?.element) return;
    try {
      selectedMedia.element.remove();
      handleContentChange();
      setSelectedMedia(null);
      toast.success('Media removed successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete media');
    }
  };

  // Change alignment of selected media
  const handleAlignSelectedMedia = (align) => {
    if (!selectedMedia?.element) return;
    const el = selectedMedia.element;

    // Reset layout classes
    el.classList.remove('block', 'mx-auto', 'w-full', 'float-left', 'float-right', 'mr-6', 'ml-6', 'mb-4', 'max-w-sm');

    if (align === 'center') {
      el.classList.add('block', 'mx-auto');
    } else if (align === 'full') {
      el.classList.add('w-full', 'block');
    } else if (align === 'left') {
      el.classList.add('float-left', 'mr-6', 'mb-4', 'max-w-sm');
    } else if (align === 'right') {
      el.classList.add('float-right', 'ml-6', 'mb-4', 'max-w-sm');
    }

    handleContentChange();
    toast.success(`Aligned to ${align}`);
  };

  // Delete media item from the bottom Media Tray
  const handleDeleteMediaBySrc = (item) => {
    if (!item?.src) return;

    if (isSourceMode) {
      let updated = sourceCode;
      if (item.type === 'image') {
        const regex = new RegExp(`<img[^>]*src=["']${item.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
        updated = updated.replace(regex, '');
      } else {
        const regex = new RegExp(`<div[^>]*class=["'][^"']*aspect-video[^"']*["'][^>]*>[\\s\\S]*?${item.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?<\\/div>`, 'gi');
        updated = updated.replace(regex, '');
      }
      setSourceCode(updated);
      if (onChange) onChange(updated);
      toast.success('Media deleted from HTML code');
      return;
    }

    if (editorRef.current) {
      if (item.type === 'image') {
        const imgs = editorRef.current.querySelectorAll('img');
        let removed = false;
        imgs.forEach((img) => {
          if (img.getAttribute('src') === item.src) {
            img.remove();
            removed = true;
          }
        });
        if (removed) {
          handleContentChange();
          if (selectedMedia?.src === item.src) setSelectedMedia(null);
          toast.success('Image deleted from content');
          return;
        }
      } else {
        const iframes = editorRef.current.querySelectorAll('iframe');
        let removed = false;
        iframes.forEach((iframe) => {
          if (iframe.getAttribute('src') === item.src) {
            const wrapper = iframe.closest('.aspect-video');
            if (wrapper) wrapper.remove();
            else iframe.remove();
            removed = true;
          }
        });
        if (removed) {
          handleContentChange();
          if (selectedMedia?.src === item.src) setSelectedMedia(null);
          toast.success('Video embed removed from content');
          return;
        }
      }
    }
  };

  // -------------------------------------------------------------
  // MODALS: Link, Image, Video
  // -------------------------------------------------------------
  const openLinkModal = () => {
    saveSelection();
    const sel = window.getSelection();
    setLinkText(sel ? sel.toString() : '');
    setLinkUrl('');
    setLinkNewTab(true);
    setLinkModalOpen(true);
  };

  const handleInsertLink = (e) => {
    e.preventDefault();
    if (!linkUrl) {
      toast.error('Please enter a valid URL');
      return;
    }
    restoreSelection();
    editorRef.current?.focus();

    let targetUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl) && !targetUrl.startsWith('/') && !targetUrl.startsWith('#') && !targetUrl.startsWith('mailto:')) {
      targetUrl = 'https://' + targetUrl;
    }

    if (linkText) {
      const targetAttr = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
      const html = `<a href="${targetUrl}" class="text-emerald-700 underline font-medium hover:text-emerald-800"${targetAttr}>${linkText}</a>`;
      document.execCommand('insertHTML', false, html);
    } else {
      document.execCommand('createLink', false, targetUrl);
    }

    setLinkModalOpen(false);
    handleContentChange();
    toast.success('Link inserted');
  };

  const handleUnlink = () => {
    exec('unlink');
  };

  const openImageModal = () => {
    saveSelection();
    setImageUrl('');
    setImageAlt('');
    setImageAlign('center');
    setImageTab('upload');
    setImageModalOpen(true);
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = response.data?.url || response.data?.file_url || '';
      if (!uploadedUrl) throw new Error('Upload succeeded but no URL returned');

      setImageUrl(uploadedUrl);
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err.message || 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleInsertImage = (e) => {
    e.preventDefault();
    if (!imageUrl) {
      toast.error('Please upload an image or provide an Image URL');
      return;
    }

    restoreSelection();
    editorRef.current?.focus();

    let alignClass = 'block mx-auto';
    if (imageAlign === 'full') alignClass = 'w-full block';
    else if (imageAlign === 'left') alignClass = 'float-left mr-6 mb-4 max-w-sm';
    else if (imageAlign === 'right') alignClass = 'float-right ml-6 mb-4 max-w-sm';

    const fullClass = `max-w-full h-auto rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700 my-4 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all ${alignClass}`;
    const altAttr = imageAlt ? ` alt="${imageAlt.replace(/"/g, '&quot;')}"` : ' alt="Content Image"';
    const html = `<img src="${imageUrl}"${altAttr} class="${fullClass}" loading="lazy" />`;

    document.execCommand('insertHTML', false, html);
    setImageModalOpen(false);
    handleContentChange();
    toast.success('Image inserted');
  };

  const openVideoModal = () => {
    saveSelection();
    setVideoUrl('');
    setVideoModalOpen(true);
  };

  const handleInsertVideo = (e) => {
    e.preventDefault();
    if (!videoUrl) {
      toast.error('Please enter a video or YouTube link');
      return;
    }

    restoreSelection();
    editorRef.current?.focus();

    let embedUrl = videoUrl.trim();
    const ytMatch = embedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    const html = `
      <div class="my-6 aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
        <iframe src="${embedUrl}" title="Embedded Video" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
      <p><br/></p>
    `;

    document.execCommand('insertHTML', false, html);
    setVideoModalOpen(false);
    handleContentChange();
    toast.success('Video embedded');
  };

  const handleClearFormat = () => {
    exec('removeFormat');
    exec('formatBlock', 'p');
    toast.success('Formatting cleared for selection');
  };

  // Text Stats
  const getStats = () => {
    const raw = isSourceMode ? sourceCode : (editorRef.current?.innerText || '');
    const clean = raw.trim();
    const words = clean ? clean.split(/\s+/).length : 0;
    const chars = clean.length;
    return { words, chars };
  };

  const { words, chars } = getStats();

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen bg-white dark:bg-slate-900' : ''
      }`}
    >
      {/* ================= HEADER / LABEL BAR ================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-4 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            {isSourceMode ? 'HTML Code Mode' : 'WYSIWYG Visual Editor'}
          </span>
          {mediaItems.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              {mediaItems.length} media item{mediaItems.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setIsRTL((prev) => !prev)}
            title="Toggle Text Direction (LTR / RTL for Urdu & Arabic)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
              isRTL
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isRTL ? 'RTL (اردو / عربی)' : 'LTR (English)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Optional Extra Toolbar Snippets (e.g. Bismillah, Hamd, Quotes) */}
      {extraToolbar && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 px-4 py-2 flex flex-wrap items-center gap-2">
          {extraToolbar}
        </div>
      )}

      {/* ================= TOOLBAR (Matching user screenshot) ================= */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/80 p-2 text-slate-700 dark:text-slate-200 select-none">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => exec('undo')}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 text-slate-700 dark:text-slate-300"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('redo')}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 text-slate-700 dark:text-slate-300"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Basic Styles (B, I, U, S, X2, X^2) */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => exec('bold')}
            title="Bold (Ctrl+B)"
            className={`p-1.5 rounded transition ${
              activeFormats.bold
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Bold className="w-4 h-4 font-bold" />
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            title="Italic (Ctrl+I)"
            className={`p-1.5 rounded transition ${
              activeFormats.italic
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('underline')}
            title="Underline (Ctrl+U)"
            className={`p-1.5 rounded transition ${
              activeFormats.underline
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('strikeThrough')}
            title="Strikethrough"
            className={`p-1.5 rounded transition ${
              activeFormats.strikethrough
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('subscript')}
            title="Subscript"
            className={`p-1.5 rounded transition ${
              activeFormats.subscript
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Subscript className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('superscript')}
            title="Superscript"
            className={`p-1.5 rounded transition ${
              activeFormats.superscript
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Superscript className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => exec('justifyLeft')}
            title="Align Left"
            className={`p-1.5 rounded transition ${
              activeFormats.justifyLeft
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyCenter')}
            title="Align Center"
            className={`p-1.5 rounded transition ${
              activeFormats.justifyCenter
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyRight')}
            title="Align Right"
            className={`p-1.5 rounded transition ${
              activeFormats.justifyRight
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('justifyFull')}
            title="Justify"
            className={`p-1.5 rounded transition ${
              activeFormats.justifyFull
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Indent / Outdent & Lists */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => exec('outdent')}
            title="Outdent"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            <Outdent className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('indent')}
            title="Indent"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            <Indent className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            title="Bullet List"
            className={`p-1.5 rounded transition ${
              activeFormats.insertUnorderedList
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            title="Numbered List"
            className={`p-1.5 rounded transition ${
              activeFormats.insertOrderedList
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-1">
          <select
            value={currentBlock}
            onChange={(e) => {
              setCurrentBlock(e.target.value);
              exec('formatBlock', e.target.value);
            }}
            title="Paragraph Format"
            className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {BLOCK_FORMATS.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label}
              </option>
            ))}
          </select>

          <select
            value={currentFont}
            onChange={(e) => {
              setCurrentFont(e.target.value);
              exec('fontName', e.target.value);
            }}
            title="Font Family"
            className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 max-w-[115px]"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={currentSize}
            onChange={(e) => {
              setCurrentSize(e.target.value);
              exec('fontSize', e.target.value);
            }}
            title="Font Size"
            className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Color Pickers & Clear Format */}
        <div className="flex items-center gap-1">
          <label
            title="Text Color"
            className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 cursor-pointer hover:bg-slate-100"
          >
            <span className="font-bold text-sm" style={{ color: foreColor }}>
              A
            </span>
            <input
              type="color"
              value={foreColor}
              onChange={(e) => {
                setForeColor(e.target.value);
                exec('foreColor', e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          <label
            title="Highlight / Background Color"
            className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 cursor-pointer hover:bg-slate-100"
          >
            <span className="px-1 font-bold text-xs rounded" style={{ backgroundColor: hiliteColor }}>
              A
            </span>
            <input
              type="color"
              value={hiliteColor}
              onChange={(e) => {
                setHiliteColor(e.target.value);
                exec('hiliteColor', e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          <button
            type="button"
            onClick={handleClearFormat}
            title="Clear Formatting"
            className="px-2.5 h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            Clear Class
          </button>
        </div>

        {/* Media Inserts & Special Tools */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={openLinkModal}
            title="Insert Link"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleUnlink}
            title="Remove Link"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            <Unlink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openImageModal}
            title="Insert Image (Upload or URL)"
            className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openVideoModal}
            title="Embed Video (YouTube / Link)"
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
          >
            <VideoIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertHorizontalRule')}
            title="Horizontal Divider"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClearFormat}
            title="Eraser / Strip Format"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleSourceMode}
            title={isSourceMode ? 'Switch to Visual Editor' : 'Switch to HTML Code View'}
            className={`p-1.5 rounded transition ${
              isSourceMode
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-400 font-bold'
            }`}
          >
            <CodeIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= FLOATING ACTION BAR FOR SELECTED MEDIA ================= */}
      {selectedMedia && !isSourceMode && (
        <div className="sticky top-0 z-20 mx-4 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/90 p-2 shadow-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
            {selectedMedia.type === 'image' ? (
              <>
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Selected Image</span>
              </>
            ) : (
              <>
                <VideoIcon className="w-4 h-4 text-red-600" />
                <span>Selected Video</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">Align:</span>
            <button
              type="button"
              onClick={() => handleAlignSelectedMedia('left')}
              className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100"
            >
              Left
            </button>
            <button
              type="button"
              onClick={() => handleAlignSelectedMedia('center')}
              className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100"
            >
              Center
            </button>
            <button
              type="button"
              onClick={() => handleAlignSelectedMedia('right')}
              className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100"
            >
              Right
            </button>
            <button
              type="button"
              onClick={() => handleAlignSelectedMedia('full')}
              className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100"
            >
              Full Width
            </button>

            {/* DELETE BUTTON */}
            <button
              type="button"
              onClick={handleDeleteCurrentSelectedMedia}
              className="ml-2 inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-2xs transition"
              title="Delete this media from content"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Media</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMedia(null)}
              className="p-1 text-slate-400 hover:text-slate-600 ml-1"
              title="Close selection bar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= EDITOR WORKSPACE ================= */}
      <div className="relative flex-1 overflow-auto p-4 sm:p-6" style={{ minHeight }}>
        {isSourceMode ? (
          <textarea
            value={sourceCode}
            onChange={handleSourceCodeChange}
            placeholder="Edit raw HTML code here..."
            className="w-full h-full min-h-[360px] p-4 font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            spellCheck={false}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dir={isRTL ? 'rtl' : 'ltr'}
            onClick={handleEditorClick}
            onInput={handleContentChange}
            onBlur={handleContentChange}
            onKeyUp={updateToolbarStates}
            onMouseUp={updateToolbarStates}
            data-placeholder={placeholder}
            className={`w-full min-h-[360px] outline-none focus:outline-none prose prose-slate max-w-none dark:prose-invert leading-relaxed text-slate-800 dark:text-slate-100 ${
              isRTL ? 'font-serif text-right text-lg' : 'text-left text-base'
            }`}
            style={{
              fontFamily: currentFont,
            }}
          />
        )}
      </div>

      {/* ================= ATTACHED MEDIA MANAGER TRAY ================= */}
      {mediaItems.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Attached Media in Content ({mediaItems.length})
            </span>
            <button
              type="button"
              onClick={() => setShowMediaTray((prev) => !prev)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <span>{showMediaTray ? 'Hide Media' : 'Show Media'}</span>
              {showMediaTray ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showMediaTray && (
            <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto pt-1">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-2xs pr-3"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                      <VideoIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="max-w-[150px] truncate text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.type === 'image' ? (item.alt || 'Image') : 'YouTube Video'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{item.src}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteMediaBySrc(item)}
                    title="Delete this item from content"
                    className="ml-1 p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= BOTTOM STATUS BAR ================= */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 text-xs text-slate-500 dark:text-slate-400 rounded-b-2xl">
        <div className="flex items-center gap-4">
          <span>Words: <strong className="text-slate-700 dark:text-slate-200">{words}</strong></span>
          <span>Characters: <strong className="text-slate-700 dark:text-slate-200">{chars}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>Mode: <strong>{isSourceMode ? 'Raw HTML' : 'Visual WYSIWYG'}</strong></span>
          <span>•</span>
          <span>Direction: <strong>{isRTL ? 'RTL' : 'LTR'}</strong></span>
        </div>
      </div>

      {/* ================= LINK INSERT MODAL ================= */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-600" /> Insert Hyperlink
              </h3>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInsertLink} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com or /books"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Click here or leave blank to use selection"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="linkNewTab"
                  checked={linkNewTab}
                  onChange={(e) => setLinkNewTab(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="linkNewTab" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  Open link in a new tab
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
                >
                  Insert Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= IMAGE INSERT MODAL ================= */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" /> Insert Image
              </h3>
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  imageTab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Upload from Computer
              </button>
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  imageTab === 'url'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Image URL / Web Link
              </button>
            </div>

            <form onSubmit={handleInsertImage} className="mt-4 space-y-4">
              {imageTab === 'upload' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Image File *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-emerald-500 cursor-pointer bg-slate-50 dark:bg-slate-800/50 transition"
                  >
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {imageUploading ? 'Uploading image...' : 'Click to browse & upload image'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">PNG, JPG, JPEG, WEBP up to 10MB</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </div>
                  {imageUrl && (
                    <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-4 h-4" /> Ready to insert: {imageUrl.split('/').pop()}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Image Direct URL *
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/photo.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alt Text / Caption
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Layout / Alignment
                  </label>
                  <select
                    value={imageAlign}
                    onChange={(e) => setImageAlign(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="center">Centered</option>
                    <option value="full">Full Width</option>
                    <option value="left">Left Float</option>
                    <option value="right">Right Float</option>
                  </select>
                </div>
              </div>

              {imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-36 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <img src={imageUrl} alt="Preview" className="max-h-36 max-w-full object-contain" />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!imageUrl || imageUploading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {imageUploading ? 'Uploading...' : 'Insert Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIDEO EMBED MODAL ================= */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <VideoIcon className="w-5 h-5 text-red-600" /> Embed Video
              </h3>
              <button
                type="button"
                onClick={() => setVideoModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInsertVideo} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  YouTube or Video URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Paste any YouTube watch link; it will automatically be converted to a responsive video player.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setVideoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 text-xs font-medium text-white shadow-sm hover:bg-red-700"
                >
                  Embed Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
