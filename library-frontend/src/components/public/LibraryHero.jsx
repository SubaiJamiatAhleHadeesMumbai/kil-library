import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ShareIcon,
  ArrowsPointingOutIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import galleryService from "../../api/galleryService";
import { useLanguage } from "../../context/LanguageContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = String(value);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Clean titles from raw filenames like "WhatsApp Image..."
const cleanMediaTitle = (title, fallback = "مرکز اہل حدیث کوکن کی تصویری جھلکیاں") => {
  if (!title || typeof title !== "string") return fallback;
  if (title.toLowerCase().includes("whatsapp image") || title.toLowerCase().includes("img_") || title.toLowerCase().includes("dsc_")) {
    return fallback;
  }
  return title.trim() || fallback;
};

const DEFAULT_SLIDES = [
  {
    id: "slide-1",
    image: "/static/images/0a33c541-b2d5-4315-aed3-04753bc5198a_download28.jpeg",
    fallback_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&q=80",
    badge: "📸 دعوتی و تعلیمی پروگرامز",
    badge_color: "bg-emerald-700 text-white",
    title: "مرکز اہل حدیث کوکن: سالانہ تعلیمی و تربیتی سیمینار کی تصویری جھلکیاں",
    description: "مسجد اہل حدیث، بیت السلام کمپلیکس کھڑ میں منعقدہ عظیم الشان علمی کانفرنس جس میں علمائے کرام اور شائقینِ علم نے شرکت فرمائی۔",
    action_text: "تمام تصاویر ملاحظہ فرمائیں",
    action_link: "/gallery",
  },
  {
    id: "slide-2",
    image: "/static/images/7b6e2da0-4181-408c-b1d7-88bac463416f_books.jpeg",
    fallback_image: "https://images.unsplash.com/photo-1507842229456-83a30310705a?auto=format&fit=crop&w=1600&q=80",
    badge: "📖 کتب خانہ و ڈیجیٹل ذخیرہ",
    badge_color: "bg-amber-700 text-white",
    title: "علومِ قرآن و سنت اور سلف صالحین کی 7,800+ کتب کا جدید مطالعہ",
    description: "محققین، طلبہ اور علم کے متلاشی احباب کے لیے نادر کتب، تفاسیر اور شروحات احادیث کا آسان، مفت اور تیز ترین پلیٹ فارم۔",
    action_text: "کتب خانہ دیکھیں",
    action_link: "/books",
  },
  {
    id: "slide-3",
    image: "/static/images/97cd6c8e-b3a3-4ba9-9d07-5d86aabc152b.jpeg",
    fallback_image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=1600&q=80",
    badge: "🏛️ سرگرمیاں و خدمات",
    badge_color: "bg-teal-700 text-white",
    title: "مسجد اہل حدیث، بیت السلام کمپلیکس کھڑ کے دعوتی و فلاحی منصوبے",
    description: "منطقہ کوکن میں توحید و سنت کی اشاعت اور معاشرتی اصلاح کے لیے مرکز کے زیرِ اہتمام جاری متنوع سرگرمیاں۔",
    action_text: "تعارفِ مرکز پڑھیں",
    action_link: "/about",
  },
  {
    id: "slide-4",
    image: "/static/images/0a33c541-b2d5-4315-aed3-04753bc5198a_download28.jpeg",
    fallback_image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1600&q=80",
    badge: "🎓 دورہ تدریبیہ و کورسز",
    badge_color: "bg-blue-700 text-white",
    title: "علمائے کرام اور ائمہ مساجد کے لیے خصوصی تربیتی نشستیں",
    description: "دعوت و ارشاد کے میدان میں موثر خدمات کے لیے ائمہ و خطباء کی رہنمائی اور علمی کارگاہیں۔",
    action_text: "سرگرمیاں دیکھیں",
    action_link: "/activities",
  },
];

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

