import React from "react";
import {
  BookOpenIcon,
  NewspaperIcon,
  AcademicCapIcon,
  UserGroupIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { useLanguage } from "../../context/LanguageContext";

const DEFAULT_STATS = [
  {
    key: "books",
    label: "Islamic Books & Rare Treatises",
    labelUrdu: "کتب و نادر علمی ذخائر",
    value: "10,000+",
    icon: BookOpenIcon,
  },
  {
    key: "clippings",
    label: "Newspaper & Press Archives",
    labelUrdu: "اخباری کٹنگز و مضامین",
    value: "250+",
    icon: NewspaperIcon,
  },
  {
    key: "fatawa",
    label: "Answered Shar'i Fatawa",
    labelUrdu: "مفتیانِ کرام کے شرعی فتاویٰ",
    value: "1,200+",
    icon: AcademicCapIcon,
  },
  {
    key: "readers",
    label: "Monthly Active Readers",
    labelUrdu: "ماہانہ قارئین و طلبہ",
    value: "50,000+",
    icon: UserGroupIcon,
  }
];

const ImpactStatsCounter = ({ config = {} }) => {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';

  // If explicitly hidden by admin
  if (config?.enabled === false) {
    return null;
  }

  // Merge admin-configured stats with defaults
  const dynamicItems = Array.isArray(config?.stats) ? config.stats : (Array.isArray(config?.items) ? config.items : null);

  const stats = DEFAULT_STATS.map((def, idx) => {
    const custom = dynamicItems?.[idx];
    if (!custom) return def;
    return {
      ...def,
      value: custom.value !== undefined && custom.value !== '' ? custom.value : def.value,
      label: custom.label !== undefined && custom.label !== '' ? custom.label : def.label,
      labelUrdu: custom.labelUrdu !== undefined && custom.labelUrdu !== '' ? custom.labelUrdu : def.labelUrdu,
    };
  });

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <div className="rounded-[2.5rem] bg-gradient-to-br from-[#031525] via-[#052827] to-[#041d24] p-6 sm:p-10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] relative overflow-hidden border border-amber-500/25">
        {/* Subtle royal ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Small top badge */}
        <div className="relative z-10 flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/30 backdrop-blur-md">
            <SparklesIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className={isUrdu ? "font-urdu text-sm" : ""}>
              مرکز کے علمی و دعوتی اعداد و شمار
            </span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:divide-x-reverse divide-amber-500/15">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`space-y-2.5 text-center ${idx !== 0 ? "pt-4 sm:pt-0 sm:px-4" : "sm:px-4"}`}>
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 text-amber-300 mx-auto flex items-center justify-center border border-amber-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]">
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="text-2xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_2px_10px_rgba(212,175,55,0.35)]">
                  {item.value}
                </div>
                {isUrdu ? (
                  <p 
                    className="text-sm sm:text-base font-bold text-slate-100 leading-loose font-urdu" 
                    dir="rtl"
                  >
                    {item.labelUrdu}
                  </p>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm font-bold text-slate-200">
                      {item.label}
                    </p>
                    <p 
                      className="text-xs sm:text-sm font-bold text-amber-300/80 leading-relaxed font-urdu" 
                      dir="rtl"
                    >
                      {item.labelUrdu}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ImpactStatsCounter;
