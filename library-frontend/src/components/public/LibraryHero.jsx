import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  XMarkIcon,
  ShareIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";
import galleryService from "../../api/galleryService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = String(value);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const cleanMediaTitle = (
  title,
  fallback = "مرکز اہل حدیث کوکن کی تصویری جھلکیاں"
) => {
  if (!title || typeof title !== "string") return fallback;
  const lower = title.toLowerCase();
  if (
    lower.includes("whatsapp image") ||
    lower.includes("img_") ||
    lower.includes("dsc_") ||
    lower.includes("screenshot")
  ) {
    return fallback;
  }
  return title.trim() || fallback;
};

const DEFAULT_SLIDES = [
  {
    id: "slide-1",
    image:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/gallery/b21046f60e5725a1_ماہانہ_اجتماع_اکتوبر_2024.jpg",
    fallback_image:
      "/static/images/0a33c541-b2d5-4315-aed3-04753bc5198a_download28.jpeg",
    badge: "ماہانہ اجتماعات",
    subtitle: "بیت السلام کھیڈ",
    title:
      "مرکز اہل حدیث کوکن: سالانہ تعلیمی و تربیتی سیمینار کی تصویری جھلکیاں",
    description:
      "مسجد اہل حدیث، بیت السلام کمپلیکس کھیڈ میں منعقدہ عظیم الشان علمی کانفرنس",
  },
  {
    id: "slide-2",
    image:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/gallery/e0b4f92f24480861_تربیتی_کیمپ_نومبر_2023___02.jpg",
    fallback_image:
      "/static/images/7b6e2da0-4181-408c-b1d7-88bac463416f_books.jpeg",
    badge: "ساتواں تربیتی کیمپ",
    subtitle: "نومبر 2023",
    title: "ساتواں سالانہ تعلیمی و تربیتی کیمپ",
    description: "مرکز الدعوۃ الاسلامیۃ والخیریہ، کھیڈ - رتناگری",
  },
  {
    id: "slide-3",
    image:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/gallery/f425526af93a53d5_چھٹا_تربیتی_کیمپ__اکتوبر_2022.jpg",
    fallback_image:
      "/static/images/97cd6c8e-b3a3-4ba9-9d07-5d86aabc152b.jpeg",
    badge: "چھٹا تربیتی کیمپ",
    subtitle: "اکتوبر 2022",
    title: "چھٹا سالانہ تربیتی کیمپ",
    description: "بیت السلام کمپلیکس، کھیڈ - رتناگری",
  },
  {
    id: "slide-4",
    image:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/gallery/add2116884a2b160_پیغام_لئے_ا_یا_ہے_تسلیم_ورضا_کا.jpg",
    fallback_image:
      "/static/images/0a33c541-b2d5-4315-aed3-04753bc5198a_download28.jpeg",
    badge: "کلام انور یوسفی",
    subtitle: "علمی انتخاب",
    title: "کلام انور یوسفی — علمی و ادبی انتخاب",
    description: "مرکز اہل حدیث کوکن",
  },
];