const LibraryHero = () => {
  const { language, isRTL } = useLanguage();
  const [galleryItems, setGalleryItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [lightboxItem, setLightboxItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    galleryService
      .getPublicGallery({ limit: 6 })
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items || []);
        if (mounted && items.length > 0) {
          // Strictly clamp to 6 to prevent pagination grid explosion
          setGalleryItems(items.slice(0, 6));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const slides = useMemo(() => {
    if (galleryItems && galleryItems.length > 0) {
      return galleryItems.slice(0, 6).map((item, index) => {
        const rawTitle = resolveSafeText(item.title, "مرکز اہل حدیث کوکن کی تصویری جھلکیاں");
        const rawDesc = resolveSafeText(item.caption, "مسجد اہل حدیث، بیت السلام کمپلیکس کھڑ میں جاری دعوتی، علمی اور اصلاحی سرگرمیاں۔");
        const badge = resolveSafeText(item.album_title, "📸 تصویری گیلری");

        const title = cleanMediaTitle(rawTitle, "مرکز اہل حدیث کوکن کی تصویری جھلکیاں");
        const desc = rawDesc;

        return {
          id: `gallery-${item.id || index}`,
          raw_item: item,
          image: resolveImageUrl(item.image_url),
          fallback_image: DEFAULT_SLIDES[index % DEFAULT_SLIDES.length].fallback_image,
          badge,
          badge_color: index % 2 === 0 ? "bg-[#0F3D2E] text-white" : "bg-[#C5A059] text-slate-950",
          title,
          description: desc,
          action_text: "نگارخانہ دیکھیں",
          action_link: "/gallery",
        };
      });
    }
    return DEFAULT_SLIDES;
  }, [galleryItems, language]);

  // Ensure active index stays within bounds
  const currentSlide = slides[activeSlideIndex] || slides[0];

  // Auto-slide every 7 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/books?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/books');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ================= HERO TOP ROW: SEARCH & HADITH CARD ================= */}
      <div className="relative flex flex-col lg:grid lg:grid-cols-12 gap-6 items-center">
        
        {/* LEFT COLUMN: TITLE + SEARCH BAR + QUICK ACTION PILLS */}
        <div className="w-full lg:col-span-7 space-y-4 text-start" dir="rtl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#0F3D2E] text-xs font-bold shadow-2xs">
            <span>✨</span>
            <span>مرکز اہل حدیث کوکن کا ڈیجیٹل کتب خانہ</span>
          </div>

          <h1 
            className="text-xl sm:text-3xl md:text-4xl font-extrabold text-[#1E293B] leading-snug sm:leading-normal"
            style={{ fontFamily: "'Noto Naskh Arabic', 'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            علومِ قرآن و سنت کا مستند اور جدید ذخیرہ
          </h1>

          <p className="text-xs sm:text-sm text-[#64748B] font-sans" dir="ltr">
            Explore 7,800+ authentic Islamic books, treatises, and researched Fatawa.
          </p>

          {/* Large Rounded Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-1 w-full">
            <div className="relative flex items-center bg-white rounded-2xl border-2 border-[#C5A059]/40 shadow-sm hover:border-[#C5A059] focus-within:border-[#0F3D2E] transition-all p-1.5 w-full">
              <span className="ps-2 sm:ps-3 text-[#0F3D2E] shrink-0">
                <MagnifyingGlassIcon className="w-5 h-5 text-[#0F3D2E]" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="کتاب، مصنف یا موضوع تلاش فرمائیں..."
                className="w-full min-w-0 bg-transparent border-none text-xs sm:text-sm text-[#1E293B] placeholder-slate-400 px-2 sm:px-3 focus:outline-none"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              />
              <button
                type="submit"
                className="bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs font-bold px-4 sm:px-6 py-2.5 rounded-xl transition shadow-xs shrink-0 cursor-pointer active:scale-95"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                تلاش کریں
              </button>
            </div>

            {/* Quick Action Pills Below Search */}
            <div className="flex items-center gap-2.5 sm:gap-3 mt-3 flex-wrap text-xs">
              <Link
                to="/juma-list"
                className="inline-flex items-center gap-1.5 bg-white border border-[#E6E2DD] hover:border-[#0F3D2E] px-3.5 py-1.5 rounded-full text-slate-700 shadow-2xs transition group"
              >
                <span className="text-emerald-800">🕌</span>
                <span className="font-bold text-[#0F3D2E]" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>خطباتِ جمعہ (Jumah Schedule)</span>
                <span className="text-[#0F3D2E] text-[10px] group-hover:translate-x-[-2px] transition-transform">←</span>
              </Link>

              <Link
                to="/moon"
                className="inline-flex items-center gap-1.5 bg-white border border-[#E6E2DD] hover:border-[#C5A059] px-3.5 py-1.5 rounded-full text-slate-700 shadow-2xs transition group"
              >
                <span className="text-amber-600">🌙</span>
                <span className="font-bold text-amber-900" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>رؤیتِ ہلال (Moon Sighting)</span>
                <span className="text-amber-900 text-[10px] group-hover:translate-x-[-2px] transition-transform">←</span>
              </Link>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: HADITH OF THE DAY CARD */}
        <div className="w-full lg:col-span-5" dir="rtl">
          <div className="w-full rounded-3xl border-2 border-[#C5A059] bg-[#FDFBF7] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-[#C5A059]/30 pb-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0F3D2E]">
                <span>✨</span>
                <span>حدیثِ مبارکہ • Hadith of the Day</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-[#64748B]">
                صحیح البخاری: 5027
              </span>
            </div>

            {/* Arabic Calligraphy in Amiri font */}
            <div className="text-center py-2 space-y-2">
              <div 
                className="text-xl sm:text-2xl font-bold text-[#0F3D2E] leading-relaxed"
                style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
              >
                «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
              </div>
              <div 
                className="text-xs sm:text-sm text-[#1E293B] font-medium leading-relaxed"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                ”تم میں سے سب سے بہتر وہ شخص ہے جو قرآن سیکھے اور سکھائے۔“
              </div>
            </div>

            {/* WhatsApp Share Action */}
            <div className="pt-3 border-t border-[#C5A059]/20 flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] text-[#64748B]">کتاب فضائل القرآن</span>
              <a 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  "✨ *حدیثِ مبارکہ*\n\n" +
                  "«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»\n\n" +
                  "”تم میں سے سب سے بہتر وہ شخص ہے جو قرآن سیکھے اور سکھائے۔“\n\n" +
                  "📖 صحیح البخاری: 5027 • کتاب فضائل القرآن\n\n" +
                  "🌐 کوکن اسلامک لائبریری:\nhttps://www.ahlehadeeskokan.com"
                )}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xs transition active:scale-95 shrink-0 cursor-pointer"
              >
                <span>📲</span>
                <span>واٹس ایپ شیئر</span>
              </a>
            </div>

          </div>
        </div>

      </div>

      {/* ================= IMAGE 2 GALLERY SHOWCASE (NO DOTS, CLEAN SHOWCASE + 4 THUMBNAILS) ================= */}
      <div className="relative rounded-3xl bg-white border border-[#E6E2DD] shadow-sm p-3 sm:p-4" dir="rtl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          
          {/* MAIN FEATURED SLIDE (8 Cols Desktop / 100% Mobile) */}
          <div className="lg:col-span-8 relative rounded-2xl overflow-hidden bg-[#0F3D2E] aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[420px] flex items-center justify-center group shadow-xs">
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = currentSlide.fallback_image;
              }}
            />

            {/* Dark Gradient Overlay for Maximum Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent flex flex-col justify-end p-4 sm:p-7 text-white pointer-events-none">
              <div className="space-y-2 pointer-events-auto">
                <div className="flex items-center gap-2">
                  <span className={`inline-block text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs ${currentSlide.badge_color}`}>
                    {currentSlide.badge}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    {activeSlideIndex + 1} / {slides.length}
                  </span>
                </div>

                <h3 
                  className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug drop-shadow-sm"
                  style={{ fontFamily: "'Noto Naskh Arabic', 'Plus Jakarta Sans', system-ui, sans-serif" }}
                >
                  {currentSlide.title}
                </h3>

                {currentSlide.description && (
                  <p 
                    className="text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-2xl font-medium"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    {currentSlide.description}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLightboxItem(currentSlide)}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-[#0F3D2E] font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-xs cursor-pointer active:scale-95"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                    <span>بڑی تصویر دیکھیں</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(currentSlide.action_link)}
                    className="inline-flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs backdrop-blur-sm border border-white/20 transition cursor-pointer active:scale-95"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    <span>{currentSlide.action_text}</span>
                    <span>←</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Arrows on Main Photo */}
            <button
              type="button"
              onClick={handlePrevSlide}
              className="absolute top-1/2 -translate-y-1/2 start-3 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950/60 hover:bg-[#0F3D2E] text-white flex items-center justify-center transition backdrop-blur-sm border border-white/20 shadow-md cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Previous photo"
            >
              <ChevronRightIcon className="w-5 h-5 text-white" />
            </button>
            <button
              type="button"
              onClick={handleNextSlide}
              className="absolute top-1/2 -translate-y-1/2 end-3 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950/60 hover:bg-[#0F3D2E] text-white flex items-center justify-center transition backdrop-blur-sm border border-white/20 shadow-md cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Next photo"
            >
              <ChevronLeftIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* RIGHT 4-THUMBNAIL STACK (4 Cols Desktop / Horizontal Scroll on Mobile) */}
          <div className="lg:col-span-4 flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-none">
            {slides.slice(0, 4).map((slide, idx) => {
              const isActive = activeSlideIndex === idx;
              return (
                <div
                  key={slide.id}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`flex-1 min-w-[200px] lg:min-w-0 p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                    isActive
                      ? "bg-emerald-50/80 border-[#0F3D2E] shadow-sm ring-1 ring-[#0F3D2E]"
                      : "bg-[#FAF8F5] border-[#E6E2DD] hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {/* Thumbnail Picture */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-18 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = slide.fallback_image;
                      }}
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-[#0F3D2E]/20 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059] ring-2 ring-white"></span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[10px] font-bold text-[#0F3D2E] block truncate">
                      {slide.badge}
                    </span>
                    <h4 
                      className={`text-xs font-bold line-clamp-2 leading-tight ${isActive ? "text-[#0F3D2E]" : "text-slate-800"}`}
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      {slide.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      تصویر {idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ================= 4 EDITORIAL METRIC BADGES ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-center" dir="rtl">
        <div className="p-4 rounded-2xl bg-white border border-[#E6E2DD] shadow-xs">
          <div className="text-xl sm:text-2xl font-black text-[#0F3D2E] font-mono">7,800+</div>
          <div className="text-[11px] sm:text-xs text-[#64748B] font-semibold mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
            {language === 'en' ? 'Books & Treatises' : 'مستند کتب و رسائل'}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E6E2DD] shadow-xs">
          <div className="text-xl sm:text-2xl font-black text-[#0F3D2E] font-mono">100% مفت</div>
          <div className="text-[11px] sm:text-xs text-[#64748B] font-semibold mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
            {language === 'en' ? 'Free Online Reading' : 'آن لائن مطالعہ و ڈاؤنلوڈ'}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E6E2DD] shadow-xs">
          <div className="text-xl sm:text-2xl font-black text-[#0F3D2E] font-mono">دار الافتاء</div>
          <div className="text-[11px] sm:text-xs text-[#64748B] font-semibold mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
            {language === 'en' ? 'Shariah Guidance' : 'شرعی رہنمائی و سوالات'}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E6E2DD] shadow-xs">
          <div className="text-xl sm:text-2xl font-black text-[#0F3D2E] font-mono">سپر فاسٹ</div>
          <div className="text-[11px] sm:text-xs text-[#64748B] font-semibold mt-0.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
            {language === 'en' ? 'High Speed Reader' : 'ہائی اسپیڈ ڈیجیٹل ریڈر'}
          </div>
        </div>
      </div>

      {/* ================= LIGHTBOX MODAL ================= */}
      {lightboxItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxItem(null)}
          dir="rtl"
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setLightboxItem(null)}
              className="absolute top-4 start-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* High-Res Image Display */}
            <div className="max-h-[75vh] flex items-center justify-center bg-black">
              <img
                src={lightboxItem.image}
                alt={lightboxItem.title}
                className="max-h-[75vh] w-auto max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = lightboxItem.fallback_image;
                }}
              />
            </div>

            {/* Lightbox Footer Bar */}
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-300">
                  {lightboxItem.badge}
                </span>
                <h4 
                  className="text-sm sm:text-base font-bold text-white"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {lightboxItem.title}
                </h4>
                {lightboxItem.description && (
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {lightboxItem.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `📸 *${lightboxItem.title}*\n\n${lightboxItem.description || ''}\n\n🌐 مرکز اہل حدیث کوکن:\nhttps://www.ahlehadeeskokan.com/gallery`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span>واٹس ایپ</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setLightboxItem(null);
                    navigate("/gallery");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  مکمل نگارخانہ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryHero;
