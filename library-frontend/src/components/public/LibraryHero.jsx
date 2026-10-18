import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import {
  PhotoIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
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
    action_link: "/library",
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
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    galleryService
      .getPublicGallery({ limit: 6 })
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setGalleryItems(data);
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

  return (
    <div className="w-full space-y-6">
      {/* ================= PREMIER MAJESTIC IMAGE SLIDER ================= */}
      <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200/90 bg-slate-900 aspect-[16/9] sm:aspect-[21/9] max-h-[500px]">
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
            bulletActiveClass: "swiper-pagination-bullet-active !opacity-100 !w-7 !rounded-full !bg-emerald-500",
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
                    className="text-lg sm:text-2xl md:text-3xl font-black drop-shadow-md text-white urdu-title leading-snug"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif", lineHeight: 1.9 }}
                  >
                    {slide.title}
                  </h3>

                  {slide.description && (
                    <p 
                      className="text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-2xl font-sans"
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      {slide.description}
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(slide.action_link)}
                      className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-sm cursor-pointer active:scale-95"
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
            className="hero-slider-prev absolute top-1/2 -translate-y-1/2 start-3 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/40 hover:bg-emerald-950/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronRightIcon className="w-5 h-5 text-white" />
          </button>
          <button
            type="button"
            className="hero-slider-next absolute top-1/2 -translate-y-1/2 end-3 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-950/40 hover:bg-emerald-950/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Next slide"
          >
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>
        </Swiper>
      </div>

      {/* ================= 4 EDITORIAL METRIC BADGES ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center" dir="rtl">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">7,800+</div>
          <div className="text-[11px] text-slate-600 font-medium font-sans">
            {language === 'en' ? 'Books & Treatises' : 'مستند کتب و رسائل'}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">100% مفت</div>
          <div className="text-[11px] text-slate-600 font-medium font-sans">
            {language === 'en' ? 'Free Online Reading' : 'آن لائن مطالعہ و ڈاؤنلوڈ'}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">دار الافتاء</div>
          <div className="text-[11px] text-slate-600 font-medium font-sans">
            {language === 'en' ? 'Shariah Guidance' : 'شرعی رہنمائی و سوالات'}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">سپر فاسٹ</div>
          <div className="text-[11px] text-slate-600 font-medium font-sans">
            {language === 'en' ? 'High Speed Reader' : 'ہائی اسپیڈ ڈیجیٹل ریڈر'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryHero;
