import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon } from "@heroicons/react/24/solid";

const DEFAULT_QUOTES = [
  {
    arabic: "رَّبِّ زِدْنِي عِلْمًا",
    urdu: "اے میرے رب! میرے علم میں اضافہ فرما۔",
    english: "O my Lord! Increase me in knowledge.",
    source: "Surah Ta-Ha : 114"
  },
  {
    arabic: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
    urdu: "علم کا حاصل کرنا ہر مسلمان پر فرض ہے۔",
    english: "Seeking knowledge is an obligation upon every Muslim.",
    source: "Sunan Ibn Majah"
  },
  {
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    urdu: "تم میں سب سے بہتر وہ ہے جو قرآن سیکھے اور سکھائے۔",
    english: "The best among you are those who learn the Quran and teach it.",
    source: "Sahih al-Bukhari"
  },
  {
    arabic: "إِنَّمَا يَخْشَى اللَّهَ مِنْ عِبَادِهِ الْعُلَمَاءُ",
    urdu: "اللہ سے اس کے وہی بندے ڈرتے ہیں جو علم والے ہیں۔",
    english: "Only those fear Allah, from among His servants, who have knowledge.",
    source: "Surah Fatir : 28"
  }
];

const THEME_STYLES = {
  navy: {
    bg: "bg-gradient-to-br from-[#070D18] via-[#001D3D] to-[#042823]",
    ring: "border-emerald-500/40 shadow-emerald-500/20",
    gold: "from-amber-300 via-yellow-400 to-amber-500",
    textPrimary: "text-white",
    textSecondary: "text-emerald-300/80",
    accent: "bg-emerald-500",
    progress: "from-emerald-500 via-amber-400 to-emerald-400"
  },
  black: {
    bg: "bg-gradient-to-br from-[#000000] via-[#0D0D0D] to-[#17140B]",
    ring: "border-amber-500/50 shadow-amber-500/20",
    gold: "from-amber-200 via-amber-400 to-yellow-500",
    textPrimary: "text-amber-100",
    textSecondary: "text-amber-300/80",
    accent: "bg-amber-500",
    progress: "from-amber-600 via-yellow-400 to-amber-300"
  },
  ivory: {
    bg: "bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0]",
    ring: "border-emerald-600/30 shadow-slate-400/20",
    gold: "from-emerald-800 via-teal-700 to-[#002147]",
    textPrimary: "text-slate-900",
    textSecondary: "text-emerald-800",
    accent: "bg-emerald-700",
    progress: "from-emerald-600 via-teal-500 to-[#002147]"
  }
};

const IslamicSplashLoader = ({
  theme = "navy", // 'navy' | 'black' | 'ivory'
  occasion = "default", // 'default' | 'ramadan' | 'eid' | 'conference'
  showQuote = true,
  customQuotes = null,
  title = "Markaz Islamic Library",
  subtitle = "مرکز اہل حدیث کوکن — ڈیجیٹل کتب خانہ",
  onComplete = null,
  duration = 2000,
  isPreview = false
}) => {
  const quotesList = customQuotes && customQuotes.length > 0 ? customQuotes : DEFAULT_QUOTES;
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  const activeTheme = THEME_STYLES[theme] || THEME_STYLES.navy;

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotesList.length);
    }, 2800);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.floor(Math.random() * 18) + 10;
      });
    }, 200);

    let finishTimer;
    if (!isPreview) {
      finishTimer = setTimeout(() => {
        setProgress(100);
        if (onComplete) onComplete();
      }, duration);
    }

    return () => {
      clearInterval(quoteInterval);
      clearInterval(progressInterval);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [quotesList.length, duration, onComplete, isPreview]);

  const activeQuote = quotesList[currentQuoteIndex] || DEFAULT_QUOTES[0];

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden ${activeTheme.bg}`}
    >
      {/* Ambient background glow & stars */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Occasion Festive Badge */}
      {occasion === "ramadan" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-8 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md"
        >
          <span>🌙</span>
          <span>رمضان مبارك — مبارک ہو ماہِ قرآن</span>
        </motion.div>
      )}

      {occasion === "eid" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-8 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md"
        >
          <span>🕌</span>
          <span>عید مبارك — تقبل الله منا ومنكم</span>
        </motion.div>
      )}

      {occasion === "conference" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-8 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/40 text-blue-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md"
        >
          <SparklesIcon className="w-3.5 h-3.5 text-blue-300" />
          <span>Markaz Annual Dawah & Educational Conference</span>
        </motion.div>
      )}

      {/* Center Container */}
      <div className="relative z-10 max-w-lg w-full text-center space-y-6">
        {/* Floating Animated Logo with Double Glowing Rings */}
        <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          {/* Outer Pulsing Ring */}
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className={`absolute inset-0 rounded-full border border-dashed ${activeTheme.ring} p-1`}
          />

          {/* Inner Shimmer Halo */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-2 rounded-full bg-gradient-to-tr from-emerald-500/20 to-amber-500/20 blur-md"
          />

          {/* Logo Badge */}
          <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-2.5 shadow-2xl flex items-center justify-center border-2 border-amber-400/40">
            <img
              src="/logo.png"
              alt="Markaz Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        {/* Brand Headings */}
        <div className="space-y-1.5">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-xl sm:text-2xl font-black tracking-tight ${activeTheme.textPrimary}`}
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-xs sm:text-sm font-urdu font-semibold tracking-wide ${activeTheme.textSecondary}`}
            dir="rtl"
          >
            {subtitle}
          </motion.p>
        </div>

        {/* Dynamic Hadith / Quote Box */}
        {showQuote && activeQuote && (
          <motion.div
            key={currentQuoteIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
            className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg space-y-2 min-h-[90px] flex flex-col justify-center"
          >
            {activeQuote.arabic && (
              <p className={`text-base sm:text-lg font-amiri font-bold bg-gradient-to-r ${activeTheme.gold} bg-clip-text text-transparent`} dir="rtl">
                {activeQuote.arabic}
              </p>
            )}
            {activeQuote.urdu && (
              <p className="text-xs sm:text-sm font-urdu text-slate-300" dir="rtl">
                {activeQuote.urdu}
              </p>
            )}
            {activeQuote.source && (
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                — {activeQuote.source}
              </span>
            )}
          </motion.div>
        )}

        {/* Slim Gradient Progress Bar */}
        <div className="space-y-2 pt-2 max-w-xs mx-auto">
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/5">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${activeTheme.progress} shadow-sm`}
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Loading Knowledge Vault...</span>
            </span>
            <span className="font-mono">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IslamicSplashLoader;
