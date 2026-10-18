import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BuildingLibraryIcon,
  BookOpenIcon,
  BoltIcon,
  ScaleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/solid";
import { motion, useScroll, useTransform } from "framer-motion";
import settingsService from "../../api/settingsService";
import { useLanguage } from "../../context/LanguageContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const STAR_COLORS = [
  "rgba(255, 230, 160, 0.8)",
  "rgba(212, 175, 55, 0.7)",
  "rgba(255, 255, 255, 0.85)",
  "rgba(110, 231, 183, 0.75)",
];

const LibraryHero = ({ config }) => {
  const { language, isRTL } = useLanguage();
  const [heroSettings, setHeroSettings] = useState(config || null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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

  const resolveText = (val, fallbacks = {}) => {
    const fallback = typeof fallbacks === "string" 
      ? fallbacks 
      : (fallbacks[language] || fallbacks.ur || fallbacks.en || "");

    if (!val) return fallback;
    if (typeof val === "string") return val.trim() || fallback;
    if (typeof val === "object") {
      // 1. Exact match for current active language
      const current = val[language];
      if (typeof current === "string" && current.trim()) return current.trim();
      
      // 2. Language-ranked secondary fallbacks
      const secondary = language === "en" 
        ? (val.en || val.ur || val.ar) 
        : language === "ar" 
        ? (val.ar || val.ur || val.en) 
        : (val.ur || val.ar || val.en);
      if (typeof secondary === "string" && secondary.trim()) return secondary.trim();

      for (const k of Object.keys(val)) {
        if (typeof val[k] === "string" && val[k].trim()) return val[k].trim();
      }
      return fallback;
    }
    return String(val);
  };

  const showStars = false;
  const showBadge = heroSettings?.show_badge !== false;
  const badgeText = resolveText(heroSettings?.badge, {
    ur: "مرکز اہل حدیث کوکن",
    en: "Markaz Ahle Hadees Kokan",
    ar: "مركز أهل الحديث كوكان",
  });
  const showAyah = heroSettings?.show_ayah !== false;
  const ayahArabic = resolveText(heroSettings?.ayah_arabic, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
  const ayahTranslation = resolveText(heroSettings?.ayah_translation, {
    ur: "اے ایمان والو! اللہ کی اطاعت کرو اور رسول کی اطاعت کرو",
    en: "O you who believe! Obey Allah and obey the Messenger",
    ar: "يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ",
  });
  const title = resolveText(heroSettings?.title, {
    ur: "کوکن اسلامک لائبریری",
    en: "Kokan Islamic Library",
    ar: "مكتبة كوكان الإسلامية",
  });
  const description = resolveText(heroSettings?.description, {
    ur: "مستند اسلامی علوم، تفاسیر، کتبِ احادیث، فقہ اور فتاویٰ کا جدید اور تیز ترین ڈیجیٹل ذخیرہ۔",
    en: "A modern digital repository of authentic Islamic sciences, Tafseer, Hadith collections, Fiqh, and Fatawa.",
    ar: "مستودع رقمي حديث للعلوم الإسلامية الأصيلة، التفاسير، كتب الحديث، الفقه والفتاوى.",
  });
  const showCta = heroSettings?.show_cta !== false;
  const ctaText = resolveText(heroSettings?.cta_text, {
    ur: "کتب خانہ دیکھیں 📖",
    en: "Explore Library 📖",
    ar: "تصفح المكتبة 📖",
  });
  const ctaLink = heroSettings?.cta_link || "/library";
  const secondaryCtaText = resolveText(heroSettings?.secondary_cta_text, {
    ur: "دار الافتاء • سوال پوچھیں ⚖️",
    en: "Dar-ul-Ifta • Ask Fatwa ⚖️",
    ar: "دار الإفتاء • اسأل فتوى ⚖️",
  });
  const secondaryCtaLink = heroSettings?.secondary_cta_link || "/fatawa";

  const searchPlaceholder = resolveText(null, {
    ur: "کتاب، مصنف، یا موضوع تلاش فرمائیں... (مثال: صحیح بخاری، توحید، فقہ)",
    en: "Search books, authors, or topics... (e.g. Sahih Bukhari, Tawheed, Fiqh)",
    ar: "ابحث عن كتاب، مؤلف، أو موضوع... (مثال: صحيح البخاري، التوحيد، الفقه)",
  });

  const searchBtnText = resolveText(null, {
    ur: "تلاش کریں 🔍",
    en: "Search 🔍",
    ar: "بحث 🔍",
  });

  const popularTopicsLabel = resolveText(null, {
    ur: "مقبول موضوعات:",
    en: "Popular Topics:",
    ar: "مواضيع شائعة:",
  });

  const popularTopics = language === "en" ? [
    { name: "Sahih Bukhari", icon: "📖", query: "Sahih Bukhari" },
    { name: "Tawheed & Aqeedah", icon: "🕋", query: "Tawheed" },
    { name: "Tafsir Ibn Kathir", icon: "📜", query: "Tafsir" },
    { name: "Shariah Fatawa", icon: "⚖️", query: "Fatawa" },
    { name: "Sunnah vs Bidah", icon: "🌿", query: "Sunnah" },
  ] : language === "ar" ? [
    { name: "صحيح البخاري", icon: "📖", query: "صحيح البخاري" },
    { name: "العقيدة والتوحيد", icon: "🕋", query: "التوحيد" },
    { name: "تفسير ابن كثير", icon: "📜", query: "التفسير" },
    { name: "الفتاوى الشرعية", icon: "⚖️", query: "فتاوى" },
    { name: "السنة والبدعة", icon: "🌿", query: "السنة" },
  ] : [
    { name: "صحیح بخاری", icon: "📖", query: "صحیح بخاری" },
    { name: "عقیدہ و توحید", icon: "🕋", query: "عقیدہ" },
    { name: "تفسیر ابن کثیر", icon: "📜", query: "تفسیر" },
    { name: "فتاویٰ شرعیہ", icon: "⚖️", query: "فتاویٰ" },
    { name: "ردِ شرک و بدعت", icon: "🌿", query: "بدعت" },
  ];

  return (
    <motion.div
      style={{ scale }}
      className="relative w-full overflow-hidden rounded-3xl bg-white shadow-xs border border-slate-200/90"
    >
      {/* ================= BACKGROUND ================= */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${mouse.x}px, ${mouse.y}px)`,
          transition: "transform .25s ease-out",
        }}
      >
        {/* Subtle Ambient Noor Aura */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.05), transparent 70%)
            `,
          }}
        />
      </div>

      {/* ================= CONTENT (100% OPEN SULTANI FRAME - NO NESTED BOX) ================= */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:py-12 md:py-16 text-center flex flex-col items-center justify-center">
        {/* Soft Center Gold Aura */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 h-44 w-44 rounded-full blur-3xl opacity-10 pointer-events-none sm:h-64 sm:w-64 md:h-80 md:w-80"
          style={{
            background: "radial-gradient(circle, #D4AF37, transparent 70%)",
          }}
        />

        {/* TOP BISMILLAH & AYAH (AMIRI CALLIGRAPHY) */}
        {showAyah && (
          <div className="mb-3">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl md:text-4xl text-amber-600 font-serif tracking-widest drop-shadow-xs mb-1"
              style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
            >
              ❖ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ❖
            </motion.div>

            {ayahArabic && (
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                dir="rtl"
                className="text-lg sm:text-xl md:text-2xl font-serif font-bold tracking-wide text-emerald-950 leading-relaxed"
                style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
              >
                {ayahArabic}
              </motion.h2>
            )}

            {ayahTranslation && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto"
                style={{
                  fontFamily: isRTL ? "'Gulzar', 'Noto Nastaliq Urdu', serif" : undefined,
                  lineHeight: isRTL ? 2.3 : 1.5,
                }}
              >
                {ayahTranslation}
              </motion.p>
            )}

            <div className="mx-auto mt-3 h-[2px] w-24 sm:w-36 bg-gradient-to-r from-transparent via-emerald-700/30 to-transparent" />
          </div>
        )}

        {/* MAIN HERO TITLE (Reactive Typography) */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className={`mx-auto my-2 text-3xl sm:text-5xl md:text-6xl font-extrabold text-emerald-950 drop-shadow-xs ${
            isRTL ? "leading-[2.1] sm:leading-[2.3]" : "leading-tight"
          }`}
          style={{ fontFamily: isRTL ? "'Gulzar', 'Noto Nastaliq Urdu', serif" : undefined }}
        >
          {title}
        </motion.h1>

        {/* SUBTITLE / DESCRIPTION */}
        {description && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7 }}
            className="mx-auto mb-7 max-w-3xl text-sm sm:text-base md:text-lg text-slate-600 font-normal"
            style={{
              fontFamily: isRTL ? "'Gulzar', 'Noto Nastaliq Urdu', serif" : undefined,
              lineHeight: isRTL ? 2.2 : 1.6,
            }}
          >
            {description}
          </motion.p>
        )}

        {/* WORLD-CLASS CLEAN SEARCH BAR */}
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.7 }}
          onSubmit={handleSearchSubmit}
          className="relative mx-auto mb-6 w-full max-w-2xl px-2"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full rounded-2xl border-2 border-slate-200 hover:border-emerald-700 focus:border-emerald-800 focus:bg-white bg-slate-50 py-3.5 sm:py-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 outline-none shadow-xs transition-all font-sans ${
              isRTL ? "pe-6 ps-36" : "ps-6 pe-36"
            }`}
          />
          <button
            type="submit"
            className={`absolute top-1/2 -translate-y-1/2 rounded-xl bg-emerald-900 hover:bg-emerald-800 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer ${
              isRTL ? "start-4" : "end-4"
            }`}
          >
            {searchBtnText}
          </button>
        </motion.form>

        {/* QUICK SUBJECT TAGS (Clean Editorial Pills) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.7 }}
          className="flex items-center justify-center flex-wrap gap-2 sm:gap-2.5 mb-7"
        >
          <span 
            className="text-xs sm:text-sm font-bold text-slate-500 me-1"
            style={{ fontFamily: isRTL ? "'Gulzar', 'Noto Nastaliq Urdu', serif" : undefined }}
          >
            {popularTopicsLabel}
          </span>
          {popularTopics.map((topic) => (
            <button
              key={topic.name}
              type="button"
              onClick={() => navigate(`/library?search=${encodeURIComponent(topic.query)}`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 px-3.5 py-1 text-xs sm:text-sm font-medium text-slate-700 transition-all cursor-pointer shadow-2xs"
              style={{ fontFamily: isRTL ? "'Gulzar', 'Noto Nastaliq Urdu', serif" : undefined }}
            >
              <span>{topic.icon}</span>
              <span>{topic.name}</span>
            </button>
          ))}
        </motion.div>

        {/* 4 EDITORIAL METRIC BADGES (Clean Grid) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.7 }}
          className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center w-full max-w-3xl"
        >
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100/90 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">7,800+</div>
            <div className="text-[11px] text-slate-600 font-medium" style={{ fontFamily: isRTL ? "'Noto Naskh Arabic', sans-serif" : undefined }}>
              {language === 'en' ? 'Books & Treatises' : language === 'ar' ? 'كتاب ورسالة' : 'مستند کتب و رسائل'}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100/90 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">100%</div>
            <div className="text-[11px] text-slate-600 font-medium" style={{ fontFamily: isRTL ? "'Noto Naskh Arabic', sans-serif" : undefined }}>
              {language === 'en' ? 'Free PDF & Reading' : language === 'ar' ? 'مجاني 100%' : '100% مفت مطالعہ'}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100/90 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">{language === 'en' ? 'Dar-ul-Ifta' : language === 'ar' ? 'دار الإفتاء' : 'دار الافتاء'}</div>
            <div className="text-[11px] text-slate-600 font-medium" style={{ fontFamily: isRTL ? "'Noto Naskh Arabic', sans-serif" : undefined }}>
              {language === 'en' ? 'Shariah Guidance' : language === 'ar' ? 'والبحوث' : 'شرعی رہنمائی و فتاویٰ'}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100/90 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-sans">{language === 'en' ? 'Super Fast' : language === 'ar' ? 'فائق السرعة' : 'سپر فاسٹ'}</div>
            <div className="text-[11px] text-slate-600 font-medium" style={{ fontFamily: isRTL ? "'Noto Naskh Arabic', sans-serif" : undefined }}>
              {language === 'en' ? 'Smart Reader' : language === 'ar' ? 'القارئ الذكي' : 'ہائی اسپیڈ ریڈر'}
            </div>
          </div>
        </motion.div>
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
