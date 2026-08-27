import React, { useEffect, useState } from "react";
import {
  BuildingLibraryIcon,
} from "@heroicons/react/24/solid";
import { motion, useScroll, useTransform } from "framer-motion";
import settingsService from "../../api/settingsService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const STAR_COLORS = [
  "rgba(255,255,255,.9)",
  "rgba(173,216,230,.9)",
  "rgba(244,162,97,.9)",
  "rgba(180,130,255,.9)",
];

const LibraryHero = ({ config }) => {
  const [heroSettings, setHeroSettings] = useState(config || null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [night] = useState(true);
  const [shoot, setShoot] = useState(false);

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
        x: (e.clientX / window.innerWidth - 0.5) * 12,
        y: (e.clientY / window.innerHeight - 0.5) * 12,
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  /* ================= Shooting Star ================= */
  useEffect(() => {
    const t = setInterval(() => {
      setShoot(true);
      setTimeout(() => setShoot(false), 1200);
    }, Math.random() * 6000 + 5000);
    return () => clearInterval(t);
  }, []);

  /* ================= Scroll Zoom ================= */
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 300], [1, 0.93]);

  // Derived Dynamic Properties
  const rawBanner = heroSettings?.banner_image_url || "";
  const bannerUrl = rawBanner
    ? (rawBanner.startsWith("http")
        ? rawBanner
        : `${API_BASE_URL}${rawBanner.startsWith("/") ? "" : "/"}${rawBanner}`)
    : "";

  const overlayOpacity = Number.isFinite(Number(heroSettings?.banner_overlay_opacity))
    ? Math.min(1, Math.max(0.1, Number(heroSettings.banner_overlay_opacity) / 100))
    : 0.7;

  const showStars = heroSettings?.show_stars !== false;
  const showBadge = heroSettings?.show_badge !== false;
  const badgeText = heroSettings?.badge || "MARKAZ AHLE HADEES KOKAN";
  const showAyah = heroSettings?.show_ayah !== false;
  const ayahArabic = heroSettings?.ayah_arabic ?? "يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ";
  const ayahTranslation = heroSettings?.ayah_translation || "";
  const title = heroSettings?.title || "Kokan Islamic Library";
  const description = heroSettings?.description || "Explore curated Islamic knowledge with a calm, modern reading experience.";

  return (
    <motion.div
      style={{ scale }}
      className="relative w-full overflow-hidden rounded-3xl bg-[#000814] shadow-2xl border border-white/10"
    >
      {/* ================= BACKGROUND ================= */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${mouse.x}px, ${mouse.y}px)`,
          transition: "transform .2s ease-out",
        }}
      >
        {/* Banner Image (if provided) */}
        {bannerUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
            {/* Configurable Darkness Overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-[#000814] via-[#001D3D] to-[#000814]"
              style={{ opacity: overlayOpacity }}
            />
          </>
        ) : (
          /* Default Deep Space Gradient */
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg,#000814,#001D3D,#003566)",
              backgroundSize: "300% 300%",
              animation: "gradientMove 30s ease infinite",
              opacity: 1,
            }}
          />
        )}

        {/* ===== STAR & SPACE EFFECTS (WHEN ENABLED) ===== */}
        {showStars && (
          <>
            {/* AI SCANNING LINES */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-full h-[2px] bg-cyan-400/20 animate-scanY" />
              <div className="absolute h-full w-[2px] bg-blue-400/15 animate-scanX" />
            </div>

            {/* BINARY CODE RAIN */}
            {[...Array(10)].map((_, i) => (
              <span
                key={i}
                className="absolute hidden text-[10px] font-mono text-green-400/10 animate-binary sm:block"
                style={{
                  left: `${(i * 10 + 5) % 100}%`,
                  animationDelay: `${i * 0.3}s`,
                }}
              >
                0101 101
              </span>
            ))}

            {/* STARS */}
            {[...Array(24)].map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full animate-star"
                style={{
                  width: `${(i % 3) + 1}px`,
                  height: `${(i % 3) + 1}px`,
                  left: `${(i * 17) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                  backgroundColor: STAR_COLORS[i % STAR_COLORS.length],
                  boxShadow: `0 0 6px ${STAR_COLORS[i % STAR_COLORS.length]}`,
                  animationDuration: `${(i % 10) + 18}s`,
                }}
              />
            ))}

            {/* SOFT FLOATING ORBS */}
            {[...Array(2)].map((_, i) => (
              <span
                key={`orb-${i}`}
                className="absolute rounded-full bg-cyan-300/10 blur-3xl animate-orb"
                style={{
                  width: `${140 + i * 34}px`,
                  height: `${140 + i * 34}px`,
                  left: `${12 + i * 46}%`,
                  top: `${10 + i * 14}%`,
                  animationDelay: `${i * 1.2}s`,
                }}
              />
            ))}

            {/* SHOOTING STAR */}
            {shoot && (
              <span
                className="absolute w-40 h-[2px]"
                style={{
                  top: "20%",
                  left: "65%",
                  background: "linear-gradient(90deg,white,transparent)",
                  animation: "shoot 1.2s ease-out",
                }}
              />
            )}
          </>
        )}

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle,transparent 55%,rgba(0,0,0,.75))",
          }}
        />
      </div>

      {/* ================= CONTENT ================= */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:py-12 md:py-16">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-white/15 bg-slate-900/40 p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8 md:p-12">
          <div className="flex flex-col items-center justify-between gap-4 text-center md:gap-6">
            
            {/* TOP BADGE */}
            {showBadge && badgeText && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/90 backdrop-blur-md shadow-xs"
              >
                <BuildingLibraryIcon className="h-4 w-4 text-[#F4A261]" />
                {badgeText}
              </motion.div>
            )}

            <div className="relative w-full">
              {/* Subtle Glowing Center Accent */}
              <div
                className="absolute left-1/2 top-1 -translate-x-1/2 h-32 w-32 rounded-full blur-3xl opacity-25 animate-pulse sm:h-44 sm:w-44 md:-top-6 md:h-56 md:w-56"
                style={{
                  background: "radial-gradient(circle,#f5d9a6,transparent 70%)",
                }}
              />

              {/* QURANIC AYAH / HADITH (ARABIC) */}
              {showAyah && ayahArabic && (
                <div className="mb-4">
                  <motion.h2
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    dir="rtl"
                    className="relative mx-auto max-w-2xl text-lg sm:text-2xl md:text-3xl leading-relaxed text-[#F4A261] font-serif font-medium tracking-wide drop-shadow-md"
                  >
                    {ayahArabic}
                  </motion.h2>

                  {/* OPTIONAL TRANSLATION */}
                  {ayahTranslation && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.7 }}
                      className="mt-1 text-xs sm:text-sm text-cyan-200/80 font-sans italic max-w-xl mx-auto"
                    >
                      "{ayahTranslation}"
                    </motion.p>
                  )}

                  <div className="mx-auto mt-3 h-[2px] w-16 bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent sm:w-28" />
                </div>
              )}

              {/* MAIN HERO TITLE */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.8 }}
                className="mx-auto mt-2 max-w-3xl text-[clamp(1.75rem,1.2rem+4vw,3.5rem)] font-serif font-black leading-[1.1] text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.5)] tracking-tight"
              >
                {title}
              </motion.h1>

              {/* SUBTITLE / DESCRIPTION */}
              {description && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.8 }}
                  className="mx-auto mt-3 max-w-2xl text-xs sm:text-base md:text-lg leading-relaxed text-slate-200/90 font-normal"
                >
                  {description}
                </motion.p>
              )}

              {/* (Buttons permanently removed as requested) */}
            </div>
          </div>
        </div>
      </div>

      {/* ================= CSS KEYFRAMES ================= */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes scanY {
          from { top: -10%; }
          to { top: 110%; }
        }
        .animate-scanY { animation: scanY 8s linear infinite; }

        @keyframes scanX {
          from { left: -10%; }
          to { left: 110%; }
        }
        .animate-scanX { animation: scanX 12s linear infinite; }

        @keyframes star {
          from { transform: translateY(0); opacity: .4; }
          to { transform: translateY(-120vh); opacity: 0; }
        }
        .animate-star { animation: star linear infinite; }

        @keyframes shoot {
          from { transform: translate(0,0); opacity: 1; }
          to { transform: translate(-600px,300px); opacity: 0; }
        }

        @keyframes binary {
          from { top: -10%; opacity: .1; }
          to { top: 110%; opacity: .35; }
        }
        .animate-binary { animation: binary 10s linear infinite; }

        @keyframes orb {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: .35; }
          50% { transform: translateY(-18px) translateX(10px) scale(1.05); opacity: .6; }
        }
        .animate-orb { animation: orb 10s ease-in-out infinite; }
      `}</style>
    </motion.div>
  );
};

export default LibraryHero;
