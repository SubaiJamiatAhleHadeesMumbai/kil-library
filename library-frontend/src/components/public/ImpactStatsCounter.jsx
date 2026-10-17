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
      <div className="rounded-[2rem] bg-white p-6 sm:p-10 text-slate-900 shadow-xs relative overflow-hidden border border-slate-200/90">
        {/* Small top badge */}
        <div className="relative z-10 flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <SparklesIcon className="w-3.5 h-3.5 text-emerald-700" />
            <span className={isUrdu ? "font-urdu text-sm" : ""}>
              مرکز کے علمی و دعوتی اعداد و شمار
            </span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:divide-x-reverse divide-slate-200">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`space-y-2.5 text-center ${idx !== 0 ? "pt-4 sm:pt-0 sm:px-4" : "sm:px-4"}`}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 mx-auto flex items-center justify-center border border-emerald-100 shadow-xs">
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {item.value}
                </div>
                {isUrdu ? (
                  <p 
                    className="text-sm sm:text-base font-bold text-slate-700 leading-loose font-urdu" 
                    dir="rtl"
                  >
                    {item.labelUrdu}
                  </p>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm font-bold text-slate-700">
                      {item.label}
                    </p>
                    <p 
                      className="text-xs sm:text-sm font-bold text-slate-500 leading-relaxed font-urdu" 
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
