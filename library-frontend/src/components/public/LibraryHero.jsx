import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import galleryService from "../../api/galleryService";
import { useLanguage } from "../../context/LanguageContext";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = String(value);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const DEFAULT_SLIDES = [
  {
    id: "slide-1",
    image: "/static/images/0a33c541-b2d5-4315-aed3-04753bc5198a_download28.jpeg",
    fallback_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&q=80",
    badge: "📸 دعوتی و تعلیمی پروگرامز",
    badge_color: "bg-emerald-600/90",
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
    badge_color: "bg-amber-600/90",
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
    badge_color: "bg-blue-600/90",
    title: "مسجد اہل حدیث، بیت السلام کمپلیکس کھڑ کے دعوتی و فلاحی منصوبے",
    description: "منطقہ کوکن میں توحید و سنت کی اشاعت اور معاشرتی اصلاح کے لیے مرکز کے زیرِ اہتمام جاری متنوع سرگرمیاں۔",
    action_text: "تعارفِ مرکز پڑھیں",
    action_link: "/about",
  },
];

const LibraryHero = () => {
  const { language, isRTL } = useLanguage();
  const [galleryItems, setGalleryItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    galleryService
      .getPublicGallery({ limit: 6 })
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items || []);
        if (mounted && items.length > 0) {
          setGalleryItems(items);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const slides = useMemo(() => {
    if (galleryItems && galleryItems.length > 0) {
      return galleryItems.map((item, index) => {
        const title = typeof item.title === "object"
          ? (item.title[language] || item.title.ur || item.title.en || "")
          : (item.title || "مرکز اہل حدیث کوکن کی تصویری جھلکیاں");
        const desc = typeof item.caption === "object"
          ? (item.caption[language] || item.caption.ur || item.caption.en || "")
          : (item.caption || "مسجد اہل حدیث، بیت السلام کمپلیکس کھڑ میں جاری دعوتی و علمی سرگرمیاں۔");

        return {
          id: `gallery-${item.id || index}`,
          image: resolveImageUrl(item.image_url),
          fallback_image: DEFAULT_SLIDES[index % DEFAULT_SLIDES.length].fallback_image,
          badge: item.album_title || "📸 تصویری گیلری",
          badge_color: index % 2 === 0 ? "bg-emerald-600/90" : "bg-amber-600/90",
          title,
          description: desc,
          action_text: "تمام تصاویر ملاحظہ فرمائیں",
          action_link: "/gallery",
        };
      });
    }
    return DEFAULT_SLIDES;
  }, [galleryItems, language]);

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
      {/* ================= HERO TOP ROW: SEARCH & HADITH CARD (STACK ON MOBILE) ================= */}
      <div className="relative flex flex-col lg:grid lg:grid-cols-12 gap-6 items-center">
        
        {/* LEFT COLUMN: TITLE + SEARCH BAR + QUICK ACTION PILLS (7 cols on desktop, 100% on mobile) */}
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

        {/* RIGHT COLUMN: HADITH OF THE DAY CARD (5 cols on desktop, 100% stacked below on mobile) */}
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

      {/* ================= PREMIER MAJESTIC IMAGE SLIDER ================= */}
      <div className="relative rounded-3xl overflow-hidden shadow-md border border-[#E6E2DD] bg-[#0F3D2E] aspect-[16/9] sm:aspect-[21/9] max-h-[460px]">
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          autoplay={{
            delay: 4500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          speed={800}
          loop={slides.length > 1}
          pagination={{
            clickable: true,
            bulletClass: "swiper-pagination-bullet !bg-white !opacity-60",
            bulletActiveClass: "swiper-pagination-bullet-active !opacity-100 !w-7 !rounded-full !bg-[#C5A059]",
          }}
          navigation={{
            nextEl: ".hero-slider-next",
            prevEl: ".hero-slider-prev",
          }}
          className="w-full h-full"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id} className="relative w-full h-full">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = slide.fallback_image;
                }}
              />

              {/* Gradient Scrim for Flawless Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent flex flex-col justify-end p-5 sm:p-10 text-white">
                <div className="max-w-3xl space-y-2 text-start" dir="rtl">
                  <span className={`inline-block text-white text-[10px] sm:text-[11px] font-bold px-3 py-0.5 rounded-full shadow-2xs ${slide.badge_color}`}>
                    {slide.badge}
                  </span>
                  
                  <h3 
                    className="text-lg sm:text-2xl md:text-3xl font-black drop-shadow-md text-white leading-snug"
                    style={{ fontFamily: "'Noto Naskh Arabic', 'Plus Jakarta Sans', system-ui, sans-serif" }}
                  >
                    {slide.title}
                  </h3>

                  {slide.description && (
                    <p 
                      className="text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-2xl"
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      {slide.description}
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(slide.action_link)}
                      className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-[#0F3D2E] font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-sm cursor-pointer active:scale-95"
                    >
                      <span>{slide.action_text}</span>
                      <span>←</span>
                    </button>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}

          {/* Navigation Arrows */}
          <button
            type="button"
            className="hero-slider-prev absolute top-1/2 -translate-y-1/2 start-3 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/40 hover:bg-[#0F3D2E]/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronRightIcon className="w-5 h-5 text-white" />
          </button>
          <button
            type="button"
            className="hero-slider-next absolute top-1/2 -translate-y-1/2 end-3 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/40 hover:bg-[#0F3D2E]/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Next slide"
          >
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>
        </Swiper>
      </div>

      {/* ================= 4 EDITORIAL METRIC BADGES (2x2 on mobile, 4-col on desktop) ================= */}
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
    </div>
  );
};

export default LibraryHero;
