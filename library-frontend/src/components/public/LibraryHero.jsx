import React, { useEffect, useState } from "react";
import {
  BuildingLibraryIcon,
  BookOpenIcon,
  BoltIcon,
  ScaleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/solid";
import { motion, useScroll, useTransform } from "framer-motion";
import settingsService from "../../api/settingsService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const STAR_COLORS = [
  "rgba(255, 230, 160, 0.8)",
  "rgba(212, 175, 55, 0.7)",
  "rgba(255, 255, 255, 0.85)",
  "rgba(110, 231, 183, 0.75)",
];

const LibraryHero = ({ config }) => {
  const [heroSettings, setHeroSettings] = useState(config || null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // If no config passed directly, load from settingsService
  useEffect(() => {
    if (config) {
      setHeroSettings(config);
      return;
    }
    let mounted = true;
    settingsService.getHomepageSettings().then((data) => {
      if (mounted && data?.sections?.hero) {
        setHeroSettings(data.sections.hero);
      }
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [config]);

  /* ================= Mouse Parallax ================= */
  useEffect(() => {
    const move = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 8,
        y: (e.clientY / window.innerHeight - 0.5) * 8,
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  /* ================= Scroll Zoom ================= */
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 300], [1, 0.96]);

  // Derived Dynamic Properties
  const rawBanner = heroSettings?.banner_image_url || "";
  const bannerUrl = rawBanner
    ? (rawBanner.startsWith("http")
        ? rawBanner
        : `${API_BASE_URL}${rawBanner.startsWith("/") ? "" : "/"}${rawBanner}`)
    : "";

  const overlayOpacity = Number.isFinite(Number(heroSettings?.banner_overlay_opacity))
    ? Math.min(1, Math.max(0.1, Number(heroSettings.banner_overlay_opacity) / 100))
    : 0.75;

  const resolveText = (val, fallback = "") => {
    if (!val) return fallback;
    if (typeof val === "string") return val.trim() || fallback;
    if (typeof val === "object") {
      const preferred = val.ur || val.ar || val.en;
      if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
      for (const k of Object.keys(val)) {
        if (typeof val[k] === "string" && val[k].trim()) return val[k].trim();
      }
      return fallback;
    }
    return String(val);
  };

  const showStars = heroSettings?.show_stars !== false;
  const showBadge = heroSettings?.show_badge !== false;
  const badgeText = resolveText(heroSettings?.badge, "مرکز اہل حدیث کوکن • ڈیجیٹل کتب خانہ");
  const showAyah = heroSettings?.show_ayah !== false;
  const ayahArabic = resolveText(heroSettings?.ayah_arabic, "يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ");
  const ayahTranslation = resolveText(heroSettings?.ayah_translation, "اے ایمان والو! اللہ کی اطاعت کرو اور رسول کی اطاعت کرو");
  const title = resolveText(heroSettings?.title, "کوکن اسلامک لائبریری");
  const description = resolveText(heroSettings?.description, "مستند اسلامی علوم، تفاسیر، کتبِ احادیث، فقہ اور فتاویٰ کا جدید اور تیز ترین ڈیجیٹل ذخیرہ۔");
  const showCta = heroSettings?.show_cta !== false;
  const ctaText = resolveText(heroSettings?.cta_text, "کتب خانہ دیکھیں");
  const ctaLink = heroSettings?.cta_link || "/library";
  const secondaryCtaText = resolveText(heroSettings?.secondary_cta_text, "دار الافتاء • سوال پوچھیں");
  const secondaryCtaLink = heroSettings?.secondary_cta_link || "/fatawa";

  return (
    <motion.div
      style={{ scale }}
      className="relative w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-[#031525] via-[#052827] to-[#020d18] shadow-2xl border border-amber-500/20"
    >
      {/* ================= BACKGROUND ================= */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${mouse.x}px, ${mouse.y}px)`,
          transition: "transform .25s ease-out",
        }}
      >
        {/* Banner Image (if provided) */}
        {bannerUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-[#031525]/90 via-[#052827]/85 to-[#020d18]/95"
              style={{ opacity: overlayOpacity }}
            />
          </>
        ) : (
          /* Subtle Islamic Radial Ambient Glow */
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 50% 15%, rgba(212, 175, 55, 0.18), transparent 60%),
                radial-gradient(circle at 15% 45%, rgba(16, 185, 129, 0.16), transparent 50%),
                radial-gradient(circle at 85% 55%, rgba(245, 158, 11, 0.12), transparent 50%),
                linear-gradient(180deg, #031525 0%, #062b28 50%, #020d18 100%)
              `,
            }}
          />
        )}

        {/* Subtle Islamic Arabesque Geometric Watermark Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.045] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4af37' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0l40 40-40 40L0 40zm40-28.284L11.716 40 40 68.284 68.284 40 40 11.716zm0 14.142L25.858 40 40 54.142 54.142 40 40 25.858z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />

        {/* Soft Warm Ambient Lights (Stars) */}
        {showStars && (
          <>
            {[...Array(18)].map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full animate-star"
                style={{
                  width: `${(i % 3) + 1.5}px`,
                  height: `${(i % 3) + 1.5}px`,
                  left: `${(i * 19 + 7) % 96}%`,
                  top: `${(i * 23 + 11) % 90}%`,
                  backgroundColor: STAR_COLORS[i % STAR_COLORS.length],
                  boxShadow: `0 0 8px ${STAR_COLORS[i % STAR_COLORS.length]}`,
                  animationDuration: `${(i % 8) + 14}s`,
                }}
              />
            ))}
          </>
        )}

        {/* Outer Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, transparent 60%, rgba(2, 13, 24, 0.85) 100%)",
          }}
        />
      </div>

      {/* ================= CONTENT ================= */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:py-12 md:py-16">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-amber-500/25 bg-slate-950/60 p-6 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-8 md:p-12">
          <div className="flex flex-col items-center justify-between gap-4 text-center md:gap-6">
            
            {/* TOP ISLAMIC BADGE */}
            {showBadge && badgeText && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 px-4 py-1.5 text-[11px] sm:text-xs font-bold tracking-wide text-amber-200 backdrop-blur-md shadow-sm"
              >
                <BuildingLibraryIcon className="h-4 w-4 text-amber-400" />
                <span>{badgeText}</span>
              </motion.div>
            )}

            <div className="relative w-full">
              {/* Soft Center Gold Aura */}
              <div
                className="absolute left-1/2 top-0 -translate-x-1/2 h-36 w-36 rounded-full blur-3xl opacity-20 pointer-events-none sm:h-52 sm:w-52 md:h-64 md:w-64"
                style={{
                  background: "radial-gradient(circle, #D4AF37, transparent 70%)",
                }}
              />

              {/* QURANIC AYAH (GOLDEN NASKH/AMIRI CALLIGRAPHY) */}
              {showAyah && ayahArabic && (
                <div className="mb-4">
                  <motion.h2
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    dir="rtl"
                    className="relative mx-auto max-w-2xl text-lg sm:text-xl md:text-2xl leading-relaxed font-serif font-bold tracking-wide drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100"
                    style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
                  >
                    {ayahArabic}
                  </motion.h2>

                  {/* TRANSLATION */}
                  {ayahTranslation && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.7 }}
                      className="mt-1.5 text-xs sm:text-sm text-emerald-200/90 font-serif leading-relaxed max-w-xl mx-auto"
                      style={{ fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq Web', 'Mehr', 'Jameel Noori Nastaleeq', serif" }}
                    >
                      {ayahTranslation}
                    </motion.p>
                  )}

                  <div className="mx-auto mt-3 h-[2px] w-20 sm:w-32 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
                </div>
              )}

              {/* MAIN HERO TITLE */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.8 }}
                className="mx-auto mt-2 max-w-2xl text-2xl sm:text-3xl md:text-4xl font-extrabold leading-relaxed text-white drop-shadow-md"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq Web', 'Mehr', 'Jameel Noori Nastaleeq', serif" }}
              >
                {title}
              </motion.h1>

              {/* SUBTITLE / DESCRIPTION */}
              {description && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.8 }}
                  className="mx-auto mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-200/90 font-normal font-serif"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', 'Mehr Nastaliq Web', 'Mehr', 'Jameel Noori Nastaleeq', serif" }}
                >
                  {description}
                </motion.p>
              )}

              {/* 4 LIVE PLATFORM FEATURE PILLS */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-[11px] sm:text-xs font-semibold text-slate-300"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-emerald-200 backdrop-blur-sm shadow-xs">
                  <BookOpenIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span>7,800+ کتب و رسائل</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-amber-200 backdrop-blur-sm shadow-xs">
                  <BoltIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>سپر فاسٹ ڈیجیٹل ریڈر</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-950/40 px-3 py-1 text-teal-200 backdrop-blur-sm shadow-xs">
                  <ScaleIcon className="h-3.5 w-3.5 text-teal-400" />
                  <span>دار الافتاء و شرعی رہنمائی</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 px-3 py-1 text-blue-200 backdrop-blur-sm shadow-xs">
                  <ArrowDownTrayIcon className="h-3.5 w-3.5 text-blue-400" />
                  <span>100% مفت ڈاؤن لوڈ</span>
                </span>
              </motion.div>

              {/* ACTION BUTTONS (CTA) */}
              {showCta && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.8 }}
                  className="mt-6 flex flex-wrap items-center justify-center gap-3"
                >
                  {ctaText && (
                    <a
                      href={ctaLink}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-950/50 hover:brightness-110 transition-all active:scale-95"
                    >
                      <BookOpenIcon className="h-4 w-4" />
                      <span>{ctaText}</span>
                    </a>
                  )}
                  {secondaryCtaText && (
                    <a
                      href={secondaryCtaLink}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-white/10 backdrop-blur-md px-5 py-2.5 text-xs sm:text-sm font-semibold text-amber-100 hover:bg-white/20 transition-all active:scale-95"
                    >
                      <ScaleIcon className="h-4 w-4 text-amber-400" />
                      <span>{secondaryCtaText}</span>
                    </a>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= CSS ANIMATIONS ================= */}
      <style>{`
        @keyframes star {
          from { transform: translateY(0); opacity: .3; }
          to { transform: translateY(-120vh); opacity: 0; }
        }
        .animate-star { animation: star linear infinite; }
      `}</style>
    </motion.div>
  );
};

export default LibraryHero;