const resolveSafeText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const candidate =
      value.ur || value.ar || value.en || value.name || value.title || value.text;
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
  const [galleryItems, setGalleryItems] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      galleryService.getHomeFeaturedGallery(30),
      galleryService.getPublicGallery({ limit: 30 }),
    ]).then(([homeRes, pubRes]) => {
      if (!mounted) return;
      const homeItems =
        homeRes.status === "fulfilled"
          ? Array.isArray(homeRes.value?.items)
            ? homeRes.value.items
            : Array.isArray(homeRes.value)
            ? homeRes.value
            : []
          : [];
      const pubItems =
        pubRes.status === "fulfilled"
          ? Array.isArray(pubRes.value?.items)
            ? pubRes.value.items
            : Array.isArray(pubRes.value)
            ? pubRes.value
            : []
          : [];

      const merged = [...homeItems, ...pubItems].filter(
        (it) =>
          it &&
          it.image_url &&
          it.item_type !== "moon" &&
          it.item_type !== "jumah"
      );

      // Deduplicate by image_url
      const seen = new Set();
      const unique = [];
      for (const item of merged) {
        const key = item.image_url || item.id;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      if (unique.length > 0) {
        setGalleryItems(unique);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const slides = useMemo(() => {
    if (galleryItems && galleryItems.length > 0) {
      return galleryItems.map((item, index) => {
        const rawTitle = resolveSafeText(
          item.title,
          "مرکز اہل حدیث کوکن کی تصویری جھلکیاں"
        );
        const rawDesc = resolveSafeText(
          item.caption,
          "مسجد اہل حدیث، بیت السلام کمپلیکس کھیڈ میں منعقدہ عظیم الشان علمی کانفرنس"
        );
        const badge = resolveSafeText(item.album_title, "ماہانہ اجتماعات");
        const subtitle = resolveSafeText(
          item.year || item.event_date,
          "بیت السلام کھیڈ"
        );

        return {
          id: `gallery-${item.id || index}`,
          image: resolveImageUrl(item.image_url),
          fallback_image:
            DEFAULT_SLIDES[index % DEFAULT_SLIDES.length].fallback_image,
          badge,
          subtitle,
          title: cleanMediaTitle(
            rawTitle,
            "مرکز اہل حدیث کوکن کی تصویری جھلکیاں"
          ),
          description: rawDesc,
        };
      });
    }
    return DEFAULT_SLIDES;
  }, [galleryItems]);

  const currentSlide = slides[activeSlideIndex % slides.length] || slides[0];

  // Continuous auto-scroll through ALL gallery images
  useEffect(() => {
    if (slides.length <= 1 || isPaused || lightboxIndex !== null) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [slides.length, isPaused, lightboxIndex]);

  // Keyboard navigation in Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev + 1) % slides.length);
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev - 1 + slides.length) % slides.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, slides.length]);

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Compute the 4 visible scrolling cards starting from activeSlideIndex
  const visibleStripSlides = useMemo(() => {
    const count = Math.min(4, slides.length);
    const list = [];
    for (let i = 0; i < count; i++) {
      const idx = (activeSlideIndex + i) % slides.length;
      list.push({ slide: slides[idx], index: idx });
    }
    return list;
  }, [slides, activeSlideIndex]);

  const activeLightboxSlide =
    lightboxIndex !== null ? slides[lightboxIndex % slides.length] : null;

  return (
    <div
      className="w-full"
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ================= FULL-WIDTH AUTO-SCROLLING GALLERY CARD ================= */}
      <div className="rounded-[20px] border-[1.5px] border-[#C8DDD2] bg-white shadow-[0_10px_25px_-5px_rgba(15,61,46,0.07),0_4px_10px_-2px_rgba(15,61,46,0.04)] overflow-hidden">
        {/* Light Mint-Pearl Header */}
        <div className="bg-gradient-to-r from-[#E6F2EC] to-[#F3F8F5] border-b-2 border-[#C5A059] px-3.5 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm sm:text-base font-extrabold text-[#0F3D2E]"
              style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
            >
              🖼️ نگارخانہ — مرکز کی دعوتی و تعلیمی سرگرمیوں کی تصویری جھلکیاں
            </span>
            <span className="text-[10px] sm:text-[11px] bg-white text-[#165B43] border border-[#C5A059] px-2.5 py-0.5 rounded-full font-bold">
              🔄 تمام تصاویر آٹو اسکرول ({activeSlideIndex + 1}/{slides.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block text-[11px] font-bold text-[#0F3D2E] bg-white/80 px-2.5 py-1 rounded-lg border border-[#C8DDD2]">
              🔍 کسی بھی تصویر پر کلک کر کے ایک ایک تصویر بڑی دیکھیں
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-[#0F3D2E] border border-[#0F3D2E]/25 hover:bg-[#165B43] hover:text-white active:bg-[#165B43] active:text-white transition cursor-pointer"
                title="پچھلی تصویر"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-[#0F3D2E] border border-[#0F3D2E]/25 hover:bg-[#165B43] hover:text-white active:bg-[#165B43] active:text-white transition cursor-pointer"
                title="اگلی تصویر"
              >
                ›
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate("/gallery")}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0F3D2E] border border-[#0F3D2E]/25 hover:bg-[#165B43] hover:text-white active:bg-[#165B43] active:text-white transition cursor-pointer"
            >
              مکمل نگارخانہ ←
            </button>
          </div>
        </div>

        {/* Continuous Scrolling Gallery Body */}
        <div className="p-3.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch bg-gradient-to-b from-white to-[#F3F8F5]/40">
          {/* Main Active Preview (5 Cols on Desktop) - Click opens Lightbox */}
          <div
            onClick={() => setLightboxIndex(activeSlideIndex)}
            className="lg:col-span-5 relative rounded-xl overflow-hidden min-h-[210px] sm:min-h-[235px] flex items-end border-2 border-[#C5A059] shadow-md cursor-pointer group bg-[#0F3D2E]"
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = currentSlide.fallback_image;
              }}
            />
            <div className="absolute top-3 left-3 z-10 bg-[#0F3D2E]/90 text-white border border-[#C5A059] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <ArrowsPointingOutIcon className="w-3 h-3 text-[#C5A059]" />
              <span>
                کلک کریں: بڑی تصویر دیکھیں ({activeSlideIndex + 1}/
                {slides.length})
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent p-4 flex flex-col justify-end text-white">
              <span className="inline-block w-fit text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#165B43] text-white mb-1">
                📸 {currentSlide.badge} • مرکز الدعوۃ الاسلامیہ والخیریہ
              </span>
              <h3
                className="text-sm sm:text-base font-extrabold text-white leading-snug line-clamp-2"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                {currentSlide.title}
              </h3>
            </div>
          </div>

          {/* Auto-Scrolling Strip of Gallery Images (7 Cols on Desktop, 2x2 or Horizontal Scroll on Mobile) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
            {visibleStripSlides.map(({ slide, index }, i) => {
              const isFirst = i === 0;
              return (
                <div
                  key={`${slide.id}-${index}`}
                  onClick={() => {
                    setActiveSlideIndex(index);
                    setLightboxIndex(index);
                  }}
                  className={`rounded-xl overflow-hidden bg-white shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group ${
                    isFirst
                      ? "border-2 border-[#165B43]"
                      : "border border-[#C8DDD2]"
                  }`}
                >
                  <div className="relative h-32 sm:h-36 bg-slate-100 overflow-hidden">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = slide.fallback_image;
                      }}
                    />
                    <span className="absolute top-1.5 left-1.5 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      🔍 دیکھیں
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 bg-white/90 text-[#0F3D2E] border border-[#C5A059] text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {index + 1}/{slides.length}
                    </span>
                  </div>
                  <div
                    className={`p-2 text-center ${
                      isFirst ? "bg-[#F3F8F5]" : "bg-white"
                    }`}
                  >
                    <div
                      className="text-[11px] font-extrabold text-[#0F3D2E] truncate"
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      {slide.badge || slide.title}
                    </div>
                    <div className="text-[9.5px] text-slate-500 truncate mt-0.5">
                      {slide.subtitle || slide.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= FULLSCREEN SINGLE-IMAGE LIGHTBOX MODAL (1-BY-1 VIEWER) ================= */}
      {activeLightboxSlide && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
          dir="rtl"
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-[#C5A059]/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar inside Lightbox */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-white/10 text-white">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#165B43] text-white text-xs font-bold">
                  {activeLightboxSlide.badge}
                </span>
                <span className="text-xs text-[#C5A059] font-mono font-bold">
                  تصویر {(lightboxIndex % slides.length) + 1} از {slides.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
                title="بند کریں"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* High-Res Image Display with Left/Right 1-by-1 Navigation Buttons */}
            <div className="relative min-h-[45vh] max-h-[72vh] flex items-center justify-center bg-black select-none">
              <img
                src={activeLightboxSlide.image}
                alt={activeLightboxSlide.title}
                className="max-h-[72vh] w-auto max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = activeLightboxSlide.fallback_image;
                }}
              />

              {/* Previous Image Button (Right side in RTL) */}
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (prev) => (prev - 1 + slides.length) % slides.length
                  )
                }
                className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0F3D2E]/85 hover:bg-[#165B43] text-white border border-[#C5A059] flex items-center justify-center shadow-lg transition cursor-pointer"
                title="پچھلی تصویر"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>

              {/* Next Image Button (Left side in RTL) */}
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev + 1) % slides.length)
                }
                className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0F3D2E]/85 hover:bg-[#165B43] text-white border border-[#C5A059] flex items-center justify-center shadow-lg transition cursor-pointer"
                title="اگلی تصویر"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Footer Bar */}
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
              <div className="space-y-1">
                <h4
                  className="text-sm sm:text-base font-bold text-white"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  {activeLightboxSlide.title}
                </h4>
                {activeLightboxSlide.description && (
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {activeLightboxSlide.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (prev) => (prev - 1 + slides.length) % slides.length
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#165B43] text-white text-xs font-bold transition cursor-pointer"
                >
                  ‹ پچھلی تصویر
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) => (prev + 1) % slides.length)
                  }
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#165B43] text-white text-xs font-bold transition cursor-pointer"
                >
                  اگلی تصویر ›
                </button>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `📸 *${activeLightboxSlide.title}*\n\n🌐 مرکز اہل حدیث کوکن:\nhttps://www.ahlehadeeskokan.com/gallery`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span>واٹس ایپ</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryHero;
