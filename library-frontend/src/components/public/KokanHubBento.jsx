import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpenIcon,
  MoonIcon,
  DocumentTextIcon,
  PhotoIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { bookService } from "../../api/bookService";
import galleryService from "../../api/galleryService";
import apiClient from "../../api/apiClient";
import { useLanguage } from "../../context/LanguageContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = String(value);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Bulletproof helper to prevent React Error #31 (Objects as React child)
const resolveSafeText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const candidate = value.ur || value.ar || value.en || value.name || value.title || value.text;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    for (const key of Object.keys(value)) {
      if (typeof value[key] === "string" && value[key].trim()) {
        return value[key].trim();
      }
    }
    return fallback;
  }
  return fallback;
};

const SVG_NO_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">
      <rect width="300" height="420" fill="#0F3D2E"/>
      <rect x="12" y="12" width="276" height="396" rx="8" fill="none" stroke="#C5A059" stroke-width="2"/>
      <circle cx="150" cy="160" r="45" fill="#0A2A20" stroke="#C5A059" stroke-width="1.5"/>
      <text x="150" y="168" font-family="'Amiri', serif" font-size="28" font-weight="bold" fill="#C5A059" text-anchor="middle">کتاب</text>
      <text x="150" y="260" font-family="'Noto Naskh Arabic', sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">مرکز اہل حدیث کوکن</text>
      <text x="150" y="285" font-family="sans-serif" font-size="10" font-weight="600" fill="#94A3B8" letter-spacing="1" text-anchor="middle">ISLAMIC LIBRARY</text>
    </svg>
  `);

const KokanHubBento = () => {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  // Data states
  const [books, setBooks] = useState([]);
  const [moonItems, setMoonItems] = useState([]);
  const [pressClippings, setPressClippings] = useState([]);
  const [posters, setPosters] = useState([]);
  const [activeClippingIndex, setActiveClippingIndex] = useState(0);

  // Slider indices for the 4 side cards
  const [bookIndex, setBookIndex] = useState(0);
  const [moonIndex, setMoonIndex] = useState(0);
  const [magazineIndex, setMagazineIndex] = useState(0);
  const [posterIndex, setPosterIndex] = useState(0);

  // Fallback authentic data
  const defaultBooks = [
    {
      id: 35869,
      title: "حدیث رسول کی عظمت امام شافعی کی نظر میں",
      author: "عبدالواحد انور یوسفی",
      cover_image_url: "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/e6326ed649fdb912_Screenshot__123.png",
      category: "حدیث و علوم الحدیث",
    },
    {
      id: 35868,
      title: "دعوت فکر",
      author: "عبدالواحد انور یوسفی",
      cover_image_url: "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/5b6b1b71acc47afd_Screenshot__122.png",
      category: "دعوت و اصلاح",
    },
    {
      id: 35867,
      title: "ماہ رمضان کے مختصر احکام ومسائل",
      author: "عبدالواحد انور یوسفی",
      cover_image_url: "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/352ef32967c50b16_Screenshot__121.png",
      category: "فقہ و احکام",
    },
    {
      id: 35865,
      title: "عید الاضحی کے احکام اور فضائل",
      author: "رضاء اللہ عبدالکریم مدنی",
      cover_image_url: "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/e79b1c5c69e5ffff_Screenshot__118.png",
      category: "فقہ و احکام",
    },
  ];

  const defaultMoon = [
    {
      id: "moon-1",
      title: "چاند کی تاریخ کا اعلان • رویتِ ہلال",
      month: "ربیع الاول 1448ھ",
      date: "2026-09-20",
      image: "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/gallery/moon/3939f8ee3e6ea131_محرم_الحرام_1448.jpg",
      description: "مرکزی رویت ہلال کمیٹی صوبائی جمعیت اہل حدیث ممبئی و کوکن کی تصدیق شدہ رپورٹ۔",
    },
  ];

  const defaultMagazines = [
    {
      id: "mag-1",
      title: "مجلہ الجامعہ (خصوصی اشاعت)",
      issue: "شمارہ نمبر 48 • جلد 12",
      date: "محرم تا ربیع الاول",
      image: "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/8521b7917ace44f3_Screenshot__120.png",
      description: "عقیدہ توحید، فتنہ پروری کی روک تھام اور اصلاح معاشرہ کے اہم علمی مضامین۔",
    },
    {
      id: "mag-2",
      title: "مجلہ صوت الجامعہ",
      issue: "شمارہ نمبر 47",
      date: "شوال تا ذو الحجہ",
      image: "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/352ef32967c50b16_Screenshot__121.png",
      description: "دار الافتاء کے منتخب فتاویٰ اور دعوتی سرگرمیوں کی مفصل رپورٹ۔",
    },
  ];

  const defaultClippings = [
    {
      id: 5,
      title: "ملت میں انتشار کی مذموم کوششوں کو ناکام بنائیں",
      source: "Roznama Inquilab (انقلاب)",
      date: "2 جولائی 2001",
      excerpt: "مرکز اہل حدیث کوکن کے زیر اہتمام منعقدہ اہم اجلاس میں تمام ائمہ اور خطباء نے اتحاد بین المسلمین اور تحفظ سنت کی اہمیت پر زور دیا۔ علماء نے واضح کیا کہ کتاب و سنت کی طرف رجوع ہی امت کی فلاح کا ضامن ہے۔",
      link: "/clippings",
    },
    {
      id: 4,
      title: "گمراہ فرقوں کی فتنہ سامانی سے مسلمانوں کو بچانا ہمارا مشن۔ مفتی سعید احمد",
      source: "Roznama Inquilab (انقلاب)",
      date: "2 جولائی 2001",
      excerpt: "مرکز کے ناظم اور مفتیان کرام نے خطاب کرتے ہوئے کہا کہ مسلم نوجوانوں کو گمراہ کن نظریات سے بچانے کے لیے دینی و فکری رہنمائی وقت کی اہم ضرورت ہے۔",
      link: "/clippings",
    },
    {
      id: 1,
      title: "تحریک تحفظ سنت کا عظیم الشان اجلاسِ عام",
      source: "Roznama Inquilab (انقلاب)",
      date: "27 جون 2001",
      excerpt: "بیت السلام کمپلیکس کھیڈ میں منعقدہ عظیم الشان کانفرنس میں ہزاروں شرکاء کی آمد، سنت نبوی پر عمل پیرا ہونے کا عزم۔",
      link: "/clippings",
    },
  ];

  const defaultPosters = [
    {
      id: "poster-1",
      title: "یک روزہ دورۂ علمیہ (شرح الأصول الثلاثة)",
      date: "آئندہ اتوار",
      venue: "بیت السلام کمپلیکس، کھیڈ",
      image: "/static/images/0a33c541-b2d5-4315-aed3-04753bc5198a_download28.jpeg",
    },
    {
      id: "poster-2",
      title: "ماہانہ تربیتی درسِ قرآن و سنت",
      date: "ہر ماہ کا پہلا جمعہ",
      venue: "جامع مسجد اہل حدیث، سونس",
      image: "/static/images/7b6e2da0-4181-408c-b1d7-88bac463416f_books.jpeg",
    },
  ];

  useEffect(() => {
    let mounted = true;

    // 1. Fetch latest books
    bookService
      .getAllBooks({ limit: 8, approved_only: true })
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.books || data?.items || []);
        if (mounted && items.length > 0) {
          setBooks(items.slice(0, 8));
        }
      })
      .catch(() => {});

    // 2. Fetch gallery items for moon & posters
    galleryService
      .getPublicGallery({ limit: 20 })
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items || []);
        if (mounted && items.length > 0) {
          const moons = items.filter((it) => it.item_type === "moon");
          if (moons.length > 0) {
            setMoonItems(moons);
          }
          const photoPosters = items.filter((it) => it.item_type === "photo" && it.image_url);
          if (photoPosters.length > 0) {
            setPosters(photoPosters.slice(0, 6));
          }
        }
      })
      .catch(() => {});

    // 3. Fetch clippings via safe endpoint
    apiClient
      .get("/api/newspaper-clippings?limit=5")
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        if (mounted && items.length > 0) {
          setPressClippings(items);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const currentBookList = books.length > 0 ? books : defaultBooks;
  const currentMoonList = moonItems.length > 0 ? moonItems : defaultMoon;
  const currentMagazineList = defaultMagazines;
  const currentClippingsList = pressClippings.length > 0 ? pressClippings : defaultClippings;
  const currentPosterList = posters.length > 0 ? posters : defaultPosters;

  const activeBook = currentBookList[bookIndex % currentBookList.length] || defaultBooks[0];
  const activeMoon = currentMoonList[moonIndex % currentMoonList.length] || defaultMoon[0];
  const activeMagazine = currentMagazineList[magazineIndex % currentMagazineList.length] || defaultMagazines[0];
  const activePoster = currentPosterList[posterIndex % currentPosterList.length] || defaultPosters[0];
  const activeClipping = currentClippingsList[activeClippingIndex % currentClippingsList.length] || defaultClippings[0];

  return (
    <section className="py-4 w-full" dir="rtl">
      {/* ================= 3-COLUMN MARKAZ HUB ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ================= RIGHT COLUMN (Desktop 3 Cols in RTL): جدید کتب & رویت ہلال ================= */}
        <div className="lg:col-span-3 space-y-5 flex flex-col justify-between">
          
          {/* CARD 1: جدید کتب (New Books) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between h-full">
            {/* Header Pill */}
            <div className="bg-[#0F3D2E] text-white px-4 py-2.5 flex items-center justify-between">
              <span 
                className="text-xs sm:text-sm font-bold flex items-center gap-1.5"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>📖</span>
                <span>جدید کتب (New Books)</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBookIndex((prev) => (prev - 1 + currentBookList.length) % currentBookList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Previous Book"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBookIndex((prev) => (prev + 1) % currentBookList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Next Book"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Book Body */}
            <div className="p-4 flex flex-col items-center text-center space-y-3 flex-1 justify-center">
              <div 
                onClick={() => navigate(`/read/${activeBook.id}`)}
                className="w-28 h-40 rounded-xl overflow-hidden shadow-md border border-slate-200 cursor-pointer hover:scale-103 transition-transform bg-slate-100 flex items-center justify-center"
              >
                <img
                  src={activeBook.cover_image_url ? resolveImageUrl(activeBook.cover_image_url) : SVG_NO_COVER}
                  alt={resolveSafeText(activeBook.title, "کتاب")}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = SVG_NO_COVER;
                  }}
                />
              </div>

              <div className="space-y-1 w-full">
                <h4 
                  onClick={() => navigate(`/read/${activeBook.id}`)}
                  className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-[#0F3D2E] transition-colors cursor-pointer leading-snug"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {resolveSafeText(activeBook.title, "کتاب")}
                </h4>
                {activeBook.author && (
                  <p className="text-[11px] text-slate-500 font-medium truncate flex items-center justify-center gap-1">
                    <UserIcon className="w-3 h-3 text-[#C5A059]" />
                    <span>{resolveSafeText(activeBook.author, "علمائے کرام")}</span>
                  </p>
                )}
              </div>

              <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/read/${activeBook.id}`)}
                  className="w-full py-1.5 rounded-xl bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  مطالعہ کریں
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/books")}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  فہرست
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: رویت ہلال (Moon Sighting Announcement) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between h-full">
            {/* Header Pill */}
            <div className="bg-[#0F3D2E] text-white px-4 py-2.5 flex items-center justify-between">
              <span 
                className="text-xs sm:text-sm font-bold flex items-center gap-1.5"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>🌙</span>
                <span>رویت ہلال (Moon Sighting)</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMoonIndex((prev) => (prev - 1 + currentMoonList.length) % currentMoonList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Previous Announcement"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMoonIndex((prev) => (prev + 1) % currentMoonList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Next Announcement"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Moon Sighting Body */}
            <div className="p-4 flex flex-col items-center text-center space-y-3 flex-1 justify-center">
              <div 
                onClick={() => navigate("/moon")}
                className="w-full h-36 rounded-xl overflow-hidden border border-amber-200 bg-amber-50/50 relative cursor-pointer group shadow-2xs"
              >
                <img
                  src={activeMoon.image || activeMoon.image_url ? resolveImageUrl(activeMoon.image || activeMoon.image_url) : SVG_NO_COVER}
                  alt={resolveSafeText(activeMoon.title_ur || activeMoon.title, "رویت ہلال")}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5">
                  <span className="text-[10px] font-bold text-amber-300 bg-slate-950/70 px-2 py-0.5 rounded-md">
                    {resolveSafeText(activeMoon.hijri_month || activeMoon.month, "ہجری تقویم")}
                  </span>
                </div>
              </div>

              <div className="space-y-1 w-full">
                <h4 
                  onClick={() => navigate("/moon")}
                  className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 hover:text-[#0F3D2E] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {resolveSafeText(activeMoon.title_ur || activeMoon.title, "چاند کی تاریخ کا باضابطہ اعلان")}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {resolveSafeText(activeMoon.event_date || activeMoon.date, "مرکزی رویت ہلال کمیٹی")}
                </p>
              </div>

              <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/moon")}
                  className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  سرکلر دیکھیں
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ================= CENTER COLUMN (Desktop 6 Cols - Wide Majestic Editorial): پریس ریلیز و اعلامیہ ================= */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div className="rounded-2xl border border-[#E6E2DD] bg-white overflow-hidden shadow-xs hover:shadow-md transition h-full flex flex-col">
            
            {/* Header Pill */}
            <div className="bg-[#0F3D2E] text-white px-5 py-3 flex items-center justify-between">
              <span 
                className="text-sm sm:text-base font-extrabold flex items-center gap-2"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>📰</span>
                <span>پریس ریلیز و بیاناتِ مرکز (Markaz Press Releases)</span>
              </span>
              <span className="text-[11px] text-[#C5A059] font-bold tracking-wider">
                روزنامہ اخباری کوریج
              </span>
            </div>

            {/* Featured Editorial Body */}
            <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
              
              <div className="space-y-3">
                {/* Meta Row: Tag & Date */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#0F3D2E] text-xs font-bold">
                    <span>✨</span>
                    <span>{resolveSafeText(activeClipping.source || activeClipping.newspaper_name, "Roznama Inquilab")}</span>
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-medium flex items-center gap-1">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{resolveSafeText(activeClipping.date || activeClipping.edition_date, "تازہ ترین اشاعت")}</span>
                  </span>
                </div>

                {/* Main Headline */}
                <h3 
                  className="text-lg sm:text-2xl font-black text-[#1E293B] leading-snug hover:text-[#0F3D2E] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', 'Plus Jakarta Sans', system-ui, sans-serif" }}
                  onClick={() => navigate("/clippings")}
                >
                  {resolveSafeText(activeClipping.title, "پریس ریلیز")}
                </h3>

                {/* Excerpt */}
                <p 
                  className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-4"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {resolveSafeText(
                    activeClipping.excerpt || activeClipping.description,
                    "مرکز اہل حدیث کوکن، بیت السلام کمپلیکس کھڑ کے زیر اہتمام کتاب و سنت کی اشاعت، معاشرتی اصلاح اور علمی کانفرنسز کا انعقاد جاری ہے۔ تمام احباب سے گزارش ہے کہ مستند بیانات اور دعوتی پروگرامز میں شرکت فرمائیں۔"
                  )}
                </p>

                {/* Read More Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/clippings")}
                    className="inline-flex items-center gap-2 bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    <span>مکمل پریس ریلیز ملاحظہ فرمائیں</span>
                    <span>←</span>
                  </button>
                </div>
              </div>

              {/* Bottom List of 3 Recent Releases */}
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  حالیہ پریس بیانات و اخباری کٹنگز:
                </span>
                <div className="space-y-1.5">
                  {currentClippingsList.slice(0, 3).map((clip, idx) => (
                    <div
                      key={clip.id || idx}
                      onClick={() => setActiveClippingIndex(idx)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                        activeClippingIndex === idx
                          ? "bg-emerald-50/80 border-[#0F3D2E] text-[#0F3D2E]"
                          : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      <span className="line-clamp-1 flex-1">
                        • {resolveSafeText(clip.title, "پریس ریلیز")}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {resolveSafeText(clip.source || clip.newspaper_name, "Inquilab")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ================= LEFT COLUMN (Desktop 3 Cols in RTL): میگزین & پروگرام کے پوسٹرز ================= */}
        <div className="lg:col-span-3 space-y-5 flex flex-col justify-between">
          
          {/* CARD 1: میگزین (Magazine / Al-Jamiah) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between h-full">
            {/* Header Pill */}
            <div className="bg-[#0F3D2E] text-white px-4 py-2.5 flex items-center justify-between">
              <span 
                className="text-xs sm:text-sm font-bold flex items-center gap-1.5"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>📚</span>
                <span>میگزین (Al-Jamiah)</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMagazineIndex((prev) => (prev - 1 + currentMagazineList.length) % currentMagazineList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Previous Issue"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMagazineIndex((prev) => (prev + 1) % currentMagazineList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Next Issue"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Magazine Body */}
            <div className="p-4 flex flex-col items-center text-center space-y-3 flex-1 justify-center">
              <div 
                onClick={() => navigate("/books?q=مجل")}
                className="w-28 h-40 rounded-xl overflow-hidden shadow-md border border-slate-200 cursor-pointer hover:scale-103 transition-transform bg-slate-100 flex items-center justify-center"
              >
                <img
                  src={activeMagazine.image ? resolveImageUrl(activeMagazine.image) : SVG_NO_COVER}
                  alt={resolveSafeText(activeMagazine.title, "میگزین")}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1 w-full">
                <h4 
                  onClick={() => navigate("/books?q=مجل")}
                  className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 hover:text-[#0F3D2E] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {resolveSafeText(activeMagazine.title, "مجلہ الجامعہ")}
                </h4>
                <p className="text-[11px] text-[#0F3D2E] font-bold">
                  {resolveSafeText(activeMagazine.issue, "شمارہ")}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {resolveSafeText(activeMagazine.date, "")}
                </p>
              </div>

              <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/books?q=مجل")}
                  className="w-full py-1.5 rounded-xl bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  مطالعہ / ڈاؤنلوڈ
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: پروگرام کے پوسٹرز (Event & Dars Posters) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between h-full">
            {/* Header Pill */}
            <div className="bg-[#0F3D2E] text-white px-4 py-2.5 flex items-center justify-between">
              <span 
                className="text-xs sm:text-sm font-bold flex items-center gap-1.5"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>🖼️</span>
                <span>پروگرام کے پوسٹرز</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPosterIndex((prev) => (prev - 1 + currentPosterList.length) % currentPosterList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Previous Poster"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPosterIndex((prev) => (prev + 1) % currentPosterList.length)}
                  className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs transition cursor-pointer"
                  title="Next Poster"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Poster Body */}
            <div className="p-4 flex flex-col items-center text-center space-y-3 flex-1 justify-center">
              <div 
                onClick={() => navigate("/gallery")}
                className="w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative cursor-pointer group shadow-2xs"
              >
                <img
                  src={activePoster.image || activePoster.image_url ? resolveImageUrl(activePoster.image || activePoster.image_url) : SVG_NO_COVER}
                  alt={resolveSafeText(activePoster.title, "پروگرام پوسٹر")}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              <div className="space-y-1 w-full">
                <h4 
                  onClick={() => navigate("/gallery")}
                  className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 hover:text-[#0F3D2E] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {resolveSafeText(activePoster.title, "دعوتی و تعلیمی پروگرام")}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {resolveSafeText(activePoster.date || activePoster.event_date, "بیت السلام کمپلیکس، کھڑ")}
                </p>
              </div>

              <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/gallery")}
                  className="w-full py-1.5 rounded-xl bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  پوسٹر دیکھیں
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default KokanHubBento;
